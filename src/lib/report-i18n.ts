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
      "몽타주 메타데이터가 불완전할 수 있음",
      "태스크 라벨 없음 가정",
      "연구용으로 사용 시 자격을 갖춘 사람이 원시 파형을 검토해야 함",
    ],
  };
  return map[lang] || map.en;
}

// ── Artifact 文本本地化：把数据库里的原始伪影字符串映射到当前 UI 语言 ──
// 数据可能存的是中文、英文或其他语言（旧报告/服务端生成时语言），
// 这里按关键字归一到当前语言，避免切换语言后仍显示英文。
export function localizeArtifact(lang: Lang, text: string): string {
  if (!text) return text;
  const s = text.trim();

  // 1) 已匹配当前语言则原样返回
  const PATTERNS: Record<string, RegExp> = {
    transient: /(瞬时尖波样活动|Transient spike-like activity|Actividad transitoria tipo pico|Activité transitoire en pointe|Vorübergehende spikes|一時的なスパイク様活動|일시적 스파이크 유사 활동)/i,
    drift: /(基线漂移|Baseline drift|Deriva de línea de base|Dérive de la ligne de base|Baseline-Drift|ベースラインドリフト|기준선 드리프트)/i,
    clipping: /(检测到信号削波|Signal clipping detected|Recorte de señal detectado|Découpage du signal détecté|Signal-Klipping erkannt|信号クリッピング検出|신호 클리핑 감지)/i,
    flat: /(平坦\/断开通道|flat\/disconnected channel|canal\(es\) plano\(s\)|canal\(aux\) plat\(s\)|flacher\/getrennter kanal|平坦\/切断チャネル|평탄\/연결 끊긴 채널)/i,
    noisy: /(过多噪声通道|Excessive noisy channels|Canales ruidosos excesivos|Canaux bruyants excessifs|Übermäßig verrauschte Kanäle|ノイズチャネルが多すぎ|과도한 잡음 채널)/i,
    large: /(异常大值|Abnormally large values|Valores anormalmente grandes|Valeurs anormalement élevées|Abnorm große Werte|異常に大きな値|비정상적으로 큰 값)/i,
    outliers: /(过多异常值|Excessive outliers|Valores atípicos excesivos|Valeurs aberrantes excessives|Übermäßige Ausreißer|異常値が多すぎ|과도한 이상값)/i,
    dead: /(Flat \/ no signal|平坦\/无信号|死通道|Canal muerto|Canal mort|Totkanal|平坦\/信号なし|죽은 채널)/i,
    short: /(数据过短|Data too short|Datos demasiado cortos|Données trop courtes|Daten zu kurz|データが短すぎ|데이터가 너무 짧음)/i,
  };

  type Kind = keyof typeof PATTERNS;
  let kind: Kind | null = null;
  (Object.keys(PATTERNS) as Kind[]).forEach((k) => {
    if (!kind && PATTERNS[k].test(s)) kind = k;
  });

  const T: Record<Lang, Record<Kind, string>> = {
    zh: {
      transient: "瞬时尖波样活动",
      drift: "基线漂移",
      clipping: "检测到信号削波",
      flat: "平坦/断开通道",
      noisy: "过多噪声通道，可能存在肌电伪影",
      large: "检测到异常大值，可能存在工频干扰",
      outliers: "检测到过多异常值，可能存在运动伪影",
      dead: "平坦/无信号（死通道或断开）",
      short: "数据过短",
    },
    en: {
      transient: "Transient spike-like activity",
      drift: "Baseline drift",
      clipping: "Signal clipping detected",
      flat: "Flat/disconnected channel(s)",
      noisy: "Excessive noisy channels; possible EMG artifact",
      large: "Abnormally large values detected; possible power-line interference",
      outliers: "Excessive outliers detected; possible movement artifact",
      dead: "Flat / no signal (dead channel or disconnected)",
      short: "Data too short",
    },
    es: {
      transient: "Actividad transitoria tipo pico",
      drift: "Deriva de línea de base",
      clipping: "Recorte de señal detectado",
      flat: "Canal(es) plano(s)/desconectado(s)",
      noisy: "Canales ruidosos excesivos; posible artefacto EMG",
      large: "Valores anormalmente grandes detectados; posible interferencia de línea eléctrica",
      outliers: "Valores atípicos excesivos detectados; posible artefacto de movimiento",
      dead: "Canal muerto o desconectado (sin señal)",
      short: "Datos demasiado cortos",
    },
    fr: {
      transient: "Activité transitoire en pointe",
      drift: "Dérive de la ligne de base",
      clipping: "Découpage du signal détecté",
      flat: "Canal(x) plat(s)/déconnecté(s)",
      noisy: "Canaux bruyants excessifs; possible artefact EMG",
      large: "Valeurs anormalement élevées détectées; possible interférence de ligne électrique",
      outliers: "Valeurs aberrantes excessives détectées; possible artefact de mouvement",
      dead: "Canal mort ou déconnecté (pas de signal)",
      short: "Données trop courtes",
    },
    de: {
      transient: "Vorübergehende spikes",
      drift: "Baseline-Drift",
      clipping: "Signal-Klipping erkannt",
      flat: "Flacher/getrennter Kanal",
      noisy: "Übermäßig verrauschte Kanäle; mögliches EMG-Artefakt",
      large: "Abnorm große Werte erkannt; mögliche Netzfrequenzstörung",
      outliers: "Übermäßige Ausreißer erkannt; mögliches Bewegungsartefakt",
      dead: "Flacher Kanal oder getrennt (kein Signal)",
      short: "Daten zu kurz",
    },
    ja: {
      transient: "一時的なスパイク様活動",
      drift: "ベースラインドリフト",
      clipping: "信号クリッピング検出",
      flat: "平坦/切断チャネル",
      noisy: "ノイズチャネルが多すぎます; EMGアーティファクトの可能性があります",
      large: "異常に大きな値が検出されました; 電源線干渉の可能性があります",
      outliers: "異常値が多すぎます; 動きアーティファクトの可能性があります",
      dead: "平坦/信号なし（死チャネルまたは切断）",
      short: "データが短すぎます",
    },
    ko: {
      transient: "일시적 스파이크 유사 활동",
      drift: "기준선 드리프트",
      clipping: "신호 클리핑 감지",
      flat: "평탄/연결 끊긴 채널",
      noisy: "과도한 잡음 채널; EMG 아티팩트 가능성",
      large: "비정상적으로 큰 값이 감지되었습니다; 전원선 간섭 가능성",
      outliers: "과도한 이상값 감지; 움직임 아티팩트 가능성",
      dead: "평탄/신호 없음 (죽은 채널 또는 연결 끊김)",
      short: "데이터가 너무 짧음",
    },
  };

  // 2) 含百分比/通道数的 transient / flat，保留数字并按语言格式化
  const transientMatch = s.match(/([\d.]+)\s*%\s*samples,\s*(\d+)\/(\d+)\s*channels/i);
  const flatMatch = s.match(/(\d+)\s*flat\/disconnected channel/i);
  if (kind === "transient" && transientMatch) {
    const [, pct, c, tot] = transientMatch;
    const lvlKey = /(高度|high|alto|élevé|hoch|高い|높음)/i.test(s)
      ? "High"
      : /(中度|moderate|moderado|modéré|moderat|中程度|보통)/i.test(s)
      ? "Moderate"
      : "Low";
    const LEVEL: Record<Lang, Record<string, string>> = {
      zh: { High: "高度", Moderate: "中度", Low: "轻度" },
      en: { High: "high", Moderate: "moderate", Low: "low" },
      es: { High: "alto", Moderate: "moderado", Low: "bajo" },
      fr: { High: "élevé", Moderate: "modéré", Low: "faible" },
      de: { High: "hoch", Moderate: "moderat", Low: "niedrig" },
      ja: { High: "高い", Moderate: "中程度", Low: "低い" },
      ko: { High: "높음", Moderate: "보통", Low: "낮음" },
    };
    const lvl = LEVEL[lang][lvlKey];
    if (lang === "zh") return `瞬时尖波样活动：${lvl}（${pct}% 样本，${c}/${tot} 通道）`;
    if (lang === "en") return `Transient spike-like activity: ${lvl} (${pct}% samples, ${c}/${tot} channels)`;
    if (lang === "es") return `Actividad transitoria tipo pico: ${lvl} (${pct}% muestras, ${c}/${tot} canales)`;
    if (lang === "fr") return `Activité transitoire en pointe: ${lvl} (${pct}% échantillons, ${c}/${tot} canaux)`;
    if (lang === "de") return `Vorübergehende spikes: ${lvl} (${pct}% Samples, ${c}/${tot} Kanäle)`;
    if (lang === "ja") return `一時的なスパイク様活動：${lvl}（${pct}% サンプル，${c}/${tot} チャネル）`;
    if (lang === "ko") return `일시적 스파이크 유사 활동: ${lvl} (${pct}% 샘플, ${c}/${tot} 채널)`;
  }
  if (kind === "flat" && flatMatch) {
    const n = flatMatch[1];
    const tail: Record<Lang, string> = {
      zh: ` ${n} 个平坦/断开通道`,
      en: ` ${n} flat/disconnected channel(s)`,
      es: ` ${n} canal(es) plano(s)/desconectado(s)`,
      fr: ` ${n} canal(x) plat(s)/déconnecté(s)`,
      de: ` ${n} flacher/getrennter Kanal`,
      ja: ` ${n} 平坦/切断チャネル`,
      ko: ` ${n} 평탄/연결 끊긴 채널`,
    };
    return tail[lang];
  }

  if (kind) return T[lang][kind];
  // 未识别则原样返回
  return text;
}

// ── 特殊波形名称：把后端代码字段（spikes/spindles/...）映射成当前语言显示名 ──
export function getSpecialWaveformName(lang: Lang, key: string): string {
  const NAMES: Record<Lang, Record<string, string>> = {
    zh: {
      spikes: "尖波/锐波（癫痫样放电）",
      sleep_spindles: "睡眠纺锤波",
      slow_waves: "慢波（δ）",
      k_complexes: "K 复合波",
      mu_rhythm: "Mu 节律",
      smr: "感觉运动节律（SMR）",
      triphasic_waves: "三相波",
      periodic_discharges: "周期性放电",
    },
    en: {
      spikes: "Spikes / Sharp waves (epileptiform)",
      sleep_spindles: "Sleep spindles",
      slow_waves: "Slow waves (delta)",
      k_complexes: "K-complexes",
      mu_rhythm: "Mu rhythm",
      smr: "Sensorimotor rhythm (SMR)",
      triphasic_waves: "Triphasic waves",
      periodic_discharges: "Periodic discharges",
    },
    es: {
      spikes: "Picos / ondas agudas (epileptiformes)",
      sleep_spindles: "Husos de sueño",
      slow_waves: "Ondas lentas (delta)",
      k_complexes: "Complejos K",
      mu_rhythm: "Ritmo mu",
      smr: "Ritmo sensorimotor (SMR)",
      triphasic_waves: "Ondas trifásicas",
      periodic_discharges: "Descargas periódicas",
    },
    fr: {
      spikes: "Pointes / ondes pointues (épileptiformes)",
      sleep_spindles: "Fuseaux de sommeil",
      slow_waves: "Ondes lentes (delta)",
      k_complexes: "Complexes K",
      mu_rhythm: "Rythme mu",
      smr: "Rythme sensorimoteur (SMR)",
      triphasic_waves: "Ondes triphasiques",
      periodic_discharges: "Décharges périodiques",
    },
    de: {
      spikes: "Spikes / scharfe Wellen (epileptiform)",
      sleep_spindles: "Schlafspindeln",
      slow_waves: "Langsame Wellen (delta)",
      k_complexes: "K-Komplexe",
      mu_rhythm: "Mu-Rhythmus",
      smr: "Sensorimotorischer Rhythmus (SMR)",
      triphasic_waves: "Triphasische Wellen",
      periodic_discharges: "Periodische Entladungen",
    },
    ja: {
      spikes: "スパイク/鋭波（てんかん様放電）",
      sleep_spindles: "睡眠紡錘波",
      slow_waves: "徐波（δ）",
      k_complexes: "K複合波",
      mu_rhythm: "ミュー律動",
      smr: "感覚運動リズム（SMR）",
      triphasic_waves: "三相波",
      periodic_discharges: "周期性放電",
    },
    ko: {
      spikes: "스파이크/예파(간질양 방전)",
      sleep_spindles: "수면 방추파",
      slow_waves: "서파(δ)",
      k_complexes: "K 복합파",
      mu_rhythm: "뮤 리듬",
      smr: "감각운동 리듬(SMR)",
      triphasic_waves: "삼상파",
      periodic_discharges: "주기적 방전",
    },
  };
  return NAMES[lang]?.[key] || key;
}

// ── 特殊波形注释：说明该波形是什么、可能反映什么（中性、非诊断） ──
export function getSpecialWaveformDesc(lang: Lang, key: string): string {
  const DESC: Record<Lang, Record<string, string>> = {
    zh: {
      spikes: "尖波或锐波是持续时间很短（通常 < 70 ms）的突出放电，可能出现在癫痫样活动中，但也可见于正常变异或局部损伤，需结合临床判断。",
      sleep_spindles: "睡眠纺锤波是睡眠期间出现的 12–15 Hz 纺锤状爆发，通常反映丘脑-皮质的节律活动，是正常睡眠结构的一部分。",
      slow_waves: "慢波（δ 频段，< 4 Hz）在深睡眠中常见，也可能在脑损伤、代谢异常或药物影响下增强。",
      k_complexes: "K 复合波是睡眠中出现的尖锐负向波后接缓慢正波，通常反映睡眠期间的唤醒反应或感觉门控。",
      mu_rhythm: "Mu 节律是感觉运动区 8–13 Hz 的弓形节律，通常在肢体运动或观察他人运动时被抑制，属于正常变异。",
      smr: "感觉运动节律（SMR，12–15 Hz）出现在感觉运动皮质，通常与静息、放松或运动抑制状态相关。",
      triphasic_waves: "三相波由负-正-负三相组成，可能与代谢性脑病（如肝性脑病）相关，但也可见于其他情况。",
      periodic_discharges: "周期性放电是以近似固定间隔反复出现的痫样放电，可能与急性脑损伤或癫痫持续状态相关，需结合临床背景。",
    },
    en: {
      spikes: "Spikes or sharp waves are very brief (usually < 70 ms) prominent discharges. They may appear in epileptiform activity but also in normal variants or focal lesions, and require clinical correlation.",
      sleep_spindles: "Sleep spindles are 12–15 Hz spindle-shaped bursts during sleep, typically reflecting thalamocortical rhythmicity and forming part of normal sleep architecture.",
      slow_waves: "Slow waves (delta band, < 4 Hz) are common in deep sleep and may also be increased by brain injury, metabolic disturbance, or medication effects.",
      k_complexes: "K-complexes are sharp negative waves followed by a slow positive wave during sleep, usually reflecting arousal responses or sensory gating.",
      mu_rhythm: "Mu rhythm is an 8–13 Hz archiform rhythm over sensorimotor cortex that is typically suppressed during movement or action observation; it is a normal variant.",
      smr: "Sensorimotor rhythm (SMR, 12–15 Hz) appears over sensorimotor cortex and is usually associated with rest, relaxation, or motor inhibition.",
      triphasic_waves: "Triphasic waves consist of negative-positive-negative components and may be associated with metabolic encephalopathy (e.g. hepatic), but can occur in other contexts.",
      periodic_discharges: "Periodic discharges are epileptiform discharges recurring at a roughly fixed interval and may relate to acute brain injury or status epilepticus, depending on clinical context.",
    },
    es: {
      spikes: "Los picos u ondas agudas son descargas prominentes muy breves (normalmente < 70 ms). Pueden aparecer en actividad epiletiforme pero también en variantes normales o lesiones focales, y requieren correlación clínica.",
      sleep_spindles: "Los husos de sueño son ráfagas en forma de huso de 12–15 Hz durante el sueño, que reflejan normalmente la actividad talamocortical y forman parte del sueño normal.",
      slow_waves: "Las ondas lentas (banda delta, < 4 Hz) son comunes en sueño profundo y también pueden aumentar por lesión cerebral, alteración metabólica o efectos de medicamentos.",
      k_complexes: "Los complejos K son ondas negativas agudas seguidas de una onda positiva lenta durante el sueño, y suelen reflejar respuestas de activación o gating sensorial.",
      mu_rhythm: "El ritmo mu es un ritmo arqueado de 8–13 Hz en la corteza sensorimotora que normalmente se inhibe con el movimiento o la observación de acciones; es una variante normal.",
      smr: "El ritmo sensorimotor (SMR, 12–15 Hz) aparece en la corteza sensorimotora y suele asociarse con reposo, relajación o inhibición motora.",
      triphasic_waves: "Las ondas trifásicas tienen componentes negativo-positivo-negativo y pueden asociarse con encefalopatía metabólica (p. ej. hepática), pero también ocurren en otros contextos.",
      periodic_discharges: "Las descargas periódicas son descargas epiletiformes que se repiten a intervalos casi fijos y pueden relacionarse con lesión cerebral aguda o estado epiléptico, según el contexto clínico.",
    },
    fr: {
      spikes: "Les pointes ou ondes pointues sont des décharges brèves (généralement < 70 ms). Elles peuvent apparaître dans une activité épileptiforme mais aussi dans des variantes normales ou des lésions focales, et demandent une corrélation clinique.",
      sleep_spindles: "Les fuseaux de sommeil sont des bouffées en forme de fuseau de 12–15 Hz pendant le sommeil, reflétant généralement la rythmicité thalamocorticale et faisant partie du sommeil normal.",
      slow_waves: "Les ondes lentes (bande delta, < 4 Hz) sont fréquentes dans le sommeil profond et peuvent aussi augmenter avec une lésion cérébrale, un trouble métabolique ou des médicaments.",
      k_complexes: "Les complexes K sont des ondes négatives pointues suivies d'une onde positive lente pendant le sommeil, reflétant généralement des réponses d'éveil ou un gating sensoriel.",
      mu_rhythm: "Le rythme mu est un rythme arqué de 8–13 Hz sur le cortex sensorimoteur, habituellement inhibé lors du mouvement ou de l'observation d'actions ; c'est une variante normale.",
      smr: "Le rythme sensorimoteur (SMR, 12–15 Hz) apparaît sur le cortex sensorimoteur et est généralement associé au repos, à la relaxation ou à l'inhibition motrice.",
      triphasic_waves: "Les ondes triphasiques comportent des composantes négatif-positif-négatif et peuvent être associées à une encéphalopathie métabolique (p. ex. hépatique), mais aussi à d'autres contextes.",
      periodic_discharges: "Les décharges périodiques sont des décharges épileptiformes récurrentes à intervalle quasi fixe et peuvent relever d'une lésion cérébrale aiguë ou d'un état de mal épileptique, selon le contexte.",
    },
    de: {
      spikes: "Spikes oder scharfe Wellen sind sehr kurze (meist < 70 ms) auffällige Entladungen. Sie können bei epileptiformer Aktivität auftreten, aber auch bei normalen Varianten oder fokalen Läsionen, und bedürfen der klinischen Korrelation.",
      sleep_spindles: "Schlafspindeln sind spindelförmige Bursts von 12–15 Hz im Schlaf und spiegeln meist die thalamokortikale Rhythmik wider; sie gehören zum normalen Schlaf.",
      slow_waves: "Langsame Wellen (Delta-Band, < 4 Hz) sind im Tiefschlaf häufig und können bei Hirnschädigung, metabolischer Störung oder Medikamentenwirkung zunehmen.",
      k_complexes: "K-Komplexe sind spitze negative Wellen gefolgt von einer langsamen positiven Welle im Schlaf und spiegeln meist Weckreaktionen oder sensorische Gating.",
      mu_rhythm: "Der Mu-Rhythmus ist ein 8–13 Hz bogenförmiger Rhythmus über dem sensorimotorischen Kortex, der bei Bewegung oder Handlungsbeobachtung meist gehemmt wird; er ist eine normale Variante.",
      smr: "Der sensorimotorische Rhythmus (SMR, 12–15 Hz) tritt über dem sensorimotorischen Kortex auf und hängt meist mit Ruhe, Entspannung oder motorischer Hemmung zusammen.",
      triphasic_waves: "Triphasische Wellen bestehen aus negativ-positiv-negativen Komponenten und können mit einer metabolischen Enzephalopathie (z. B. hepatisch) assoziiert sein, treten aber auch anders auf.",
      periodic_discharges: "Periodische Entladungen sind epileptiforme Entladungen in annähernd festem Abstand und können bei akuter Hirnschädigung oder epileptischem Status vorkommen, je nach klinischem Kontext.",
    },
    ja: {
      spikes: "スパイクや鋭波は非常に短い（通常70ms未満）突出した放電です。てんかん様活動に現れることもありますが、正常変異や局所病変でも見られ、臨床的な関連付けが必要です。",
      sleep_spindles: "睡眠紡錘波は睡眠中の12–15Hzの紡錘状バーストで、通常は視床-皮質のリズムを反映し、正常な睡眠構造の一部です。",
      slow_waves: "徐波（δ帯域、4Hz未満）は深い睡眠で一般的ですが、脳損傷、代謝異常、薬物の影響でも増強することがあります。",
      k_complexes: "K複合波は睡眠中の鋭い陰性波の後に緩やかな陽性波が続くもので、通常は覚醒反応や感覚ゲーティングを反映します。",
      mu_rhythm: "ミュー律動は感覚運動野の8–13Hzの弓状リズムで、運動時や他者の行動観察時に抑制されることが多く、正常な変異です。",
      smr: "感覚運動リズム（SMR、12–15Hz）は感覚運動皮質に現れ、通常は休息、リラックス、運動抑制と関連します。",
      triphasic_waves: "三相波は陰-正-陰の3相からなり、代謝性脳症（肝性など）と関連することがありますが、他の状況でも生じます。",
      periodic_discharges: "周期性放電はほぼ一定間隔で反復するてんかん様放電で、急性脳損傷やてんかん発作状態と関連することがありますが、臨床背景によります。",
    },
    ko: {
      spikes: "스파이크나 예파는 매우 짧은(보통 70ms 미만) 두드러진 방전입니다. 간질양 활동에 나타날 수도 있으나 정상 변이나 국소 병변에서도 보이며 임상적 상관이 필요합니다.",
      sleep_spindles: "수면 방추파는 수면 중 12–15Hz 방추 모양 버스트로, 보통 시상-피질 리듬을 반영하며 정상 수면 구조의 일부입니다.",
      slow_waves: "서파(δ대역, 4Hz 미만)는 깊은 수면에서 흔하며 뇌 손상, 대사 이상, 약물 영향으로 증가하기도 합니다.",
      k_complexes: "K 복합파는 수면 중 뾰족한 음성파 뒤에 느린 양성파가 오는 것으로, 보통 각성 반응이나 감각 차단을 반영합니다.",
      mu_rhythm: "뮤 리듬은 감각운동 피질의 8–13Hz 활 모양 리듬으로, 움직임이나 타인 행동 관찰 시 억제되는 경우가 많으며 정상 변이입니다.",
      smr: "감각운동 리듬(SMR, 12–15Hz)은 감각운동 피질에 나타나며 보통 휴식, 이완, 운동 억제와 관련됩니다.",
      triphasic_waves: "삼상파는 음-양-음 3상으로 이루어지며 대사성 뇌증(예: 간성)과 관련될 수 있으나 다른 상황에서도 나타납니다.",
      periodic_discharges: "주기적 방전은 거의 일정한 간격으로 반복되는 간질양 방전으로, 급성 뇌 손상이나 간질 지속 상태와 관련할 수 있으며 임상 맥락에 따릅니다.",
    },
  };
  return DESC[lang]?.[key] || "";
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
