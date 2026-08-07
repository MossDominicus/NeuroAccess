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


def template_beginner(a: Dict, lang: str) -> str:
    q = _quality_level(a.get("signal_quality_score"), lang)
    n = len(a.get("noisy_channels") or [])
    if lang == "en":
        return (
            f"This file can be opened and read. It contains brainwave recordings from several sensors.\n\n"
            f"Overall readability: {q}. {n} sensor area(s) may be harder to read.\n\n"
            "This report helps you understand whether the file is clear enough for learning."
        )
    if lang == "zh":
        return (
            f"这份文件可以被正常读取。它记录的是一段时间内的脑电波形。\n\n"
            f"整体可读性：{q}。系统发现 {n} 个可能较难阅读的传感区域。\n\n"
            "这份报告主要帮助你判断这份数据是否清楚、是否适合学习。"
        )
    # fallback English for unsupported languages
    return (
        f"This file can be opened and read. It contains brainwave recordings from several sensors.\n\n"
        f"Overall readability: {q}. {n} sensor area(s) may be harder to read.\n\n"
        "This report helps you understand whether the file is clear enough for learning."
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
    dom  = a.get("dominant_frequency") or a.get("frequency_analysis", {}).get("dominant_frequency")
    ns   = a.get("noisy_channels") or []
    n_s  = ", ".join(ns[:10]) or ("none highlighted" if lang == "en" else "未明显标出")
    n_n  = len(ns)
    ch_n = a.get("channel_count")
    sr   = a.get("sampling_rate")
    dur  = a.get("duration")
    sq   = a.get("signal_quality_score")
    if lang == "en":
        return (
            f"Dataset metadata: {ch_n} channels at SR={sr} Hz, duration={dur}. "
            f"Signal quality score: {sq}/100.\n\n"
            f"Spectral summary (bandpower percent): {bp_s}. "
            f"Dominant frequency: {dom} Hz. "
            f"Noisy channels flagged: {n_n} ({n_s})."
        )
    if lang == "zh":
        return (
            f"数据集概览：{ch_n} 个通道，采样率 {sr} Hz，时长 {dur}。"
            f"信号质量评分：{sq}/100。\n\n"
            f"频段功率（百分比）：{bp_s}。"
            f"主导频率：{dom} Hz。"
            f"噪声通道数：{n_n}（{n_s}）。"
        )
    # fallback English
    return (
        f"Dataset metadata: {ch_n} channels at SR={sr} Hz, duration={dur}. "
        f"Signal quality score: {sq}/100.\n\n"
        f"Spectral summary (bandpower percent): {bp_s}. "
        f"Dominant frequency: {dom} Hz. "
        f"Noisy channels flagged: {n_n} ({n_s})."
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
    literacy = a.get("literacy_scores") or {}
    return {
        "channel_count":            overview.get("channel_count"),
        "sampling_rate":            overview.get("sampling_rate"),
        "duration":                 overview.get("duration"),
        "duration_seconds":         overview.get("recording_duration_seconds"),
        "signal_quality_score":     sq.get("signal_quality_score"),
        # 只保留前若干项，避免超长通道列表
        "noisy_channels":           (sq.get("noisy_channels") or [])[:20],
        "possible_artifacts":       (sq.get("possible_artifacts") or [])[:10],
        "clipping_detected":        sq.get("clipping_detected"),
        "missing_data":             sq.get("missing_data"),
        "high_frequency_noise":     sq.get("high_frequency_noise"),
        # 频段只用聚合百分比 / 均值（已经是 5 个 key 的字典），丢弃逐通道 bandpower 数组
        "bandpower_percent":        fa.get("bandpower_percent") or {},
        "average_bandpower":        fa.get("average_bandpower") or {},
        "dominant_frequency":       fa.get("dominant_frequency"),
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
        "7. Do NOT add a general disclaimer at the end of every explanation; the website already displays limitation notices separately."
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
            f"- Explain alpha/beta/theta/delta if useful.\n- Mention signal quality.\n"
            f"- DO NOT list all channel names individually; refer to them collectively as 'the channels'.\n"
            f"{uncertainty}{boundary}\nEEG JSON:\n{payload}\n"
        )
    return (
        f"You are writing ONLY the Research explanation.\nOutput language: {output_lang}.\n"
        f"Audience: researchers/technicians.\nRules:\n- 2-3 concise technical paragraphs.\n"
        f"- DO NOT list individual channel names; refer to them collectively.\n"
        f"- Focus on technical INTERPRETATION: dominant frequency, bandpower distribution, "
        f"any artifacts or noise patterns, data quality implications for analysis.\n"
        f"- Mention what can/cannot be reliably concluded from this recording.\n"
        f"- You MAY use PSD, bandpower, artifacts, sampling rate, montage terminology.\n"
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
            ollama = call_ollama(prompt, timeout=30)
            text = str(ollama.get("text", "")).strip() if ollama.get("success") else ""
            if not text or (level == "beginner" and contains_beginner_jargon(text)):
                return fallbacks[level]
            return _strip_disclaimers(text)
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

    # 英文：只用模板（避免额外 API 开销，分析加速 ~15s）
    results["en"] = {
        "beginner": template_beginner(analysis, "en"),
        "student": template_student(analysis, "en"),
        "research": template_research(analysis, "en"),
    }

    return results
