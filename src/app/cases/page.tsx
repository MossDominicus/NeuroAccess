"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Stethoscope,
  Brain,
  Activity,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  User,
  GraduationCap,
  Microscope,
  Search,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { useLang } from "@/lib/language-context";
import type { Lang } from "@/lib/translations";

/* 案例数据类型（多语言） */
type LangString = Partial<Record<Lang, string>>;
type LangStringArray = Partial<Record<Lang, string[]>>;

interface CaseStudy {
  id: string;
  categoryKey: string;
  difficultyKey: "beginner" | "intermediate" | "advanced";
  signal_quality: number;
  learning_readability_score: number;
  tags: string[];
  readTime: string;
  // 多语言字段
  title: LangString;
  description: LangString;
  details: LangString;
  beginner_explanation: LangString;
  student_explanation: LangString;
  research_explanation: LangString;
  limitations: LangStringArray;
  what_this_data_cannot_tell: LangStringArray;
}

const cases: CaseStudy[] = [
  {
    id: "c1",
    title: {
      zh: "高质量 EEG 示例（Clean EEG）",
      en: "Clean EEG Example",
      es: "Ejemplo de EEG Limpio",
      fr: "Exemple d'EEG Propre",
      de: "Sauberes EEG-Beispiel",
      ja: "クリーンEEGの例",
      ko: "깨끗한 EEG 예시",
    },
    categoryKey: "quality",
    difficultyKey: "beginner",
    description: {
      zh: "这份 EEG 数据来自一名健康成人，闭眼放松状态记录 5 分钟。信号质量评分 92/100，几乎所有通道质量都为 Excellent。",
      en: "This EEG data is from a healthy adult, eyes-closed relaxed state for 5 minutes. Signal quality score 92/100, almost all channels are Excellent.",
      es: "Estos datos EEG son de un adulto sano, estado relajado con ojos cerrados durante 5 minutos. Puntuación de calidad de señal 92/100, casi todos los canales son Excelentes.",
      fr: "Ces données EEG proviennent d'un adulte sain, état de repos yeux fermés pendant 5 minutes. Score de qualité du signal 92/100, presque tous les canaux sont Excellents.",
      de: "Diese EEG-Daten stammen von einem gesunden Erwachsenen, entspannter Zustand mit geschlossenen Augen für 5 Minuten. Signalqualitätsscore 92/100, fast alle Kanäle sind exzellent.",
      ja: "このEEGデータは健康な成人のもので、閉眼リラックス状態で5分間記録されました。信号品質スコア92/100、ほぼすべてのチャンネルが優秀です。",
      ko: "이 EEG 데이터는 건강한 성인의 것으로, 눈을 감고 휴식한 상태에서 5분간 기록되었습니다. 신호 품질 점수 92/100, 거의 모든 채널이 우수합니다."
    },
    details: {
      zh: "此案例展示了一份干净（无噪声）的 EEG 数据应该是什么样的。\n\n1. Alpha 波（8-13 Hz）在枕叶区域（O1、O2）非常明显\n2. 没有可见的噪声或伪影\n3. 所有通道的信号质量都很好\n\n这是学习正常 EEG 模式的理想参考案例。",
      en: "This case shows what clean (noise-free) EEG data should look like.\n\n1. Alpha waves (8-13 Hz) are very prominent in occipital areas (O1, O2)\n2. No visible noise or artifacts\n3. All channels have good signal quality\n\nThis is an ideal reference case for learning normal EEG patterns.",
      es: "Este caso muestra cómo deberían verse los datos EEG limpios (sin ruido).\n\n1. Las ondas Alfa (8-13 Hz) son muy prominentes en áreas occipitales (O1, O2)\n2. No hay ruido ni artefactos visibles\n3. Todos los canales tienen buena calidad de señal\n\nEste es un caso de referencia ideal para aprender los patrones normales de EEG.",
      fr: "Ce cas montre à quoi devraient ressembler des données EEG propres (sans bruit).\n\n1. Les ondes Alpha (8-13 Hz) sont très prominentes dans les zones occipitales (O1, O2)\n2. Pas de bruit ni d'artefacts visibles\n3. Tous les canaux ont une bonne qualité de signal\n\nC'est un cas de référence idéal pour apprendre les motifs EEG normaux.",
      de: "Dieser Fall zeigt, wie saubere (rauschfreie) EEG-Daten aussehen sollten.\n\n1. Alpha-Wellen (8-13 Hz) sind in okzipitalen Bereichen (O1, O2) sehr prominent\n2. Kein sichtbares Rauschen oder Artefakte\n3. Alle Kanäle haben gute Signalqualität\n\nDies ist ein ideales Referenzbeispiel zum Erlernen normaler EEG-Muster.",
      ja: "この症例は、きれいな（ノイズのない）EEGデータがどのように見えるべきかを示しています。\n\n1. アルファ波（8-13Hz）は後頭部領域（O1、O2）で非常に顕著です\n2. 可視的なノイズやアーチファクトはありません\n3. すべてのチャンネルで信号品質が良好です\n\nこれは正常なEEGパターンを学ぶための理想的な参照症例です。",
      ko: "이 사례는 깨끗한(노이즈 없는) EEG 데이터가 어떻게 보여야 하는지 보여줍니다.\n\n1. 알파파(8-13Hz)는 후두부 영역(O1, O2)에서 매우 두드러집니다\n2. 가시적인 노이즈나 아티팩트가 없습니다\n3. 모든 채널의 신호 품질이 좋습니다\n\n이는 정상적인 EEG 패턴을 배우기 위한 이상적인 참조 사례입니다."
    },
    signal_quality: 92,
    learning_readability_score: 88,
    beginner_explanation: {
      zh: "这份 EEG 很健康！你可以看到后脑区域有明显的 Alpha 波，这表示大脑正在放松休息。所有通道的信号都很干净，没有噪声。",
      en: "This EEG looks healthy! You can see clear Alpha waves in the back of the brain, which means the brain is relaxing. All channels have clean signals with no noise.",
    },
    student_explanation: {
      zh: "该 EEG 记录显示典型的 Alpha rhythm（8-13 Hz），在枕叶区域振幅最高（>50 μV）。前额区域可见低频活动（可能是额头肌肉伪影）。总体信号质量优秀，适合用于学习正常 EEG 模式。",
      en: "The EEG recording shows typical Alpha rhythm (8-13 Hz) with highest amplitude in occipital areas (>50 μV). Low-frequency activity is visible in frontal areas (possibly forehead muscle artifact). Overall signal quality is excellent, suitable for learning normal EEG patterns.",
    },
    research_explanation: {
      zh: "PSD 分析显示枕叶区域有强烈的 Alpha peak（~10 Hz）。Bandpower 分析：Alpha 42%，Beta 31%，Theta 18%，Delta 9%。采样率 500 Hz，符合标准。无可见伪影或噪声。符合健康成人静息态 EEG 特征。",
      en: "PSD analysis shows strong Alpha peak (~10 Hz) in occipital areas. Bandpower analysis: Alpha 42%, Beta 31%, Theta 18%, Delta 9%. Sampling rate 500 Hz, meets standards. No visible artifacts or noise. Consistent with healthy adult resting-state EEG characteristics.",
    },
    limitations: {
      zh: ["仅记录 5 分钟，可能无法捕捉到 intermittent 异常", "没有同时记录行为数据（如 eye tracking），无法确认 Alpha 阻断"],
      en: ["Only 5 minutes recorded; may not capture intermittent abnormalities", "No concurrent behavioral data (e.g., eye tracking) to confirm Alpha blocking"],
    },
    what_this_data_cannot_tell: {
      zh: ["智商高低", "是否患有精神疾病", "具体的情绪状态"],
      en: ["Intelligence level", "Whether the person has a mental illness", "Specific emotional state"],
    },
    tags: ["alpha", "resting", "healthyAdult", "highQuality"],
    readTime: "5 分钟",
  },
  {
    id: "c2",
    title: {
      zh: "高噪声 EEG 示例（Noisy EEG）",
      en: "Noisy EEG Example",
      es: "Ejemplo de EEG Ruidoso",
      fr: "Exemple d'EEG Bruyant",
      de: "Verrauschtes EEG-Beispiel",
      ja: "ノイジーEEGの例",
      ko: "노이지 EEG 예시",
    },
    categoryKey: "quality",
    difficultyKey: "intermediate",
    description: {
      zh: "这份 EEG 数据包含明显的噪声和伪影。信号质量评分仅 45/100，多个通道被标记为 Poor 或 Bad。",
      en: "This EEG data contains significant noise and artifacts. Signal quality score is only 45/100, multiple channels are marked as Poor or Bad.",
      es: "Estos datos EEG contienen ruido y artefactos significativos. La puntuación de calidad de señal es solo 45/100, múltiples canales están marcados como Pobres o Malos.",
      fr: "Ces données EEG contiennent un bruit et des artefacts significatifs. Le score de qualité du signal n'est que de 45/100, plusieurs canaux sont marqués comme Pauvres ou Mauvais.",
      de: "Diese EEG-Daten enthalten signifikantes Rauschen und Artefakte. Der Signalqualitätsscore beträgt nur 45/100, mehrere Kanäle sind als Schlecht oder Schlechtest markiert.",
      ja: "このEEGデータは著しいノイズとアーチャクトを含みます。信号品質スコアはわずか45/100、複数のチャンネルが「不良」または「悪い」とマークされています。",
      ko: "이 EEG 데이터는 상당한 노이즈와 아티팩트를 포함합니다. 신호 품질 점수는 겨우 45/100, 여러 채널이 '나쁨' 또는 '최악'으로 표시되어 있습니다."
    },
    details: {
      zh: "此案例展示了真实世界中常见的脏 EEG 数据。你需要学会识别：\n\n1. 肌电伪影（高频、低振幅，常见于颞肌）\n2. 眼电伪影（EOG，大振幅、慢波，常见于前额）\n3. 工频噪声（50/60 Hz 电源线干扰）\n\n学习如何识别这些伪影是 EEG 分析的重要技能。",
      en: "This case demonstrates common dirty EEG data in real-world settings. You need to learn to identify:\n\n1. Electromyographic (EMG) artifacts (high frequency, low amplitude, common in temporal muscle)\n2. Electrooculographic (EOG) artifacts (large amplitude, slow waves, common in forehead)\n3. Power line noise (50/60 Hz interference)\n\nLearning to identify these artifacts is an important skill in EEG analysis.",
    },
    signal_quality: 45,
    learning_readability_score: 52,
    beginner_explanation: {
      zh: "这份 EEG 有很多杂讯，就像收音机有静电干扰一样。有些通道的信号很乱，可能是因为电极接触不好，或者受试者有眨眼、动弹。",
      en: "This EEG has a lot of noise, like static on a radio. Some channels have messy signals, possibly because the electrodes aren't contacting well, or the subject is blinking or moving.",
    },
    student_explanation: {
      zh: "该 EEG 记录显示多处伪影：前额区域可见眼电伪影（EOG，大振幅慢波），颞叶可见肌电伪影（EMG，高频低振幅）。通道 FP1、FP2 信号质量差。建议在进行分析前先进行伪影去除（如 ICA 或带阻滤波）。",
      en: "The EEG recording shows multiple artifacts: EOG artifacts (large-amplitude slow waves) are visible in frontal areas, and EMG artifacts (high-frequency low-amplitude) are visible in temporal areas. Channels FP1, FP2 have poor signal quality. Artifact removal (e.g., ICA or notch filtering) is recommended before analysis.",
    },
    research_explanation: {
      zh: "PSD 显示 50 Hz 工频噪声（电源干扰）。多个通道 SNR < 2 dB。建议：1) 检查电极阻抗（应 < 5 kΩ）；2) 使用 notch filter 去除 50 Hz 噪声；3) 考虑使用 ICA 去除眼电和肌电伪影。当前数据不适合用于认知或临床研究。",
      en: "PSD shows 50 Hz power line noise (mains interference). Multiple channels have SNR < 2 dB. Recommendations: 1) Check electrode impedance (should be < 5 kΩ); 2) Use notch filter to remove 50 Hz noise; 3) Consider using ICA to remove EOG and EMG artifacts. Current data is not suitable for cognitive or clinical research.",
    },
    limitations: {
      zh: ["高噪声水平严重限制了数据解读", "无法可靠地测量频段功率", "伪影去除算法可能引入额外误差"],
      en: ["High noise level severely limits data interpretation", "Cannot reliably measure band power", "Artifact removal algorithms may introduce additional errors"],
    },
    what_this_data_cannot_tell: {
      zh: ["真实的脑活动模式", "准确的频段能量分布", "任何与认知相关的信息"],
      en: ["True brain activity patterns", "Accurate band power distribution", "Any cognition-related information"],
    },
    tags: ["noise", "artifact", "eog", "emg", "qualityCtrl"],
    readTime: "8 分钟",
  },
  {
    id: "c3",
    title: {
      zh: "短记录示例（Short Recording）",
      en: "Short Recording Example",
      es: "Ejemplo de Grabación Corta",
      fr: "Exemple d'Enregistrement Court",
      de: "Kurzaufnahme-Beispiel",
      ja: "短い記録の例",
      ko: "짧은 녹음 예시",
    },
    categoryKey: "duration",
    difficultyKey: "beginner",
    description: {
      zh: "这份 EEG 数据只记录了 30 秒。虽然信号质量尚可（评分 68/100），但记录时间太短，无法可靠地评估脑电活动。",
      en: "This EEG data was recorded for only 30 seconds. Although signal quality is acceptable (score 68/100), the recording time is too short to reliably assess brain activity.",
    },
    details: {
      zh: "此案例展示了记录时长不足的问题：\n\n1. 30 秒不足以评估 Alpha 阻断等事件相关反应\n2. 频段功率估算可能不准确（需要至少 2-3 分钟）\n3. 可能无法捕捉到 intermittent 的异常活动\n\n学习 EEG 时，理解记录时长的重要性非常关键。",
      en: "This case demonstrates the problem of insufficient recording duration:\n\n1. 30 seconds is not enough to assess event-related responses like Alpha blocking\n2. Band power estimation may be inaccurate (at least 2-3 minutes needed)\n3. May not capture intermittent abnormal activities\n\nWhen learning EEG, understanding the importance of recording duration is crucial.",
    },
    signal_quality: 68,
    learning_readability_score: 75,
    beginner_explanation: {
      zh: "这份 EEG 只记录了 30 秒，就像只看了书的最后一页。大脑活动是会变化的，30 秒太短了，不能代表你的整体脑电活动。",
      en: "This EEG was recorded for only 30 seconds, like reading only the last page of a book. Brain activity changes over time; 30 seconds is too short to represent your overall brain activity.",
    },
    student_explanation: {
      zh: "该记录时长仅 30 秒，不符合最低记录时长建议（静息态 EEG 至少 2 分钟）。短时程导致频段功率估算不准确（Welch 方法需要足够多的数据段）。若需评估 Alpha 阻断等事件相关反应，建议记录 3-5 分钟。",
      en: "The recording duration is only 30 seconds, which does not meet the minimum recommended recording time (at least 2 minutes for resting-state EEG). Short duration leads to inaccurate band power estimation (Welch's method requires sufficient data segments). If assessing event-related responses like Alpha blocking, 3-5 minutes of recording is recommended.",
    },
    research_explanation: {
      zh: "30 秒记录仅包含 15 个 2-second epochs（无重叠）。根据 Welch 方法，频率分辨率 ≈ 0.5 Hz，但功率谱估计的方差很大。建议至少记录 2 分钟（120 秒 = 60 epochs），以获得稳定的 PSD 估计。此数据仅适合作为教学示例，不应用于研究。",
      en: "30-second recording contains only 15 2-second epochs (non-overlapping). According to Welch's method, frequency resolution ≈ 0.5 Hz, but the variance of power spectrum estimation is large. At least 2 minutes of recording (120 seconds = 60 epochs) is recommended for stable PSD estimation. This data is only suitable as a teaching example, not for research.",
    },
    limitations: {
      zh: ["记录时长严重不足", "频段功率估计不可靠", "无法评估稳态特征"],
      en: ["Severely insufficient recording duration", "Band power estimation is unreliable", "Cannot assess steady-state characteristics"],
    },
    what_this_data_cannot_tell: {
      zh: ["可靠的频段能量分布", "Alpha 阻断反应", "任何时序相关的变化"],
      en: ["Reliable band power distribution", "Alpha blocking response", "Any time-series related changes"],
    },
    tags: ["shortRec", "teachingEx", "psd"],
    readTime: "4 分钟",
  },
  {
    id: "c4",
    title: {
      zh: "低采样率示例（Low Sampling Rate）",
      en: "Low Sampling Rate Example",
      es: "Ejemplo de Baja Tasa de Muestreo",
      fr: "Exemple de Faible Fréquence d'Échantillonnage",
      de: "Niedrige Abtastrate-Beispiel",
      ja: "低サンプリングレートの例",
      ko: "낮은 샘플링 레이트 예시",
    },
    categoryKey: "technical",
    difficultyKey: "intermediate",
    description: {
      zh: "这份 EEG 数据采样率仅为 128 Hz，低于标准推荐的 500 Hz。信号质量评分 55/100，可能丢失高频信息。",
      en: "This EEG data has a sampling rate of only 128 Hz, below the standard recommendation of 500 Hz. Signal quality score 55/100, may lose high-frequency information.",
    },
    details: {
      zh: "此案例展示了低采样率的问题：\n\n1. 根据奈奎斯特定理，128 Hz 采样率只能可靠地记录 ≤ 64 Hz 的信号\n2. Beta 波（13-30 Hz）和 Gamma 波（30-100 Hz）的高频部分可能混叠\n3. 对于需要高频分析的 ERP 研究，此采样率不足\n\n学习 EEG 时，理解采样率对数据质量的影响非常重要。",
      en: "This case demonstrates the problem of low sampling rate:\n\n1. According to Nyquist theorem, 128 Hz sampling rate can only reliably record signals ≤ 64 Hz\n2. High-frequency parts of Beta waves (13-30 Hz) and Gamma waves (30-100 Hz) may be aliased\n3. For ERP research requiring high-frequency analysis, this sampling rate is insufficient\n\nWhen learning EEG, understanding the impact of sampling rate on data quality is very important.",
    },
    signal_quality: 55,
    learning_readability_score: 60,
    beginner_explanation: {
      zh: "这份 EEG 的'拍照速度'比较慢（128 Hz），就像用慢速摄像机拍快速运动。可能会丢失一些快速的脑电活动信息。",
      en: "This EEG has a 'slow camera speed' (128 Hz), like using a slow-motion camera to film fast movement. It may miss some fast brain activity information.",
    },
    student_explanation: {
      zh: "采样率 128 Hz 意味着每秒记录 128 个数据点。根据奈奎斯特定理，最高可可靠记录频率为 64 Hz。对于在意 Beta（13-30 Hz）和 Gamma（30+ Hz）的研究，建议采样率 ≥ 500 Hz。此数据适合初步学习，但不适合高频分析。",
      en: "Sampling rate of 128 Hz means 128 data points are recorded per second. According to Nyquist theorem, the highest reliably recordable frequency is 64 Hz. For research interested in Beta (13-30 Hz) and Gamma (30+ Hz), sampling rate ≥ 500 Hz is recommended. This data is suitable for preliminary learning but not for high-frequency analysis.",
    },
    research_explanation: {
      zh: "128 Hz 采样率违反了对于高频神经活动（如 Gamma 振荡 30-100 Hz）的采样要求。FFT 频率分辨率受采样率限制，高频混叠可能发生。若研究涉及 ERP（事件相关电位）或高频振荡，此数据不适用。建议重新以 ≥ 500 Hz 采样率记录。",
      en: "128 Hz sampling rate violates sampling requirements for high-frequency neural activity (e.g., Gamma oscillations 30-100 Hz). FFT frequency resolution is limited by sampling rate, and high-frequency aliasing may occur. If the research involves ERPs (event-related potentials) or high-frequency oscillations, this data is not suitable. Re-recording at ≥ 500 Hz sampling rate is recommended.",
    },
    limitations: {
      zh: ["高频信息丢失", "不符合标准 EEG 研究采样率要求", "不适合 ERP 或高频分析"],
      en: ["High-frequency information loss", "Does not meet standard EEG research sampling rate requirements", "Not suitable for ERP or high-frequency analysis"],
    },
    what_this_data_cannot_tell: {
      zh: ["高频脑活动（Gamma 振荡）", "精确的 ERP 成分", "超过 64 Hz 的任何信号"],
      en: ["High-frequency brain activity (Gamma oscillations)", "Precise ERP components", "Any signal above 64 Hz"],
    },
    tags: ["lowSR", "nyquist", "aliasing", "techLimit"],
    readTime: "6 分钟",
  },
  {
    id: "c5",
    title: {
      zh: "缺失通道示例（Missing Channels）",
      en: "Missing Channels Example",
      es: "Ejemplo de Canales Faltantes",
      fr: "Exemple de Canaux Manquants",
      de: "Fehlende Kanäle-Beispiel",
      ja: "欠損チャンネルの例",
      ko: "누락된 채널 예시",
    },
    categoryKey: "technical",
    difficultyKey: "intermediate",
    description: {
      zh: "这份 EEG 数据缺失多个通道（仅记录了 8 个通道，标准是 19-32 个）。信号质量评分 50/100，空间覆盖不足。",
      en: "This EEG data is missing multiple channels (only 8 channels recorded, standard is 19-32). Signal quality score 50/100, insufficient spatial coverage.",
    },
    details: {
      zh: "此案例展示了通道缺失的问题：\n\n1. 标准 10-20 系统有 19 个通道，此数据仅 8 个\n2. 无法进行全面的空间分析（如源定位）\n3. 某些脑区（如颞叶）完全没有覆盖\n\n学习 EEG 时，理解电极放置和通道数量对解释的影响非常重要。",
      en: "This case demonstrates the problem of missing channels:\n\n1. Standard 10-20 system has 19 channels, this data has only 8\n2. Cannot perform comprehensive spatial analysis (e.g., source localization)\n3. Some brain regions (e.g., temporal lobes) are completely uncovered\n\nWhen learning EEG, understanding the impact of electrode placement and channel count on interpretation is very important.",
    },
    signal_quality: 50,
    learning_readability_score: 65,
    beginner_explanation: {
      zh: "这份 EEG 只记录了很少的通道（像只用几个麦克风录音乐会），很多脑区没有被记录到。就像拼图少了很多块，看不完整。",
      en: "This EEG only recorded a few channels (like using only a few microphones to record a concert), many brain areas are not recorded. It's like a jigsaw puzzle with many missing pieces, the picture is incomplete.",
    },
    student_explanation: {
      zh: "标准 10-20 系统包含 19 个通道（扩展版可达 32 或更多）。此数据仅记录 8 个通道（可能是 Fp1、Fp2、F3、F4、C3、C4、O1、O2）。空间采样不足限制了拓扑分析和源定位的准确性。建议至少使用 19 通道记录。",
      en: "Standard 10-20 system includes 19 channels (extended versions can have 32 or more). This data only records 8 channels (possibly Fp1, Fp2, F3, F4, C3, C4, O1, O2). Insufficient spatial sampling limits the accuracy of topographic analysis and source localization. At least 19-channel recording is recommended.",
    },
    research_explanation: {
      zh: "8 通道记录不符合 10-20 标准，空间欠采样导致无法进行可靠的皮层源定位。缺少颞叶（T3、T4、T5、T6）和中央-顶叶通道限制了全脑分析。若研究需要空间信息（如 connectivity 分析），此数据不适用。建议使用高密度 EEG（64+ 通道）或至少标准 19 通道。",
      en: "8-channel recording does not meet 10-20 standards, and spatial undersampling makes reliable cortical source localization impossible. Missing temporal (T3, T4, T5, T6) and central-parietal channels limits whole-brain analysis. If the research requires spatial information (e.g., connectivity analysis), this data is not suitable. High-density EEG (64+ channels) or at least standard 19 channels is recommended.",
    },
    limitations: {
      zh: ["空间覆盖严重不足", "无法进行源定位或 connectivity 分析", "不符合 10-20 标准"],
      en: ["Severely insufficient spatial coverage", "Cannot perform source localization or connectivity analysis", "Does not meet 10-20 standards"],
    },
    what_this_data_cannot_tell: {
      zh: ["全脑活动模式", "精确的皮层源位置", "通道间的功能连接"],
      en: ["Whole-brain activity patterns", "Precise cortical source locations", "Functional connectivity between channels"],
    },
    tags: ["missingCh", "sys1020", "spatSamp", "srcLoc"],
    readTime: "7 分钟",
  },
  {
    id: "c6",
    title: {
      zh: "强 Alpha 活动示例（Strong Alpha）",
      en: "Strong Alpha Activity Example",
      es: "Ejemplo de Fuerte Actividad Alfa",
      fr: "Exemple de Forte Activité Alpha",
      de: "Starke Alpha-Aktivität-Beispiel",
      ja: "強いアルファ活動の例",
      ko: "강한 알파 활동 예시",
    },
    categoryKey: "patterns",
    difficultyKey: "beginner",
    description: {
      zh: "这份 EEG 数据显示非常强的 Alpha 波活动（枕叶区域振幅 > 80 μV）。信号质量评分 85/100，是典型的放松状态 EEG。",
      en: "This EEG data shows very strong Alpha wave activity (occipital area amplitude > 80 μV). Signal quality score 85/100, typical of relaxed-state EEG.",
    },
    details: {
      zh: "此案例展示了典型的 Alpha 节律：\n\n1. Alpha 波（8-13 Hz）在闭眼放松状态下最为明显\n2. 一旦睁眼或注意外部刺激，Alpha 波会减弱（Alpha 阻断）\n3. Alpha 振幅和分布可以反映放松程度和注意力状态\n\n这是学习 EEG 基础节律的最佳案例之一。",
      en: "This case demonstrates typical Alpha rhythm:\n\n1. Alpha waves (8-13 Hz) are most prominent during eyes-closed relaxed state\n2. Upon opening eyes or attending to external stimuli, Alpha waves diminish (Alpha blocking)\n3. Alpha amplitude and distribution can reflect relaxation level and attention state\n\nThis is one of the best cases for learning basic EEG rhythms.",
    },
    signal_quality: 85,
    learning_readability_score: 90,
    beginner_explanation: {
      zh: "这份 EEG 显示很强的 Alpha 波，就像大脑在'休息模式'。当你闭眼放松时，后脑会发出这种规律的波。如果睁眼或开始思考，这种波就会消失。",
      en: "This EEG shows strong Alpha waves, like the brain is in 'rest mode.' When you close your eyes and relax, the back of the brain emits this regular wave. If you open your eyes or start thinking, this wave disappears.",
    },
    student_explanation: {
      zh: "Alpha 节律（8-13 Hz）是成人静息态 EEG 最突出的特征。枕叶区域（O1、O2）振幅通常 50-100 μV。Alpha 阻断是指视觉输入或认知任务导致 Alpha 功率下降。此案例适合学习基本的 EEG 节律和状态变化。",
      en: "Alpha rhythm (8-13 Hz) is the most prominent feature of adult resting-state EEG. Occipital areas (O1, O2) typically have amplitude 50-100 μV. Alpha blocking refers to the reduction of Alpha power due to visual input or cognitive tasks. This case is suitable for learning basic EEG rhythms and state changes.",
    },
    research_explanation: {
      zh: "PSD 分析显示枕叶区域 Alpha peak 在 10 Hz，功率谱密度 ~15 μV²/Hz。Alpha/Theta 比值约为 2.5。根据文献，强 Alpha 活动与放松状态、降低的焦虑水平、以及良好的认知储备相关。此数据适合用于研究个体差异和状态依赖性变化。",
      en: "PSD analysis shows Alpha peak at 10 Hz in occipital areas, power spectral density ~15 μV²/Hz. Alpha/Theta ratio is approximately 2.5. According to literature, strong Alpha activity is associated with relaxed state, reduced anxiety levels, and good cognitive reserve. This data is suitable for studying individual differences and state-dependent changes.",
    },
    limitations: {
      zh: ["仅静息态记录，无任务条件对比", "未记录同时的行为数据（如 Alpha 阻断测试）", "个体差异未考虑（如 Alpha 优势个体差异）"],
      en: ["Only resting-state recording, no task condition comparison", "No concurrent behavioral data (e.g., Alpha blocking test)", "Individual differences not considered (e.g., individual differences in Alpha dominance)"],
    },
    what_this_data_cannot_tell: {
      zh: ["智商或认知能力", "情绪状态的具体细节", "是否患有神经系统疾病"],
      en: ["IQ or cognitive ability", "Specific details of emotional state", "Whether the person has a neurological disease"],
    },
    tags: ["alpha", "resting", "relax", "rhythm"],
    readTime: "6 分钟",
  },
  {
    id: "c7",
    title: {
      zh: "高噪声复杂度示例（High Noise Complexity）",
      en: "High Noise Complexity Example",
      es: "Ejemplo de Complejidad de Ruido Alta",
      fr: "Exemple de Complexité de Bruit Élevé",
      de: "Hohe Rauschkomplexität-Beispiel",
      ja: "高ノイズ複雑性の例",
      ko: "높은 노이즈 복잡성 예시",
    },
    categoryKey: "quality",
    difficultyKey: "advanced",
    description: {
      zh: "这份 EEG 数据包含多种复杂噪声（肌电、眼电、工频、电极松动）。信号质量评分仅 30/100，是噪声处理的挑战性案例。",
      en: "This EEG data contains multiple complex noises (EMG, EOG, power line, loose electrodes). Signal quality score is only 30/100, a challenging case for noise processing.",
    },
    details: {
      zh: "此案例展示了真实世界中最具挑战性的 EEG 数据：\n\n1. 多种伪影同时出现（肌电 + 眼电 + 工频噪声）\n2. 某些通道完全不可用（信号质量评分 < 20）\n3. 需要高级预处理（ICA、带阻滤波、分段）才能提取有效信息\n\n这是学习 EEG 预处理流程的高级案例。",
      en: "This case demonstrates the most challenging EEG data in real-world settings:\n\n1. Multiple artifacts appear simultaneously (EMG + EOG + power line noise)\n2. Some channels are completely unusable (signal quality score < 20)\n3. Advanced preprocessing (ICA, notch filtering, segmentation) is needed to extract valid information\n\nThis is an advanced case for learning EEG preprocessing workflows.",
    },
    signal_quality: 30,
    learning_readability_score: 40,
    beginner_explanation: {
      zh: "这份 EEG 噪声非常多，就像在嘈杂的餐厅里试图听清一个人的说话。很多通道的信号完全不可用，需要专业人士进行大量清理工作。",
      en: "This EEG has a lot of noise, like trying to hear one person speak in a noisy restaurant. Many channels have completely unusable signals, requiring professionals to do a lot of cleaning work.",
    },
    student_explanation: {
      zh: "该 EEG 记录包含多种伪影的叠加：前额区域有眼电伪影（EOG），颞叶和中央区域有肌电伪影（EMG），且存在 50 Hz 工频噪声。多个通道（如 FP1、F7、T3）信号质量 < 20。建议的预处理流程：1) 检查并拒绝坏通道；2) 使用 ICA 去除眼电和肌电伪影；3) 应用 notch filter 去除工频噪声；4) 分段并基线校正。",
      en: "The EEG recording contains a superposition of multiple artifacts: EOG artifacts in frontal areas, EMG artifacts in temporal and central areas, and 50 Hz power line noise. Multiple channels (e.g., FP1, F7, T3) have signal quality < 20. Recommended preprocessing pipeline: 1) Identify and reject bad channels; 2) Use ICA to remove EOG and EMG artifacts; 3) Apply notch filter to remove power line noise; 4) Segment and baseline correct.",
    },
    research_explanation: {
      zh: "此数据的 SNR 极低（多个通道 < 1 dB）。ICA 分解显示 3-4 个明显的伪影成分（眼电、肌电、工频、心跳）。建议：1) 使用 ADJUST 或 MARA 算法自动识别伪影成分；2) 考虑使用 EEGLAB 的 `clean_rawdata` 插件；3) 如果超过 30% 的通道损坏，建议重新记录。对于研究用途，此数据仅适合作为伪影处理教学案例，不应直接用于分析。",
      en: "The SNR of this data is extremely low (multiple channels < 1 dB). ICA decomposition shows 3-4 distinct artifact components (EOG, EMG, power line, heartbeat). Recommendations: 1) Use ADJUST or MARA algorithm to automatically identify artifact components; 2) Consider using EEGLAB's `clean_rawdata` plugin; 3) If more than 30% of channels are corrupted, re-recording is recommended. For research purposes, this data is only suitable as a teaching case for artifact processing, not for direct analysis.",
    },
    limitations: {
      zh: ["多种伪影叠加，分离困难", "超过 30% 的通道可能不可用", "预处理可能引入额外误差"],
      en: ["Multiple overlapping artifacts, difficult to separate", "Over 30% of channels may be unusable", "Preprocessing may introduce additional errors"],
    },
    what_this_data_cannot_tell: {
      zh: ["可靠的脑活动模式", "任何与认知或临床相关的信息", "准确的频段功率或 connectivity"],
      en: ["Reliable brain activity patterns", "Any cognition- or clinically-related information", "Accurate band power or connectivity"],
    },
    tags: ["complexNoise", "ica", "preprocess", "artRemoval", "advanced"],
    readTime: "10 分钟",
  },
  {
    id: "c8",
    title: {
      zh: "学生学习示例（Student Learning）",
      en: "Student Learning Example",
      es: "Ejemplo de Aprendizaje Estudiantil",
      fr: "Exemple d'Apprentissage Étudiant",
      de: "Studentisches Lernen-Beispiel",
      ja: "学生学習の例",
      ko: "학생 학습 예시",
    },
    categoryKey: "education",
    difficultyKey: "beginner",
    description: {
      zh: "这份 EEG 数据是专门为 EEG 初学者设计的教学案例。信号质量评分 75/100，包含典型的 EEG 特征，适合练习基础解读技能。",
      en: "This EEG data is specifically designed as a teaching case for EEG beginners. Signal quality score 75/100, contains typical EEG features, suitable for practicing basic interpretation skills.",
    },
    details: {
      zh: "此案例是 EEG 学习的起点：\n\n1. 信号质量适中（75/100），有一些噪声但不严重\n2. 可以清楚地看到 Alpha 和 Theta 波\n3. 适合练习识别基本波形和计算频段功率\n4. 附带详细的逐步解读指南\n\n建议使用此案例练习 EEG 基础解读，然后再尝试更复杂的案例。",
      en: "This case is the starting point for EEG learning:\n\n1. Moderate signal quality (75/100), some noise but not severe\n2. Alpha and Theta waves can be clearly seen\n3. Suitable for practicing identifying basic waveforms and calculating band power\n4. Comes with detailed step-by-step interpretation guide\n\nIt is recommended to use this case to practice basic EEG interpretation, then try more complex cases.",
    },
    signal_quality: 75,
    learning_readability_score: 95,
    beginner_explanation: {
      zh: "这份 EEG 很适合学习！信号质量不错，你可以看到脑电的基本波形。就像学骑自行车，从一个不太陡的坡开始。",
      en: "This EEG is great for learning! The signal quality is good, and you can see basic brainwave patterns. It's like learning to ride a bicycle, starting on a gentle slope.",
    },
    student_explanation: {
      zh: "该 EEG 记录适合初学者练习基础解读技能。可以观察到：1) 枕叶区域 Alpha 波（8-13 Hz）；2) 额叶区域 Theta 波（4-8 Hz）轻微升高；3) 信号质量评分 75/100，有轻度噪声但不影响学习。建议练习：计算各频段功率、识别伪影、练习 Alpha 阻断实验。",
      en: "This EEG recording is suitable for beginners to practice basic interpretation skills. You can observe: 1) Alpha waves (8-13 Hz) in occipital areas; 2) Slightly elevated Theta waves (4-8 Hz) in frontal areas; 3) Signal quality score 75/100, with mild noise that does not affect learning. Recommended exercises: Calculate band power, identify artifacts, practice Alpha blocking experiment.",
    },
    research_explanation: {
      zh: "此案例设计为教学用途，包含典型的 EEG 特征：Alpha peak ~10 Hz，Theta ~6 Hz，低振幅 Beta（13-20 Hz）。PSD 估计基于 2-second 分段（Hanning 窗）。采样率 250 Hz，符合教学标准。数据已进行轻度预处理（带通滤波 1-40 Hz， notch 50 Hz）。适合用于教学演示 PSD、bandpower、以及基础伪影识别。",
      en: "This case is designed for teaching purposes and contains typical EEG features: Alpha peak ~10 Hz, Theta ~6 Hz, low-amplitude Beta (13-20 Hz). PSD estimation is based on 2-second segments (Hanning window). Sampling rate 250 Hz, meets teaching standards. Data has undergone mild preprocessing (bandpass filter 1-40 Hz, notch 50 Hz). Suitable for teaching PSD, bandpower, and basic artifact identification.",
    },
    limitations: {
      zh: ["专为教学设计的简化数据", "可能不包含真实世界的复杂噪声", "频段功率估算基于较短的记录"],
      en: ["Simplified data designed for teaching", "May not include complex noise from real-world settings", "Band power estimation based on shorter recording"],
    },
    what_this_data_cannot_tell: {
      zh: ["临床或诊断信息", "复杂的认知状态", "个体差异或疾病标记"],
      en: ["Clinical or diagnostic information", "Complex cognitive states", "Individual differences or disease markers"],
    },
    tags: ["teaching", "beginnerTag", "basicInterp", "alpha", "theta"],
    readTime: "10 分钟",
  },
];
const difficultyColor: Record<string, string> = {
  beginner: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800",
  intermediate: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800",
  advanced: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
};

export default function CasesPage() {
  const { lang, t } = useLang();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("default");

  const categories = ["all", ...Array.from(new Set(cases.map((c) => c.categoryKey)))];
  const difficulties = ["all", "beginner", "intermediate", "advanced"];

  const filtered = useMemo(() => {
    let result = cases.filter((c) => {
      if (selectedCategory !== "all" && c.categoryKey !== selectedCategory) return false;
      if (selectedDifficulty !== "all" && c.difficultyKey !== selectedDifficulty) return false;
      if (selectedTag && !c.tags.includes(selectedTag)) return false;
      const q = search.toLowerCase();
      if (q) {
        const title = (c.title[lang] || c.title.en || c.title.zh || "").toLowerCase();
        const desc = (c.description[lang] || c.description.en || c.description.zh || "").toLowerCase();
        const tags = c.tags.join(" ").toLowerCase();
        if (!title.includes(q) && !desc.includes(q) && !tags.includes(q)) return false;
      }
      return true;
    });

    // 排序
    if (sortBy === "quality") result.sort((a, b) => b.signal_quality - a.signal_quality);
    if (sortBy === "difficulty") {
      const order = { beginner: 0, intermediate: 1, advanced: 2 };
      result.sort((a, b) => (order[a.difficultyKey] || 0) - (order[b.difficultyKey] || 0));
    }

    return result;
  }, [cases, selectedCategory, selectedDifficulty, search, selectedTag, sortBy, lang]);

  const toggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <motion.div
      className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <section className="max-w-6xl mx-auto px-5 py-8">
        {/* 标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{t("casesTitle")}</h1>
          <p className="text-sm text-[var(--color-text)]/70 mt-1">{t("casesSubtitle")}</p>
        </div>

        {/* 搜索 + 筛选 */}
        <div className="space-y-4 mb-6">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("casesSearchPlaceholder")}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-primary)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10"
            />
          </div>

          {/* 筛选栏 */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 分类 */}
            <div className="flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    selectedCategory === cat
                      ? "bg-blue-600 text-white border-blue-600 dark:bg-blue-600 dark:text-white"
                      : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-border)]"
                  }`}
                >
                  {cat === "all" ? t("all") : t(`cat${cat}`)}
                </button>
              ))}
            </div>

            {/* 难度 */}
            <div className="flex items-center gap-1.5 ml-2">
              <Filter className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              {difficulties.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDifficulty(d)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    selectedDifficulty === d
                      ? "bg-blue-600 text-white border-blue-600 dark:bg-blue-600 dark:text-white"
                      : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-border)]"
                  }`}
                >
                  {d === "all" ? t("all") : t(`diff${d}`)}
                </button>
              ))}
            </div>

            {/* 排序 */}
            <div className="flex items-center gap-1.5 ml-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[var(--color-text)] focus:outline-none"
              >
                <option value="default">{t("casesSortDefault")}</option>
                <option value="quality">{t("quality")}</option>
                <option value="difficulty">{t("casesSortDifficulty")}</option>
              </select>
            </div>
          </div>

          {/* 标签筛选（仅在有选中标签时显示清除按钮） */}
          {selectedTag && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-secondary)]">{t("tags")}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/30 px-2.5 py-0.5 text-xs text-blue-700 dark:text-blue-400">
                {t("tag" + selectedTag.charAt(0).toUpperCase() + selectedTag.slice(1))}
                <button onClick={() => setSelectedTag(null)} className="ml-1 hover:text-blue-900 dark:hover:text-blue-200">×</button>
              </span>
            </div>
          )}
        </div>

        {/* 案例列表 */}
        <div className="space-y-4">
          {filtered.map((c, i) => {
            const isExpanded = expandedId === c.id;
            const title = c.title[lang] || c.title.en || c.title.zh || "";
            const description = c.description[lang] || c.description.en || c.description.zh || "";
            const details = c.details[lang] || c.details.en || c.details.zh || "";
            const beginnerExp = c.beginner_explanation[lang] || c.beginner_explanation.en || c.beginner_explanation.zh || "";
            const studentExp = c.student_explanation[lang] || c.student_explanation.en || c.student_explanation.zh || "";
            const researchExp = c.research_explanation[lang] || c.research_explanation.en || c.research_explanation.zh || "";
            const limitations = c.limitations[lang] || c.limitations.en || c.limitations.zh || [];
            const cannotTell = c.what_this_data_cannot_tell[lang] || c.what_this_data_cannot_tell.en || c.what_this_data_cannot_tell.zh || [];

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden hover:shadow-lg hover:shadow-gray-900/5 transition-all duration-300"
              >
                {/* 卡片头部（点击展开） */}
                <div
                  className="p-5 cursor-pointer select-none"
                  onClick={() => toggle(c.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* 标签行 */}
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${difficultyColor[c.difficultyKey]}`}
                        >
                          {t(`diff${c.difficultyKey}`)}
                        </span>
                        <span className="text-xs text-[var(--color-text-secondary)]">{t(`cat${c.categoryKey}`)}</span>
                        <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {t("readTime").replace("{min}", c.readTime.replace(/[^0-9]/g, ""))}
                        </span>
                      </div>
                      {/* 标题 */}
                      <h3 className="text-sm font-bold text-[var(--color-text)] leading-snug">{title}</h3>
                      {/* 简介 */}
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 line-clamp-2">{description}</p>
                    </div>
                    {/* 展开/折叠箭头 */}
                    <div className="pt-1">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      )}
                    </div>
                  </div>
                </div>

                {/* 展开内容 */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-6 border-t border-[var(--color-border)]">
                        {/* 详细描述 */}
                        <div className="pt-4">
                          <h4 className="text-xs font-bold text-[var(--color-text-secondary)] mb-2">{t("caseDetails")}</h4>
                          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line">{details}</p>
                        </div>

                        {/* 信号质量 */}
                        <div>
                          <h4 className="text-xs font-bold text-[var(--color-text-secondary)] mb-2">{t("signalQualityScore")}</h4>
                          <div className="flex items-center gap-3">
                            <div className={`text-lg font-bold ${
                              c.signal_quality >= 80 ? "text-green-600" : c.signal_quality >= 60 ? "text-yellow-600" : "text-red-600"
                            }`}>{c.signal_quality}/100</div>
                            <div className="flex-1 h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  c.signal_quality >= 80 ? "bg-green-500" : c.signal_quality >= 60 ? "bg-yellow-500" : "bg-red-500"
                                }`}
                                style={{ width: `${c.signal_quality}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* 三层 AI 解释 */}
                        <div>
                          <h4 className="text-xs font-bold text-[var(--color-text-secondary)] mb-3">{t("aiExplanation")}（{t("beginnerMode")} / {t("studentMode")} / {t("researchMode")}）</h4>
                          <div className="space-y-4">
                            {/* Beginner */}
                            <div className="bg-green-50/50 border border-green-200 rounded-xl p-4 dark:bg-green-950/30 dark:border-green-800">
                              <div className="flex items-center gap-2 mb-2">
                                <User className="w-4 h-4 text-green-600" />
                                <span className="text-xs font-bold text-green-700 dark:text-green-400">{t("beginnerMode")}</span>
                              </div>
                              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{beginnerExp}</p>
                            </div>
                            {/* Student */}
                            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 dark:bg-blue-950/30 dark:border-blue-800">
                              <div className="flex items-center gap-2 mb-2">
                                <GraduationCap className="w-4 h-4 text-blue-600" />
                                <span className="text-xs font-bold text-blue-700 dark:text-blue-400">{t("studentMode")}</span>
                              </div>
                              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{studentExp}</p>
                            </div>
                            {/* Research */}
                            <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-4 dark:bg-purple-950/30 dark:border-purple-800">
                              <div className="flex items-center gap-2 mb-2">
                                <Microscope className="w-4 h-4 text-purple-600" />
                                <span className="text-xs font-bold text-purple-700 dark:text-purple-400">{t("researchMode")}</span>
                              </div>
                              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{researchExp}</p>
                            </div>
                          </div>
                        </div>

                        {/* Limitations */}
                        {limitations.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-[var(--color-text-secondary)] mb-2">{t("dataLimitations")}</h4>
                            <ul className="space-y-1">
                              {limitations.map((lim, j) => (
                                <li key={j} className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
                                  <AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                                  {lim}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* What this data cannot tell */}
                        <div>
                          <h4 className="text-xs font-bold text-[var(--color-text-secondary)] mb-2">{t("whatDataCannotTell")}</h4>
                          <ul className="space-y-1">
                            {cannotTell.map((item, j) => (
                              <li key={j} className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
                                <span className="text-gray-300">•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* 标签 */}
                        <div className="flex flex-wrap gap-1.5">
                          {c.tags.map((tag) => (
                            <button
                              key={tag}
                              onClick={(e) => { e.stopPropagation(); setSelectedTag(tag === selectedTag ? null : tag); }}
                              className={`text-xs px-2 py-0.5 rounded-md transition-all ${
                                selectedTag === tag
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                                  : "bg-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-text)]/10"
                              }`}
                            >
                              {t("tag" + tag.charAt(0).toUpperCase() + tag.slice(1))}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* 空状态 */}
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-16 text-center"
          >
            <Stethoscope className="w-12 h-12 text-[var(--color-border)] mx-auto mb-4" />
            <p className="text-[var(--color-text-secondary)]">{t("noFilesSelected")}</p>
          </motion.div>
        )}
      </section>
    </motion.div>
  );
}
