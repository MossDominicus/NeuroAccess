// Report i18n — 根据分析数据 + 当前语言重新计算显示文本
// 这样切换语言时，报告内容会跟随当前语言，而不是显示生成时的语言

type Lang = "zh" | "en" | "es" | "fr" | "de" | "ja" | "ko";

interface AnalysisData {
  signal_quality_score?: number;
  noisy_channels?: string[];
  overview?: { duration?: string; channel_count?: number };
  [key: string]: any;
}

// ── Normalize confidence level to English key ──────────────────────
const LEVEL_MAP: Record<string, "High" | "Moderate" | "Low"> = {
  High: "High", 较高: "High", 高い: "High", 높음: "High", Alto: "High", Élevé: "High", Hoch: "High",
  Moderate: "Moderate", 中等: "Moderate", 中程度: "Moderate", 보통: "Moderate", Moderado: "Moderate", Modéré: "Moderate", Moderat: "Moderate",
};
export function normalizeLevel(level: string): "High" | "Moderate" | "Low" {
  return LEVEL_MAP[level] || "Low";
}

// ── Confidence level: 返回翻译后的等级文本 ──────────────────────
export function getConfidenceLevelText(level: string, lang: Lang): string {
  const map: Record<Lang, Record<string, string>> = {
    zh: { High: "较高", Moderate: "中等", Low: "较低" },
    en: { High: "High", Moderate: "Moderate", Low: "Low" },
    es: { High: "Alto", Moderate: "Moderado", Low: "Bajo" },
    fr: { High: "Élevé", Moderate: "Modéré", Low: "Faible" },
    de: { High: "Hoch", Moderate: "Moderat", Low: "Niedrig" },
    ja: { High: "高い", Moderate: "中程度", Low: "低い" },
    ko: { High: "높음", Moderate: "보통", Low: "낮음" },
  };
  return map[lang]?.[level] || level;
}

// ── Confidence badge color ─────────────────────────────────────
export function getConfidenceBadgeClass(level: string): string {
  if (level === "High") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400";
  if (level === "Moderate") return "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400";
  return "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400";
}

// ── Confidence reasons: 根据分析数据重新计算 ───────────────────
export function getConfidenceReasons(data: AnalysisData, lang: Lang): string[] {
  const sq = data.signal_quality_score ?? 0;
  const noisyCount = (data.noisy_channels || []).length;
  const duration = data.overview?.duration || "";
  const channelCount = data.overview?.channel_count || 0;
  const reasons: string[] = [];

  const t: Record<Lang, Record<string, string>> = {
    zh: {
      lowQuality: "信号质量较低",
      moderateQuality: "信号质量中等，部分通道存在噪声",
      highQuality: "信号质量较高",
      stableWaveform: "波形稳定",
      noisyChannels: `存在 ${noisyCount} 个噪声通道，可能影响解释准确性`,
      shortDuration: "记录时长较短（< 1分钟），统计结果可能不稳定",
      fewChannels: "通道数较少，可能无法反映全脑活动",
    },
    en: {
      lowQuality: "Low signal quality",
      moderateQuality: "Moderate signal quality, some noisy channels",
      highQuality: "High signal quality",
      stableWaveform: "Stable waveform",
      noisyChannels: `Multiple noisy channels (${noisyCount}) may affect interpretation accuracy`,
      shortDuration: "Short recording duration (< 1 min), statistical results may be unstable",
      fewChannels: "Few channels, may not reflect whole-brain activity",
    },
    es: {
      lowQuality: "Baja calidad de señal",
      moderateQuality: "Calidad de señal moderada, algunos canales con ruido",
      highQuality: "Alta calidad de señal",
      stableWaveform: "Forma de onda estable",
      noisyChannels: `Múltiples canales ruidosos (${noisyCount}) pueden afectar la precisión`,
      shortDuration: "Duración de grabación corta (< 1 min), resultados inestables",
      fewChannels: "Pocos canales, puede no reflejar actividad de todo el cerebro",
    },
    fr: {
      lowQuality: "Faible qualité du signal",
      moderateQuality: "Qualité moyenne, certains canaux bruités",
      highQuality: "Haute qualité du signal",
      stableWaveform: "Forme d'onde stable",
      noisyChannels: `Plusieurs canaux bruités (${noisyCount}) peuvent affecter la précision`,
      shortDuration: "Enregistrement court (< 1 min), résultats instables",
      fewChannels: "Peu de canaux, peut ne pas refléter toute l'activité cérébrale",
    },
    de: {
      lowQuality: "Niedrige Signalgüte",
      moderateQuality: "Mäßige Signalgüte, einige verrauschte Kanäle",
      highQuality: "Hohe Signalgüte",
      stableWaveform: "Stabilie Wellenform",
      noisyChannels: `${noisyCount} verrauschte Kanäle können die Interpretation beeinträchtigen`,
      shortDuration: "Kurze Aufnahmedauer (< 1 Min), statistische Ergebnisse unstabil",
      fewChannels: "Wenig Kanäle, können nicht die gesamte Hirnaktivität reflektieren",
    },
    ja: {
      lowQuality: "信号品質が低い",
      moderateQuality: "信号品質は中程度、一部のチャンネルにノイズ",
      highQuality: "信号品質が高い",
      stableWaveform: "波形は安定している",
      noisyChannels: `ノイズのあるチャンネルが${noisyCount}個、解釈の精度に影響する可能性`,
      shortDuration: "記録時間が短い（< 1分）、統計結果は不安定",
      fewChannels: "チャンネル数が少なく、脳全体の活動を反映しない可能性",
    },
    ko: {
      lowQuality: "신호 품질이 낮음",
      moderateQuality: "신호 품질이 보통, 일부 채널에 노이즈 있음",
      highQuality: "신호 품질이 높음",
      stableWaveform: "파형이 안정적임",
      noisyChannels: `노이즈 채널 ${noisyCount}개, 해석 정확도에 영향 가능`,
      shortDuration: "기록 시간이 짧음 (< 1분), 통계 결과 불안정",
      fewChannels: "채널 수가 적어 전체 뇌 활동 반영하지 못할 수 있음",
    },
  };

  if (sq < 55) reasons.push(t[lang].lowQuality);
  else if (sq >= 80) reasons.push(t[lang].highQuality);
  else reasons.push(t[lang].moderateQuality);

  if (noisyCount > 3) reasons.push(t[lang].noisyChannels);
  if (typeof duration === "string" && (duration.includes("sec") || duration.includes("秒"))) {
    reasons.push(t[lang].shortDuration);
  }

  return reasons;
}

// ── Limitations: 根据当前语言返回 ─────────────────────────────
export function getLimitations(lang: Lang): string[] {
  const map: Record<Lang, string[]> = {
    zh: [
      "基本的伪影处理，结果仅供参考",
      "导联数据可能不完整",
      "无任务标签假设",
      "若用于研究，应由专业人员检查原始波形",
    ],
    en: [
      "Basic artifact rejection, results for reference only",
      "Montage metadata may be incomplete",
      "No task labels assumed",
      "Qualified personnel should inspect raw waveforms if used for research",
    ],
    es: [
      "Rechazo básico de artefactos, resultados solo referenciales",
      "Metadatos de montaje pueden estar incompletos",
      "Sin etiquetas de tarea asumidas",
      "Personal calificado debe revisar formas de onda originales si se usa para investigación",
    ],
    fr: [
      "Rejet d'artefacts basique, résultats indicatifs uniquement",
      "Les métadonnées de montage peuvent être incomplètes",
      "Aucune étiquette de tâche assumée",
      "Le personnel qualifié doit inspecter les formes d'onde brutes si utilisé pour la recherche",
    ],
    de: [
      "Basale Artefakt-Abweisung, Ergebnisse nur referentiell",
      "Montage-Metadaten können unvollständig sein",
      "Keine Task-Labels angenommen",
      "Qualifiziertes Personal sollte Roh-Wellenformen prüfen bei Forschungszwecken",
    ],
    ja: [
      "基本的なアーチファクト処理、結果は参考程度",
      "モンタージュメタデータが不完全な可能性",
      "タスクラベルなしの想定",
      "研究用の場合、資格を持つ人が元の波形をチェックすべき",
    ],
    ko: [
      "기본적인 아티팩트 처리, 결과는 참고용임",
      "Montage 메타데이터가 불완전할 수 있음",
      "태스크 라벨 없음 가정",
      "연구용으로 사용 시 자격을 갖춘 사람이 원시 파형을 검토해야 함",
    ],
  };
  return map[lang] || map.en;
}

// ── What data cannot tell: 根据当前语言返回 ─────────────────────
export function getCannotTell(lang: Lang): string[] {
  const map: Record<Lang, string[]> = {
    zh: [
      "EEG 数据不能用于判断智商、性格、心理健康",
      "EEG 数据不能用于判断疾病诊断",
      "EEG 数据不能用于判断情绪状态、注意力缺陷（如 ADHD）、抑郁症",
    ],
    en: [
      "EEG data cannot be used to determine IQ, personality, or mental health",
      "EEG data cannot be used for disease diagnosis",
      "EEG data cannot determine emotional state, attention deficits (e.g. ADHD), or depression",
    ],
    es: [
      "Los datos de EEG no pueden determinar el CI, la personalidad o la salud mental",
      "Los datos de EEG no pueden usarse para diagnóstico de enfermedades",
      "Los datos de EEG no pueden determinar el estado emocional, déficits de atención (ej. TDAH) o depresión",
    ],
    fr: [
      "Les données EEG ne peuvent pas déterminer le QI, la personnalité ou la santé mentale",
      "Les données EEG ne peuvent pas être utilisées pour le diagnostique de maladies",
      "Les données EEG ne peuvent pas déterminer l'état émotionnel, les déficits d'attention (ex. TDAH) ou la dépression",
    ],
    de: [
      "EEG-Daten können nicht zur Bestimmung von IQ, Persönlichkeit oder psychischer Gesundheit verwendet werden",
      "EEG-Daten können nicht zur Krankheitsdiagnose verwendet werden",
      "EEG-Daten können emotionalen Zustand, Aufmerksamkeitsdefizite (z.B. ADHS) oder Depressionen nicht bestimmen",
    ],
    ja: [
      "EEGデータはIQ、性格、メンタルヘルスを判断するために使用できない",
      "EEGデータは疾患診断に使用できない",
      "EEGデータは感情状態、注意力欠陥（ADHD等）、うつ病を判断できない",
    ],
    ko: [
      "EEG 데이터는 IQ, 성격, 정신 건강을 판단하는 데 사용할 수 없음",
      "EEG 데이터는 질병 진단에 사용할 수 없음",
      "EEG 데이터는 감정 상태, 주의력 결핍(예: ADHD), 우울증을 판단할 수 없음",
    ],
  };
  return map[lang] || map.en;
}
