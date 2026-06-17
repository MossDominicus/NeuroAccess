"""
NeuroAccess Backend v2.0 — 快速分析架构
- /analyze:  快速基础分析（无AI/无PDF/无PNG），3-10s返回
- /explain:  异步AI解释（Ollama三路并行）
- /export-pdf: 按需PDF生成
"""
import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
import concurrent.futures
import json
import hashlib
import threading
import time as _time
from typing import Any, Optional, List, Dict

import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware

from utils import safe_float, to_jsonable, safe_name, normalize_language
from explanations import generate_explanations, template_beginner, template_student, template_research
import i18n

# ── AI 解释异步缓存 ────────────────────────────────────────────
_EXPLANATIONS_CACHE: Dict[str, Dict] = {}

def _bg_generate_explanations(aid: str, enhanced: Dict, lang: str):
    """后台线程：生成 AI 解释并存入缓存"""
    try:
        explanations = generate_explanations(enhanced, lang)
        _EXPLANATIONS_CACHE[aid] = {"explanations": explanations, "ready": True}
    except Exception as e:
        print(f"[BG-EXPLAIN] Failed for {aid}: {e}")
        _EXPLANATIONS_CACHE[aid] = {"explanations": None, "ready": True, "error": str(e)}

BASE_DIR   = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="NeuroAccess Backend", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

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

def save_upload(file: UploadFile) -> Dict[str, Any]:
    """保存上传文件（只接受 .edf）"""
    if not file or not file.filename:
        return {"success": False, "error": "未提供文件"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext != ".edf":
        if ext in [".bdf", ".gdf"]:
            return {"success": False, "error": "This version supports EDF format only. BDF/GDF are no longer supported. Please convert your file to EDF."}
        return {"success": False, "error": f"Unsupported file format: {ext}. Only .edf is supported."}
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
    nc = len(quality.get("noisy_channels") or [])
    if nc > 3: reasons.append(i18n.get_signal_quality_text(lang, "multiple_noisy_channels"))
    if s >= 90: level = i18n.get_signal_quality_text(lang, "high")
    elif s >= 55: level = i18n.get_signal_quality_text(lang, "moderate")
    else: level = i18n.get_signal_quality_text(lang, "low")
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
    frequency_analysis = to_jsonable({
        "bandpower": bp_normalized, "bandpower_percent": bp_percent,
        "dominant_band": _dominant_band(bp_normalized),
        "frequency_distribution": _freq_distribution(bp_normalized),
        "frequency_distribution_array": to_jsonable(data.get("frequency_analysis", {}).get("frequency_distribution") or []),
        "average_bandpower": to_jsonable(data.get("frequency_analysis", {}).get("average_bandpower") or bp_normalized),
    })
    literacy_scores = _compute_literacy_scores(data, quality, bp_normalized)
    sq = quality.get("signal_quality_score") or data.get("signal_quality_score")
    confidence = _compute_confidence(data, sq, quality, language)
    cannot_tell = to_jsonable(data.get("what_this_data_cannot_tell") or ["智商","性格","心理健康","疾病","情绪","ADHD","抑郁症"])
    return to_jsonable({
        "file_name": overview.get("filename") or data.get("file_name") or "Unknown",
        "channel_count": overview.get("channel_count") or data.get("channel_count") or 0,
        "sampling_rate": overview.get("sampling_rate") or data.get("sampling_rate") or 0,
        "duration": overview.get("duration") or data.get("duration") or "Unknown",
        "channel_names": overview.get("channel_names") or data.get("channel_names") or [],
        "signal_quality_score": safe_float(sq),
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
            "signal_quality_score": safe_float(sq),
            "noisy_channels": quality.get("noisy_channels") or [],
            "clipping_detected": quality.get("clipping_detected", False),
            "possible_artifacts": quality.get("possible_artifacts") or [],
            "high_frequency_noise": quality.get("high_frequency_noise", False),
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
    return {"success": True, "ollama": openrouter_ok, "openrouter": openrouter_ok,
            "analysis_available": analyze_edf is not None}


# =================================================================
# v2.0: /analyze — 快速基础分析（无AI/无PDF/无PNG）
# =================================================================

@app.post("/api/analyze")
async def analyze(request: Request, file: UploadFile = File(...), language: str = Form("zh")):
    """
    快速分析 EDF 文件（v2.0）
    - 不调用 Ollama AI
    - 不生成 PDF
    - 不生成 PNG 波形图
    - 只用前 60s 数据做分析
    - 超时：60s（ThreadPoolExecutor）
    
    返回：overview + signal_quality + frequency_analysis + waveform_preview
    """
    # ── Auth ─────────────────────────────────────────────────────
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
    
    # ── 保存文件 ─────────────────────────────────────────────────
    lang = normalize_language(language)
    saved = save_upload(file)
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
        _EXPLANATIONS_CACHE[analysis_id] = {"explanations": None, "ready": False}
        
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
        except:
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
    except:
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
    except:
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

        saved = save_upload(file)
        if not saved.get("success"):
            return {"success": False, "error": saved.get("error", "文件上传失败")}
        file_path = saved["path"]
        file_name = saved.get("file_name", "unknown")

        import mne
        raw = mne.io.read_raw_edf(file_path, preload=True, verbose=False)
        
        # Select EEG channels
        from analysis import _pick_eeg_channels
        picks = _pick_eeg_channels(raw)
        raw.pick(picks)
        ch_names = [raw.ch_names[i] for i in range(len(raw.ch_names))]
        
        sfreq = raw.info['sfreq']
        total_duration = raw.times[-1] if len(raw.times) > 0 else 0
        n_samples = min(int(sfreq * duration), raw.n_times)
        
        data = raw.get_data(start=0, stop=n_samples)[0] * 1e6
        times = raw.times[:n_samples]
        
        max_points = 8000
        if len(times) > max_points:
            step = len(times) // max_points
            data = data[:, ::step]
            times = times[::step]
        
        channels_data = {}
        for i, ch_name in enumerate(ch_names):
            channels_data[ch_name] = data[i].tolist()
        
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
                "detail": traceback.format_exc()}
    finally:
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass


# =================================================================
# Debug waveform endpoint
# =================================================================

@app.post("/api/debug/waveform")
async def debug_waveform(file: Optional[UploadFile] = File(None),
                          path: Optional[str] = Form(None),
                          duration: float = Form(10.0)):
    import mne
    file_path = None
    file_name = "unknown"
    
    if file is not None:
        saved = save_upload(file)
        if not saved.get("success"):
            return {"success": False, "error": saved.get("error", "Upload failed")}
        file_path = saved["path"]
        file_name = saved.get("file_name", "unknown")
    elif path:
        file_path = path
        file_name = os.path.basename(path)
        if not os.path.exists(file_path):
            return {"success": False, "error": f"File not found: {file_path}"}
    else:
        return {"success": False, "error": "Provide either 'file' (upload) or 'path'"}

    try:
        from analysis import fast_preview_window
        waveform = fast_preview_window(file_path, duration_sec=duration)
        return {"success": True, "file_name": file_name, **waveform}
    except Exception as e:
        import traceback
        return {"success": False, "error": str(e), "detail": traceback.format_exc()}
    finally:
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
        except:
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

@app.post("/api/auth/register")
def auth_register(username: str = Form(...), email: str = Form(...),
                  password: str = Form(...), code: str = Form(...)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": f"认证模块不可用: {AUTH_IMPORT_ERROR}"}
    try:
        if not verify_registration_code(email, code):
            return {"success": False, "error": "验证码无效或已过期"}
        user = create_user(username, email, password)
        token = create_access_token({"sub": str(user["id"]), "username": user["username"]})
        return {"success": True, "token": token, "user": {"id": user["id"], "username": user["username"],
                "email": user["email"], "phone": user.get("phone", ""),
                "avatar_url": user.get("avatar_url", ""), "avatar_color": user.get("avatar_color", "blue")}}
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
    return {"success": True, "token": token, "terms_accepted": bool(terms_accepted),
            "needs_username_setup": needs_username_setup,
            "user": {"id": user["id"], "username": user["username"], "email": user["email"],
                     "phone": user.get("phone", ""), "avatar_url": user.get("avatar_url", ""),
                     "avatar_color": user.get("avatar_color", "blue")}}

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

def send_verification_email(to_email: str, code: str, purpose: str = "password_change") -> bool:
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
    print(f"[Email] SMTP: host={smtp_host!r} port={smtp_port} user={smtp_username!r}")
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
    print(f"[Email] Would send code {code} to {to_email}")
    return False

def _has_active_code(conn, user_id=None, email=None):
    from datetime import datetime as _dt
    try:
        if user_id:
            row = conn.execute("SELECT created_at,expires_at FROM verification_codes WHERE user_id=? AND used=0 ORDER BY created_at DESC LIMIT 1", (user_id,)).fetchone()
        else:
            row = conn.execute("SELECT created_at,expires_at FROM verification_codes WHERE email=? AND used=0 ORDER BY created_at DESC LIMIT 1", (email,)).fetchone()
        if not row or not row["created_at"]:
            return False, 0
        last_created = _dt.fromisoformat(row["created_at"])
        expires_at = _dt.fromisoformat(row["expires_at"])
        now = _dt.utcnow()
        if now >= expires_at:
            return False, 0
        elapsed = (now - last_created).total_seconds()
        if elapsed < 60:
            return True, int(60 - elapsed)
        return False, 0
    except:
        return False, 0

@app.post("/api/auth/register-verification-code")
def auth_register_verification_code(email: str = Form(...)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "认证模块不可用"}
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email=?", (email,))
        if cur.fetchone():
            cur.close(); conn.close()
            return {"success": False, "error": "邮箱已被注册"}
        cur.close(); conn.close()
    except Exception as e:
        return {"success": False, "error": "数据库错误"}
    try:
        conn = get_db()
        has_active, remaining = _has_active_code(conn, email=email)
        conn.close()
        if has_active:
            return {"success": False, "error": f"已有验证码，请等待{remaining}秒后再试"}
    except:
        pass
    try:
        code = generate_verification_code(email=email, purpose="register")
    except Exception as e:
        return {"success": False, "error": f"生成验证码失败: {e}"}
    email_sent = send_verification_email(email, code, purpose="register")
    result = {"success": True, "expires_in": 600}
    if email_sent:
        result["message"] = "Verification code sent"
    else:
        result["message"] = "Verification code (email not configured)"
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
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    conn = get_db()
    try:
        has_active, remaining = _has_active_code(conn, user_id=user_id)
    finally:
        conn.close()
    if has_active:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"已有验证码，请等待{remaining}秒后再试")
    conn = get_db()
    try:
        row = conn.execute("SELECT created_at FROM verification_codes WHERE user_id=? AND purpose=? AND used=0 ORDER BY created_at DESC LIMIT 1", (user_id, "password_change")).fetchone()
        if row and row["created_at"]:
            from datetime import datetime as _dt
            elapsed = (_dt.utcnow() - _dt.fromisoformat(row["created_at"])).total_seconds()
            if elapsed < 60:
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"请等待{int(60-elapsed)}秒后再获取验证码")
    finally:
        conn.close()
    code = generate_verification_code(user_id, purpose="password_change")
    email_sent = send_verification_email(user["email"], code)
    result = {"success": True, "expires_in": 600}
    if email_sent:
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
    if not verify_verification_code(user_id, verification_code, purpose="password_change"):
        return {"success": False, "error": "验证码无效或已过期"}
    try:
        updated = update_password(user_id, new_password)
        if updated:
            return {"success": True, "message": "Password updated"}
        return {"success": False, "error": "密码更新失败"}
    except ValueError as e:
        return {"success": False, "error": str(e)}

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
    except:
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
            elapsed = (_dt.utcnow() - _dt.fromisoformat(row["created_at"])).total_seconds()
            if elapsed < 60:
                conn.close()
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"请等待{int(60-elapsed)}秒后再获取验证码")
        conn.close()
    except HTTPException:
        raise
    except:
        conn.close()
    code = generate_verification_code(user_id, purpose=f"email_change:{new_email}")
    email_sent = send_verification_email(new_email, code, purpose="email_change")
    result = {"success": True, "expires_in": 600}
    if email_sent:
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
    if not verify_verification_code(user_id, verification_code, purpose=f"email_change:{new_email}"):
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
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    conn = get_db()
    try:
        has_active, remaining = _has_active_code(conn, user_id=user_id)
    finally:
        conn.close()
    if has_active:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"已有验证码，请等待{remaining}秒后再试")
    conn = get_db()
    try:
        row = conn.execute("SELECT created_at FROM verification_codes WHERE user_id=? AND purpose=? AND used=0 ORDER BY created_at DESC LIMIT 1", (user_id, "delete_account")).fetchone()
        if row and row["created_at"]:
            from datetime import datetime as _dt
            elapsed = (_dt.utcnow() - _dt.fromisoformat(row["created_at"])).total_seconds()
            if elapsed < 60:
                conn.close()
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"请等待{int(60-elapsed)}秒后再获取验证码")
        conn.close()
    except HTTPException:
        raise
    except:
        conn.close()
    code = generate_verification_code(user_id, purpose="delete_account")
    email_sent = send_verification_email(user["email"], code, purpose="delete_account")
    result = {"success": True, "expires_in": 600}
    if email_sent:
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
    if not verify_verification_code(user_id, verification_code, purpose="delete_account"):
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
    except:
        body = {}
    username = body.get("username", "").strip()
    avatar_url = body.get("avatar_url", "").strip()
    avatar_color = body.get("avatar_color", "").strip()
    if username is not None and username != "":
        import sys
        sys.path.insert(0, "/home/ubuntu/NeuroAccess/backend")
        from auth import _visual_length, _is_unicode_letter_start, _has_special_symbol
        vlen = _visual_length(username)
        if vlen < 1 or vlen > 20:
            return {"success": False, "error": "名字长度必须在1-20个字符之间"}
        if not _is_unicode_letter_start(username):
            return {"success": False, "error": "名字开头必须是文字"}
        if _has_special_symbol(username):
            return {"success": False, "error": "名字不能包含特殊符号"}
        import re as _re
        if _re.search(r"\s{2,}", username):
            return {"success": False, "error": "名字中不能有连续空格"}
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
    except:
        body = {}
    name = body.get("name", "")
    email = body.get("email", "")
    type_ = body.get("type", "")
    message = body.get("message", "")
    rating = body.get("rating", "")
    try:
        from datetime import datetime
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        email_body = f"""New Feedback Received\n\nTime: {ts}\nType: {type_}\nName: {name or 'Anonymous'}\nEmail: {email or 'Not provided'}\nRating: {rating or 'N/A'}\n\nMessage:\n{message}\n"""
        log_path = os.path.join(BASE_DIR, "feedback.log")
        with open(log_path, "a") as f2:
            f2.write("\n=== " + ts + " ===\n" + email_body + "\n")
        return {"success": True, "message": "Feedback received"}
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

@app.post("/api/eeg-simulator/generate")
async def eeg_simulator_generate(request: Request):
    try:
        try:
            body = await request.json()
        except:
            body = {}
        if not EEG_SIMULATOR_AVAILABLE:
            return {"success": False, "error": f"EEG simulator module not available: {EEG_SIMULATOR_ERROR}"}
        result = generate_synthetic_eeg(
            duration_sec=float(body.get("duration_sec", 10.0)),
            sampling_rate=int(body.get("sampling_rate", 250)),
            n_channels=int(body.get("n_channels", 8)),
            alpha_power=float(body.get("alpha_power", 1.0)),
            beta_power=float(body.get("beta_power", 0.5)),
            theta_power=float(body.get("theta_power", 0.3)),
            delta_power=float(body.get("delta_power", 0.8)),
            alpha_freq=float(body.get("alpha_freq", 10.0)),
            beta_freq=float(body.get("beta_freq", 20.0)),
            theta_freq=float(body.get("theta_freq", 6.0)),
            delta_freq=float(body.get("delta_freq", 3.0)),
            noise_level=float(body.get("noise_level", 0.1)),
            artifact_blink=bool(body.get("artifact_blink", False)),
            artifact_muscle=bool(body.get("artifact_muscle", False)),
            artifact_powerline=bool(body.get("artifact_powerline", False)),
        )
        return result
    except Exception as e:
        import traceback
        return {"success": False, "error": str(e), "detail": traceback.format_exc()}

@app.get("/api/eeg-simulator/presets")
def eeg_simulator_presets():
    if not EEG_SIMULATOR_AVAILABLE:
        return {"success": False, "error": f"EEG simulator module not available: {EEG_SIMULATOR_ERROR}"}
    return {"success": True, "presets": get_preset_states()}
