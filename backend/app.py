"""
NeuroAccess Backend v2.5.0
- /analyze 唯一接口：上传 → MNE 分析 → Ollama 三层解释 → 完整 JSON
- v2.5.0: 拆分为 utils.py / explanations.py / analysis.py
"""
import os
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
        return {"success": False, "error": "No file provided"}
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
        return {"success": False, "error": f"Failed to save file: {e}"}
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
        return {"success": False, "error": f"Auth module not available: {AUTH_IMPORT_ERROR}"}
    payload = verify_token(token)
    if not payload:
        return {"success": False, "error": "Invalid or expired token. Please login again."}
    user_id = int(payload["sub"])
    # ── Analysis ─────────────────────────────────────────────────
    lang = normalize_language(language)
    saved = save_upload(file)
    if not saved.get("success"):
        return {"success": False, "file_name": file.filename or "unknown", "error": saved.get("error", "Unknown error")}
    try:
        if analyze_edf is None:
            return {"success": False, "file_name": saved.get("file_name"), "error": f"analyze_edf not available: {ANALYSIS_IMPORT_ERROR}"}
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(analyze_edf, saved["path"], lang)
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


# =================================================================
# Auth routes
# =================================================================

try:
    from auth import (
        create_user, authenticate_user, create_access_token, verify_token, get_user_by_id,
        generate_verification_code, verify_verification_code, update_password, get_db,
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
def auth_register(username: str = Form(...), email: str = Form(...), password: str = Form(...)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": f"Auth module not available: {AUTH_IMPORT_ERROR}"}
    try:
        user = create_user(username, email, password)
        token = create_access_token({"sub": str(user["id"]), "username": user["username"]})
        return {"success": True, "token": token, "user": {"id": user["id"], "username": user["username"], "email": user["email"]}}
    except ValueError as e:
        return {"success": False, "error": str(e)}

@app.post("/api/auth/login")
def auth_login(username_or_email: str = Form(...), password: str = Form(...)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": f"Auth module not available: {AUTH_IMPORT_ERROR}"}
    user = authenticate_user(username_or_email, password)
    if not user:
        return {"success": False, "error": "Invalid credentials"}
    token = create_access_token({"sub": str(user["id"]), "username": user["username"]})
    return {"success": True, "token": token, "user": {"id": user["id"], "username": user["username"], "email": user["email"]}}

@app.get("/api/auth/me")
def auth_me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "Auth module not available"}
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = get_user_by_id(int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return {"success": True, "user": {"id": user["id"], "username": user["username"], "email": user["email"]}}

@app.post("/api/auth/logout")
def auth_logout():
    return {"success": True, "message": "Logged out"}



def send_verification_email(to_email: str, code: str) -> bool:
    """Send verification code via Resend API. Returns True on success."""
    resend_key = os.getenv("RESEND_API_KEY", "")
    if not resend_key:
        print(f"[Email] RESEND_API_KEY not configured. Code for {to_email}: {code}")
        return False
    
    import json, urllib.request, urllib.error
    url = "https://api.resend.com/emails"
    payload = json.dumps({
        "from": "NeuroAccess <onboarding@resend.dev>",
        "to": [to_email],
        "subject": "NeuroAccess - Password Change Verification Code",
        "text": f"""Hello,

You requested to change your password on NeuroAccess.

Your verification code is: {code}

This code expires in 10 minutes.

If you did not request this, please ignore this email.

Best regards,
NeuroAccess Team
"""
    }).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {resend_key}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            print(f"[Email] Resend success: {result}")
            return True
    except Exception as e:
        print(f"[Email] Resend failed: {e}")
        return False

@app.post("/api/auth/verification-code")
def auth_verification_code(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Generate a 6-digit verification code for password change. Rate limit: 1 per minute."""
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "Auth module not available"}
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
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
                    detail=f"Please wait {remaining} seconds before requesting a new code",
                )
    finally:
        conn.close()

    code = generate_verification_code(user_id, purpose="password_change")
    # Send email with verification code
    email_sent = send_verification_email(user["email"], code)
    return {"success": True, "message": "Verification code sent to your email" if email_sent else "Verification code generated (email not configured, check server logs)", "expires_in": 600}


@app.post("/api/auth/change-password")
def auth_change_password(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    verification_code: str = Form(...),
    new_password: str = Form(...),
):
    """Change password with verification code."""
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "Auth module not available"}
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id = int(payload["sub"])
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    # Verify the code
    if not verify_verification_code(user_id, verification_code, purpose="password_change"):
        return {"success": False, "error": "Invalid or expired verification code"}
    # Update password
    try:
        updated = update_password(user_id, new_password)
        if updated:
            return {"success": True, "message": "Password updated successfully"}
        return {"success": False, "error": "Failed to update password"}
    except ValueError as e:
        return {"success": False, "error": str(e)}

@app.put("/api/auth/profile")
async def auth_update_profile(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Update user profile (username, avatar_url)."""
    if not AUTH_AVAILABLE:
        return {"success": False, "error": "Auth module not available"}
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
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
        if avatar_url:
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
