"""
NeuroAccess Backend v2.0 — 快速分析架构
- /analyze:  快速基础分析（无AI/无PDF/无PNG），3-10s返回
- /explain:  异步AI解释（Ollama三路并行）
- /export-pdf: 按需PDF生成
"""
import os
import sys
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
import concurrent.futures
import json
import hashlib
import threading
import time as _time
from typing import Any, Optional, List, Dict

import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, Request, Depends
from fastapi.middleware.cors import CORSMiddleware

from utils import safe_float, to_jsonable, safe_name, normalize_language
from explanations import generate_explanations, template_beginner, template_student, template_research
import i18n

# ── AI 解释异步缓存 ────────────────────────────────────────────
_EXPLANATIONS_CACHE: Dict[str, Dict] = {}
_EXPLANATIONS_CACHE_ORDER: List[str] = []  # 按插入顺序记录 key
_EXPLANATIONS_CACHE_MAX = 50  # 最多缓存 50 个 AI 解释
# 磁盘持久化：后端重启（部署/崩溃）不丢 AI 文案，否则前端轮询拿到 None 就一直显示模板
_EXPLANATIONS_CACHE_FILE = os.path.join(os.path.dirname(__file__), "explanations_cache.json")
_EXPLANATIONS_LOCK = threading.Lock()

def _load_explanations_cache_from_disk():
    """模块启动时从磁盘恢复缓存（上次进程的 AI 文案）"""
    try:
        if os.path.exists(_EXPLANATIONS_CACHE_FILE):
            with open(_EXPLANATIONS_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict):
                _EXPLANATIONS_CACHE.update(data)
                _EXPLANATIONS_CACHE_ORDER.extend(list(data.keys()))
    except Exception:
        pass

def _persist_explanations_cache_to_disk():
    """把当前内存缓存写回磁盘（原子写：先写临时文件再替换）"""
    try:
        tmp = _EXPLANATIONS_CACHE_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(_EXPLANATIONS_CACHE, f, ensure_ascii=False)
        os.replace(tmp, _EXPLANATIONS_CACHE_FILE)
    except Exception:
        pass

def _cache_explanations(aid: str, data: Dict):
    """存入缓存（内存+磁盘），超出上限时删除最旧的"""
    global _EXPLANATIONS_CACHE_ORDER
    with _EXPLANATIONS_LOCK:
        _EXPLANATIONS_CACHE[aid] = data
        _EXPLANATIONS_CACHE_ORDER.append(aid)
        if len(_EXPLANATIONS_CACHE_ORDER) > _EXPLANATIONS_CACHE_MAX:
            old = _EXPLANATIONS_CACHE_ORDER.pop(0)
            _EXPLANATIONS_CACHE.pop(old, None)
        _persist_explanations_cache_to_disk()

# 模块加载时恢复上次进程的 AI 文案缓存（后端重启不丢）
_load_explanations_cache_from_disk()

# ── 验证码发送防重限流（内存级，比 DB 快）─────────────────
_code_rate_limit: Dict[str, float] = {}
_code_rate_lock = threading.Lock()

def _check_code_rate_limit(key: str, cooldown_sec: int = 3) -> bool:
    """检查指定 key 是否在冷却期内。返回 True=允许发送, False=需等待"""
    now = _time.time()
    with _code_rate_lock:
        # 每 10 次检查清理一次过期条目
        if len(_code_rate_limit) > 100:
            expiry = now - 10
            _code_rate_limit.clear()  # 清理全部（简单高效）
        last = _code_rate_limit.get(key)
        if last and (now - last) < cooldown_sec:
            return False  # 仍在冷却期，拒绝
        _code_rate_limit[key] = now
        return True

def _bg_generate_explanations(aid: str, enhanced: Dict, lang: str):
    """后台线程：生成 AI 解释并存入缓存"""
    try:
        explanations = generate_explanations(enhanced, lang)
        _cache_explanations(aid, {"explanations": explanations, "ready": True})
    except Exception as e:
        print(f"[BG-EXPLAIN] Failed for {aid}: {e}", flush=True)
        _cache_explanations(aid, {"explanations": None, "ready": True, "error": str(e)})

BASE_DIR   = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="NeuroAccess Backend", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["https://neuroaccess.cloud", "http://localhost:3000"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

# =====================================================================
# 安全防火墙（应用层）— 只拦截明确恶意/高频请求，不改任何现有功能
# 开关：环境变量 FIREWALL_ENABLED=0 可一键关闭（默认开启）
# =====================================================================
import collections as _collections
import urllib.parse as _urllib_parse
from fastapi.responses import JSONResponse as _JSONResponse

_FW_ENABLED = os.environ.get("FIREWALL_ENABLED", "1") == "1"

# 每 IP 限流（max_requests, window_seconds）
_FW_RATE = {
    "auth":    (15, 60),    # 登录/注册/验证码：防爆破
    "upload":  (10, 60),    # /api/analyze 文件分析：防滥用
    "poll":    (180, 60),   # AI 解释轮询（前端 3s×60 次）：须宽松
    "default": (300, 60),   # 普通 API
}
_FW_HITS: dict = {}
_FW_CLEANUP_COUNTER = 0

# 恶意/扫描器路径特征（不含本站任何真实路径）
_FW_BAD_PATH_MARKERS = (
    "/.env", "/.git/", "/.svn/", "/.aws/", "/.ssh/",
    "/wp-admin", "/wp-login.php", "/wp-content", "/wp-includes",
    "/phpmyadmin", "/pma/", "/adminer", "/manager/html", "/actuator",
    "/console", "/jenkins", "/solr/", "/web.config", "/server-status",
    "/server-info", "/etc/passwd", "/proc/self/", "/cgi-bin/", "/shell",
    "/webshell", "/cmd.php", "/shell.php", "/config.php", "/info.php",
    "/test.php", "/dump.sql", "/backup.zip", "/.htaccess", "/.bash_history",
    "/laravel", "/thinkphp", "/v1/", "/swagger", "/graphql",
)
# 查询串/URL 中的注入与 XSS 特征（只查 URL 与查询参数，不查请求体，避免误伤正常内容）
_FW_BAD_QUERY_PATTERNS = (
    "union select", "union+select", "union%20select", "union all select",
    "or 1=1", "or+1=1", "or 1=1--", "' or '", "select * from",
    "select+*+from", "drop table", "delete from", "insert into", "update set",
    "xp_cmdshell", "information_schema", "load_file", "into outfile",
    "benchmark(", "sleep(", "pg_sleep", "waitfor delay",
    "javascript:", "onerror=", "onload=", "onclick=", "<script", "</script>",
    "alert(", "document.cookie", "confirm(", "prompt(", "svg onload",
    "base64_decode", "eval(", "assert(", "system(", "passthru(", "shell_exec",
)
# 明确恶意扫描器 UA（收紧名单：只拦攻击工具，不误伤搜索引擎爬虫/合法自动化）
_FW_BAD_UA = (
    "sqlmap", "nikto", "nmap", "masscan", "gobuster", "dirb", "wfuzz",
    "acunetix", "nessus", "openvas", "burpsuite", "hydra", "medusa",
    "python-urllib", "libwww-perl", "zgrab", "expanse", "censys",
    "nuclei", "xray", "l9explore", "sqlmap", "fimap", "shelldump",
    "w3af", "wpscan", "joomscan", "aircrack", "metasploit",
)

def _fw_client_ip(request: Request) -> str:
    """取真实客户端 IP：Cloudflare 头优先，其次 X-Forwarded-For，最后 socket。"""
    cf = request.headers.get("cf-connecting-ip") or ""
    if cf:
        return cf.strip().split(",")[0][:64]
    xff = request.headers.get("x-forwarded-for") or ""
    if xff:
        return xff.strip().split(",")[0][:64]
    if request.client:
        return (request.client.host or "0.0.0.0")[:64]
    return "0.0.0.0"

def _fw_group(path: str) -> str:
    if path.startswith("/api/auth/"):
        return "auth"
    if path in ("/api/analyze",) or path == "/api/explain":
        return "upload" if path == "/api/analyze" else "poll"
    if path.startswith("/api/analysis/explanations/") or path.startswith("/api/analysis/explanation/"):
        return "poll"
    return "default"

def _fw_rate_ok(ip: str, group: str, now: float) -> bool:
    limit, window = _FW_RATE[group]
    key = group + "|" + ip
    dq = _FW_HITS.get(key)
    if dq is None:
        dq = _collections.deque()
        _FW_HITS[key] = dq
    while dq and now - dq[0] > window:
        dq.popleft()
    if len(dq) >= limit:
        return False
    dq.append(now)
    return True

def _fw_cleanup(now: float):
    global _FW_CLEANUP_COUNTER
    _FW_CLEANUP_COUNTER += 1
    if _FW_CLEANUP_COUNTER % 200 != 0 and len(_FW_HITS) < 20000:
        return
    stale = [k for k, dq in _FW_HITS.items() if not dq or now - dq[-1] > 3600]
    for k in stale:
        del _FW_HITS[k]

@app.middleware("http")
async def security_firewall(request: Request, call_next):
    """防火墙主入口：命中即 403/429，其余原样放行。"""
    if not _FW_ENABLED:
        return await call_next(request)
    now = _time.time()
    path = request.url.path
    # 1) 危险 HTTP 方法
    if request.method in ("TRACE", "CONNECT", "TRACK"):
        return _JSONResponse(status_code=405, content={"detail": "请求方法不允许"})
    # 2) 恶意路径/路径穿越/空字节
    raw_lower = path.lower()
    try:
        decoded_lower = _urllib_parse.unquote(path).lower()
    except Exception:
        decoded_lower = raw_lower
    if any(m in raw_lower or m in decoded_lower for m in _FW_BAD_PATH_MARKERS):
        return _JSONResponse(status_code=403, content={"detail": "请求被防火墙拦截"})
    if "/../" in decoded_lower or "/..%2f" in raw_lower or "%2e%2e" in raw_lower or "%00" in raw_lower or "\x00" in decoded_lower:
        return _JSONResponse(status_code=403, content={"detail": "请求被防火墙拦截"})
    # 3) 查询串注入/XSS 特征（先 URL 解码，再匹配）
    try:
        q = _urllib_parse.unquote(request.url.query).lower().replace("+", " ")
    except Exception:
        q = request.url.query.lower()
    if any(p in q for p in _FW_BAD_QUERY_PATTERNS) or "\x00" in q or "\r" in q or "\n" in q:
        return _JSONResponse(status_code=403, content={"detail": "请求被防火墙拦截"})
    # 4) 明确恶意扫描器 UA
    ua = (request.headers.get("user-agent") or "").lower()
    if any(b in ua for b in _FW_BAD_UA):
        return _JSONResponse(status_code=403, content={"detail": "请求被防火墙拦截"})
    # 5) 请求体大小护栏（只读 Content-Length 头，不影响上传流式传输）
    cl = request.headers.get("content-length")
    if cl and cl.isdigit():
        size = int(cl)
        ct = (request.headers.get("content-type") or "").lower()
        if "multipart" in ct:
            if size > 260 * 1024 * 1024:
                return _JSONResponse(status_code=413, content={"detail": "文件过大"})
        elif size > 20 * 1024 * 1024:
            return _JSONResponse(status_code=413, content={"detail": "请求体过大"})
    # 6) 健康检查免限流（但不免上面 1-5 的恶意检查）
    if path in ("/", "/api/health", "/health"):
        return await call_next(request)
    # 7) 限流
    ip = _fw_client_ip(request)
    if not _fw_rate_ok(ip, _fw_group(path), now):
        return _JSONResponse(status_code=429, content={"detail": "请求过于频繁，请稍后再试"})
    _fw_cleanup(now)
    return await call_next(request)


# 导入分析引擎
try:
    from analysis import analyze_edf
except Exception as _e:
    analyze_edf = None
    ANALYSIS_IMPORT_ERROR = str(_e)
else:
    ANALYSIS_IMPORT_ERROR = ""

MAX_FILE_SIZE = 200 * 1024 * 1024  # 200MB

# =================================================================
# File upload
# =================================================================

def save_upload(file: UploadFile, lang: str = "zh") -> Dict[str, Any]:
    """保存上传文件（仅接受 .edf）"""
    # 格式错误时适配 7 种语言的错误提示
    _EXT_ERR = {
        "zh": "不支持的文件格式: {}，仅支持 .edf 格式",
        "en": "Unsupported file format: {}. Only .edf is supported",
        "es": "Formato no compatible: {}. Solo se admite .edf",
        "fr": "Format non pris en charge: {}. Seul .edf est accepté",
        "de": "Nicht unterstütztes Format: {}. Nur .edf wird unterstützt",
        "ja": "サポートされていない形式: {}。.edf のみ対応しています",
        "ko": "지원되지 않는 형식: {}。.edf만 지원됩니다",
    }
    _EMPTY_ERR = {
        "zh": "未提供文件", "en": "No file provided",
        "es": "No se proporcionó ningún archivo", "fr": "Aucun fichier fourni",
        "de": "Keine Datei bereitgestellt", "ja": "ファイルが提供されていません",
        "ko": "파일이 제공되지 않았습니다",
    }
    if not file or not file.filename:
        return {"success": False, "error": _EMPTY_ERR.get(lang, _EMPTY_ERR["en"])}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext != ".edf":
        return {"success": False, "error": _EXT_ERR.get(lang, _EXT_ERR["en"]).format(ext)}
    import uuid
    stored_name = f"{uuid.uuid4().hex[:10]}_{safe_name(file.filename)}"
    path = os.path.join(UPLOAD_DIR, stored_name)
    try:
        content = file.file.read()
        if not content:
            return {"success": False, "error": "Uploaded file is empty"}
        if len(content) > MAX_FILE_SIZE:
            return {"success": False, "error": f"File too large ({len(content)/1024/1024:.1f}MB). Max 200MB."}
        with open(path, "wb") as f:
            f.write(content)
    except Exception as e:
        return {"success": False, "error": f"文件保存失败: {e}"}
    return {"success": True, "path": path, "file_name": file.filename,
            "stored_name": stored_name, "file_size_mb": round(os.path.getsize(path)/1024/1024, 3)}


# =================================================================
# Analysis helpers (enhance_analysis — 不变)
# =================================================================

def _dominant_band(bp: Dict[str, float]) -> str:
    if not bp: return "unknown"
    try: return max(bp, key=lambda k: safe_float(bp[k]))
    except Exception: return "unknown"

def _freq_distribution(bp: Dict[str, float]) -> Dict[str, str]:
    if not bp: return {}
    total = sum(safe_float(v) for v in bp.values())
    if total == 0: return {k: "0%" for k in bp}
    return {k: f"{safe_float(v)/total*100:.1f}%" for k, v in bp.items()}

def _compute_literacy_scores(data: Dict, quality: Dict, bp: Dict) -> Dict[str, Any]:
    # Use actual signal-quality components so each literacy score is differentiated.
    # Old logic used the single signal_quality_score for 4 of 5 scores, producing identical values.
    qd = quality.get("quality_details") or {}
    snr_c = safe_float(qd.get("snr_component"), 0)
    cons_c = safe_float(qd.get("consistency_component"), 0)
    spec_c = safe_float(qd.get("spectral_component"), 0)
    base_c = safe_float(qd.get("base_score"), 0)
    art_c = safe_float(qd.get("artifact_penalty"), 0)
    int_c = safe_float(qd.get("integrity_penalty"), 0)
    drift_c = safe_float(qd.get("drift_penalty"), 0)

    # Each score uses a distinct combination of components → all values differ.
    # Component ranges (user-specified): snr 0~15, cons 0~10, spec 0~15, base 0~25,
    #   artifact 0~10, integrity 0~15, drift 0~10. Multipliers adjusted to preserve
    #   score range (~0-100) via old_max/new_max ratio.
    reliability = max(5, min(100, cons_c * 8.0 + base_c * 0.8 - int_c * 3.333 - drift_c * 1.6))          # 可靠性评估
    clarity = max(5, min(100, snr_c * 6.667 - art_c * 5.0 + 5.0))                                              # 信号清晰度（降低伪影权重，避免正常噪声直接压到0）
    beginner = max(0, min(100, base_c * 2.0 + cons_c * 5.0 - art_c * 3.0 - int_c * 0.8))              # 入口友好度：保底 8，减少伪影/完整性惩罚
    research = max(5, min(100, snr_c * 3.333 + spec_c * 1.667 + cons_c * 2.0 - drift_c * 1.6))           # 研究可用性
    noise_complexity = max(0, min(100, art_c * 5.25 + int_c * 2.0 + drift_c * 1.2))                      # 噪声复杂度

    return {
        "learning_readability_score": round(reliability, 1),
        "signal_clarity_score": round(clarity, 1),
        "beginner_friendliness_score": round(beginner, 1),
        "research_usefulness_score": round(research, 1),
        "noise_complexity_score": round(noise_complexity, 1),
    }

def _compute_confidence(data: Dict, sq: Any, quality: Dict, lang: str) -> Dict[str, str]:
    s = safe_float(sq, -1)
    reasons = []
    if s < 55: reasons.append(i18n.get_signal_quality_text(lang, "low_signal_quality"))
    if s >= 80: reasons.append(i18n.get_signal_quality_text(lang, "stable_waveform"))
    nc = len(quality.get("noisy_channels") or [])
    if nc > 3: reasons.append(i18n.get_signal_quality_text(lang, "multiple_noisy_channels"))
    if s >= 90: level = "High"
    elif s >= 55: level = "Moderate"
    else: level = "Low"
    return {"level": level, "reason": "; ".join(reasons) or i18n.get_signal_quality_text(lang, "stable_metrics")}

def enhance_analysis(raw: Dict[str, Any], language: str = "zh") -> Dict[str, Any]:
    data = raw
    overview = data.get("overview", data)
    quality = data.get("signal_quality", data)
    raw_bp = data.get("frequency_analysis", {}).get("bandpower") or data.get("bandpower") or {}
    bp_normalized: Dict[str, float] = {}
    if isinstance(raw_bp, dict):
        for std_key, variants in {"delta":["delta"], "theta":["theta"], "alpha":["alpha"], "beta":["beta"]}.items():
            for v in variants:
                if v in raw_bp:
                    bp_normalized[std_key] = safe_float(raw_bp[v])
                    break
    bp_total = sum(bp_normalized.values())
    bp_percent = {k: f"{v/bp_total*100:.1f}%" for k, v in bp_normalized.items()} if bp_total > 0 else {k: "0%" for k in bp_normalized}
    # 频率分布：优先使用后端原始全频谱列表（[{frequency,power}]）；
    # 若该列表缺失/为空，则按频段功率合成（delta/theta/alpha/beta 中心频率），
    # 确保频率分布图始终有数据，不会因旧报告或字段缺失而显示空白。
    _raw_fd = data.get("frequency_analysis", {}).get("frequency_distribution")
    if not isinstance(_raw_fd, list) or len(_raw_fd) == 0:
        _band_centers = {"delta": 2.5, "theta": 6.5, "alpha": 10.0, "beta": 22.0}
        _raw_fd = [
            {"frequency": float(fc), "power": float(safe_float(bp_normalized.get(b, 0.0)))}
            for b, fc in _band_centers.items() if b in bp_normalized
        ]
    frequency_analysis = to_jsonable({
        "bandpower": bp_normalized, "bandpower_percent": bp_percent,
        "dominant_band": _dominant_band(bp_normalized),
        "frequency_distribution": to_jsonable(_raw_fd),
        "frequency_distribution_array": to_jsonable(_raw_fd),
        "average_bandpower": to_jsonable(data.get("frequency_analysis", {}).get("average_bandpower") or bp_normalized),
    })
    literacy_scores = _compute_literacy_scores(data, quality, bp_normalized)
    sq = quality.get("signal_quality_score") or data.get("signal_quality_score")
    _sqf = safe_float(sq)
    sq3 = round(_sqf, 3) if _sqf is not None else None  # 评分源头截位到 3 位小数，前端/存储/AI 全用舍入值
    confidence = _compute_confidence(data, sq, quality, language)
    cannot_tell = to_jsonable(data.get("what_this_data_cannot_tell") or ["智商","性格","心理健康","疾病","情绪","ADHD","抑郁症"])
    return to_jsonable({
        "file_name": overview.get("filename") or data.get("file_name") or "Unknown",
        "channel_count": overview.get("channel_count") or data.get("channel_count") or 0,
        "sampling_rate": overview.get("sampling_rate") or data.get("sampling_rate") or 0,
        "duration": overview.get("duration") or data.get("duration") or "Unknown",
        "channel_names": overview.get("channel_names") or data.get("channel_names") or [],
        "signal_quality_score": sq3,
        "noisy_channels": quality.get("noisy_channels") or [],
        "possible_artifacts": quality.get("possible_artifacts") or [],
        "clipping_detected": quality.get("clipping_detected", False),
        "high_frequency_noise": quality.get("high_frequency_noise", False),
        "bandpower": bp_normalized, "bandpower_percent": bp_percent,
        "frequency_analysis": frequency_analysis,
        "eeg_literacy_scores": literacy_scores,
        "confidence": confidence,
        "limitations": i18n.get_limitations(language),
        "what_this_data_cannot_tell": cannot_tell,
        "waveform_preview": to_jsonable(data.get("waveform_preview", {})),
        "band_waveforms": to_jsonable(data.get("band_waveforms", {})),
        "signal_quality": to_jsonable({
            "signal_quality_score": sq3,
            "noisy_channels": quality.get("noisy_channels") or [],
            "clipping_detected": quality.get("clipping_detected", False),
            "possible_artifacts": quality.get("possible_artifacts") or [],
            "high_frequency_noise": quality.get("high_frequency_noise", False),
            "quality_details": quality.get("quality_details", {}),
        }),
    })


# =================================================================
# Routes
# =================================================================

@app.get("/")
def root():
    return {"success": True, "service": "NeuroAccess Backend", "version": "2.0.0",
            "model": "qwen-2.5-7b-instruct"}

@app.get("/api/health")
@app.get("/health")  # 兼容旧版健康检查
def health():
    try:
        from explanations import call_openrouter
    except Exception:
        return {"success": False, "error": "explanations module failed to import"}
    try:
        test_resp = call_openrouter("ping", timeout=10)
        openrouter_ok = test_resp.get("success") == True
    except Exception:
        openrouter_ok = False
    return {"success": True, "ollama": openrouter_ok, "openrouter": openrouter_ok,
            "analysis_available": analyze_edf is not None}


# 临时：下载样本 EEG 文件（仅 /tmp/eeg_samples/*.edf 和 /tmp/natural_samples.tar.gz）
@app.get("/api/sample-file")
async def sample_file(name: str = "natural_samples.tar.gz"):
    import os
    from fastapi.responses import FileResponse
    # 只允许 /tmp/ 下的文件
    allowed = {"/tmp/natural_samples.tar.gz", "/tmp/eeg_samples/natural_v7.edf", "/tmp/eeg_samples/natural_v9.edf",
               "/tmp/eeg_samples/natural_v10.edf", "/tmp/eeg_samples/natural_v11.edf"}
    for p in allowed:
        if p.endswith(name) and os.path.exists(p):
            return FileResponse(p, filename=os.path.basename(p))
    return {"error": "File not found"}


# =================================================================
# v2.0: /analyze — 快速基础分析（无AI/无PDF/无PNG）
# =================================================================

def require_user_id(request: Request):
    """FastAPI 依赖：认证启用时校验 Bearer token 并返回 user_id；禁用时返回 None（游客可访问）。

    作为依赖注入时会在解析请求体（Form/File/JSON）之前执行，保证未登录请求直接 401。
    采用 request: Request 读取 Authorization 头（而非 Depends(security)），以便在本文件靠前位置定义，
    避免 analyze 端点（定义较早）引用到尚未定义的依赖。
    """
    if not AUTH_AVAILABLE:
        return None
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录后再操作")
    token = auth_header.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录凭证无效")
    try:
        uid = int(payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录凭证无效")
    if not get_user_by_id(uid):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号不存在或已注销")
    return uid


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...), language: str = Form("zh"), current_user_id: int = Depends(require_user_id)):
    """
    快速分析 EDF 文件（v2.0）
    - 不调用 Ollama AI
    - 不生成 PDF
    - 不生成 PNG 波形图
    - 只用前 60s 数据做分析
    - 超时：60s（ThreadPoolExecutor）

    返回：overview + signal_quality + frequency_analysis + waveform_preview
    """
    # ── Auth（AUTH 启用时必须登录；关闭时游客可分析，便于本地开发）──
    # 鉴权由 Depends(require_user_id) 在解析请求体（Form/File）之前完成：无 token/账号已注销 → 401
    
    # ── 保存文件 ─────────────────────────────────────────────────
    lang = normalize_language(language)
    saved = save_upload(file, lang)
    file_path = saved.get("path")
    file_name = saved.get("file_name", "unknown")
    
    if not saved.get("success"):
        return {"success": False, "file_name": file.filename or "unknown",
                "error": saved.get("error", "Unknown error")}
    
    try:
        if analyze_edf is None:
            return {"success": False, "file_name": file_name,
                    "error": f"analyze_edf not available: {ANALYSIS_IMPORT_ERROR}"}
        
        # ── 分析（60s 超时）──────────────────────────────────────
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(analyze_edf, file_path, lang)
            try:
                raw_result = future.result(timeout=60)
            except concurrent.futures.TimeoutError:
                return {"success": False, "file_name": file_name,
                        "error": "Analysis timed out (60s). File may be too large or corrupted."}
        
        # ── 增强输出 ─────────────────────────────────────────────
        enhanced = enhance_analysis(raw_result, lang)
        
        # ── 模板解释（立即可用）──────────────────────────────────
        template_explanations = {
            lang: {"beginner": template_beginner(enhanced, lang),
                   "student": template_student(enhanced, lang),
                   "research": template_research(enhanced, lang)},
            "en": {"beginner": template_beginner(enhanced, "en"),
                   "student": template_student(enhanced, "en"),
                   "research": template_research(enhanced, "en")},
        }
        
        # ── 生成 analysis_id（供 /explain 轮询）──────────────────
        analysis_id = hashlib.md5((file_path + str(_time.time())).encode()).hexdigest()[:12]
        _cache_explanations(analysis_id, {"explanations": None, "ready": False})
        
        # ── 后台异步生成 AI 解释 ─────────────────────────────────
        threading.Thread(target=_bg_generate_explanations,
                        args=(analysis_id, enhanced, lang), daemon=True).start()
        
        analysis_out = {
            **enhanced,
            "explanations": template_explanations,
            "analysis_id": analysis_id,
            "disclaimer": {
                "zh": "本报告仅用于 EEG 科普教育。不构成医疗建议、诊断或治疗推荐。EEG 数据不能单独用于诊断任何疾病。如有健康问题，请咨询专业医生。",
                "en": "This report is for EEG educational purposes only. It does not constitute medical advice, diagnosis, or treatment recommendations. EEG data alone cannot diagnose any disease. For health concerns, consult a qualified physician."
            },
            "file_size_mb": saved.get("file_size_mb", 0) or raw_result.get("file_size_mb", 0),
        }
        
        return {"success": True, "file_name": file_name, "analysis": analysis_out}
        
    except ValueError as e:
        return {"success": False, "file_name": file_name, "error": str(e)}
    except Exception as e:
        import traceback
        return {"success": False, "file_name": file_name,
                "error": f"Internal server error: {str(e)}",
                "detail": traceback.format_exc() if os.getenv("DEBUG") else "Enable DEBUG=1 for details"}
    finally:
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass


# =================================================================
# v2.0: /explain — AI 解释（前端收到基础分析后再调用）
# =================================================================

@app.post("/api/explain")
async def explain(request: Request):
    """
    为已有分析结果生成 AI 解释（Ollama 三路并行）
    
    输入 JSON:
        {"analysis": {...}, "language": "zh"}
    
    返回:
        {"success": true, "explanations": {"zh": {"beginner": "...", "student": "...", "research": "..."}, "en": {...}}}
    
    超时: 180s
    """
    try:
        body = await request.json()
    except Exception:
        return {"success": False, "error": "Invalid JSON body"}
    
    analysis_data = body.get("analysis", {})
    language = normalize_language(body.get("language", "zh"))
    
    if not analysis_data:
        return {"success": False, "error": "Missing 'analysis' field"}
    
    # ── 180s 超时解析（Ollama 较慢时用）───────────────────────
    with concurrent.futures.ThreadPoolExecutor() as pool:
        future = pool.submit(generate_explanations, analysis_data, language)
        try:
            explanations = future.result(timeout=180)
        except concurrent.futures.TimeoutError:
            # 超时时用模板解释兜底
            explanations = {
                language: {
                    "beginner": template_beginner(analysis_data, language),
                    "student": template_student(analysis_data, language),
                    "research": template_research(analysis_data, language),
                },
                "en": {
                    "beginner": template_beginner(analysis_data, "en"),
                    "student": template_student(analysis_data, "en"),
                    "research": template_research(analysis_data, "en"),
                }
            }
            return {"success": True, "explanations": explanations,
                    "warning": "AI explanation timed out. Template explanations used instead."}
    
    return {"success": True, "explanations": explanations}


# =================================================================
# AI 解释轮询端点（兼容旧版 polling 方式）
# =================================================================

@app.get("/api/analysis/explanations/{analysis_id}")
async def get_explanations(analysis_id: str):
    cached = _EXPLANATIONS_CACHE.get(analysis_id)
    if cached is None:
        # 重启后内存缓存为空 → 从磁盘恢复
        _load_explanations_cache_from_disk()
        cached = _EXPLANATIONS_CACHE.get(analysis_id)
    if cached is None:
        return {"success": False, "error": "Unknown analysis_id"}
    if cached.get("ready"):
        return {"success": True, "explanations": cached.get("explanations"),
                "error": cached.get("error")}
    return {"success": True, "explanations": None}


# =================================================================
# v2.0: /export-pdf — 按需 PDF 生成
# =================================================================

@app.post("/api/export-pdf")
async def export_pdf(request: Request):
    """按需生成 PDF 报告（用户点击 Export PDF 时调用）"""
    try:
        body = await request.json()
    except Exception:
        return {"success": False, "error": "Invalid JSON body"}
    
    analysis_data = body.get("analysis", {})
    language = body.get("language", "zh")
    
    if not analysis_data:
        return {"success": False, "error": "Missing 'analysis' field"}
    
    # ── 使用模板解释生成 PDF（不调 Ollama）────────────────────
    try:
        t_beginner = template_beginner(analysis_data, language)
        t_student = template_student(analysis_data, language)
        t_research = template_research(analysis_data, language)
    except Exception:
        t_beginner = "EEG analysis report"
        t_student = "See details in the app."
        t_research = "See details in the app."
    
    # ── 生成简化 PDF ────────────────────────────────────────────
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas as pdf_canvas
        from reportlab.lib.units import mm
        import io
        import base64
        
        buf = io.BytesIO()
        c = pdf_canvas.Canvas(buf, pagesize=A4)
        width, height = A4
        y = height - 30 * mm
        
        c.setFont("Helvetica-Bold", 16)
        c.drawString(20 * mm, y, f"NeuroAccess EEG Report — {analysis_data.get('file_name', 'Unknown')}")
        y -= 25
        
        c.setFont("Helvetica", 10)
        c.drawString(20 * mm, y, f"Date: {analysis_data.get('date', 'N/A')}  |  Quality: {analysis_data.get('signal_quality_score', 'N/A')}")
        y -= 20
        
        c.setFont("Helvetica-Bold", 12)
        c.drawString(20 * mm, y, "Beginner Explanation")
        y -= 16
        c.setFont("Helvetica", 9)
        for line in t_beginner.split("\n")[:15]:
            c.drawString(22 * mm, y, line[:120])
            y -= 12
            if y < 30 * mm:
                c.showPage()
                y = height - 30 * mm
                c.setFont("Helvetica", 9)
        
        y -= 15
        c.setFont("Helvetica-Bold", 12)
        c.drawString(20 * mm, y, "Student Explanation")
        y -= 16
        c.setFont("Helvetica", 9)
        for line in t_student.split("\n")[:15]:
            c.drawString(22 * mm, y, line[:120])
            y -= 12
            if y < 30 * mm:
                c.showPage()
                y = height - 30 * mm
                c.setFont("Helvetica", 9)
        
        c.showPage()
        c.save()
        buf.seek(0)
        pdf_b64 = base64.b64encode(buf.read()).decode('utf-8')
        
        return {"success": True, "pdf_base64": pdf_b64, "filename": f"{analysis_data.get('file_name', 'report')}.pdf"}
        
    except ImportError:
        return {"success": False, "error": "PDF generation library (reportlab) not installed"}
    except Exception as e:
        return {"success": False, "error": f"PDF generation failed: {str(e)}"}


# =================================================================
# EEG Viewer (保持不变)
# =================================================================

@app.post("/api/eeg/viewer")
async def eeg_viewer(request: Request, file: UploadFile = File(...), duration: float = Form(30.0)):
    file_path = None
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return {"success": False, "error": "请先登录"}
        token = auth_header.split(" ", 1)[1]
        if not AUTH_AVAILABLE:
            return {"success": False, "error": "认证模块不可用"}
        payload = verify_token(token)
        if not payload:
            return {"success": False, "error": "登录凭证已过期，请重新登录"}

        saved = save_upload(file, lang)
        if not saved.get("success"):
            return {"success": False, "error": saved.get("error", "文件上传失败")}
        file_path = saved["path"]
        file_name = saved.get("file_name", "unknown")

        # 格式无关加载（EDF/BDF/GDF），统一转为 μV
        from analysis import _load_raw_any, _raw_to_uv, _pick_eeg_channels, MAX_PREVIEW_CHANNELS
        raw = _load_raw_any(file_path, preload=True)

        # Select EEG channels（支持 256 导联帽）
        picks = _pick_eeg_channels(raw, max_channels=MAX_PREVIEW_CHANNELS)
        raw.pick(picks)
        ch_names = [raw.ch_names[i] for i in range(len(raw.ch_names))]
        n_ch = len(ch_names)

        sfreq = float(raw.info['sfreq'])
        total_duration = raw.times[-1] if len(raw.times) > 0 else 0
        n_samples = min(int(sfreq * duration), raw.n_times)

        # 统一转 μV（GDF 已为 μV，MNE EDF/BDF 为 V → ×1e6 已在 _raw_to_uv 内处理）
        data_uv = _raw_to_uv(raw, start=0, stop=n_samples)  # shape (n_ch, n_samples)
        times = raw.times[:n_samples]

        max_points = 8000
        if len(times) > max_points:
            step = len(times) // max_points
            data_uv = data_uv[:, ::step]
            times = times[::step]

        channels_data = {}
        for i, ch_name in enumerate(ch_names):
            channels_data[ch_name] = data_uv[i].tolist()
        
        return to_jsonable({
            "success": True, "file_name": file_name,
            "channel_names": ch_names, "sampling_rate": round(sfreq, 2),
            "duration_seconds": round(total_duration, 2),
            "times": times.tolist(), "channels": channels_data,
            "total_channels": len(ch_names), "total_samples": n_samples,
        })
    except Exception as e:
        import traceback
        return {"success": False, "error": f"EEG 数据处理失败: {str(e)}",
                "detail": traceback.format_exc() if os.getenv("DEBUG") else "Enable DEBUG=1 for details"}
    finally:
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass


# =================================================================
# Debug waveform endpoint
# =================================================================

@app.post("/api/debug/waveform")
async def debug_waveform(request: Request, file: Optional[UploadFile] = File(None),
                          duration: float = Form(10.0)):
    # Require authentication
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"success": False, "error": "Authentication required"}
    token = auth_header.split(" ", 1)[1]
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "Auth module not available"}
    payload = verify_token(token)
    if not payload:
        return {"success": False, "error": "Invalid or expired token"}

    if file is None:
        return {"success": False, "error": "Provide 'file' (upload)"}

    saved = save_upload(file)
    if not saved.get("success"):
        return {"success": False, "error": saved.get("error", "Upload failed")}
    file_path = saved["path"]
    file_name = saved.get("file_name", "unknown")

    try:
        from analysis import fast_preview_window
        waveform = fast_preview_window(file_path, duration_sec=duration)
        return {"success": True, "file_name": file_name, **waveform}
    except Exception as e:
        import traceback
        return {"success": False, "error": str(e),
                "detail": traceback.format_exc() if os.getenv("DEBUG") else "Enable DEBUG=1 for details"}
    finally:
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass


# =================================================================
# Auth routes (保持不变)
# =================================================================

try:
    from auth import (
        create_user, authenticate_user, create_access_token, verify_token, get_user_by_id,
        generate_verification_code, verify_verification_code, update_password, update_email,
        delete_user, get_db,
        accept_terms, check_username_setup,
        get_user_by_phone, create_user_with_phone, authenticate_by_phone, update_phone,
    )
    AUTH_AVAILABLE = True
except Exception as _auth_e:
    AUTH_AVAILABLE = False
    AUTH_IMPORT_ERROR = str(_auth_e)

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

# ── 简单数学验证码（替换 Cloudflare Turnstile）─────────────────
import random as _random, secrets as _secrets, time as _time_captcha

_CAPTCHA_STORE: Dict[str, dict] = {}  # qid -> {answer, created}

@app.post("/api/auth/captcha")
def captcha_generate():
    """生成数学验证码问题"""
    a, b = _random.randint(1, 20), _random.randint(1, 20)
    ops = ["+", "-", "×"]
    op = _random.choice(ops)
    if op == "+":
        result = a + b
        q = f"{a} + {b}"
    elif op == "-":
        result = a - b
        q = f"{a} - {b}"
    else:
        result = a * b
        q = f"{a} × {b}"
    qid = _secrets.token_hex(8)
    _CAPTCHA_STORE[qid] = {"answer": result, "created": _time_captcha.time()}
    # 清理超过 5 分钟的旧记录
    now = _time_captcha.time()
    for k in list(_CAPTCHA_STORE.keys()):
        if now - _CAPTCHA_STORE[k]["created"] > 300:
            del _CAPTCHA_STORE[k]
    return {"qid": qid, "question": q}

@app.post("/api/auth/captcha/verify")
def captcha_verify(qid: str = Form(...), answer: str = Form(...)):
    """验证数学验证码答案，成功返回 token"""
    record = _CAPTCHA_STORE.get(qid)
    if not record:
        return {"success": False, "error": "验证已过期，请重新获取"}
    now = _time_captcha.time()
    if now - record["created"] > 300:
        del _CAPTCHA_STORE[qid]
        return {"success": False, "error": "验证已过期，请重新获取"}
    try:
        if int(answer) == record["answer"]:
            del _CAPTCHA_STORE[qid]
            # 生成一个一次性验证 token（用于后端防重放）
            token = _secrets.token_hex(16)
            return {"success": True, "token": token}
    except ValueError:
        pass
    return {"success": False, "error": "答案错误"}

# ── Cloudflare Turnstile 人机验证（已弃用，保留兼容）─────────
TURNSTILE_SECRET_KEY = os.environ.get("TURNSTILE_SECRET_KEY", "")

def verify_turnstile(token: str) -> bool:
    """验证 Turnstile 令牌。未配置密钥时跳过验证（开发模式）。"""
    if not TURNSTILE_SECRET_KEY:
        return True  # 未配置密钥，跳过验证（本地开发/测试）
    if not token:
        return False
    import urllib.request, urllib.parse
    try:
        data = urllib.parse.urlencode({
            "secret": TURNSTILE_SECRET_KEY,
            "response": token,
        }).encode()
        req = urllib.request.Request(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            result = json.loads(resp.read().decode())
            return bool(result.get("success", False))
    except Exception:
        return False

@app.post("/api/auth/register")
def auth_register(username: str = Form(...), email: str = Form(...),
                  password: str = Form(...), code: str = Form(...),
                  cf_turnstile_response: str = Form("")):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": f"认证模块不可用: {AUTH_IMPORT_ERROR}"}
    # 先验证注册验证码（不管 Turnstile）
    if not verify_registration_code(email, code):
        return {"success": False, "error": "验证码无效或已过期"}
    # 验证码正确 → 需要人机验证
    if not verify_turnstile(cf_turnstile_response):
        return {"success": False, "needsCaptcha": True, "error": "请完成人机验证"}
    try:
        user = create_user(username, email, password)
        token = create_access_token({"sub": str(user["id"]), "username": user["username"]})
        return {"success": True, "token": token, "user": {"id": user["id"], "username": user["username"],
                "email": user["email"], "phone": user.get("phone", ""),
                "avatar_url": user.get("avatar_url", ""), "avatar_color": user.get("avatar_color", "blue")}}
    except ValueError as e:
        return {"success": False, "error": str(e)}

@app.post("/api/auth/login")
def auth_login(username_or_email: str = Form(...), password: str = Form(...),
               cf_turnstile_response: str = Form("")):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": f"认证模块不可用: {AUTH_IMPORT_ERROR}"}
    # 先验证账号密码（不管 Turnstile）
    try:
        user = authenticate_user(username_or_email, password)
    except PermissionError as e:
        return {"success": False, "error": str(e)}
    if not user:
        return {"success": False, "error": "用户名或密码错误"}
    # 密码正确 → 需要人机验证
    if not verify_turnstile(cf_turnstile_response):
        return {"success": False, "needsCaptcha": True, "error": "请完成人机验证"}
    token = create_access_token({"sub": str(user["id"]), "username": user["username"]})
    terms_accepted = user.get("terms_accepted", 0)
    needs_username_setup = (user["username"] == "User" or user["username"].strip() == "")
    return {"success": True, "token": token, "terms_accepted": bool(terms_accepted),
            "needs_username_setup": needs_username_setup,
            "user": {"id": user["id"], "username": user["username"], "email": user["email"],
                     "phone": user.get("phone", ""), "avatar_url": user.get("avatar_url", ""),
                     "avatar_color": user.get("avatar_color", "blue")}}

@app.post("/api/auth/send-login-code")
def auth_send_login_code(email: str = Form(...)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": f"认证模块不可用: {AUTH_IMPORT_ERROR}"}
    # 内存级防重：同一邮箱 3 秒内只发一次
    if not _check_code_rate_limit(f"login:{email}", 3):
        return {"success": False, "error": "操作过于频繁，请3秒后再试"}
    try:
        from auth import get_user_by_email
        user = get_user_by_email(email)
        if not user:
            return {"success": False, "error": "该邮箱未注册"}
        conn = get_db()
        try:
            has_active, remaining = _has_active_code(conn, email=email, purpose="login")
        finally:
            conn.close()
        if has_active:
            return {"success": False, "error": f"已有验证码，请等待{remaining}秒后再试"}
        code = generate_verification_code(email=email, purpose="login")
        email_sent = send_verification_email(email, code, purpose="login")
        result = {"success": True, "expires_in": 600}
        if email_sent == "sent":
            result["message"] = "Verification code sent"
        else:
            result["message"] = "Verification code (email not configured)" if email_sent == "not_configured" else "Verification code (email send failed, please retry)"
            if os.getenv("DEBUG", "").lower() in ("1", "true", "yes"):
                result["dev_code"] = code
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/auth/login-with-code")
def auth_login_with_code(email: str = Form(...), code: str = Form(...),
                         cf_turnstile_response: str = Form("")):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": f"认证模块不可用: {AUTH_IMPORT_ERROR}"}
    try:
        from auth import get_user_by_email
        if not verify_verification_code(email=email, code=code, purpose="login"):
            return {"success": False, "error": "验证码无效或已过期"}
        user = get_user_by_email(email)
        if not user:
            return {"success": False, "error": "账号不存在"}
        # 验证码正确 → 需要人机验证
        if not verify_turnstile(cf_turnstile_response):
            return {"success": False, "needsCaptcha": True, "error": "请完成人机验证"}
        token = create_access_token({"sub": str(user["id"]), "username": user["username"]})
        terms_accepted = user.get("terms_accepted", 0)
        needs_username_setup = (user["username"] == "User" or user["username"].strip() == "")
        return {"success": True, "token": token, "terms_accepted": bool(terms_accepted),
                "needs_username_setup": needs_username_setup,
                "user": {"id": user["id"], "username": user["username"], "email": user["email"],
                         "phone": user.get("phone", ""), "avatar_url": user.get("avatar_url", ""),
                         "avatar_color": user.get("avatar_color", "blue")}}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/auth/me")
def auth_me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "认证模块不可用"}
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录凭证无效")
    user = get_user_by_id(int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return {"success": True, "user": {"id": user["id"], "username": user["username"],
            "email": user["email"], "phone": user.get("phone", ""),
            "avatar_url": user.get("avatar_url", ""), "avatar_color": user.get("avatar_color", "blue"),
            "terms_accepted": user.get("terms_accepted", 0)}}

@app.post("/api/auth/logout")
def auth_logout():
    return {"success": True, "message": "Logged out"}

@app.post("/api/auth/accept-terms")
def auth_accept_terms(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "认证模块不可用"}
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录凭证无效")
    user_id = int(payload["sub"])
    accepted = accept_terms(user_id)
    if accepted:
        return {"success": True, "message": "Terms accepted"}
    return {"success": False, "error": "Failed to accept terms"}

def send_verification_email(to_email: str, code: str, purpose: str = "password_change") -> str:
    """Send verification email. Returns 'sent' | 'not_configured' | 'failed'."""
    import os as _os, smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    smtp_host = _os.getenv("SMTP_HOST", "")
    smtp_port = int(_os.getenv("SMTP_PORT", "587"))
    smtp_username = _os.getenv("SMTP_USERNAME", "")
    smtp_password = _os.getenv("SMTP_PASSWORD", "")
    smtp_from = _os.getenv("SMTP_FROM", "")
    if purpose == "register":
        subject = "NeuroAccess - 注册验证码"
        html = f"""<html><body style="font-family:Arial,sans-serif"><h2 style="color:#3B82F6">NeuroAccess 注册验证码</h2><p>您的验证码是：</p><div style="background:#f0f9ff;border:2px solid #3B82F6;border-radius:8px;padding:20px;text-align:center;margin:20px 0"><span style="font-size:32px;font-weight:bold;color:#3B82F6;letter-spacing:8px">{code}</span></div><p>10分钟后过期。</p></body></html>"""
    elif purpose == "email_change":
        subject = "NeuroAccess - 邮箱变更验证码"
        html = f"""<html><body style="font-family:Arial,sans-serif"><h2 style="color:#3B82F6">NeuroAccess 邮箱变更验证码</h2><p>您的验证码是：</p><div style="background:#f0f9ff;border:2px solid #3B82F6;border-radius:8px;padding:20px;text-align:center;margin:20px 0"><span style="font-size:32px;font-weight:bold;color:#3B82F6;letter-spacing:8px">{code}</span></div><p>10分钟后过期。</p></body></html>"""
    elif purpose == "delete_account":
        subject = "NeuroAccess - 注销账号验证码"
        html = f"""<html><body style="font-family:Arial,sans-serif"><h2 style="color:#DC2626">NeuroAccess 注销账号验证码</h2><p>此操作不可撤销！您的验证码是：</p><div style="background:#fef2f2;border:2px solid #DC2626;border-radius:8px;padding:20px;text-align:center;margin:20px 0"><span style="font-size:32px;font-weight:bold;color:#DC2626;letter-spacing:8px">{code}</span></div><p>10分钟后过期。</p></body></html>"""
    else:
        subject = "NeuroAccess - 密码修改验证码"
        html = f"""<html><body style="font-family:Arial,sans-serif"><h2 style="color:#3B82F6">NeuroAccess 验证码</h2><p>您的验证码是：</p><div style="background:#f0f9ff;border:2px solid #3B82F6;border-radius:8px;padding:20px;text-align:center;margin:20px 0"><span style="font-size:32px;font-weight:bold;color:#3B82F6;letter-spacing:8px">{code}</span></div><p>10分钟后过期。</p></body></html>"""
    if os.getenv("DEBUG", "").lower() in ("1", "true", "yes"):
        print(f"[Email] SMTP: host={smtp_host!r} port={smtp_port} user={smtp_username!r}")
    if not (smtp_host and smtp_username and smtp_password):
        print("[Email] SMTP not configured (missing env)")
        return "not_configured"
    try:
        msg = MIMEMultipart()
        msg["From"] = smtp_from
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html, "html", "utf-8"))
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.sendmail(smtp_from, [to_email], msg.as_string())
        server.quit()
        print(f"[Email] SMTP success: {to_email}")
        return "sent"
    except Exception as e:
        print(f"[Email] SMTP failed: {e}")
        return "failed"

def _has_active_code(conn, user_id=None, email=None, purpose=None):
    from datetime import datetime as _dt, timezone as _tz
    try:
        if user_id:
            if purpose:
                row = conn.execute("SELECT created_at,expires_at FROM verification_codes WHERE user_id=? AND purpose=? AND used=0 ORDER BY created_at DESC LIMIT 1", (user_id, purpose)).fetchone()
            else:
                row = conn.execute("SELECT created_at,expires_at FROM verification_codes WHERE user_id=? AND used=0 ORDER BY created_at DESC LIMIT 1", (user_id,)).fetchone()
        else:
            if purpose:
                row = conn.execute("SELECT created_at,expires_at FROM verification_codes WHERE email=? AND purpose=? AND used=0 ORDER BY created_at DESC LIMIT 1", (email, purpose)).fetchone()
            else:
                row = conn.execute("SELECT created_at,expires_at FROM verification_codes WHERE email=? AND used=0 ORDER BY created_at DESC LIMIT 1", (email,)).fetchone()
        if not row or not row["created_at"]:
            return False, 0
        last_created = _dt.fromisoformat(row["created_at"])
        expires_at = _dt.fromisoformat(row["expires_at"])
        # SQLite CURRENT_TIMESTAMP 是 naive UTC；统一补 tzinfo 再与 aware now 比较，
        # 否则 aware - naive 抛 TypeError 被 except 吞掉 → 60 秒拦截永远失效
        if last_created.tzinfo is None:
            last_created = last_created.replace(tzinfo=_tz.utc)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=_tz.utc)
        now = _dt.now(_tz.utc)
        if now >= expires_at:
            return False, 0
        elapsed = (now - last_created).total_seconds()
        if elapsed < 60:
            return True, int(60 - elapsed)
        return False, 0
    except Exception:
        return False, 0

@app.post("/api/auth/register-verification-code")
def auth_register_verification_code(email: str = Form(...)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "认证模块不可用"}
    # 内存级防重：同一邮箱 3 秒内只发一次
    if not _check_code_rate_limit(f"register:{email}", 3):
        return {"success": False, "error": "操作过于频繁，请3秒后再试"}
    # Single transaction with IMMEDIATE lock to prevent race condition
    conn = get_db()
    try:
        conn.execute("BEGIN IMMEDIATE")
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email=?", (email,))
        if cur.fetchone():
            return {"success": False, "error": "邮箱已被注册"}
        # Rate limit check inside same transaction
        has_active, remaining = _has_active_code(conn, email=email, purpose="register")
        if has_active:
            return {"success": False, "error": f"已有验证码，请等待{remaining}秒后再试"}
        conn.commit()
    except Exception as e:
        conn.close()
        return {"success": False, "error": "数据库错误"}
    conn.close()
    try:
        code = generate_verification_code(email=email, purpose="register")
    except Exception as e:
        return {"success": False, "error": f"生成验证码失败: {e}"}
    email_sent = send_verification_email(email, code, purpose="register")
    result = {"success": True, "expires_in": 600}
    if email_sent == "sent":
        result["message"] = "Verification code sent"
    else:
        result["message"] = "Verification code (email not configured)" if email_sent == "not_configured" else "Verification code (email send failed, please retry)"
        if os.getenv("DEBUG", "").lower() in ("1", "true", "yes"):
            result["dev_code"] = code
    return result

def verify_registration_code(email: str, code: str) -> bool:
    return verify_verification_code(email=email, code=code, purpose="register")

@app.post("/api/auth/verification-code")
def auth_verification_code(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "认证模块不可用"}
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录凭证无效")
    user_id = int(payload["sub"])
    # 内存级防重：同一用户 3 秒内只发一次
    if not _check_code_rate_limit(f"password_change:{user_id}", 3):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="操作过于频繁，请3秒后再试")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    conn = get_db()
    try:
        has_active, remaining = _has_active_code(conn, user_id=user_id, purpose="password_change")
    finally:
        conn.close()
    if has_active:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"已有验证码，请等待{remaining}秒后再试")
    conn = get_db()
    try:
        row = conn.execute("SELECT created_at FROM verification_codes WHERE user_id=? AND purpose=? AND used=0 ORDER BY created_at DESC LIMIT 1", (user_id, "password_change")).fetchone()
        if row and row["created_at"]:
            from datetime import datetime as _dt
            _last = _dt.fromisoformat(row["created_at"])
            if _last.tzinfo is None:
                _last = _last.replace(tzinfo=_tz.utc)
            elapsed = (_dt.now(_tz.utc) - _last).total_seconds()
            if elapsed < 60:
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"请等待{int(60-elapsed)}秒后再获取验证码")
    finally:
        conn.close()
    code = generate_verification_code(user_id, purpose="password_change")
    email_sent = send_verification_email(user["email"], code)
    result = {"success": True, "expires_in": 600}
    if email_sent == "sent":
        result["message"] = "Verification code sent"
    else:
        result["message"] = "Verification code generated"
        if os.getenv("DEBUG") == "1":
            result["dev_code"] = code
    return result

@app.post("/api/auth/change-password")
def auth_change_password(credentials: HTTPAuthorizationCredentials = Depends(security), verification_code: str = Form(...), new_password: str = Form(...)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "认证模块不可用"}
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录凭证无效")
    user_id = int(payload["sub"])
    if not verify_verification_code(user_id=user_id, code=verification_code, purpose="password_change"):
        return {"success": False, "error": "验证码无效或已过期"}
    try:
        updated = update_password(user_id, new_password)
        if updated:
            return {"success": True, "message": "Password updated"}
        return {"success": False, "error": "密码更新失败"}
    except ValueError as e:
        return {"success": False, "error": str(e)}

@app.post("/api/auth/send-old-email-code")
def auth_send_old_email_code(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "认证模块不可用"}
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录凭证无效")
    user_id = int(payload["sub"])
    # 内存级防重：同一用户 3 秒内只发一次
    if not _check_code_rate_limit(f"old_email_verify:{user_id}", 3):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="操作过于频繁，请3秒后再试")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    conn = get_db()
    try:
        has_active, remaining = _has_active_code(conn, user_id=user_id, purpose="old_email_verify")
    finally:
        conn.close()
    if has_active:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"已有验证码，请等待{remaining}秒后再试")
    code = generate_verification_code(user_id, purpose="old_email_verify")
    email_sent = send_verification_email(user["email"], code, purpose="old_email_verify")
    result = {"success": True, "expires_in": 600}
    if email_sent == "sent":
        result["message"] = "Verification code sent to current email"
    else:
        result["message"] = "Verification code (email not configured)" if email_sent == "not_configured" else "Verification code (email send failed, please retry)"
        if os.getenv("DEBUG", "").lower() in ("1", "true", "yes"):
            result["dev_code"] = code
    return result

@app.post("/api/auth/verify-old-email")
def auth_verify_old_email(credentials: HTTPAuthorizationCredentials = Depends(security), code: str = Form(...)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "认证模块不可用"}
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录凭证无效")
    user_id = int(payload["sub"])
    if not verify_verification_code(user_id=user_id, code=code, purpose="old_email_verify"):
        return {"success": False, "error": "验证码无效或已过期"}
    return {"success": True, "message": "Old email verified"}

@app.post("/api/auth/send-email-change-code")
def auth_send_email_change_code(credentials: HTTPAuthorizationCredentials = Depends(security), new_email: str = Form(...)):
    import re
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "认证模块不可用"}
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录凭证无效")
    user_id = int(payload["sub"])
    # 内存级防重：同一用户 3 秒内只发一次
    if not _check_code_rate_limit(f"email_change:{user_id}", 3):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="操作过于频繁，请3秒后再试")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not re.match(r"^[^@]+@[^@]+\.[^@]+$", new_email):
        return {"success": False, "error": "邮箱格式无效"}
    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM users WHERE email=?", (new_email,)).fetchone()
        if existing:
            conn.close(); return {"success": False, "error": "邮箱已被注册"}
        conn.close()
    except Exception:
        conn.close()
    conn = get_db()
    try:
        has_active, remaining = _has_active_code(conn, user_id=user_id)
    finally:
        conn.close()
    if has_active:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"已有验证码，请等待{remaining}秒后再试")
    conn = get_db()
    try:
        row = conn.execute("SELECT created_at FROM verification_codes WHERE user_id=? AND purpose=? AND used=0 ORDER BY created_at DESC LIMIT 1", (user_id, f"email_change:{new_email}")).fetchone()
        if row and row["created_at"]:
            from datetime import datetime as _dt
            _last = _dt.fromisoformat(row["created_at"])
            if _last.tzinfo is None:
                _last = _last.replace(tzinfo=_tz.utc)
            elapsed = (_dt.now(_tz.utc) - _last).total_seconds()
            if elapsed < 60:
                conn.close()
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"请等待{int(60-elapsed)}秒后再获取验证码")
        conn.close()
    except HTTPException:
        raise
    except Exception:
        conn.close()
    code = generate_verification_code(user_id, purpose=f"email_change:{new_email}")
    email_sent = send_verification_email(new_email, code, purpose="email_change")
    result = {"success": True, "expires_in": 600}
    if email_sent == "sent":
        result["message"] = "Verification code sent"
    else:
        result["message"] = "Verification code generated"
        if os.getenv("DEBUG") == "1":
            result["dev_code"] = code
    return result

@app.post("/api/auth/confirm-email-change")
def auth_confirm_email_change(credentials: HTTPAuthorizationCredentials = Depends(security), verification_code: str = Form(...), new_email: str = Form(...)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "认证模块不可用"}
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录凭证无效")
    user_id = int(payload["sub"])
    if not verify_verification_code(user_id=user_id, code=verification_code, purpose=f"email_change:{new_email}"):
        return {"success": False, "error": "验证码无效或已过期"}
    updated = update_email(user_id, new_email)
    if updated:
        updated_user = get_user_by_id(user_id)
        return {"success": True, "message": "Email updated", "user": {"id": updated_user["id"], "username": updated_user["username"], "email": updated_user["email"], "avatar_url": updated_user.get("avatar_url", ""), "avatar_color": updated_user.get("avatar_color", "blue")}}
    return {"success": False, "error": "邮箱更新失败"}

@app.post("/api/auth/send-delete-account-code")
def auth_send_delete_account_code(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "认证模块不可用"}
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录凭证无效")
    user_id = int(payload["sub"])
    # 内存级防重：同一用户 3 秒内只发一次
    if not _check_code_rate_limit(f"delete_account:{user_id}", 3):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="操作过于频繁，请3秒后再试")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    conn = get_db()
    try:
        has_active, remaining = _has_active_code(conn, user_id=user_id, purpose="delete_account")
    finally:
        conn.close()
    if has_active:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"已有验证码，请等待{remaining}秒后再试")
    conn = get_db()
    try:
        row = conn.execute("SELECT created_at FROM verification_codes WHERE user_id=? AND purpose=? AND used=0 ORDER BY created_at DESC LIMIT 1", (user_id, "delete_account")).fetchone()
        if row and row["created_at"]:
            from datetime import datetime as _dt
            _last = _dt.fromisoformat(row["created_at"])
            if _last.tzinfo is None:
                _last = _last.replace(tzinfo=_tz.utc)
            elapsed = (_dt.now(_tz.utc) - _last).total_seconds()
            if elapsed < 60:
                conn.close()
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"请等待{int(60-elapsed)}秒后再获取验证码")
        conn.close()
    except HTTPException:
        raise
    except Exception:
        conn.close()
    code = generate_verification_code(user_id, purpose="delete_account")
    email_sent = send_verification_email(user["email"], code, purpose="delete_account")
    result = {"success": True, "expires_in": 600}
    if email_sent == "sent":
        result["message"] = "Verification code sent"
    else:
        result["message"] = "Verification code generated"
        if os.getenv("DEBUG") == "1":
            result["dev_code"] = code
    return result

@app.post("/api/auth/confirm-delete-account")
def auth_confirm_delete_account(credentials: HTTPAuthorizationCredentials = Depends(security), verification_code: str = Form(...)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "认证模块不可用"}
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录凭证无效")
    user_id = int(payload["sub"])
    if not verify_verification_code(user_id=user_id, code=verification_code, purpose="delete_account"):
        return {"success": False, "error": "验证码无效或已过期"}
    deleted = delete_user(user_id)
    if deleted:
        return {"success": True, "message": "Account deleted"}
    return {"success": False, "error": "账号删除失败"}

@app.put("/api/auth/profile")
async def auth_update_profile(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "认证模块不可用"}
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录凭证无效")
    user_id = int(payload["sub"])
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        body = await request.json()
    except Exception:
        body = {}
    username = body.get("username", "").strip()
    avatar_url = body.get("avatar_url", "").strip()
    avatar_color = body.get("avatar_color", "").strip()
    # 头像颜色白名单（与前端 src/app/account/page.tsx AVATAR_COLORS 保持一致）
    ALLOWED_AVATAR_COLORS = {"#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6"}
    # 兼容数据库旧默认值 'blue' → 归一化为色板蓝色，避免新用户无法保存资料
    if avatar_color == "blue":
        avatar_color = "#3B82F6"
    if username is not None and username != "":
        sys.path.insert(0, BASE_DIR)
        from auth import _visual_length, _is_unicode_letter_start, _has_special_symbol
        vlen = _visual_length(username)
        if vlen < 2 or vlen > 20:
            return {"success": False, "error": "名字长度必须在2-20个字符之间"}
        if not _is_unicode_letter_start(username):
            return {"success": False, "error": "名字开头必须是文字"}
        if _has_special_symbol(username):
            return {"success": False, "error": "名字不能包含特殊符号"}
        import re as _re
        if _re.search(r"\s{2,}", username):
            return {"success": False, "error": "名字中不能有连续空格"}
    if avatar_color and avatar_color not in ALLOWED_AVATAR_COLORS:
        return {"success": False, "error": "头像颜色无效"}
    conn = get_db()
    try:
        if username and username != user["username"]:
            existing = conn.execute("SELECT id FROM users WHERE username=? AND id!=?", (username, user_id)).fetchone()
            if existing:
                conn.close(); return {"success": False, "error": "Username already taken"}
            conn.execute("UPDATE users SET username=? WHERE id=?", (username, user_id))
        conn.execute("UPDATE users SET avatar_url=?, avatar_color=? WHERE id=?", (avatar_url, avatar_color, user_id))
        conn.commit()
    except Exception as e:
        conn.close(); return {"success": False, "error": str(e)}
    conn.close()
    updated_user = get_user_by_id(user_id)
    return {"success": True, "user": {"id": updated_user["id"], "username": updated_user["username"], "email": updated_user["email"], "phone": updated_user.get("phone", ""), "avatar_url": updated_user.get("avatar_url", ""), "avatar_color": updated_user.get("avatar_color", "blue")}}


# =================================================================
# Feedback
# =================================================================

@app.post("/api/feedback")
async def submit_feedback(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    name = body.get("name", "")
    email = body.get("email", "")
    type_ = body.get("type", "")
    message = body.get("message", "")
    rating = body.get("rating", "")
    # 限制字段长度，防 log 膨胀
    if len(message) > 2000:
        return {"success": False, "error": "反馈内容过长，请限制在 2000 字以内"}
    if len(name) > 100:
        return {"success": False, "error": "名字过长"}
    if len(email) > 200:
        return {"success": False, "error": "邮箱过长"}
    try:
        from datetime import datetime
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        email_body = f"""New Feedback Received\n\nTime: {ts}\nType: {type_}\nName: {name or 'Anonymous'}\nEmail: {email or 'Not provided'}\nRating: {rating or 'N/A'}\n\nMessage:\n{message}\n"""
        log_path = os.path.join(BASE_DIR, "feedback.log")
        with open(log_path, "a") as f2:
            f2.write("\n=== " + ts + " ===\n" + email_body + "\n")

        # ── 永久保存到数据库（feedback 表），不依赖易被清空的日志文件 ──
        user_id = None
        try:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                payload = verify_token(auth_header[7:].strip())
                if payload:
                    user_id = int(payload["sub"])
        except Exception:
            pass
        try:
            from auth import get_db
            conn = get_db()
            conn.execute(
                "INSERT INTO feedback (user_id, name, email, type, rating, message, created_at) VALUES (?,?,?,?,?,?,?)",
                (user_id, name, email, type_, rating, message, ts),
            )
            conn.commit()
            conn.close()
        except Exception as e:
            # 数据库写入失败不阻塞反馈（日志已写），仅记录
            print(f"[feedback] DB save failed: {e}")

        return {"success": True, "message": "Feedback received"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# =================================================================
# Survey API
# =================================================================

SURVEY_LOG = os.path.join(BASE_DIR, "survey.log")

@app.post("/api/survey/submit")
async def submit_survey(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        body = await request.json()
    except Exception:
        body = {}
    # 至少需要填写一道题目（q1~q6 之一有值），防止空表单被提交
    survey_fields = ['q1','q2','q3','q4','q5','q6']
    has_content = any(k in survey_fields and v for k, v in body.items())
    if not has_content:
        return {"success": False, "error": "请至少填写一道题目"}
    # 限制字段数量，防止恶意大 payload
    if len(body) > 20:
        return {"success": False, "error": "提交的字段过多"}
    for k in body:
        if len(str(body[k])) > 2000:
            return {"success": False, "error": f"字段 {k} 过长"}

    # 验证登录用户，每个账户只能填一次
    user_id = None
    if credentials and credentials.credentials:
        try:
            from auth import verify_token
            payload = verify_token(credentials.credentials)
            if payload:
                user_id = int(payload["sub"])
        except Exception:
            pass
    if not user_id:
        return {"success": False, "error": "请先登录后再填写问卷"}

    # 查 user 表是否已填过
    try:
        from auth import get_user_by_id
        u = get_user_by_id(user_id)
        if u and u.get("survey_completed"):
            return {"success": False, "error": "您已填写过问卷调查，每个账户只能填写一次"}
    except Exception:
        pass

    try:
        from datetime import datetime
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(SURVEY_LOG, "a") as f:
            f.write(json.dumps({"timestamp": ts, "user_id": user_id, **body}, ensure_ascii=False) + "\n")
        # 持久化到 survey_submissions 表（永久存储，替代易碎的纯文件日志）
        try:
            import sqlite3
            db_path = os.path.join(BASE_DIR, "neuroaccess.db")
            conn = sqlite3.connect(db_path)
            conn.execute(
                "INSERT INTO survey_submissions (user_id, data, created_at) VALUES (?,?,?)",
                (user_id, json.dumps(body, ensure_ascii=False), ts),
            )
            conn.execute("UPDATE users SET survey_completed = 1 WHERE id = ?", (user_id,))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[survey] DB save failed: {e}")
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/survey/status")
async def get_survey_status(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials or not credentials.credentials:
        return {"success": False, "completed": False}
    try:
        from auth import verify_token, get_user_by_id
        payload = verify_token(credentials.credentials)
        if not payload: return {"success": False, "completed": False}
        uid = int(payload["sub"])
        u = get_user_by_id(uid)
        return {"success": True, "completed": bool(u and u.get("survey_completed"))}
    except Exception:
        return {"success": False, "completed": False}

@app.get("/api/survey/results")
async def get_survey_results(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from auth import verify_token, get_user_by_id
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录凭证无效")
    # 账号可能已在其它设备被注销；无状态 JWT 删除后依然有效，需校验用户仍存在
    if not get_user_by_id(int(payload["sub"])):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not os.path.exists(SURVEY_LOG):
        return {"success": True, "entries": [], "count": 0}
    try:
        entries = []
        with open(SURVEY_LOG, "r") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        entries.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass
        return {"success": True, "entries": entries, "count": len(entries)}
    except Exception as e:
        return {"success": False, "error": str(e)}


# =================================================================
# 服务端报告同步（跨设备） —— 分析报告随账号保存，任意设备/重新登录后可用
# =================================================================

def _report_user_id(credentials: HTTPAuthorizationCredentials) -> int:
    """从 Bearer token 解析并校验用户，返回 user_id；无效或已注销则抛 401。"""
    if not AUTH_AVAILABLE:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="认证模块不可用")
    payload = verify_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录凭证无效")
    try:
        uid = int(payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录凭证无效")
    if not get_user_by_id(uid):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号不存在或已注销")
    return uid


@app.post("/api/reports/save")
async def api_save_report(report: Dict[str, Any], credentials: HTTPAuthorizationCredentials = Depends(security)):
    uid = _report_user_id(credentials)
    try:
        rid = str(report.get("id") or "")
        if not rid:
            return {"success": False, "error": "Missing report id"}
        # ── 保存前用磁盘持久化缓存里的 AI 文案覆盖模板 ──
        # 用户常在前端轮询换入 AI 之前就保存 → 报告里仍是模板；
        # 这里直接从分析缓存取 AI 文案覆盖，确保保存的总是最新最好的版本。
        try:
            aid = (report.get("analysis") or {}).get("analysis_id")
            if aid:
                cached = _EXPLANATIONS_CACHE.get(aid)
                if cached is None:
                    _load_explanations_cache_from_disk()
                    cached = _EXPLANATIONS_CACHE.get(aid)
                if cached and cached.get("ready") and cached.get("explanations"):
                    cur_an = report.setdefault("analysis", {})
                    cur_expl = cur_an.setdefault("explanations", {})
                    for lang, tdict in (cached["explanations"] or {}).items():
                        target = cur_expl.setdefault(lang, {})
                        if isinstance(tdict, dict):
                            for tier, txt in tdict.items():
                                if isinstance(txt, str) and txt.strip():
                                    target[tier] = txt
        except Exception:
            pass
        data_json = json.dumps(report, ensure_ascii=False)
        conn = get_db()
        conn.execute(
            """INSERT INTO reports (id, user_id, file_name, date, mode, quality, language, data)
               VALUES (?,?,?,?,?,?,?,?)
               ON CONFLICT(id) DO UPDATE SET
                 user_id=excluded.user_id, file_name=excluded.file_name, date=excluded.date,
                 mode=excluded.mode, quality=excluded.quality, language=excluded.language, data=excluded.data""",
            (rid, uid,
             str(report.get("fileName", "")), str(report.get("date", "")),
             str(report.get("mode", "Beginner")), float(report.get("quality", 0) or 0),
             str(report.get("language", "zh")), data_json),
        )
        conn.commit()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/reports/list")
def api_list_reports(credentials: HTTPAuthorizationCredentials = Depends(security)):
    uid = _report_user_id(credentials)
    try:
        conn = get_db()
        rows = conn.execute(
            "SELECT data FROM reports WHERE user_id=? ORDER BY created_at DESC", (uid,)
        ).fetchall()
        reports = [json.loads(r["data"]) for r in rows]
        return {"success": True, "reports": reports}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/reports/get")
async def api_get_report(body: Dict[str, Any], credentials: HTTPAuthorizationCredentials = Depends(security)):
    uid = _report_user_id(credentials)
    try:
        rid = str(body.get("id") or "")
        if not rid:
            return {"success": False, "error": "Missing report id"}
        conn = get_db()
        row = conn.execute(
            "SELECT data FROM reports WHERE id=? AND user_id=?", (rid, uid)
        ).fetchone()
        if not row:
            return {"success": False, "error": "Report not found"}
        return {"success": True, "report": json.loads(row["data"])}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/reports/delete")
async def api_delete_report(body: Dict[str, Any], credentials: HTTPAuthorizationCredentials = Depends(security)):
    uid = _report_user_id(credentials)
    try:
        rid = str(body.get("id") or "")
        if not rid:
            return {"success": False, "error": "Missing report id"}
        conn = get_db()
        conn.execute("DELETE FROM reports WHERE id=? AND user_id=?", (rid, uid))
        conn.commit()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/reports/delete-all")
async def api_delete_all_reports(credentials: HTTPAuthorizationCredentials = Depends(security)):
    uid = _report_user_id(credentials)
    try:
        conn = get_db()
        conn.execute("DELETE FROM reports WHERE user_id=?", (uid,))
        conn.commit()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


# =================================================================
# EEG Simulator
# =================================================================

try:
    from eeg_simulator import generate_synthetic_eeg, get_preset_states
    EEG_SIMULATOR_AVAILABLE = True
except Exception as _sim_e:
    EEG_SIMULATOR_AVAILABLE = False
    EEG_SIMULATOR_ERROR = str(_sim_e)


# =================================================================
# 波形图像端点：返回纯 SVG，前端用 <img> 直接加载，绕过 React canvas
# =================================================================
@app.get("/api/waveform-image")
def waveform_image(rid: str = ""):
    """根据报告ID返回波形SVG图像"""
    svg = gen_waveform_svg(rid)
    from fastapi.responses import Response
    return Response(content=svg, media_type="image/svg+xml",
                    headers={"Cache-Control": "private, max-age=300"})


def gen_waveform_svg(rid: str) -> str:
    """从数据库读取报告数据，生成纯SVG波形图"""
    if not rid:
        return f"<svg width=400 height=100><text y=50 fill=red>Missing report ID</text></svg>"
    try:
        from auth import get_db
        conn = get_db()
        row = conn.execute("SELECT data FROM reports WHERE id=?", (rid,)).fetchone()
        conn.close()
        if not row:
            return f"<svg width=400 height=100><text y=50 fill=red>Report not found</text></svg>"
        d = json.loads(row[0])
        wp = d.get("analysis", {}).get("waveform_preview", {}) or {}
        chs = wp.get("channels", {}) or {}
        if not chs:
            return f"<svg width=400 height=100><text y=50 fill=#888>No waveform data</text></svg>"
        
        ch_names = list(chs.keys())
        nch = len(ch_names)
        npts = len(chs[ch_names[0]]) if nch else 0
        if npts < 2:
            return f"<svg width=400 height=100><text y=50 fill=#888>Insufficient data points ({npts})</text></svg>"
        
        W, LW = 900, 65
        # 自适应行高：通道多时压扁，保证 64/128 通道也能一屏放下
        # 64ch → 8px/行 → 542px；128ch → 4px/行 → 542px
        laneH = max(4, min(24, int(520 / nch)))
        H = laneH * nch + 30
        colors = ["#ef4444","#facc15","#3b82f6","#22c55e"]
        
        def esc(s):
            return str(s).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace('"',"&quot;")
        
        svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" style="background:#1a1a2e;font-family:monospace">']
        for i, ch in enumerate(ch_names):
            y = i * laneH + laneH//2
            svg.append(f'<line x1="{LW}" y1="{y}" x2="{W}" y2="{y}" stroke="#333" stroke-width="0.5" stroke-dasharray="3 3"/>')
            svg.append(f'<text x="{LW-4}" y="{y+3}" fill="#aab" font-size="{min(11, max(8, 200//nch))}" text-anchor="end">{esc(ch)}</text>')
            vals = chs[ch]
            if len(vals) < 2: continue
            vabs = sorted([abs(v) for v in vals])
            p95 = vabs[min(int(len(vabs)*0.95), len(vabs)-1)] or 1
            sc = (laneH * 0.5) / (2 * p95)
            cl = laneH * 0.5 / sc
            pts = "M" + "".join(f" {LW + j*(W-LW)/(npts-1):.1f},{y - max(-cl, min(cl, vals[j]))*sc:.2f}" for j in range(len(vals)))
            svg.append(f'<path d="{pts}" stroke="{colors[i%4]}" stroke-width="0.7" fill="none" opacity="0.85"/>')
        
        # 用 times 数组尾端取实际时长（采样率经多次降采样后不准）
        times = wp.get("times", [])
        dur = (times[-1] - times[0]) if len(times) > 1 else (npts / float(wp.get("sampling_rate") or 128))
        for i in range(6):
            t = i * dur / 5
            x = LW + (W - LW) * i / 5
            svg.append(f'<text x="{x:.1f}" y="{H-4}" fill="#667" font-size="9" text-anchor="middle">{t:.1f}s</text>')
        svg.append("</svg>")
        return "".join(svg)
    except Exception as e:
        return f"<svg width=400 height=100><text y=50 fill=red>Error: {esc(str(e))}</text></svg>"

@app.post("/api/eeg-simulator/generate")
async def eeg_simulator_generate(request: Request, _uid: int = Depends(require_user_id)):
    # ── Auth（AUTH 启用时必须登录；关闭时游客可生成，便于本地开发）──
    # 鉴权由 Depends(require_user_id) 完成：无 token/账号已注销 → 401
    try:
        try:
            body = await request.json()
        except Exception:
            body = {}
        if not EEG_SIMULATOR_AVAILABLE:
            return {"success": False, "error": f"EEG simulator module not available: {EEG_SIMULATOR_ERROR}"}

        # ── 参数范围校验（避免把非法值传给底层 numpy，暴露技术性错误）──
        def _f(name: str, default: float, lo: float, hi: float) -> float:
            try:
                v = float(body.get(name, default))
            except (TypeError, ValueError):
                v = default
            if v < lo or v > hi:
                raise ValueError(f"参数 {name} 必须在 {lo:g}~{hi:g} 之间")
            return v

        def _i(name: str, default: int, lo: int, hi: int) -> int:
            try:
                v = int(body.get(name, default))
            except (TypeError, ValueError):
                v = default
            if v < lo or v > hi:
                raise ValueError(f"参数 {name} 必须在 {lo}~{hi} 之间")
            return v

        result = generate_synthetic_eeg(
            duration_sec=_f("duration_sec", 10.0, 1.0, 300.0),
            sampling_rate=_i("sampling_rate", 250, 16, 4096),
            n_channels=_i("n_channels", 8, 1, 256),
            alpha_power=_f("alpha_power", 1.0, 0.0, 10.0),
            beta_power=_f("beta_power", 0.5, 0.0, 10.0),
            theta_power=_f("theta_power", 0.3, 0.0, 10.0),
            delta_power=_f("delta_power", 0.8, 0.0, 10.0),
            alpha_freq=_f("alpha_freq", 10.0, 1.0, 50.0),
            beta_freq=_f("beta_freq", 20.0, 5.0, 80.0),
            theta_freq=_f("theta_freq", 6.0, 1.0, 30.0),
            delta_freq=_f("delta_freq", 3.0, 0.1, 10.0),
            noise_level=_f("noise_level", 0.1, 0.0, 2.0),
            artifact_blink=bool(body.get("artifact_blink", False)),
            artifact_muscle=bool(body.get("artifact_muscle", False)),
            artifact_powerline=bool(body.get("artifact_powerline", False)),
        )
        return result
    except ValueError as ve:
        return {"success": False, "error": str(ve)}
    except Exception as e:
        import traceback
        return {"success": False, "error": "参数无效，请检查后重试",
                "detail": traceback.format_exc() if os.getenv("DEBUG") else "Enable DEBUG=1 for details"}

@app.get("/api/eeg-simulator/presets")
def eeg_simulator_presets():
    if not EEG_SIMULATOR_AVAILABLE:
        return {"success": False, "error": f"EEG simulator module not available: {EEG_SIMULATOR_ERROR}"}
    return {"success": True, "presets": get_preset_states()}
