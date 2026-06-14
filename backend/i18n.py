"""
Backend i18n module for NeuroAccess.
All user-facing strings in the analysis pipeline go through here.
Fallback: unsupported languages → English.
"""
from typing import Dict, List

# ── Core translations ───────────────────────────────────────────────

_SIGNAL_QUALITY_TEXTS: Dict[str, Dict[str, str]] = {
    "zh": {
        "low_signal_quality": "信号质量较低",
        "stable_waveform": "波形稳定",
        "multiple_noisy_channels": "多个噪声通道",
        "short_recording": "记录时间短",
        "stable_metrics": "指标稳定",
        "high": "较高",
        "moderate": "中等",
        "low": "较低",
    },
    "en": {
        "low_signal_quality": "low signal quality",
        "stable_waveform": "stable waveform",
        "multiple_noisy_channels": "multiple noisy channels",
        "short_recording": "short recording",
        "stable_metrics": "stable metrics",
        "high": "High",
        "moderate": "Moderate",
        "low": "Low",
    },
    "es": {
        "low_signal_quality": "calidad de señal baja",
        "stable_waveform": "forma de onda estable",
        "multiple_noisy_channels": "múltiples canales ruidosos",
        "short_recording": "grabación corta",
        "stable_metrics": "métricas estables",
        "high": "Alta",
        "moderate": "Moderada",
        "low": "Baja",
    },
    "fr": {
        "low_signal_quality": "qualité du signal faible",
        "stable_waveform": "forme d'onde stable",
        "multiple_noisy_channels": "plusieurs canaux bruyants",
        "short_recording": "enregistrement court",
        "stable_metrics": "métriques stables",
        "high": "Élevée",
        "moderate": "Modérée",
        "low": "Faible",
    },
    "de": {
        "low_signal_quality": "niedrige Signalqualität",
        "stable_waveform": "stabile Wellenform",
        "multiple_noisy_channels": "mehrere verrauschte Kanäle",
        "short_recording": "kurze Aufzeichnung",
        "stable_metrics": "stabile Metriken",
        "high": "Hoch",
        "moderate": "Mittel",
        "low": "Niedrig",
    },
    "ja": {
        "low_signal_quality": "信号品質が低い",
        "stable_waveform": "安定した波形",
        "multiple_noisy_channels": "複数のノイズチャネル",
        "short_recording": "短い記録",
        "stable_metrics": "安定した指標",
        "high": "高",
        "moderate": "中",
        "low": "低",
    },
    "ko": {
        "low_signal_quality": "낮은 신호 품질",
        "stable_waveform": "안정적인 파형",
        "multiple_noisy_channels": "다중 잡음 채널",
        "short_recording": "짧은 기록",
        "stable_metrics": "안정적인 지표",
        "high": "높음",
        "moderate": "보통",
        "low": "낮음",
    },
}

_LIMITATION_TEXTS: Dict[str, List[str]] = {
    "zh": [
        "基本的伪影处理",
        "导联数据可能不完整",
        "无任务标签假设",
        "若用于研究，应由专业人员检查原始波形",
    ],
    "en": [
        "Basic artifact rejection",
        "Montage metadata may be incomplete",
        "No task labels assumed",
        "Qualified reviewer should inspect raw traces",
    ],
    "es": [
        "Rechazo básico de artefactos",
        "Los metadatos de montaje pueden estar incompletos",
        "No se asumen etiquetas de tareas",
        "Un revisor cualificado debe inspeccionar las trazas en bruto",
    ],
    "fr": [
        "Rejet basique des artefacts",
        "Les métadonnées de montage peuvent être incomplètes",
        "Aucune étiquette de tâche supposée",
        "Un examinateur qualifié devrait inspecter les traces brutes",
    ],
    "de": [
        "Grundlegende Artefaktunterdrückung",
        "Montage-Metadaten können unvollständig sein",
        "Keine Aufgabenlabels angenommen",
        "Ein qualifizierter Prüfer sollte die Rohdaten überprüfen",
    ],
    "ja": [
        "基本的なアーティファクト処理",
        "モンタージュメタデータが不完全な可能性があります",
        "タスクラベルは想定されていません",
        "研究に使用する場合は、専門家が元の波形を確認する必要があります",
    ],
    "ko": [
        "기본적인 아티팩트 처리",
        "몽타주 메타데이터가 불완전할 수 있습니다",
        "작업 레이블이 가정되지 않습니다",
        "연구에 사용하려면 전문가가 원시 파형을 검사해야 합니다",
    ],
}

_ARTIFACT_TEXTS: Dict[str, Dict[str, str]] = {
    "zh": {
        "many_noisy_channels": "过多噪声通道，可能存在肌电伪影",
        "large_values": "检测到异常大值，可能存在工频干扰",
        "many_outliers": "检测到过多异常值，可能存在运动伪影",
    },
    "en": {
        "many_noisy_channels": "Excessive noisy channels; possible EMG artifact",
        "large_values": "Abnormally large values detected; possible power-line interference",
        "many_outliers": "Excessive outliers detected; possible movement artifact",
    },
    "es": {
        "many_noisy_channels": "Canales ruidosos excesivos; posible artefacto EMG",
        "large_values": "Valores anormalmente grandes detectados; posible interferencia de línea eléctrica",
        "many_outliers": "Valores atípicos excesivos detectados; posible artefacto de movimiento",
    },
    "fr": {
        "many_noisy_channels": "Canaux bruyants excessifs; possible artefact EMG",
        "large_values": "Valeurs anormalement élevées détectées; possible interférence de ligne électrique",
        "many_outliers": "Valeurs aberrantes excessives détectées; possible artefact de mouvement",
    },
    "de": {
        "many_noisy_channels": "Übermäßig verrauschte Kanäle; mögliches EMG-Artefakt",
        "large_values": "Abnorm große Werte erkannt; mögliche Netzfrequenzstörung",
        "many_outliers": "Übermäßige Ausreißer erkannt; mögliches Bewegungsartefakt",
    },
    "ja": {
        "many_noisy_channels": "ノイズチャネルが多すぎます; EMGアーティファクトの可能性があります",
        "large_values": "異常に大きな値が検出されました; 電源線干渉の可能性があります",
        "many_outliers": "異常値が多すぎます; 動きアーティファクトの可能性があります",
    },
    "ko": {
        "many_noisy_channels": "과도한 잡음 채널; EMG 아티팩트 가능성",
        "large_values": "비정상적으로 큰 값이 감지되었습니다; 전원선 간섭 가능성",
        "many_outliers": "과도한 이상값 감지; 움직임 아티팩트 가능성",
    },
}

_CONFIDENCE_REASONS: Dict[str, Dict[str, str]] = {
    "zh": {
        "high_quality": "信号质量评分较高",
        "moderate_quality": "信号质量中等，部分通道存在噪声",
        "low_quality": "信号质量较低，存在较多噪声或伪影",
    },
    "en": {
        "high_quality": "High signal quality score",
        "moderate_quality": "Moderate signal quality; some channels contain noise",
        "low_quality": "Low signal quality; significant noise or artifacts present",
    },
    "es": {
        "high_quality": "Puntuación de calidad de señal alta",
        "moderate_quality": "Calidad de señal moderada; algunos canales contienen ruido",
        "low_quality": "Calidad de señal baja; ruido o artefactos significativos presentes",
    },
    "fr": {
        "high_quality": "Score de qualité du signal élevé",
        "moderate_quality": "Qualité du signal modérée; certains canaux contiennent du bruit",
        "low_quality": "Qualité du signal faible; bruit ou artefacts significatifs présents",
    },
    "de": {
        "high_quality": "Hohe Signalqualitätsbewertung",
        "moderate_quality": "Mittlere Signalqualität; einige Kanäle enthalten Rauschen",
        "low_quality": "Niedrige Signalqualität; signifikantes Rauschen oder Artefakte vorhanden",
    },
    "ja": {
        "high_quality": "信号品質スコアが高い",
        "moderate_quality": "信号品質は中程度; 一部のチャネルにノイズが含まれています",
        "low_quality": "信号品質が低い; 著しいノイズまたはアーティファクトが存在します",
    },
    "ko": {
        "high_quality": "높은 신호 품질 점수",
        "moderate_quality": "보통 신호 품질; 일부 채널에 잡음이 있습니다",
        "low_quality": "낮은 신호 품질; 상당한 잡음 또는 아티팩트가 있습니다",
    },
}

_CONFIDENCE_LIMITATIONS: Dict[str, Dict[str, str]] = {
    "zh": {
        "noisy_channels": "存在 {} 个噪声通道，可能影响解释准确性",
        "short_duration": "记录时长较短（< 1分钟），统计结果可能不稳定",
        "few_channels": "通道数较少，可能无法反映全脑活动",
        "not_for_diagnosis_1": "EEG 数据不能用于判断智商、性格、心理健康、疾病诊断",
        "not_for_diagnosis_2": "EEG 数据不能用于判断情绪状态、注意力缺陷（如 ADHD）、抑郁症",
    },
    "en": {
        "noisy_channels": "{} noisy channel(s) present; may affect interpretation accuracy",
        "short_duration": "Short recording duration (< 1 min); statistical results may be unstable",
        "few_channels": "Few channels; may not reflect whole-brain activity",
        "not_for_diagnosis_1": "EEG data cannot be used to assess IQ, personality, mental health, or diagnose disease",
        "not_for_diagnosis_2": "EEG data cannot be used to assess emotional state, attention deficit (e.g. ADHD), or depression",
    },
    "es": {
        "noisy_channels": "{} canal(es) ruidoso(s) presente(s); puede afectar la precisión de la interpretación",
        "short_duration": "Duración de grabación corta (< 1 min); los resultados estadísticos pueden ser inestables",
        "few_channels": "Pocos canales; puede no reflejar la actividad cerebral completa",
        "not_for_diagnosis_1": "Los datos de EEG no pueden usarse para evaluar CI, personalidad, salud mental o diagnosticar enfermedades",
        "not_for_diagnosis_2": "Los datos de EEG no pueden usarse para evaluar el estado emocional, déficit de atención (p. ej. TDAH) o depresión",
    },
    "fr": {
        "noisy_channels": "{} canal(aux) bruyant(s) présent(s); peut affecter la précision de l'interprétation",
        "short_duration": "Durée d'enregistrement courte (< 1 min); les résultats statistiques peuvent être instables",
        "few_channels": "Peu de canaux; peut ne pas refléter l'activité cérébrale globale",
        "not_for_diagnosis_1": "Les données EEG ne peuvent pas être utilisées pour évaluer le QI, la personnalité, la santé mentale ou diagnostiquer des maladies",
        "not_for_diagnosis_2": "Les données EEG ne peuvent pas être utilisées pour évaluer l'état émotionnel, le déficit d'attention (p. ex. TDAH) ou la dépression",
    },
    "de": {
        "noisy_channels": "{} verrauschter(e) Kanal(e) vorhanden; kann die Interpretationsgenauigkeit beeinträchtigen",
        "short_duration": "Kurze Aufzeichnungsdauer (< 1 Min.); statistische Ergebnisse können instabil sein",
        "few_channels": "Wenige Kanäle; spiegelt möglicherweise nicht die gesamte Hirnaktivität wider",
        "not_for_diagnosis_1": "EEG-Daten können nicht zur Bewertung von IQ, Persönlichkeit, psychischer Gesundheit oder zur Diagnose von Krankheiten verwendet werden",
        "not_for_diagnosis_2": "EEG-Daten können nicht zur Bewertung des emotionalen Zustands, Aufmerksamkeitsdefizits (z. B. ADHS) oder Depression verwendet werden",
    },
    "ja": {
        "noisy_channels": "{} 個のノイズチャネルがあります; 解釈の精度に影響する可能性があります",
        "short_duration": "記録時間が短い（< 1分）; 統計結果が不安定になる可能性があります",
        "few_channels": "チャネル数が少ない; 全脳活動を反映しない可能性があります",
        "not_for_diagnosis_1": "EEGデータは、IQ、性格、メンタルヘルス、または病気の診断に使用できません",
        "not_for_diagnosis_2": "EEGデータは、感情状態、注意欠陥（例：ADHD）、またはうつ病の評価に使用できません",
    },
    "ko": {
        "noisy_channels": "{}개의 잡음 채널이 있습니다; 해석 정확도에 영향을 미칠 수 있습니다",
        "short_duration": "짧은 기록 시간(< 1분); 통계 결과가 불안정할 수 있습니다",
        "few_channels": "채널 수가 적습니다; 전체 뇌 활동을 반영하지 않을 수 있습니다",
        "not_for_diagnosis_1": "EEG 데이터는 IQ, 성격, 정신 건강 평가 또는 질병 진단에 사용할 수 없습니다",
        "not_for_diagnosis_2": "EEG 데이터는 정서 상태, 주의력 결핍(예: ADHD) 또는 우울증 평가에 사용할 수 없습니다",
    },
}

# ── Helper functions ────────────────────────────────────────────────

def _get_text(mapping: Dict[str, any], lang: str, key: str, *args) -> str:
    """Fetch translated text. Falls back to English, then key itself."""
    texts = mapping.get(lang) or mapping.get("en", {})
    text = texts.get(key, key)
    if args:
        return text.format(*args)
    return text


def get_signal_quality_text(lang: str, key: str, *args) -> str:
    return _get_text(_SIGNAL_QUALITY_TEXTS, lang, key, *args)


def get_limitations(lang: str) -> List[str]:
    return _LIMITATION_TEXTS.get(lang) or _LIMITATION_TEXTS.get("en", [])


def get_artifact_text(lang: str, key: str, *args) -> str:
    return _get_text(_ARTIFACT_TEXTS, lang, key, *args)


def get_confidence_reason(lang: str, key: str, *args) -> str:
    return _get_text(_CONFIDENCE_REASONS, lang, key, *args)


def get_confidence_limitation(lang: str, key: str, *args) -> str:
    return _get_text(_CONFIDENCE_LIMITATIONS, lang, key, *args)
