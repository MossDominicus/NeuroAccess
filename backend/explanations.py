"""
NeuroAccess Backend — AI 解释生成模块
OpenRouter API 调用 / prompt 构建 / 三层解释
"""
import os
import json
import concurrent.futures
import requests
from typing import Any, Dict

from utils import safe_float, to_jsonable

# ── Language name map for AI prompt output language ──────────────────
LANG_NAME_MAP = {
    "zh": "Chinese",
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "ja": "Japanese",
    "ko": "Korean",
}

# ── OpenRouter 配置 ─────────────────────────────────────
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "qwen/qwen-2.5-7b-instruct")
OPENROUTER_URL   = "https://openrouter.ai/api/v1/chat/completions"

# Beginner 禁止术语（中英文）
FORBIDDEN = [
    "alpha", "beta", "theta", "delta", "gamma", "psd", "bandpower",
    "artifact", "sampling rate", "electrode", "channel", "montage",
    "frequency", "oscillation", "rhythm", "amplitude", "spectrum",
    "noise", "signal quality", "filtering", "impedance",
    "阿尔法", "贝塔", "西塔", "德尔塔", "频段", "功率谱", "通道", "电极", "伪迹", "采样率",
]


def contains_beginner_jargon(text: str) -> bool:
    """检查 beginner 解释是否包含过多技术术语；只有出现 >= 3 个禁用词才认为是 jargon"""
    text_lower = str(text).lower()
    count = sum(1 for t in FORBIDDEN if t in text_lower)
    return count >= 3


def call_openrouter(prompt: str, timeout: int = 60) -> Dict[str, Any]:
    """调用 OpenRouter API；失败返回 { success: False, error }"""
    if not OPENROUTER_API_KEY:
        return {"success": False, "error": "OpenRouter API key not configured"}
    try:
        resp = requests.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 700,
                "temperature": 0.15,
            },
            timeout=(10, timeout),
        )
        if resp.status_code != 200:
            return {"success": False, "error": f"OpenRouter failed (HTTP {resp.status_code}): {resp.text[:500]}"}
        text = str(resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")).strip()
        if not text:
            return {"success": False, "error": "OpenRouter returned empty response"}
        return {"success": True, "text": text}
    except requests.exceptions.Timeout:
        return {"success": False, "error": f"OpenRouter request timed out after {timeout} seconds."}
    except Exception as e:
        return {"success": False, "error": f"OpenRouter unexpected error: {str(e)}"}


def call_ollama(prompt: str, timeout: int = 120) -> Dict[str, Any]:
    """兼容旧接口，内部调用 OpenRouter"""
    return call_openrouter(prompt, timeout=timeout)


def _quality_level(score: Any, lang: str) -> str:
    s = safe_float(score, -1)
    if s >= 80: return "good" if lang == "en" else ("较好" if lang == "zh" else "good")
    if s >= 55: return "moderate" if lang == "en" else ("中等" if lang == "zh" else "moderate")
    if s >= 0:  return "limited" if lang == "en" else ("受限" if lang == "zh" else "limited")
    return "unknown" if lang == "en" else ("暂不确定" if lang == "zh" else "unknown")


def template_beginner(a: Dict, lang: str) -> str:
    q = _quality_level(a.get("signal_quality_score"), lang)
    n = len(a.get("noisy_channels") or [])
    if lang == "en":
        return (
            f"This file can be opened and read. It contains brainwave recordings from several sensors.\n\n"
            f"Overall readability: {q}. {n} sensor area(s) may be harder to read.\n\n"
            "This report helps you understand whether the file is clear enough for learning. "
            "It does not tell whether someone is healthy or sick."
        )
    if lang == "zh":
        return (
            f"这份文件可以被正常读取。它记录的是一段时间内的脑电波形。\n\n"
            f"整体可读性：{q}。系统发现 {n} 个可能较难阅读的传感区域。\n\n"
            "这份报告主要帮助你判断这份数据是否清楚、是否适合学习。"
            "它不能说明一个人是否健康，也不能用于判断疾病。"
        )
    # fallback English for unsupported languages
    return (
        f"This file can be opened and read. It contains brainwave recordings from several sensors.\n\n"
        f"Overall readability: {q}. {n} sensor area(s) may be harder to read.\n\n"
        "This report helps you understand whether the file is clear enough for learning. "
        "It does not tell whether someone is healthy or sick."
    )


def template_student(a: Dict, lang: str) -> str:
    bp   = a.get("bandpower_percent") or a.get("frequency_analysis", {}).get("bandpower_percent") or {}
    bp_s = ", ".join(f"{k}: {v}" for k, v in list(bp.items())[:4])
    ch_s = ", ".join((a.get("channel_names") or [])[:10]) or ("not available" if lang == "en" else "暂无")
    ns   = a.get("noisy_channels") or []
    n_s  = ", ".join(ns[:8]) or ("none highlighted" if lang == "en" else "未明显标出")
    q    = _quality_level(a.get("signal_quality_score"), lang)
    if lang == "en":
        return (
            f"Learning-level summary: {a.get('channel_count')} channels, "
            f"SR={a.get('sampling_rate')}, duration={a.get('duration')}. Channels: {ch_s}.\n\n"
            f"Signal quality is {q}. Noisier channels: {n_s}.\n\n"
            f"Band overview (percent): {bp_s}. Delta/theta/alpha/beta are broad frequency ranges used in EEG education."
        )
    if lang == "zh":
        return (
            f"学习者摘要：{a.get('channel_count')} 个通道，"
            f"采样率 {a.get('sampling_rate')}，时长 {a.get('duration')}。通道：{ch_s}。\n\n"
            f"信号质量：{q}。噪声通道：{n_s}。\n\n"
            f"频段概览（百分比）：{bp_s}。delta/theta/alpha/beta 是 EEG 学习中常用的宽频段。"
        )
    # fallback English
    return (
        f"Learning-level summary: {a.get('channel_count')} channels, "
        f"SR={a.get('sampling_rate')}, duration={a.get('duration')}. Channels: {ch_s}.\n\n"
        f"Signal quality is {q}. Noisier channels: {n_s}.\n\n"
        f"Band overview (percent): {bp_s}. Delta/theta/alpha/beta are broad frequency ranges used in EEG education."
    )


def template_research(a: Dict, lang: str) -> str:
    bp   = a.get("bandpower_percent") or a.get("frequency_analysis", {}).get("bandpower_percent") or {}
    bp_s = ", ".join(f"{k}: {v}" for k, v in list(bp.items())[:4])
    ch_s = ", ".join((a.get("channel_names") or [])[:20]) or ("not available" if lang == "en" else "暂无")
    ns   = a.get("noisy_channels") or []
    n_s  = ", ".join(ns[:10]) or ("none highlighted" if lang == "en" else "未明显标出")
    if lang == "en":
        return (
            f"Technical review: channels={a.get('channel_count')}, SR={a.get('sampling_rate')}, "
            f"duration={a.get('duration')}. Channels: {ch_s}. Quality={a.get('signal_quality_score')}. "
            f"Noisy: {n_s}.\n\n"
            f"Bandpower (percent): {bp_s}.\n\n"
            "Limitations: artifact rejection is basic; montage metadata may be incomplete; "
            "no task labels assumed. Qualified reviewer should inspect raw traces before research use."
        )
    if lang == "zh":
        return (
            f"技术审阅：通道数={a.get('channel_count')}，采样率={a.get('sampling_rate')}，"
            f"时长={a.get('duration')}。通道：{ch_s}。质量评分={a.get('signal_quality_score')}。噪声：{n_s}。\n\n"
            f"频段功率（百分比）：{bp_s}。\n\n"
            "局限性：artifact 处理较基础，montage 元数据可能不完整，无任务标签。"
            "若用于研究，应由专业人员检查原始波形。"
        )
    # fallback English
    return (
        f"Technical review: channels={a.get('channel_count')}, SR={a.get('sampling_rate')}, "
        f"duration={a.get('duration')}. Channels: {ch_s}. Quality={a.get('signal_quality_score')}. "
        f"Noisy: {n_s}.\n\n"
        f"Bandpower (percent): {bp_s}.\n\n"
        "Limitations: artifact rejection is basic; montage metadata may be incomplete; "
        "no task labels assumed. Qualified reviewer should inspect raw traces before research use."
    )


def _build_prompt(a: Dict, level: str, lang: str) -> str:
    payload      = json.dumps(to_jsonable(a), ensure_ascii=False, indent=2)
    output_lang  = LANG_NAME_MAP.get(lang, "English")
    boundary     = (
        "CRITICAL BOUNDARIES - You MUST follow these rules:\n"
        "1. NEVER provide medical diagnosis, disease labels, treatment advice, or normal/abnormal judgment.\n"
        "2. NEVER interpret bandpower values as indicators of mental states (e.g., do NOT say 'high alpha means relaxation' or 'low beta means poor attention').\n"
        "3. NEVER suggest what the user should do based on EEG data (no lifestyle, medication, or therapy advice).\n"
        "4. NEVER claim to detect emotions, attention levels, cognitive states, personality traits, or intelligence.\n"
        "5. ALWAYS emphasize the limitations of EEG analysis and that single-session data cannot characterize brain function.\n"
        "6. ALWAYS use cautious language (e.g., 'may be associated with', 'could reflect', 'might indicate') when describing patterns.\n"
        "7. This is for EEG literacy, education, and accessibility ONLY."
    )
    sq = safe_float(a.get("signal_quality_score", 100), 100)
    uncertainty = ""
    if sq < 50:
        uncertainty = (
            "IMPORTANT - Low Data Quality Warning:\n"
            "Signal quality is below 50/100. The data may be too noisy for reliable interpretation.\n"
            "You MUST begin your explanation by stating this uncertainty clearly. "
            "Suggest that better quality recordings would provide more reliable insights.\n"
        )
    if level == "beginner":
        return (
            f"You are writing ONLY the Beginner explanation for an EEG literacy website.\n"
            f"Output language: {output_lang}.\nAudience: ordinary non-expert users.\nRules:\n"
            "- 4 to 6 short sentences.\n- Do NOT use technical jargon "
            "(alpha, beta, theta, delta, PSD, bandpower, artifact, sampling rate, channel, electrode).\n"
            f"{uncertainty}"
            f"- {boundary}\nEEG analysis JSON:\n{payload}\n"
        )
    if level == "student":
        return (
            f"You are writing ONLY the Student explanation.\nOutput language: {output_lang}.\n"
            f"Audience: neuroscience beginners.\nRules:\n- 2 short paragraphs.\n"
            f"- Explain alpha/beta/theta/delta if useful.\n- Mention signal quality.\n{uncertainty}{boundary}\nEEG JSON:\n{payload}\n"
        )
    return (
        f"You are writing ONLY the Research explanation.\nOutput language: {output_lang}.\n"
        f"Audience: researchers/techs.\nRules:\n- 2-3 technical paragraphs.\n"
        f"- You MAY use PSD, bandpower, artifacts, sampling rate, montage.\n{uncertainty}{boundary}\nEEG JSON:\n{payload}\n"
    )


def _generate_explanations_for_lang(analysis: Dict, lang: str) -> Dict[str, str]:
    """为指定语言生成三层解释；三层各独立调用 Ollama（并行），失败用模板兜底"""
    a     = analysis.copy()
    results: Dict[str, str] = {}
    fallbacks = {
        "beginner": template_beginner(a, lang),
        "student":  template_student(a, lang),
        "research": template_research(a, lang),
    }

    def _call_level(level: str) -> str:
        try:
            prompt = _build_prompt(a, level, lang)
            ollama = call_ollama(prompt, timeout=90)
            text = str(ollama.get("text", "")).strip() if ollama.get("success") else ""
            if not text or (level == "beginner" and contains_beginner_jargon(text)):
                return fallbacks[level]
            return text
        except Exception:
            return fallbacks[level]

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        future_beginner = executor.submit(_call_level, "beginner")
        future_student  = executor.submit(_call_level, "student")
        future_research = executor.submit(_call_level, "research")
        for key, future in [("beginner", future_beginner), ("student", future_student), ("research", future_research)]:
            try:
                results[key] = future.result(timeout=120)
            except Exception:
                results[key] = fallbacks[key]

    return results


def generate_explanations(analysis: Dict, primary_lang: str = "zh") -> Dict[str, Dict[str, str]]:
    """为分析结果生成指定语言 + 英文双层解释（并行）"""
    results: Dict[str, Dict[str, str]] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        future_primary = executor.submit(_generate_explanations_for_lang, analysis, primary_lang)
        future_en = executor.submit(_generate_explanations_for_lang, analysis, "en")
        try:
            results[primary_lang] = future_primary.result(timeout=120)
        except Exception:
            results[primary_lang] = {
                "beginner": template_beginner(analysis, primary_lang),
                "student": template_student(analysis, primary_lang),
                "research": template_research(analysis, primary_lang),
            }
        try:
            results["en"] = future_en.result(timeout=120)
        except Exception:
            results["en"] = {
                "beginner": template_beginner(analysis, "en"),
                "student": template_student(analysis, "en"),
                "research": template_research(analysis, "en"),
            }
    return results
