"""
NeuroAccess Backend v2.5.0
- /analyze 唯一接口：上传 → MNE 分析 → Ollama 三层解释 → 完整 JSON
- v2.5.0: 拆分为 utils.py / explanations.py / analysis.py
"""
import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
import concurrent.futures
import json
from typing import Any, Optional, List, Dict

import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware

from utils import safe_float, to_jsonable, safe_name, normalize_language
from explanations import generate_explanations, template_beginner, template_student, template_research
import i18n

BASE_DIR   = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# FastAPI init
app = FastAPI(title="NeuroAccess Backend", version="2.5.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Import analysis engine
try:
    from analysis import analyze_edf
except Exception as _e:
    analyze_edf = None
    ANALYSIS_IMPORT_ERROR = str(_e)
else:
    ANALYSIS_IMPORT_ERROR = ""


# =================================================================
# File upload
# =================================================================

def save_upload(file: UploadFile) -> Dict[str, Any]:
    """保存上传文件到本地"""
    if not file or not file.filename:
        return {"success": False, "error": "未提供文件"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".edf", ".bdf", ".gdf", ".csv"]:
        return {"success": False, "error": f"Unsupported file format: {ext}"}
    import uuid
    stored_name = f"{uuid.uuid4().hex[:10]}_{safe_name(file.filename)}"
    path = os.path.join(UPLOAD_DIR, stored_name)
    MAX_FILE_SIZE = 500 * 1024 * 1024
    try:
        content = file.file.read()
        if not content:
            return {"success": False, "error": "Uploaded file is empty"}
        if len(content) > MAX_FILE_SIZE:
            return {"success": False, "error": f"File too large ({len(content)/1024/1024:.1f}MB). Max 500MB."}
        with open(path, "wb") as f:
            f.write(content)
    except Exception as e:
        return {"success": False, "error": f"文件保存失败: {e}"}
    return {"success": True, "path": path, "file_name": file.filename, "stored_name": stored_name, "file_size_mb": round(os.path.getsize(path)/1024/1024, 3)}


# =================================================================
# Analysis helpers
# =================================================================

def _dominant_band(bp: Dict[str, float]) -> str:
    if not bp: return "unknown"
    try: return max(bp, key=lambda k: safe_float(bp[k]))
    except: return "unknown"

def _freq_distribution(bp: Dict[str, float]) -> Dict[str, str]:
    if not bp: return {}
    total = sum(safe_float(v) for v in bp.values())
    if total == 0: return {k: "0%" for k in bp}
    return {k: f"{safe_float(v)/total*100:.1f}%" for k, v in bp.items()}

def _compute_literacy_scores(data: Dict, quality: Dict, bp: Dict) -> Dict[str, Any]:
    sq = quality.get("signal_quality_score") or data.get("signal_quality_score")
    sq_f = safe_float(sq, 50.0)
    noisy_count = len(quality.get("noisy_channels") or data.get("noisy_channels") or [])
    artifact_count = len(quality.get("possible_artifacts") or data.get("possible_artifacts") or [])
    clipping = quality.get("clipping_detected") or data.get("clipping_detected") or False
    complexity = min(100, noisy_count * 3 + artifact_count * 10 + (15 if clipping else 0))
    readability = min(100, max(0, sq_f))
    clarity = min(100, max(0, sq_f - noisy_count * 4))
    beginner = min(100, max(0, sq_f - complexity * 0.6))
    research = min(100, max(0, sq_f - noisy_count * 2))
    return {
        "learning_readability_score": round(readability, 1),
        "signal_clarity_score": round(clarity, 1),
        "beginner_friendliness_score": round(beginner, 1),
        "research_usefulness_score": round(research, 1),
        "noise_complexity_score": round(complexity, 1),
    }

def _compute_confidence(data: Dict, sq: Any, quality: Dict, lang: str) -> Dict[str, str]:
    s = safe_float(sq, -1)
    reasons = []
    if s < 55: reasons.append(i18n.get_signal_quality_text(lang, "low_signal_quality"))
    if s >= 80: reasons.append(i18n.get_signal_quality_text(lang, "stable_waveform"))
    nc = len(quality.get("noisy_channels") or data.get("noisy_channels") or [])
    if nc > 3: reasons.append(i18n.get_signal_quality_text(lang, "multiple_noisy_channels"))
    dur = data.get("overview", {}).get("duration") or data.get("duration") or "Unknown"
    if "sec" in str(dur).lower() or "秒" in str(dur):
        reasons.append(i18n.get_signal_quality_text(lang, "short_recording"))
    if s >= 90: level = i18n.get_signal_quality_text(lang, "high")
    elif s >= 55: level = i18n.get_signal_quality_text(lang, "moderate")
    else: level = i18n.get_signal_quality_text(lang, "low")
    return {"level": level, "reason": "; ".join(reasons) or i18n.get_signal_quality_text(lang, "stable_metrics")}

def _get_limitations(lang: str) -> List[str]:
    return i18n.get_limitations(lang)

def enhance_analysis(raw: Dict[str, Any], language: str = "zh") -> Dict[str, Any]:
    data = raw.get("data", raw)
    overview = data.get("overview", data)
    quality = data.get("signal_quality", data)
    raw_bp = data.get("frequency_analysis", {}).get("bandpower") or data.get("bandpower") or raw.get("bandpower") or {}
    bp_normalized: Dict[str, float] = {}
    if isinstance(raw_bp, dict):
        for std_key, variants in {"delta":["delta","delt"], "theta":["theta","thet"], "alpha":["alpha","alph"], "beta":["beta","bet"]}.items():
            for v in variants:
                if v in raw_bp:
                    bp_normalized[std_key] = safe_float(raw_bp[v])
                    break
    bp_total = sum(bp_normalized.values())
    bp_percent = {k: f"{v/bp_total*100:.1f}%" for k, v in bp_normalized.items()} if bp_total > 0 else {k: "0%" for k in bp_normalized}
    raw_freq = data.get("frequency_analysis", {})
    freq_dist_array = to_jsonable(raw_freq.get("frequency_distribution") or [])
    avg_bp = to_jsonable(raw_freq.get("average_bandpower") or bp_normalized)
    frequency_analysis = to_jsonable({
        "bandpower": bp_normalized, "bandpower_percent": bp_percent,
        "dominant_band": _dominant_band(bp_normalized),
        "frequency_distribution": _freq_distribution(bp_normalized),
        "frequency_distribution_array": freq_dist_array,
        "average_bandpower": avg_bp,
    })
    literacy_scores = _compute_literacy_scores(data, quality, bp_normalized)
    sq = quality.get("signal_quality_score") or data.get("signal_quality_score")
    confidence = _compute_confidence(data, sq, quality, language)
    cannot_tell = to_jsonable(data.get("what_this_data_cannot_tell") or ["\u667a\u5546","\u6027\u683c","\u5fc3\u7406\u5065\u5eb7","\u75be\u75c5","\u60c5\u7eea","ADHD","\u6291\u90c1\u75c7"])
    return to_jsonable({
        "file_name": data.get("overview", {}).get("filename") or data.get("file_name") or "Unknown",
        "channel_count": overview.get("channel_count") or data.get("channel_count") or 0,
        "sampling_rate": overview.get("sampling_rate") or data.get("sampling_rate") or 0,
        "duration": overview.get("duration") or data.get("duration") or "Unknown",
        "channel_names": overview.get("channel_names") or data.get("channel_names") or [],
        "signal_quality_score": safe_float(sq),
        "noisy_channels": quality.get("noisy_channels") or data.get("noisy_channels") or [],
        "possible_artifacts": quality.get("possible_artifacts") or data.get("possible_artifacts") or [],
        "clipping_detected": quality.get("clipping_detected") or data.get("clipping_detected", False),
        "high_frequency_noise": quality.get("high_frequency_noise") or data.get("high_frequency_noise", False),
        "bandpower": bp_normalized, "bandpower_percent": bp_percent,
        "frequency_analysis": frequency_analysis,
        "eeg_literacy_scores": literacy_scores,
        "confidence": confidence,
        "limitations": _get_limitations(language),
        "what_this_data_cannot_tell": cannot_tell,
        "signal_quality": to_jsonable({
            "signal_quality_score": safe_float(sq),
            "noisy_channels": quality.get("noisy_channels") or data.get("noisy_channels") or [],
            "clipping_detected": quality.get("clipping_detected") or data.get("clipping_detected", False),
            "possible_artifacts": quality.get("possible_artifacts") or data.get("possible_artifacts") or [],
            "high_frequency_noise": quality.get("high_frequency_noise") or data.get("high_frequency_noise", False),
        }),
    })


# =================================================================
# Routes
# =================================================================

@app.get("/")
def root():
    return {"success": True, "service": "NeuroAccess Backend", "version": "2.5.0", "model": "qwen2.5:7b"}

@app.get("/api/health")
def health():
    try:
        from explanations import call_openrouter
    except:
        return {"success": False, "error": "explanations module failed to import"}
    try:
        test_resp = call_openrouter("ping", timeout=10)
        openrouter_ok = test_resp.get("success") == True
    except:
        openrouter_ok = False
    return {"success": True, "ollama": openrouter_ok, "openrouter": openrouter_ok, "analysis_available": analyze_edf is not None}

@app.post("/api/analyze")
async def analyze(request: Request, file: UploadFile = File(...), language: str = Form("zh")):
    # ── Auth: must be logged in ──────────────────────────────────
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"success": False, "error": "Authentication required. Please login to analyze files."}
    token = auth_header.split(" ", 1)[1]
    if not AUTH_AVAILABLE:
        return {"success": False, "error": f"认证模块不可用: {AUTH_IMPORT_ERROR}"}
    payload = verify_token(token)
    if not payload:
        return {"success": False, "error": "登录凭证已过期，请重新登录"}
    user_id = int(payload["sub"])
    # ── Analysis ─────────────────────────────────────────────────
    lang = normalize_language(language)
    saved = save_upload(file)
    file_path = saved.get("path")
    if not saved.get("success"):
        return {"success": False, "file_name": file.filename or "unknown", "error": saved.get("error", "Unknown error")}
    try:
        if analyze_edf is None:
            return {"success": False, "file_name": saved.get("file_name"), "error": f"analyze_edf not available: {ANALYSIS_IMPORT_ERROR}"}
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(analyze_edf, file_path, lang)
            try:
                raw_result = future.result(timeout=120)
            except concurrent.futures.TimeoutError:
                return {"success": False, "file_name": saved.get("file_name"), "error": f"Analysis timed out after 120s. File may be too large or corrupted."}
        enhanced = enhance_analysis(raw_result, lang)
        explanations = generate_explanations(enhanced, lang)
        analysis_out = {**enhanced, "explanations": explanations, "disclaimer": {"zh": "本报告仅用于 EEG 科普教育。不构成医疗建议、诊断或治疗推荐。EEG 数据不能单独用于诊断任何疾病。如有健康问题，请咨询专业医生。", "en": "This report is for EEG educational purposes only. It does not constitute medical advice, diagnosis, or treatment recommendations. EEG data alone cannot diagnose any disease. For health concerns, consult a qualified physician."}, "file_size_mb": saved.get("file_size_mb", 0)}
        return {"success": True, "file_name": saved.get("file_name"), "analysis": analysis_out}
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc() if os.getenv("DEBUG") else "Enable DEBUG=1 for details"
        file_name = saved.get("file_name")
        return {"success": False, "file_name": file_name, "error": f"Internal server error: {str(e)}", "detail": error_detail if os.getenv("DEBUG") else "Enable DEBUG=1 for details"}
    finally:
        # 清理上传的临时文件
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass


# =================================================================
# EEG Viewer API
# =================================================================

@app.post("/api/eeg/viewer")
async def eeg_viewer(request: Request, file: UploadFile = File(...), duration: float = Form(30.0)):
    """
    EEG 文件预览 API：上传 EEG 文件，返回波形数据用于前端绘图。
    只读取前 duration 秒数据（默认30秒），避免数据过大。
    """
    file_path = None
    try:
        # ── Auth ─────────────────────────────────────────────────────
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return {"success": False, "error": "请先登录"}
        token = auth_header.split(" ", 1)[1]
        if not AUTH_AVAILABLE:
            return {"success": False, "error": "认证模块不可用"}
        payload = verify_token(token)
        if not payload:
            return {"success": False, "error": "登录凭证已过期，请重新登录"}

        # ── Save upload ──────────────────────────────────────────────
        saved = save_upload(file)
        if not saved.get("success"):
            return {"success": False, "error": saved.get("error", "文件上传失败")}

        file_path = saved["path"]
        file_name = saved.get("file_name", "unknown")

        # ── Check MNE availability ───────────────────────────────────
        try:
            import mne
            import numpy as np
        except ImportError as imp_err:
            return {"success": False, "error": f"EEG 解析模块未安装: {str(imp_err)}"}

        # 读取 EEG 文件
        ext = os.path.splitext(file_name)[1].lower()
        raw = None
        try:
            if ext == ".edf":
                raw = mne.io.read_raw_edf(file_path, preload=True, verbose=False)
            elif ext == ".bdf":
                raw = mne.io.read_raw_bdf(file_path, preload=True, verbose=False)
            elif ext == ".gdf":
                raw = mne.io.read_raw_gdf(file_path, preload=True, verbose=False)
            elif ext == ".csv":
                # CSV: 假设第一列是时间，其余列是通道
                import pandas as pd
                df = pd.read_csv(file_path, nrows=int(1000 * duration))  # 最多读 duration 秒
                time_col = df.columns[0]
                data_cols = df.columns[1:]
                sfreq = 1000  # 假设 1000Hz，或从文件推断
                # 尝试从文件名或内容推断采样率
                times = df[time_col].values
                if len(times) > 1:
                    inferred_sfreq = 1.0 / (times[1] - times[0]) if times[1] != times[0] else 1000
                    sfreq = min(inferred_sfreq, 10000)
                # 构造伪 raw 对象返回数据
                ch_names = list(data_cols)
                data_arr = df[data_cols].values.T  # (n_channels, n_times)
                # 截断到 duration 秒
                max_samples = int(sfreq * duration)
                if data_arr.shape[1] > max_samples:
                    data_arr = data_arr[:, :max_samples]
                    times = times[:max_samples]
                t_arr = np.arange(data_arr.shape[1]) / sfreq
                return to_jsonable({
                    "success": True,
                    "file_name": file_name,
                    "channel_names": ch_names,
                    "sampling_rate": round(sfreq, 2),
                    "duration_seconds": round(len(t_arr) / sfreq, 2),
                    "times": t_arr.tolist()[:min(len(t_arr), 10000)],  # 最多返回10000个点
                    "channels": {ch: data_arr[i][:min(data_arr.shape[1], 10000)].tolist() for i, ch in enumerate(ch_names)},
                    "total_channels": len(ch_names),
                    "total_samples": data_arr.shape[1],
                })
            else:
                return {"success": False, "error": f"不支持的文件格式: {ext}"}
        except Exception as load_err:
            return {"success": False, "error": f"文件读取失败: {str(load_err)}"}

        if raw is None:
            return {"success": False, "error": "文件解析失败"}

        # 获取基本信息
        info = raw.info
        ch_names = info["ch_names"]
        sfreq = info["sfreq"]
        total_duration = raw.times[-1] if len(raw.times) > 0 else 0

        # 只取前 duration 秒数据
        n_samples = min(int(sfreq * duration), raw.n_times)
        start_sample = 0

        # 获取数据 (n_channels, n_times)
        data, times = raw[:]  # (n_channels, n_times) — MNE 返回单位是伏特(V)
        data = data[:, start_sample:n_samples]
        # 转换为微伏(μV)，前端以 μV 为单位显示波形
        data = data * 1e6
        times = times[start_sample:n_samples]

        # 降采样：如果数据点太多，前端绘图会卡
        max_points = 8000  # 前端绘图最多8000个点
        if len(times) > max_points:
            step = len(times) // max_points
            data = data[:, ::step]
            times = times[::step]

        # 构造返回数据
        channels_data = {}
        for i, ch_name in enumerate(ch_names):
            channels_data[ch_name] = data[i].tolist()

        return to_jsonable({
            "success": True,
            "file_name": file_name,
            "channel_names": ch_names,
            "sampling_rate": round(sfreq, 2),
            "duration_seconds": round(total_duration, 2),
            "times": times.tolist(),
            "channels": channels_data,
            "total_channels": len(ch_names),
            "total_samples": n_samples,
            "view_duration": round(times[-1] - times[0], 2) if len(times) > 1 else 0,
        })

    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        return {"success": False, "error": f"EEG 数据处理失败: {str(e)}", "detail": error_detail}
    finally:
        # 清理上传的文件
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass


# =================================================================
# Auth routes
# =================================================================

try:
    from auth import (
        create_user, authenticate_user, create_access_token, verify_token, get_user_by_id,
        generate_verification_code, verify_verification_code, update_password, update_email, delete_user, get_db,
        accept_terms, check_username_setup,
    )
    AUTH_AVAILABLE = True
except Exception as _auth_e:
    AUTH_AVAILABLE = False
    AUTH_IMPORT_ERROR = str(_auth_e)

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

def get_current_user():
    """Get current user from JWT token"""
    if not AUTH_AVAILABLE:
        return None
    # This is a simplified version - in production, get token from cookie or header
    return None  # Placeholder

@app.post("/api/auth/register")
def auth_register(username: str = Form(...), email: str = Form(...), password: str = Form(...), code: str = Form(...)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": f"认证模块不可用: {AUTH_IMPORT_ERROR}"}
    try:
        # Verify registration code
        if not verify_registration_code(email, code):
            return {"success": False, "error": "验证码无效或已过期"}
        user = create_user(username, email, password)
        token = create_access_token({"sub": str(user["id"]), "username": user["username"]})
        return {"success": True, "token": token, "user": {"id": user["id"], "username": user["username"], "email": user["email"], "avatar_url": user.get("avatar_url", "")}}
    except ValueError as e:
        return {"success": False, "error": str(e)}

@app.post("/api/auth/login")
def auth_login(username_or_email: str = Form(...), password: str = Form(...)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": f"认证模块不可用: {AUTH_IMPORT_ERROR}"}
    user = authenticate_user(username_or_email, password)
    if not user:
        return {"success": False, "error": "用户名或密码错误"}
    token = create_access_token({"sub": str(user["id"]), "username": user["username"]})
    terms_accepted = user.get("terms_accepted", 0)
    needs_username_setup = (user["username"] == "User" or user["username"].strip() == "")
    return {"success": True, "token": token, "terms_accepted": bool(terms_accepted), "needs_username_setup": needs_username_setup, "user": {"id": user["id"], "username": user["username"], "email": user["email"], "avatar_url": user.get("avatar_url", "")}}

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
    return {"success": True, "user": {"id": user["id"], "username": user["username"], "email": user["email"], "avatar_url": user.get("avatar_url", "")}}

@app.post("/api/auth/logout")
def auth_logout():
    return {"success": True, "message": "Logged out"}


@app.post("/api/auth/accept-terms")
def auth_accept_terms(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Mark user as having accepted terms."""
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
    accepted = accept_terms(user_id)
    if accepted:
        return {"success": True, "message": "Terms accepted"}
    return {"success": False, "error": "Failed to accept terms"}



def send_verification_email(to_email: str, code: str, purpose: str = "password_change") -> bool:
    """Send verification code via SMTP (Tencent Cloud SES or Gmail fallback). Returns True on success."""
    import os, smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM", "")

    # Determine subject and HTML body based on purpose
    if purpose == "register":
        subject = "NeuroAccess - 注册验证码"
        html = f"""<html><body style="font-family: Arial, sans-serif;">
                <h2 style="color: #3B82F6;">NeuroAccess 注册验证码</h2>
                <p>您正在注册 NeuroAccess 账号。</p>
                <p>您的验证码是：</p>
                <div style="background: #f0f9ff; border: 2px solid #3B82F6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; color: #3B82F6; letter-spacing: 8px;">{code}</span>
                </div>
                <p>此验证码将于 10 分钟后过期。</p>
                <p style="color: #666; font-size: 12px;">如非本人操作，请忽略此邮件。</p>
            </body></html>"""
    elif purpose == "email_change":
        subject = "NeuroAccess - 邮箱变更验证码"
        html = f"""<html><body style="font-family: Arial, sans-serif;">
                <h2 style="color: #3B82F6;">NeuroAccess 邮箱变更验证码</h2>
                <p>您正在请求变更 NeuroAccess 账号的邮箱地址。</p>
                <p>您的验证码是：</p>
                <div style="background: #f0f9ff; border: 2px solid #3B82F6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; color: #3B82F6; letter-spacing: 8px;">{code}</span>
                </div>
                <p>此验证码将于 10 分钟后过期。</p>
                <p style="color: #666; font-size: 12px;">如非本人操作，请忽略此邮件。</p>
            </body></html>"""
    elif purpose == "delete_account":
        subject = "NeuroAccess - 注销账号验证码"
        html = f"""<html><body style="font-family: Arial, sans-serif;">
                <h2 style="color: #DC2626;">NeuroAccess 注销账号验证码</h2>
                <p>您正在请求注销 NeuroAccess 账号。<strong>此操作不可撤销！</strong></p>
                <p>您的验证码是：</p>
                <div style="background: #fef2f2; border: 2px solid #DC2626; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; color: #DC2626; letter-spacing: 8px;">{code}</span>
                </div>
                <p>此验证码将于 10 分钟后过期。</p>
                <p style="color: #666; font-size: 12px;">如非本人操作，请立即登录并修改密码。</p>
            </body></html>"""
    else:
        subject = "NeuroAccess - 密码修改验证码"
        html = f"""<html><body style="font-family: Arial, sans-serif;">
                <h2 style="color: #3B82F6;">NeuroAccess 验证码</h2>
                <p>您请求修改 NeuroAccess 账户密码。</p>
                <p>您的验证码是：</p>
                <div style="background: #f0f9ff; border: 2px solid #3B82F6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; color: #3B82F6; letter-spacing: 8px;">{code}</span>
                </div>
                <p>此验证码将于 10 分钟后过期。</p>
                <p style="color: #666; font-size: 12px;">如非本人操作，请忽略此邮件。</p>
            </body></html>"""

    # Try SMTP first
    if smtp_host and smtp_username and smtp_password:
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
            return True
        except Exception as e:
            print(f"[Email] SMTP failed: {e}")

    # Fallback: print code to console (for development)
    print(f"[Email] Would send code {code} to {to_email} (SMTP not configured)")
    return False

@app.post("/api/auth/register-verification-code")
def auth_register_verification_code(email: str = Form(...), request: Request = None):
    """Send verification code to email for registration. No login required. Rate limit: 1 per 60s."""
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "认证模块不可用"}
    
    # Check if email already registered
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email = ?", (email,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return {"success": False, "error": "邮箱已被注册"}
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[DB] Error checking email: {e}")
        return {"success": False, "error": "数据库错误"}
    
    # Rate limit: check last code sent within 60 seconds (from DB)
    try:
        conn = get_db()
        row = conn.execute(
            "SELECT created_at FROM verification_codes WHERE email = ? AND purpose = ? AND used = 0 ORDER BY created_at DESC LIMIT 1",
            (email, "register")
        ).fetchone()
        if row and row["created_at"]:
            from datetime import datetime as _dt
            last_created = _dt.fromisoformat(row["created_at"])
            elapsed = (_dt.utcnow() - last_created).total_seconds()
            if elapsed < 60:
                remaining = int(60 - elapsed)
                conn.close()
                return {"success": False, "error": f"请等待 {remaining} 秒后再获取验证码"}
        conn.close()
    except Exception as e:
        print(f"[RateLimit] Error: {e}")
    
    # Generate code (store in DB)
    try:
        code = generate_verification_code(email=email, purpose="register")
    except Exception as e:
        return {"success": False, "error": f"生成验证码失败: {e}"}
    
    # Send email
    email_sent = send_verification_email(email, code, purpose="register")
    result = {"success": True, "expires_in": 600}
    if email_sent:
        result["message"] = "Verification code sent to your email"
    else:
        result["message"] = "Verification code sent (email not configured)"
        # Only return dev_code in DEBUG mode
        if os.getenv("DEBUG") == "1":
            result["dev_code"] = code
    return result

def verify_registration_code(email: str, code: str) -> bool:
    """Verify registration code from DB. Returns True if valid."""
    return verify_verification_code(email=email, code=code, purpose="register")

@app.post("/api/auth/verification-code")
def auth_verification_code(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Generate a 6-digit verification code for password change. Rate limit: 1 per minute."""
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

    # Rate limit: check last unused code created within 60 seconds
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT created_at FROM verification_codes WHERE user_id = ? AND purpose = ? AND used = 0 ORDER BY created_at DESC LIMIT 1",
            (user_id, "password_change"),
        ).fetchone()
        if row and row["created_at"]:
            from datetime import datetime as _dt
            last_created = _dt.fromisoformat(row["created_at"])
            elapsed = (_dt.utcnow() - last_created).total_seconds()
            if elapsed < 60:
                remaining = int(60 - elapsed)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"请等待 {remaining} 秒后再获取验证码",
                )
    finally:
        conn.close()

    code = generate_verification_code(user_id, purpose="password_change")
    # Send email with verification code
    email_sent = send_verification_email(user["email"], code)
    result = {"success": True, "expires_in": 600}
    if email_sent:
        result["message"] = "Verification code sent to your email"
    else:
        result["message"] = "Verification code generated (email not configured)"
        # Only return dev_code in DEBUG mode
        if os.getenv("DEBUG") == "1":
            result["dev_code"] = code
    return result


@app.post("/api/auth/change-password")
def auth_change_password(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    verification_code: str = Form(...),
    new_password: str = Form(...),
):
    """Change password with verification code."""
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
    # Verify the code
    if not verify_verification_code(user_id, verification_code, purpose="password_change"):
        return {"success": False, "error": "验证码无效或已过期"}
    # Update password
    try:
        updated = update_password(user_id, new_password)
        if updated:
            return {"success": True, "message": "Password updated successfully"}
        return {"success": False, "error": "密码更新失败"}
    except ValueError as e:
        return {"success": False, "error": str(e)}

@app.post("/api/auth/send-email-change-code")
def auth_send_email_change_code(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    new_email: str = Form(...),
):
    """Send verification code to NEW email for email change. Rate limit: 1 per 60s."""
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

    # Check new_email format
    import re
    if not re.match(r"^[^@]+@[^@]+\.[^@]+$", new_email):
        return {"success": False, "error": "邮箱格式无效"}
    # Check new_email not already registered
    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (new_email,)).fetchone()
        if existing:
            conn.close()
            return {"success": False, "error": "邮箱已被注册"}
        conn.close()
    except Exception as e:
        conn.close()
        return {"success": False, "error": "数据库错误"}

    # Rate limit: check last unused code for this user+new_email
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT created_at FROM verification_codes WHERE user_id = ? AND purpose = ? AND used = 0 ORDER BY created_at DESC LIMIT 1",
            (user_id, f"email_change:{new_email}"),
        ).fetchone()
        if row and row["created_at"]:
            from datetime import datetime as _dt
            last_created = _dt.fromisoformat(row["created_at"])
            elapsed = (_dt.utcnow() - last_created).total_seconds()
            if elapsed < 60:
                remaining = int(60 - elapsed)
                conn.close()
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"请等待 {remaining} 秒后再获取验证码",
                )
        conn.close()
    except HTTPException:
        raise
    except Exception as e:
        conn.close()

    # Generate code (use purpose = f"email_change:{new_email}" to isolate per email)
    code = generate_verification_code(user_id, purpose=f"email_change:{new_email}")
    # Send email to NEW email
    email_sent = send_verification_email(new_email, code, purpose="email_change")
    result = {"success": True, "expires_in": 600}
    if email_sent:
        result["message"] = "Verification code sent to new email"
    else:
        result["message"] = "Verification code generated (email not configured)"
        # Only return dev_code in DEBUG mode
        if os.getenv("DEBUG") == "1":
            result["dev_code"] = code
    return result


@app.post("/api/auth/confirm-email-change")
def auth_confirm_email_change(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    verification_code: str = Form(...),
    new_email: str = Form(...),
):
    """Confirm email change with verification code."""
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

    # Verify the code
    if not verify_verification_code(user_id, verification_code, purpose=f"email_change:{new_email}"):
        return {"success": False, "error": "验证码无效或已过期"}
    # Update email
    updated = update_email(user_id, new_email)
    if updated:
        updated_user = get_user_by_id(user_id)
        return {"success": True, "message": "Email updated successfully", "user": {"id": updated_user["id"], "username": updated_user["username"], "email": updated_user["email"], "avatar_url": updated_user.get("avatar_url", "")}}
    return {"success": False, "error": "邮箱更新失败（可能已被注册）"}


@app.post("/api/auth/send-delete-account-code")
def auth_send_delete_account_code(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Send verification code to current email for account deletion. Rate limit: 1 per 60s."""
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

    # Rate limit
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT created_at FROM verification_codes WHERE user_id = ? AND purpose = ? AND used = 0 ORDER BY created_at DESC LIMIT 1",
            (user_id, "delete_account"),
        ).fetchone()
        if row and row["created_at"]:
            from datetime import datetime as _dt
            last_created = _dt.fromisoformat(row["created_at"])
            elapsed = (_dt.utcnow() - last_created).total_seconds()
            if elapsed < 60:
                remaining = int(60 - elapsed)
                conn.close()
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"请等待 {remaining} 秒后再获取验证码",
                )
        conn.close()
    except HTTPException:
        raise
    except Exception as e:
        conn.close()

    # Generate code
    code = generate_verification_code(user_id, purpose="delete_account")
    # Send email to current email
    email_sent = send_verification_email(user["email"], code, purpose="delete_account")
    result = {"success": True, "expires_in": 600}
    if email_sent:
        result["message"] = "Verification code sent to your email"
    else:
        result["message"] = "Verification code generated (email not configured)"
        # Only return dev_code in DEBUG mode
        if os.getenv("DEBUG") == "1":
            result["dev_code"] = code
    return result


@app.post("/api/auth/confirm-delete-account")
def auth_confirm_delete_account(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    verification_code: str = Form(...),
):
    """Confirm account deletion with verification code."""
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

    # Verify the code
    if not verify_verification_code(user_id, verification_code, purpose="delete_account"):
        return {"success": False, "error": "验证码无效或已过期"}
    # Delete user and all related data
    deleted = delete_user(user_id)
    if deleted:
        return {"success": True, "message": "Account deleted successfully"}
    return {"success": False, "error": "账号删除失败"}


@app.put("/api/auth/profile")
async def auth_update_profile(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Update user profile (username, avatar_url)."""
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
    except:
        body = {}
    username = body.get("username", "").strip()
    avatar_url = body.get("avatar_url", "").strip()
    
    conn = get_db()
    try:
        if username and username != user["username"]:
            existing = conn.execute("SELECT id FROM users WHERE username = ? AND id != ?", (username, user_id)).fetchone()
            if existing:
                conn.close()
                return {"success": False, "error": "Username already taken"}
            conn.execute("UPDATE users SET username = ? WHERE id = ?", (username, user_id))
        # Always update avatar_url (even if empty string = remove avatar)
        conn.execute("UPDATE users SET avatar_url = ? WHERE id = ?", (avatar_url, user_id))
        conn.commit()
    except Exception as e:
        conn.close()
        return {"success": False, "error": str(e)}
    conn.close()
    
    updated_user = get_user_by_id(user_id)
    return {"success": True, "user": {"id": updated_user["id"], "username": updated_user["username"], "email": updated_user["email"], "avatar_url": updated_user.get("avatar_url", "")}}

# =================================================================
# Feedback API
# =================================================================

@app.post("/api/feedback")
async def submit_feedback(request: Request):
    """Receive user feedback and send email notification."""
    try:
        try:
            body_json = await request.json()
        except:
            body_json = {}
        name = body_json.get("name", "")
        email = body_json.get("email", "")
        type_ = body_json.get("type", "")
        message = body_json.get("message", "")
        rating = body_json.get("rating", "")
        
        from datetime import datetime
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        email_body = f"""New Feedback Received

Time: {ts}
Type: {type_}
Name: {name or "Anonymous"}
Email: {email or "Not provided"}
Rating: {rating or "N/A"}

Message:
{message}
"""
        # Email sending disabled - feedback logged to file only
        log_path = os.path.join(BASE_DIR, "feedback.log")
        with open(log_path, "a") as f2:
            f2.write("\n=== " + ts + " ===\n" + email_body + "\n")
        return {"success": True, "message": "Feedback received"}
    except Exception as e:
        print(f"[Feedback] Error: {e}")
        return {"success": False, "error": str(e)}
