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
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from utils import safe_float, to_jsonable, safe_name, normalize_language
from explanations import generate_explanations, template_beginner, template_student, template_research

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
    if s < 55: reasons.append("low signal quality" if lang == "en" else "信号质量较低")
    if s >= 80: reasons.append("stable waveform" if lang == "en" else "波形稳定")
    nc = len(quality.get("noisy_channels") or data.get("noisy_channels") or [])
    if nc > 3: reasons.append("multiple noisy channels" if lang == "en" else "多个噪声通道")
    dur = data.get("overview", {}).get("duration") or data.get("duration") or "Unknown"
    if "sec" in str(dur).lower() or "秒" in str(dur):
        if lang == "en": reasons.append("short recording")
        else: reasons.append("记录时间短")
    if s >= 90: level = "High" if lang == "en" else "较高"
    elif s >= 55: level = "Moderate" if lang == "en" else "中等"
    else: level = "Low" if lang == "en" else "较低"
    return {"level": level, "reason": "; ".join(reasons) or ("stable metrics" if lang == "en" else "指标稳定")}

def _get_limitations(lang: str) -> List[str]:
    if lang == "en":
        return ["Basic artifact rejection", "Montage metadata may be incomplete", "No task labels assumed", "Qualified reviewer should inspect raw traces"]
    return ["基本的 artifact 处理", "Montage 元数据可能不完整", "无任务标签假设", "若用于研究，应由专业人员检查原始波形"]

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

@app.get("/health")
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
async def analyze(file: UploadFile = File(...), language: str = Form("zh")):
    lang = normalize_language(language)
    saved = save_upload(file)
    if not saved.get("success"):
        return {"success": False, "file_name": file.filename or "unknown", "error": saved.get("error", "Unknown error")}
    try:
        if analyze_edf is None:
            return {"success": False, "file_name": saved.get("file_name"), "error": f"analyze_edf not available: {ANALYSIS_IMPORT_ERROR}"}
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(analyze_edf, saved["path"])
            try:
                raw_result = future.result(timeout=120)
            except concurrent.futures.TimeoutError:
                return {"success": False, "file_name": saved.get("file_name"), "error": f"Analysis timed out after 120s. File may be too large or corrupted."}
        enhanced = enhance_analysis(raw_result, lang)
        explanations = generate_explanations(enhanced)
        analysis_out = {**enhanced, "explanations": explanations, "disclaimer": {"zh": "本报告仅用于 EEG 科普教育。不构成医疗建议、诊断或治疗推荐。EEG 数据不能单独用于诊断任何疾病。如有健康问题，请咨询专业医生。", "en": "This report is for EEG educational purposes only. It does not constitute medical advice, diagnosis, or treatment recommendations. EEG data alone cannot diagnose any disease. For health concerns, consult a qualified physician."}, "file_size_mb": saved.get("file_size_mb", 0)}
        return {"success": True, "file_name": saved.get("file_name"), "analysis": analysis_out}
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc() if os.getenv("DEBUG") else "Enable DEBUG=1 for details"
        file_name = saved.get("file_name")
        return {"success": False, "file_name": file_name, "error": f"Internal server error: {str(e)}", "detail": error_detail if os.getenv("DEBUG") else "Enable DEBUG=1 for details"}
