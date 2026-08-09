"""
NeuroAccess Backend — AI 解释生成模块
OpenRouter API 调用 / prompt 构建 / 三层解释
"""
import os
import re
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

# Beginner 禁止术语（中英文）——只禁真正深奥的术语；
# 允许 channel/电极/采样率/frequency/alpha/beta 等描述性词（AI 需要它们描述数据本身）
FORBIDDEN = [
    "psd", "bandpower", "montage", "artifact", "amplitude", "impedance",
    "oscillation", "rhythm", "spectrum", "filtering", "nyquist",
    "功率谱", "伪迹", "阻抗", "振幅", "振荡", "节律", "频谱", "滤波", "奈奎斯特",
]


def contains_beginner_jargon(text: str) -> bool:
    """检查 beginner 解释是否包含过多深奥术语；出现 >= 3 个禁用词才认为是 jargon"""
    text_lower = str(text).lower()
    count = sum(1 for t in FORBIDDEN if t in text_lower)
    return count >= 3


def call_openrouter(prompt: str, timeout: int = 30) -> Dict[str, Any]:
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
                "max_tokens": 400,
                "temperature": 0.15,
            },
            timeout=(10, timeout),
        )
        if resp.status_code != 200:
            body = resp.text[:500]
            # 友好的错误归类：上下文超长属于已知可降级情况，不向用户暴露原始 API 文本
            if "input length" in body.lower() or "too long" in body.lower():
                return {"success": False, "error": "AI input exceeded model context limit; using template explanation."}
            return {"success": False, "error": f"OpenRouter failed (HTTP {resp.status_code})."}
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


def _band_plain_name(band: str | None, lang: str) -> str:
    """把频段名转成入门级通俗名称"""
    if lang != "zh":
        if not band: return "an unknown wave type"
        return {"delta": "slow waves", "theta": "slow waves", "alpha": "mid-speed waves", "beta": "fast waves"}.get(band, f"{band} waves")
    if not band: return "一种未知波型"
    return {"delta": "慢波", "theta": "慢波", "alpha": "中速波", "beta": "快波"}.get(band, f"{band}波")


def _pct(v) -> float | None:
    """把 bandpower_percent 的值（可能是 '58.1%'、'58.1'、数字、None）统一转成 float；失败返回 None"""
    if v is None: return None
    try:
        s = str(v).strip().rstrip('%').strip()
        return float(s)
    except (TypeError, ValueError):
        return None


# 标准 10-20 系统电极名 + 通用命名模式（数字编号 / 自定义名）—— 用于检测 AI 是否违规列出了通道名
_CHANNEL_PATTERNS = [
    r"\bEEG\s*Fp1\b", r"\bEEG\s*Fp2\b", r"\bEEG\s*AF[3-7]\b", r"\bEEG\s*F[3-8z]\b",
    r"\bEEG\s*T[3-6]\b", r"\bEEG\s*C[3-4z]\b", r"\bEEG\s*P[3-4z]\b", r"\bEEG\s*O[1-2z]\b",
    r"\bEEG\s*A[1-2]\b", r"\bEEG\s*M[1-2]\b", r"\bEEG\s*I[1-2]\b",
    r"\bFp1\b", r"\bFp2\b", r"\bAF[3-7]\b", r"\bF[3-8z]\b",
    r"\bT[3-6]\b", r"\bC[3-4z]\b", r"\bP[3-4z]\b", r"\bO[1-2z]\b",
    r"\bA[1-2]\b", r"\bM[1-2]\b", r"\bI[1-2]\b",
    r"\bEEG\s*CH\s*\d+\b", r"\bEEG\s*\d{2,3}\b", r"\bchannel\s*\d+\b",
]
def _fix_channel_pattern(p: str) -> str:
    """把 \b 边界改成 Unicode 安全的前/后顾。

    关键：中文（如"和""如""的"）在 Python re 的 Unicode 模式下属于 \\w，
    因此当中文直接紧贴 'EEG'/'Fp1' 时 \\b 根本不存在 → 通道名无法匹配。
    改用 (?<![A-Za-z0-9])（前顾）与 (?![A-Za-z0-9])（后顾），
    只排除 ASCII 字母/数字，中文相邻也能正常命中。
    """
    if p.startswith(r"\b"):
        p = r"(?<![A-Za-z0-9])" + p[2:]
    if p.endswith(r"\b"):
        p = p[:-2] + r"(?![A-Za-z0-9])"
    return p


_CHANNEL_RE = re.compile(
    "|".join(_fix_channel_pattern(p) for p in _CHANNEL_PATTERNS),
    re.IGNORECASE,
)
# 连续通道名列表（逗号/顿号/空格/和/与/及 分隔，可选前置"如/例如/比如"引导词），整体删除。
# 注意：不带前缀的裸数字（如 68、128）不是通道名，不能匹配——只有 EEG/CH/channel 前缀的数字编号才算。
# 前/后边界均用 (?<![A-Za-z0-9]) / (?![A-Za-z0-9]) 而非 \\b（原因见 _fix_channel_pattern）。
_CHANNEL_ATOM = r"(?:(?:EEG|CH|Channel|channel)\s*)?(?:Fp1|Fp2|AF[3-7]|F[3-8z]|T[3-6]|C[3-4z]|P[3-4z]|O[1-2z]|A[1-2]|M[1-2]|I[1-2])"
_CHANNEL_LIST_RE = re.compile(
    r"(?<![A-Za-z0-9])(?:如|例如|比如|如\s*[:：]|例如\s*[:：]|比如\s*[:：])?\s*"
    + _CHANNEL_ATOM
    + r"(?:\s*[,，、;；\s和和与及]\s*" + _CHANNEL_ATOM + r")*(?![A-Za-z0-9])",
    re.IGNORECASE,
)


def _strip_channel_names(text: str) -> str:
    """强制清除 AI 输出中的通道名（不符合 STYLE RULES 时兜底）。
    直接删除通道名本身并清理残留连接词/标点，不留下'各通道'之类的占位词。
    例如 '两个噪声通道：EEG O2和EEG A2-A1。' → '两个噪声通道。'"""
    if not text:
        return text
    # 1) 连续通道名列表整体删除（含连接逗号/顿号/和/及）
    out = _CHANNEL_LIST_RE.sub("", text)
    # 2) 孤立单个通道名删除（含可选 EEG/CH/channel 前缀）
    out = _CHANNEL_RE.sub("", out)
    # 3) 清理残留（只处理被删通道名留下的碎片，不动正常标点）：
    #    a) 孤立的 EEG/CH/channel 前缀（后跟标点/连接词/破折号/行尾）。
    #       不能用 \b（中文相邻时 \b 失效），改用 (?<![A-Za-z0-9])
    #       后置 lookahead 加上 "和/与/及"：处理 'EEG 和EEG' 这类连接词残留
    out = re.sub(r"(?<![A-Za-z0-9])(?:EEG|CH|Channel|channel)(?=\s*[-—–。.,，、;；:！？!?和与及]|\s*$)", "", out)
    #    b) 孤立的连接词"和/与/及"（前是标点/括号/空格，后是标点/括号/空格/行尾）
    out = re.sub(r"(?<=[：:,，、;；\s（(【])(?:和|与|及|or|and)(?=\s*[-—–。.,，、;；:！？!?\s)）】]|$)", "", out)
    #    b2) 括号内残留的孤立引导词"如/例如/比如/比方"（通道名被删后只剩空壳，如"噪声通道（如）"）
    out = re.sub(r"[（(]\s*(?:如|例如|比如|比方)\s*[：:，,、]?\s*[）)]", "", out)
    #    c) 破折号碎片 "A2-A1" → "-"
    out = re.sub(r"-{1,3}", "", out)
    #    d) "：。" / "，。" / "、。" → "。"
    out = re.sub(r"[：:，,、;；]\s*[。.]", "。", out)
    #    e) 行尾残留冒号/连接词/空格
    out = re.sub(r"[：:,，、;；\s]+$", "", out)
    #    f) 清空空括号（删除通道名后留下的"（）"或"（ ）"）
    out = re.sub(r"[（(]\s*[）)]", "", out)
    out = re.sub(r"[【\[]\s*[】\]]", "", out)
    # 压缩行内多余空格（不碰换行——避免把 ### 标题与正文合并，导致标题正则误删整段）
    out = re.sub(r"[ \t]+", " ", out)
    return out.strip()


def _dominant_band_from_percent(bp: Dict[str, Any]) -> str | None:
    """从 bandpower_percent 字典找主导频段（数值最高），自动处理 '%' 字符串"""
    best, best_v = None, -1.0
    for k, v in bp.items():
        pv = _pct(v)
        if pv is not None and pv > best_v:
            best_v, best = pv, k
    return best


def _band_pct_display(bp: Dict[str, Any]) -> str:
    """把 bandpower_percent 渲染成 'delta: 12.1%, beta: 58.1%'，自动剥 % 防双 %"""
    items = []
    for k, v in list(bp.items())[:4]:
        p = _pct(v)
        if p is None:
            items.append(f"{k}: {v}")
        else:
            items.append(f"{k}: {p:.1f}%")
    return ", ".join(items)


def template_beginner(a: Dict, lang: str) -> str:
    q     = _quality_level(a.get("signal_quality_score"), lang)
    n     = len(a.get("noisy_channels") or [])
    bp    = a.get("bandpower_percent") or a.get("frequency_analysis", {}).get("bandpower_percent") or {}
    dom   = _dominant_band_from_percent(bp) if bp else None
    ch_n  = a.get("channel_count")
    dur   = a.get("duration")
    dom_plain = _band_plain_name(dom, lang)
    pct_num   = round(_pct(bp[dom])) if dom and bp.get(dom) is not None else None
    n_s   = ("没有明显不清晰的区域" if lang == "zh" else "no noticeably unclear areas") if n == 0 else (
        f"有 {n} 个区域读数较不清晰" if lang == "zh" else f"{n} area(s) are harder to read")
    if lang == "en":
        return (
            f"This recording contains brainwave signals from {ch_n or 'multiple'} sensors "
            f"over {dur or 'a short'} period of time.\n\n"
            f"The most prominent activity is {dom_plain}"
            + (f" (about {pct_num}% of total activity)" if pct_num is not None else "")
            + f". {n_s}.\n\n"
            f"Overall, the recording is {q} — it is clear enough to study how brainwaves behave, "
            f"but it reflects only this particular moment of recording."
        )
    if lang == "zh":
        return (
            f"这份记录包含了来自 {ch_n or '多个'} 个传感位置的脑电信号，"
            f"记录了 {dur or '一小段时间'} 的脑电活动。\n\n"
            f"其中最主要的是{dom_plain}，"
            + (f"约占全部活动的 {pct_num}%" if pct_num is not None else "占了较大比例")
            + f"。{n_s}。\n\n"
            f"总体来看，这份记录的清晰度属于「{q}」，足以用来观察和了解脑电波的基本样子；"
            f"但请注意，它只反映这一小段记录时间内的情况。"
        )
    # fallback English for unsupported languages
    return (
        f"This recording contains brainwave signals from {ch_n or 'multiple'} sensors "
        f"over {dur or 'a short'} period of time.\n\n"
        f"The most prominent activity is {dom_plain}"
        + (f" (about {pct_num}% of total activity)" if pct_num is not None else "")
        + f". {n_s}.\n\n"
        f"Overall, the recording is {q} — it is clear enough to study how brainwaves behave, "
        f"but it reflects only this particular moment of recording."
    )


def template_student(a: Dict, lang: str) -> str:
    bp   = a.get("bandpower_percent") or a.get("frequency_analysis", {}).get("bandpower_percent") or {}
    # 主导频段（百分比最高的频段，自动处理 '%' 字符串）
    dom_band = _dominant_band_from_percent(bp) if bp else None
    ns   = a.get("noisy_channels") or []
    n_n  = len(ns)
    n_s  = ", ".join(ns[:3]) if ns else ("none" if lang == "en" else ("无" if lang == "zh" else "none"))
    q    = _quality_level(a.get("signal_quality_score"), lang)
    ch_n = a.get("channel_count")
    sr   = a.get("sampling_rate")
    dur  = a.get("duration")
    bp_s = _band_pct_display(bp)
    dom_str = (f"alpha/theta/beta range" if not dom_band else f"{dom_band} band") if lang == "en" else (f"{dom_band} 频段" if dom_band else "未知频段")
    if lang == "en":
        return (
            f"Recording overview: {ch_n} channels, SR={sr} Hz, duration={dur}. "
            f"Overall signal readability: {q}.\n\n"
            f"Spectral distribution across the recording (percent): {bp_s}. "
            f"The dominant band is the {dom_str}. "
            f"About {n_n} channel(s) appear noisier than the rest"
            + (f" (e.g., {n_s})" if ns else "")
            + ", which can affect local readings.\n\n"
            f"Note: This summary describes the recording as a whole, not individual sensors."
        )
    if lang == "zh":
        return (
            f"这份记录共有 {ch_n} 个通道，采样率 {sr} Hz，时长 {dur}。"
            f"整体信号可读性：{q}。\n\n"
            f"频段功率分布（百分比）：{bp_s}。"
            f"主导频段是 {dom_str}。"
            f"约 {n_n} 个通道信号偏弱"
            + (f"（如 {n_s}）" if ns else "")
            + "，可能影响局部数据的可信度。\n\n"
            f"提示：以上是对整段记录的总体描述，不是对单个传感器的逐一解读。"
        )
    # fallback English
    return (
        f"Recording overview: {ch_n} channels, SR={sr} Hz, duration={dur}. "
        f"Overall signal readability: {q}.\n\n"
        f"Spectral distribution across the recording (percent): {bp_s}. "
        f"The dominant band is the {dom_str}. "
        f"About {n_n} channel(s) appear noisier than the rest"
        + (f" (e.g., {n_s})" if ns else "")
        + ", which can affect local readings.\n\n"
        f"Note: This summary describes the recording as a whole, not individual sensors."
    )


def template_research(a: Dict, lang: str) -> str:
    bp   = a.get("bandpower_percent") or a.get("frequency_analysis", {}).get("bandpower_percent") or {}
    dom_band = _dominant_band_from_percent(bp) if bp else None
    ns   = a.get("noisy_channels") or []
    n_s  = ", ".join(ns[:3]) if ns else ("none" if lang == "en" else ("无" if lang == "zh" else "none"))
    n_n  = len(ns)
    ch_n = a.get("channel_count")
    sr   = a.get("sampling_rate")
    dur  = a.get("duration")
    sq   = a.get("signal_quality_score")
    bp_s = _band_pct_display(bp)
    dom_str = f"{dom_band}" if dom_band else ("unknown" if lang == "en" else ("未知" if lang == "zh" else "unknown"))
    q_label = _quality_level(sq, lang)
    if lang == "en":
        return (
            f"Dataset: {ch_n} channels, SR={sr} Hz, duration={dur}; quality score {sq}/100 ({q_label}).\n\n"
            f"Spectral profile: {bp_s}. Dominant band: {dom_str}. "
            f"Noisy-channel count: {n_n}"
            + (f" (e.g., {n_s})" if ns else "")
            + ".\n\n"
            f"Interpretation guidance: the relative bandpower distribution describes the spectral balance, "
            f"not cognitive state. With {n_n} channel(s) below noise tolerance, "
            f"any per-channel analysis should treat those channels as unreliable. "
            f"Overall quality ({q_label}) supports whole-dataset summaries but limits fine-grained inference."
        )
    if lang == "zh":
        return (
            f"数据集概览：{ch_n} 个通道，采样率 {sr} Hz，时长 {dur}；"
            f"信号质量评分 {sq}/100（{q_label}）。\n\n"
            f"频谱概貌：{bp_s}。主导频段：{dom_str}。"
            f"噪声通道数：{n_n}"
            + (f"（如 {n_s}）" if ns else "")
            + "。\n\n"
            f"解读提示：频段功率的相对分布描述的是频谱平衡，不代表认知状态。"
            f"有 {n_n} 个通道低于噪声容忍度，针对这些通道的逐通道分析应视为不可靠。"
            f"整体质量（{q_label}）足以支撑数据集级结论，但限制细粒度推断。"
        )
    # fallback English
    return (
        f"Dataset: {ch_n} channels, SR={sr} Hz, duration={dur}; quality score {sq}/100 ({q_label}).\n\n"
        f"Spectral profile: {bp_s}. Dominant band: {dom_str}. "
        f"Noisy-channel count: {n_n}"
        + (f" (e.g., {n_s})" if ns else "")
        + ".\n\n"
        f"Interpretation guidance: the relative bandpower distribution describes the spectral balance, "
        f"not cognitive state. With {n_n} channel(s) below noise tolerance, "
        f"any per-channel analysis should treat those channels as unreliable. "
        f"Overall quality ({q_label}) supports whole-dataset summaries but limits fine-grained inference."
    )


def _summarize_for_ai(a: Dict) -> Dict:
    """
    只保留 AI 解释需要的「派生标量指标」，剔除所有数组 / 波形 / 时间序列数据。
    目的：防止把过大的 analysis JSON 直接塞给 qwen2.5-7b（32K 上下文），
    触发 OpenRouter 的 "400 input length too long" 错误。
    """
    sq       = a.get("signal_quality") or {}
    fa       = a.get("frequency_analysis") or {}
    overview = a.get("overview") or {}
    literacy = a.get("literacy_scores") or a.get("eeg_literacy_scores") or {}
    return {
        "channel_count":            overview.get("channel_count") or a.get("channel_count"),
        "sampling_rate":            overview.get("sampling_rate") or a.get("sampling_rate"),
        "duration":                 overview.get("duration") or a.get("duration"),
        "duration_seconds":         overview.get("recording_duration_seconds") or a.get("recording_duration_seconds") or a.get("duration_seconds"),
        "signal_quality_score":     sq.get("signal_quality_score") or a.get("signal_quality_score"),
        # 只保留前若干项，避免超长通道列表
        "noisy_channels":           (sq.get("noisy_channels") or a.get("noisy_channels") or [])[:20],
        "possible_artifacts":       (sq.get("possible_artifacts") or a.get("possible_artifacts") or [])[:10],
        "clipping_detected":        sq.get("clipping_detected") or a.get("clipping_detected"),
        "missing_data":             sq.get("missing_data") or a.get("missing_data"),
        "high_frequency_noise":     sq.get("high_frequency_noise") or a.get("high_frequency_noise"),
        # 频段只用聚合百分比 / 均值（已经是 5 个 key 的字典），丢弃逐通道 bandpower 数组
        "bandpower_percent":        fa.get("bandpower_percent") or a.get("bandpower_percent") or {},
        "average_bandpower":        fa.get("average_bandpower") or a.get("average_bandpower") or {},
        "dominant_frequency":       fa.get("dominant_frequency") or a.get("dominant_frequency"),
        "dominant_band":            fa.get("dominant_band") or a.get("dominant_band"),
        "literacy_scores":          literacy,
        "file_size_mb":             a.get("file_size_mb"),
        "what_this_data_cannot_tell": a.get("what_this_data_cannot_tell"),
    }


def _build_prompt(a: Dict, level: str, lang: str) -> str:
    # 只发送精简后的派生指标，避免超出模型上下文窗口
    prompt_data = _summarize_for_ai(a)
    payload     = json.dumps(to_jsonable(prompt_data), ensure_ascii=False, indent=2)

    # 安全网：硬性限制发给模型的内容长度（qwen2.5-7b 上下文约 32K token ≈ 128K 字符，
    # 留出充裕余量给指令文本）。正常精简后远低于此值，这里仅作兜底。
    MAX_PROMPT_CHARS = 12000
    if len(payload) > MAX_PROMPT_CHARS:
        payload = payload[:MAX_PROMPT_CHARS] + "\n... [truncated: remaining metrics omitted]"
    output_lang  = LANG_NAME_MAP.get(lang, "English")
    boundary     = (
        "CRITICAL BOUNDARIES - You MUST follow these rules:\n"
        "1. NEVER provide medical diagnosis, disease labels, treatment advice, or normal/abnormal judgment.\n"
        "2. NEVER interpret bandpower values as indicators of mental states (e.g., do NOT say 'high alpha means relaxation' or 'low beta means poor attention').\n"
        "3. NEVER suggest what the user should do based on EEG data (no lifestyle, medication, or therapy advice).\n"
        "4. NEVER claim to detect emotions, attention levels, cognitive states, personality traits, or intelligence.\n"
        "5. ALWAYS use cautious language (e.g., 'may be associated with', 'could reflect', 'might indicate') when describing patterns.\n"
        "6. This is for EEG literacy, education, and accessibility ONLY.\n"
        "7. Do NOT add a general disclaimer at the end of every explanation; the website already displays limitation notices separately.\n"
        "8. NEVER list individual channel names (e.g., 'EEG 001, EEG 002, ...'). Refer to them collectively as 'the channels' or 'the recording'.\n"
        "9. NEVER pad the explanation with channel lists, sampling-rate restatements, or parameter dumps. Focus on INTERPRETATION and ANALYSIS.\n"
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
            f"Output language: {output_lang}.\n"
            f"Audience: ordinary non-expert users who know nothing about EEG.\n\n"
            f"TASK: Write a clear, plain, but scientifically RIGOROUS explanation of what this brainwave recording shows. "
            f"5-8 short sentences, ONE paragraph.\n\n"
            f"STYLE RULES:\n"
            f"- Use simple, precise scientific language. Do NOT use metaphors, analogies, or poetic comparisons.\n"
            f"- Avoid technical jargon where possible: instead of alpha/beta/theta/delta say 'slow brainwaves (delta/theta range)' "
            f"or 'fast brainwaves (beta range)' — or simply describe the frequency activity in plain words. "
            f"If you must use a technical term, define it briefly in parentheses.\n"
            f"- State facts only: the recording's duration, whether slow or fast activity dominates, how clean or noisy the signal is. "
            f"Do NOT speculate about mental states, emotions, attention, or what the person was doing.\n"
            f"- Reference the real numbers naturally in words (e.g., 'fast brainwaves accounted for roughly half of the activity'), "
            f"but never dump raw numbers or parameter lists.\n"
            f"- NEVER mention individual channel names or channel 1, channel 2, etc.\n"
            f"- Keep it concise and factual — every sentence should convey accurate information from the data. No generic filler.\n"
            f"{uncertainty}"
            f"{boundary}\nEEG analysis JSON:\n{payload}\n"
        )
    if level == "student":
        return (
            f"You are writing ONLY the Student explanation for an EEG literacy website.\n"
            f"Output language: {output_lang}.\n"
            f"Audience: neuroscience beginners taking their first EEG course.\n\n"
            f"TASK: Write a teaching-style explanation in 3 short paragraphs. "
            f"This is a middle level — more detail than the beginner summary, less depth than a research report. "
            f"Each paragraph must teach a specific concept AND relate it to THIS recording's real numbers.\n\n"
            f"PARAGRAPH 1 — The recording and its quality: "
            f"Describe the setup in one line (channels, sampling rate, duration), then explain "
            f"what the signal quality score means for how much we can trust this data, "
            f"connecting the quality level to the actual score.\n\n"
            f"PARAGRAPH 2 — Brainwave bands in this recording: "
            f"Briefly explain what delta/theta/alpha/beta waves are and their rough frequency ranges, "
            f"then point to which band dominates in THIS recording with its real percentage "
            f"(cautious wording: may reflect, could indicate) and compare the bands against each other "
            f"using the real percentages.\n\n"
            f"PARAGRAPH 3 — Noise and artifacts in this recording: "
            f"In one or two sentences explain what EEG artifacts and noisy channels are, "
            f"then state how many channels were flagged noisy here (or none) and whether "
            f"artifacts/clipping/high-frequency noise were detected.\n\n"
            f"STYLE RULES:\n"
            f"- You MAY use the terms alpha/beta/theta/delta, bandpower, artifact, sampling rate, channel — but define each briefly the first time.\n"
            f"- NEVER EVER list individual channel names such as 'EEG Fp1, EEG Fp2, F3, F4...' or 'EEG 001, EEG 002...'. "
            f"NEVER list a numbered/lettered subset of channels either. Refer to channels ONLY as a count (e.g. '21 channels') or collectively ('the channels', '各通道'). "
            f"Violations are automatically stripped at output time, so writing them out wastes your response.\n"
            f"- DO NOT use markdown heading markers (### / ## / #) or 'Paragraph 1:' style section labels. "
            f"Output plain paragraphs separated by blank lines only — any markdown heading is stripped at output time.\n"
            f"- Output language MUST be fully {output_lang}. NO English words mixed in (except technical "
            f"abbreviations: EEG, PSD, SNR, Nyquist, EEG 001/002 channel patterns). Everything else in {output_lang}.\n"
            f"- Use the real numbers from the JSON (percentages, quality score, counts).\n"
            f"- 3 paragraphs, each 3-4 sentences. TOTAL around 200-280 words. Substantive, no filler.\n"
            f"{uncertainty}{boundary}\nEEG JSON:\n{payload}\n"
        )
    # research
    return (
        f"You are writing ONLY the Research explanation for an EEG literacy website.\n"
        f"Output language: {output_lang}.\n"
        f"Audience: researchers, EEG technicians, and data analysts.\n\n"
        f"TASK: Write a RIGOROUS, DENSE research analysis of THIS recording in 3 paragraphs. "
        f"This is the deepest level of the report — it MUST be the longest and most information-dense "
        f"of the three levels. Every sentence must carry the highest-value technical information a "
        f"researcher would act on. NO filler, NO generic methodology notes.\n\n"
        f"KILL RULES — delete any sentence that:\n"
        f"  (a) merely restates the parameters without interpretation (e.g., 'the recording has 21 channels "
        f"at 500 Hz' is allowed ONLY as a brief opening clause, never a full sentence of its own);\n"
        f"  (b) would read identically for any EEG file ('sampling rate above Nyquist supports analysis', "
        f"'duration limits frequency resolution' — only keep when this recording's values make it a "
        f"REAL, quantified limitation such as 'only 20 s ⇒ ~0.05 Hz resolution');\n"
        f"  (c) is a hedge with no number behind it.\n\n"
        f"PARAGRAPH 1 — Dominant spectral finding & absolute power (4-5 sentences): "
        f"Open with the dominant band and its real percentage. Give the ABSOLUTE average_bandpower "
        f"comparison (μV²/Hz) and QUANTIFY the dominance (e.g., 'alpha is 4.1× theta, 3.2× beta'), "
        f"then assess how physiological (1/f-like) the profile is and how far it deviates, "
        f"and name the single finding a researcher would act on.\n\n"
        f"PARAGRAPH 2 — Methodological limits that actually bind THIS data (3-4 sentences): "
        f"State only the constraints that are REAL for this recording, quantified (frequency resolution "
        f"from duration, e.g. '3 min ⇒ ~0.01 Hz resolution, adequate for band ratios; 20 s ⇒ ~0.05 Hz, "
        f"coarse for alpha-peak fitting'). Say which analysis types this data CAN support vs where it "
        f"falls short — with the numbers justifying it.\n\n"
        f"PARAGRAPH 3 — Quality, downstream safety & handling (3-4 sentences): "
        f"Report the quality score, noisy-channel count (category only), and artifacts/clipping/high-freq "
        f"findings in ONE compact sentence. Then state the direct implication for downstream analyses "
        f"(which are safe vs risky) and end with 1 concrete preprocessing action derived from the actual "
        f"findings. No generic advice.\n\n"
        f"STYLE RULES:\n"
        f"- You MAY and SHOULD use technical terminology: PSD, bandpower, artifacts, Nyquist, montage, SNR.\n"
        f"- NEVER EVER list individual channel names such as 'Fp1, Fp2, F3, F4, T3, T4, C3, C4...' or 'EEG 001, EEG 002...'. "
        f"NEVER list a numbered/lettered subset of channels either. Refer to channels ONLY as a count (e.g. '21 channels') or collectively ('the channels', '各通道'). "
        f"Violations are automatically stripped at output time, so writing them out wastes your response.\n"
        f"- Write the ENTIRE explanation, including any paragraph headings, in {output_lang}. "
        f"Never leave headings in English — translate or omit them. The output must be fully in {output_lang}.\n"
        f"- DO NOT use markdown heading markers (### / ## / #) or 'Paragraph 1:' / 'Paragraph 2:' style section labels. "
        f"Output plain paragraphs separated by blank lines only — any markdown heading or English section label "
        f"is automatically stripped at output time.\n"
        f"- Output language MUST be fully {output_lang}. NO mixing of English words or sentences inside a "
        f"Chinese explanation (and vice versa). Allowed technical abbreviations only: EEG, PSD, SNR, "
        f"Nyquist, EEG 001/002 (channel naming pattern). Everything else in {output_lang}.\n"
        f"- NEVER output sentences stating that the data cannot provide information about "
        f"intelligence, personality, mental health, diseases, emotions, or specific psychological disorders "
        f"(the website already displays a unified disclaimer; do not repeat it inside the explanation).\n"
        f"- Do NOT fabricate or overstate problems (e.g., do not claim hidden low-frequency noise or "
        f"threats to analyses unless the JSON explicitly shows them).\n"
        f"- 3 paragraphs, each 4-5 sentences. TOTAL 400-500 words — the LONGEST section of the report, "
        f"but every sentence must add information a researcher could not get by reading the raw parameters.\n"
        f"{uncertainty}{boundary}\nEEG JSON:\n{payload}\n"
    )


import re

# 各语言常见免责声明句式，用于从 LLM 输出中移除末尾/穿插的重复免责说明
DISCLAIMER_PATTERNS = [
    # Chinese
    r"(?:但是|不过|然而|需要|请注意|重要|提醒|免责|声明|注意).*?(?:不能|无法|不应|不要|请勿|不应用来|不足以|不适合|无法判断|无法诊断|无法确定|不能反映|不代表|不说明|不表明|不等同于|不能作为|仅供参考|仅作参考|参考).*?(?:诊断|疾病|健康|智商|性格|心理|情绪|认知|功能|状态|治疗|建议|医疗|医学|专业|医生|医师|结论|判断|依据|用途)?[。；]?",
    r"(?:单次|一次|单次记录|一次记录|仅一次|单次 EEG|一次 EEG).*?(?:不能|无法|不应|不要|不足以|不适合|无法判断|无法诊断|无法确定|不能反映|不代表|不说明|不表明).*?(?:大脑|具体|功能|状态|智商|性格|心理|健康|疾病|情绪|认知|治疗|诊断|建议)?[。；]?",
    r"(?:EEG|脑电图|脑电|频谱|功率|波段|频段|分析).*?(?:不能|无法|不应|不要|不足以|不适合|无法用来|不能直接|不能简单|不能单独|不能作为).*?(?:诊断|判断|确定|说明|反映|代表|指示|预测|评估|衡量|评价).*?(?:疾病|健康|智商|性格|心理|情绪|认知|状态|功能|治疗|医疗|专业|结论)?[。；]?",
    # English
    r"(?:However|But|Please note|Important|Disclaimer|Note that|Keep in mind|It is important to).*?(?:cannot|can not|should not|does not|is not|may not|unable to|not enough|not sufficient|not suitable|not appropriate|not intended|not a substitute|not diagnostic|not medical|not clinical).*?(?:diagnose|determine|reflect|represent|indicate|predict|assess|evaluate|measure|judge|tell|show|suggest|advise|treat|medical|health|disease|condition|IQ|personality|mental|cognitive|emotional|state|function|condition|disorder|ADHD|depression|anxiety|professional|physician|doctor|clinician)?[.!?;]?",
    r"(?:single|one|individual|single-session|one-time).*?(?:recording|session|measurement|data|EEG).*?(?:cannot|can not|should not|does not|is not|may not|unable to|not enough|not sufficient).*?(?:diagnose|determine|reflect|represent|indicate|predict|assess|evaluate|measure|judge|tell|show|characterize).*?(?:brain|health|disease|condition|IQ|personality|mental|cognitive|emotional|state|function|disorder|medical|clinical)?[.!?;]?",
    # Spanish
    r"(?:Esta|Este|La|El).*?(?:información|análisis|herramienta|sistema|resultado|dato|datos|aplicación).*?(?:no debe|no se debe|no debe ser|no puede|no es|no constituye|no reemplaza|no sustituye|no proporciona|no ofrece|no pretende|solo con fines|únicamente|meramente|exclusivamente).*?(?:diagnosticar|diagnóstico|médico|médica|consejo|consulta|tratamiento|terapia|enfermedad|enfermedades|condición|condiciones|trastorno|trastornos|evaluar|determinar|juzgar|indicar|predecir|asesorar)?[.!?;]?",
    r"(?:No|Este|Estos).*?(?:debe|deben|puede|pueden).*?(?:ser utilizado|ser utilizada|ser usada|ser usado|interpretarse|considerarse|tomarse).*?(?:como|para).*?(?:diagnóstico|diagnóstico médico|reemplazo|sustituto|sustituta|alternativa).*?(?:médico|médica|profesional|clínico)?[.!?;]?",
    r"(?:Solo|Únicamente|Meramente|Exclusivamente).*?(?:para|a título|con fines).*?(?:informativos|informativo|referencia|educativos|educativo|orientativos|orientativo).*?(?:y no|no|sin).*?(?:debe|puede|constituye|reemplaza|sustituye).*?(?:médico|médica|clínico|diagnóstico|tratamiento|profesional)?[.!?;]?",
    # French
    r"(?:Ces|Cette|Ce|L'|Les).*?(?:informations|analyse|outil|système|résultat|données|application|explication).*?(?:ne doit pas|ne doivent pas|ne peut pas|ne peuvent pas|n'est pas|ne sont pas|ne constitue pas|ne remplacent pas|ne remplace pas|ne se substitue pas|ne prétend pas|n'est pas destiné|uniquement à titre|à titre|uniquement).*?(?:diagnostiquer|diagnostic|médical|médicale|avis|consultation|traitement|thérapie|maladie|maladies|état|condition|trouble|troubles|évaluer|déterminer|indiquer|prédire|conseiller)?[.!?;]?",
    r"(?:Ne|À titre).*?(?:doit|doivent|peut|peuvent).*?(?:pas être utilisé|pas être utilisée|pas être employé|pas être employée|pas constituer|pas remplacer|pas se substituer).*?(?:un|une|le|la|comme|en tant que).*?(?:diagnostic|remplacement|substitut|alternative).*?(?:médical|médicale|professionnel|clinique)?[.!?;]?",
    r"(?:Uniquement|Seulement|À titre|Simplement).*?(?:informatif|informative|d'information|de référence|pédagogique|d'orientation).*?(?:et ne|sans).*?(?:doit|doivent|peut|peuvent|constitue|remplace|se substitue).*?(?:médical|médicale|clinique|diagnostic|traitement|professionnel)?[.!?;]?",
    # German
    r"(?:Diese|Dieser|Das|Die|Dieses).*?(?:Informationen|Analyse|Werkzeug|System|Ergebnis|Ergebnisse|Daten|Anwendung|Erklärung|Auswertung|Bewertung).*?(?:darf nicht|dürfen nicht|kann nicht|können nicht|ist nicht|sind nicht|stellt keine|stellen keine|ersetzt nicht|ersetzen nicht|sollte nicht|sollten nicht|nicht als|nicht zur|nicht für|ausschließlich|lediglich|nur).*?(?:Diagnose|diagnostizieren|medizinisch|medizinische|medizinischer|ärztlich|ärztliche|ärztlicher|Behandlung|Therapie|Krankheit|Krankheiten|Zustand|Zustände|Störung|Störungen|bewerten|beurteilen|feststellen|anzeigen|vorhersagen|beraten)?[.!?;]?",
    r"(?:Diese|Diese).*?(?:Informationen|Analyse|Ergebnisse|Daten).*?(?:sind nicht|ist nicht|dienen nicht|stellt keine|stellen keine).*?(?:als|für|zur).*?(?:medizinische|ärztliche|klinische).*?(?:Diagnose|Beurteilung|Beratung|Bewertung|Empfehlung)?[.!?;]?",
    r"(?:Nur|Ausschließlich|Lediglich|Bloß).*?(?:zu|zur|als|für).*?(?:Informationszwecken|Information|Referenz|Bildungszwecken|Orientierung).*?(?:und|aber).*?(?:nicht|keine|kein|keinen).*?(?:medizinisch|ärztlich|klinisch|Diagnose|Behandlung|Therapie|professionell)?[.!?;]?",
    # Japanese
    r"(?:この|本|当).*?(?:情報|分析|ツール|システム|結果|データ|アプリケーション|説明|評価).*?(?:は|が).*?(?:医療|医学|診断|治療|健康|病気|疾患|症状|状態).*?(?:目的|ため|用|代わり|代替|判断|評価|決定).*?(?:では(?:あり|ござい)ません|できません|しないでください|できません|するものでは(?:あり|ござい)ません|いたしません|行いません|できませんので|お控えください)?",
    r"(?:医師|専門家|医療機関).*?(?:の|による|へ).*?(?:診断|治療|相談|アドバイス|判断|指示).*?(?:を|に).*?(?:代わる|代替|置き換える).*?(?:ものでは(?:あり|ござい)ません|では(?:あり|ござい)ません|できません)?",
    r"(?:参考|参照|教育|学習|情報提供).*?(?:目的|用|ため|として).*?(?:のみ|だけ|限定).*?(?:であり|で).*?(?:医療|医学|診断|治療|健康).*?(?:目的|用|ため).*?(?:では(?:あり|ござい)ません|するものではありません)?",
    # Korean
    r"(?:이|본|해당).*?(?:정보|분석|도구|시스템|결과|데이터|애플리케이션|설명|평가).*?(?:는|은|이|가).*?(?:의학적|의료|진단|치료|건강|질병|질환|증상|상태).*?(?:목적|용도|대체|판단|평가|결정).*?(?:이(?: 아닙니| 아닙)다|할 수 없습니다|하지 마십시오|할 수 없습니다|위한 것이 아닙니다|목적으로 하지 않습니다)?",
    r"(?:의사|전문가|의료진|의료 기관).*?(?:의|에게|에).*?(?:진단|치료|상담|조언|판단|지시).*?(?:를|을).*?(?:대체|대신|갈음).*?(?:할 수 없습니다|하는 것이 아닙니다|위한 것이 아닙니다|되지 않습니다)?",
    r"(?:참고|참조|교육|학습|정보 제공).*?(?:목적|용도|용).*?(?:으로|로|만|만을|입니다).*?(?:의학적|의료|진단|치료|건강).*?(?:목적|용도|판단).*?(?:이(?: 아닙니| 아닙)다|할 수 없습니다|위한 것이 아닙니다)?",
]


def _strip_disclaimers(text: str) -> str:
    """移除 LLM 输出中重复的免责声明；保留主体解释内容。"""
    if not text:
        return text
    # 先尝试移除独立成段的免责声明段落（以换行分隔）
    paragraphs = [p.strip() for p in str(text).split("\n") if p.strip()]
    cleaned = []
    for p in paragraphs:
        if any(re.search(pat, p, re.IGNORECASE) for pat in DISCLAIMER_PATTERNS):
            continue
        cleaned.append(p)
    result = "\n\n".join(cleaned)
    # 如果整段被删光了，退回原文本避免空输出
    return result if result.strip() else text


# 标题行模式：用于从非英文解释中剔除。
# ① AI 有时输出 "### Spectral analysis" / "### 噪声与伪迹分析" — 任何以 # 开头（1-4 个）作为段落分隔的行都视为多余标题，统一删除
# ② AI 有时输出 "Paragraph 1 — ..." / "Section 2:" 等英文段落标记，同样删除
_EN_HEADING_RE = re.compile(
    r"^#{1,6}\s+\S.*$",
    re.MULTILINE,
)


def _strip_en_headings(text: str, lang: str) -> str:
    """非英文解释中剔除 AI 偶尔留下的标题/段落标记（'Paragraph 1 — ...'、'### Spectral'、'### 中文标题'），
    保证输出与界面语言一致。英文解释原样保留。"""
    if lang == "en" or not text:
        return text
    # 1) 删 markdown 标题行（### 或 ## 等开头）
    text = _EN_HEADING_RE.sub("", text)
    # 2) 删英文段落标记 "Paragraph 1 — ...\n" 等（行首）
    text = re.sub(
        r"^(?:Paragraph|Section|Step|Part)\s*\d*[.:、\-\s]*[A-Za-z][A-Za-z0-9 ,&'()\-/]{2,80}\s*$",
        "",
        text,
        flags=re.MULTILINE,
    )
    # 3) 清理通道名替换的啰嗦："各通道和EEG 各通道-各通道" → "各通道"
    text = re.sub(r"\bEEG\s*各通道", "各通道", text)
    text = re.sub(r"各通道\s*[,，、和与及]\s*EEG\s*各通道", "各通道", text)
    text = re.sub(r"各通道\s*[,，、和与及]+\s*各通道", "各通道", text)
    # 4) 删掉 AI 输出的中英混杂句（英文连续 ≥5 字符 + 中文夹在一起的整句）
    cleaned = []
    for line in text.split("\n"):
        if not line.strip():
            cleaned.append(line)
            continue
        ascii_run = max((len(m.group()) for m in re.finditer(r"[A-Za-z][A-Za-z\s,.\-']{4,}", line)), default=0)
        if ascii_run >= 8:  # 长英文片段 ≥8 字符 → 整句删除
            continue
        cleaned.append(line)
    text = "\n".join(cleaned)
    # 清理多余空行
    lines = [ln for ln in text.split("\n") if ln.strip()]
    return "\n".join(lines).strip()


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
            ollama = call_ollama(prompt, timeout=75)
            text = str(ollama.get("text", "")).strip() if ollama.get("success") else ""
            if not text or (level == "beginner" and contains_beginner_jargon(text)):
                return fallbacks[level]
            # 所有级别都强制清除通道名列表（避免 AI 违反 prompt 列通道）
            cleaned = _strip_channel_names(_strip_en_headings(_strip_disclaimers(text), lang))
            return cleaned
        except Exception:
            return fallbacks[level]

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        future_beginner = executor.submit(_call_level, "beginner")
        future_student  = executor.submit(_call_level, "student")
        future_research = executor.submit(_call_level, "research")
        for key, future in [("beginner", future_beginner), ("student", future_student), ("research", future_research)]:
            try:
                results[key] = future.result(timeout=45)
            except Exception:
                results[key] = fallbacks[key]

    return results


def generate_explanations(analysis: Dict, primary_lang: str = "zh") -> Dict[str, Dict[str, str]]:
    """为分析结果生成指定语言的三层解释；英文直接用模板（省掉另外 3 次 OpenRouter 调用）"""
    results: Dict[str, Dict[str, str]] = {}

    # 主语言：调用 OpenRouter（3 路并行）
    try:
        results[primary_lang] = _generate_explanations_for_lang(analysis, primary_lang)
    except Exception:
        results[primary_lang] = {
            "beginner": template_beginner(analysis, primary_lang),
            "student": template_student(analysis, primary_lang),
            "research": template_research(analysis, primary_lang),
        }

    # 其余语言：只用模板填充（避免额外 API 开销；用户切换语言时仍能看到对应语言的解释）
    for _lang in LANG_NAME_MAP.keys():
        if _lang in results:
            continue
        results[_lang] = {
            "beginner": template_beginner(analysis, _lang),
            "student": template_student(analysis, _lang),
            "research": template_research(analysis, _lang),
        }

    return results
