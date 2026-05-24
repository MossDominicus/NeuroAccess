"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useLang } from "@/lib/language-context";
import KnowledgeCard, { KnowledgeCardData } from "@/components/KnowledgeCard";
import { BookOpen, Search, Filter } from "lucide-react";

// ── 知识卡片双语数据 ─────────────────────────────────
function getCards(lang: "zh" | "en"): KnowledgeCardData[] {
  return [
    {
      id: "alpha", category: "brainwaves", icon: "α", iconColor: "#059669",
      title: lang === "zh" ? "Alpha 波 (α)" : "Alpha Waves (α)",
      frequency: "8 – 12 Hz",
      description: lang === "zh"
        ? "Alpha 波是 EEG 中最常见的节律性活动，当人闭眼放松但仍清醒时最为明显。它是 EEG 研究中最经典的发现之一。"
        : "Alpha waves are the most common rhythmic activity in EEG, prominent when a person closes their eyes in a relaxed but awake state. It is one of the most classic findings in EEG research.",
      details: {
        what: lang === "zh"
          ? "α 波频率为 8–12 Hz，振幅约为 20–100 μV，主要分布在枕叶（后脑勺）。睁眼时会迅速减弱或消失，称为 α 阻滞（alpha blockade）。"
          : "α waves have a frequency of 8–12 Hz, amplitude of 20–100 μV, mainly distributed in the occipital lobe. They quickly attenuate upon opening eyes, known as alpha blockade.",
        why: lang === "zh"
          ? "α 波是评估大脑皮层“空闲”状态的重要指标。α 波缺失或异常可能提示皮层功能障碍，但单独看 α 波不能做任何疾病诊断。"
          : "Alpha is an important indicator of cortical 'idling' state. Absence or abnormality of alpha may suggest cortical dysfunction, but alpha alone cannot diagnose any disease.",
        ranges: "8 – 12 Hz, occipital dominant",
        pattern: lang === "zh"
          ? "典型的 α 节律呈正弦样，枕叶导联最明显（如 O1、O2），在 EEG 上表现为规则的 10 Hz 左右波动。"
          : "Typical alpha rhythm appears sinusoidal, most prominent in occipital leads (e.g. O1, O2), showing regular ~10 Hz oscillations on EEG.",
        cannotTell: lang === "zh"
          ? "α 波不能诊断任何疾病、智力水平、情绪状态或性格特征。α 波减少也可能仅仅是因为被试睁眼、焦虑或注意力集中。"
          : "Alpha cannot diagnose any disease, intelligence, emotional state, or personality. Reduced alpha can simply be due to eyes being open, anxiety, or attention.",
      }
    },
    {
      id: "beta", category: "brainwaves", icon: "β", iconColor: "#2563eb",
      title: lang === "zh" ? "Beta 波 (β)" : "Beta Waves (β)",
      frequency: "12 – 30 Hz",
      description: lang === "zh"
        ? "Beta 波与活跃思维、注意力集中和警觉状态相关。它通常出现在前额叶和中央区域。"
        : "Beta waves are associated with active thinking, focused attention, and alert states. They typically appear in frontal and central regions.",
      details: {
        what: lang === "zh"
          ? "β 波频率为 12–30 Hz，振幅较低（5–20 μV），主要分布在额叶和中央区。在眼睛睁开、进行心理活动或焦虑时增加。安眠药或镇静剂可增加 β 活动。"
          : "β waves range 12–30 Hz, low amplitude (5–20 μV), mainly frontal/central. They increase with eyes open, mental activity, or anxiety. Sedatives can increase beta activity.",
        why: lang === "zh"
          ? "β 波反映皮层的活跃处理状态。在不同脑区的 β 活动差异可用于研究认知功能，但需注意肌电伪迹也会产生 β 频段信号。"
          : "Beta reflects cortical active processing. Regional beta activity differences can inform cognitive studies, but EMG artifacts also produce beta-range signals.",
        ranges: "12 – 30 Hz, frontocentral dominant",
        cannotTell: lang === "zh"
          ? "β 波不能诊断 ADHD、焦虑症或任何精神疾病。也无法衡量智商、创造力或注意力水平。"
          : "Beta cannot diagnose ADHD, anxiety, or any psychiatric condition. It also cannot measure IQ, creativity, or attention level.",
      }
    },
    {
      id: "theta", category: "brainwaves", icon: "θ", iconColor: "#7c3aed",
      title: lang === "zh" ? "Theta 波 (θ)" : "Theta Waves (θ)",
      frequency: "4 – 8 Hz",
      description: lang === "zh"
        ? "Theta 波与冥想、浅睡和记忆编码相关。在儿童和青少年中更常见，成年人清醒时出现过多 θ 波可能提示异常。"
        : "Theta waves are associated with meditation, light sleep, and memory encoding. More common in children/adolescents; excessive theta in awake adults may indicate abnormality.",
      details: {
        what: lang === "zh"
          ? "θ 波频率为 4–8 Hz，振幅中等到高（20–100 μV），分布在额叶和颞叶区域。在入睡过渡期和 REM 睡眠中尤为明显。"
          : "θ waves range 4–8 Hz, medium to high amplitude (20–100 μV), distributed in frontal and temporal regions. Prominent during sleep transition and REM sleep.",
        why: lang === "zh"
          ? "θ 波参与记忆巩固和空间导航。海马体的 θ 节律在学习过程中起关键作用。临床中，弥漫性 θ 波可见于某些脑病，但需要医生综合判断。"
          : "Theta participates in memory consolidation and spatial navigation. Hippocampal theta rhythm plays a key role in learning. Clinically, diffuse theta may be seen in certain encephalopathies, requiring physician evaluation.",
        ranges: "4 – 8 Hz, frontotemporal dominant",
        cannotTell: lang === "zh"
          ? "θ 波不能诊断 ADHD（尽管有些假说涉及 θ/β 比值），也不能判断冥想深度、记忆力优劣或是否患有脑部疾病。"
          : "Theta cannot diagnose ADHD (despite hypotheses about theta/beta ratio), judge meditation depth, memory quality, or brain disease.",
      }
    },
    {
      id: "delta", category: "brainwaves", icon: "δ", iconColor: "#dc2626",
      title: lang === "zh" ? "Delta 波 (δ)" : "Delta Waves (δ)",
      frequency: "0.5 – 4 Hz",
      description: lang === "zh"
        ? "Delta 波是最慢的脑电波，主要出现在深度睡眠（慢波睡眠）中。清醒成年人出现 δ 波通常为异常。"
        : "Delta waves are the slowest brain waves, primarily occurring during deep sleep. Delta in awake adults is typically abnormal.",
      details: {
        what: lang === "zh"
          ? "δ 波频率为 0.5–4 Hz，高振幅（100–200 μV），广泛分布。是 NREM 第 3 阶段（慢波睡眠）的标志。清醒状态下的局灶性 δ 波可能提示结构性脑损伤。"
          : "δ waves range 0.5–4 Hz, high amplitude (100–200 μV), widely distributed. Hallmark of NREM stage 3 (slow wave sleep). Focal delta in awake state may suggest structural brain lesions.",
        why: lang === "zh"
          ? "δ 波是评估睡眠质量和深度的重要指标。慢波睡眠中的 δ 活动被认为对记忆巩固和大脑恢复至关重要。"
          : "Delta is crucial for evaluating sleep quality and depth. Slow wave activity during deep sleep is believed essential for memory consolidation and brain restoration.",
        ranges: "0.5 – 4 Hz, widespread",
        cannotTell: lang === "zh"
          ? "δ 波本身不能诊断脑肿瘤、脑损伤或任何特定疾病。医生需要结合 MRI、CT 等其他检查进行综合判断。"
          : "Delta alone cannot diagnose brain tumors, injury, or any specific disease. Physicians need MRI, CT, and other tests for comprehensive evaluation.",
      }
    },
    {
      id: "artifacts", category: "artifacts", icon: "⚡", iconColor: "#d97706",
      title: lang === "zh" ? "EEG 伪迹" : "EEG Artifacts",
      description: lang === "zh"
        ? "伪迹是 EEG 记录中非脑源性的信号，如果不加以识别和去除，会严重影响分析结果。"
        : "Artifacts are non-cerebral signals in EEG recordings that can severely impact analysis if not identified and removed.",
      details: {
        what: lang === "zh"
          ? "常见伪迹包括：眨眼（EOG，最高达 200 μV）、肌电（EMG，20 Hz 以上高频）、工频干扰（50/60 Hz）、电极位移、出汗等。每种伪迹在波形和频率上有独特特征。"
          : "Common artifacts: eye blinks (EOG, up to 200 μV), muscle activity (EMG, >20 Hz), power line interference (50/60 Hz), electrode movement, sweat. Each has distinctive waveform and frequency features.",
        why: lang === "zh"
          ? "伪迹识别是 EEG 分析的第一步。如果不处理伪迹，频段分析、连接性分析等所有后续分析都可能产生错误结论。ICA 是最常用的自动去除方法。"
          : "Artifact identification is the first step in EEG analysis. Without handling artifacts, frequency analysis, connectivity, and all subsequent analyses may produce erroneous conclusions. ICA is the most common automated removal method.",
        cannotTell: lang === "zh"
          ? "去除伪迹不能完全消除所有噪声，也做不到完美复原被干扰的脑电成分。过度去伪迹可能丢失真实脑电信号。"
          : "Artifact removal cannot eliminate all noise, nor perfectly restore contaminated brain components. Over-removal may lose genuine EEG signal.",
      }
    },
    {
      id: "channels", category: "technical", icon: "🔢", iconColor: "#0891b2",
      title: lang === "zh" ? "EEG 通道与 10-20 系统" : "EEG Channels & 10-20 System",
      description: lang === "zh"
        ? "EEG 通道数决定了空间分辨率。标准 10-20 系统定义了电极放置位置，是国际通用的 EEG 记录标准。"
        : "The number of EEG channels determines spatial resolution. The standard 10-20 system defines electrode placement, the international standard for EEG recording.",
      details: {
        what: lang === "zh"
          ? "10-20 系统将头皮按 10% 和 20% 的比例划分，电极名称以字母（F=额叶、C=中央、P=顶叶、O=枕叶、T=颞叶）+ 数字（奇数左、偶数右）命名。临床常用 19–21 通道，研究可用 32/64/128 通道。"
          : "The 10-20 system divides the scalp by 10% and 20% intervals. Electrodes are named by letter (F=Frontal, C=Central, P=Parietal, O=Occipital, T=Temporal) + number (odd=left, even=right). Clinical: 19-21 channels; Research: 32/64/128 channels.",
        why: lang === "zh"
          ? "通道数影响源定位精度。电极越多空间采样越密集，但采集时间、舒适度和成本也随之增加。通道缺失会严重影响分析。"
          : "Channel count affects source localization accuracy. More electrodes = denser spatial sampling, but collection time, comfort, and cost increase. Missing channels severely impact analysis.",
        ranges: "Standard: 19–21 (clinical), 32–256 (research)",
        cannotTell: lang === "zh"
          ? "少通道（<8）EEG 不能进行可靠的源定位或连接性分析。通道数本身不决定数据质量。"
          : "Low channel count (<8) EEG cannot perform reliable source localization or connectivity analysis. Channel count alone does not determine data quality.",
      }
    },
    {
      id: "sampling", category: "technical", icon: "⏱", iconColor: "#6366f1",
      title: lang === "zh" ? "采样率" : "Sampling Rate",
      description: lang === "zh"
        ? "采样率决定了 EEG 信号的时间分辨率。根据奈奎斯特定理，采样率必须至少是目标最高频率的 2 倍。"
        : "Sampling rate determines the temporal resolution of EEG. According to Nyquist theorem, it must be at least 2× the highest frequency of interest.",
      details: {
        what: lang === "zh"
          ? "采样率以 Hz 为单位，常见值为 128/256/500/1000 Hz。采样率 = 250 Hz 意味着每秒记录 250 个数据点。奈奎斯特频率 = 采样率 / 2，即最高可分析的频率。"
          : "Sampling rate is measured in Hz, common values: 128/256/500/1000 Hz. 250 Hz means 250 data points per second. Nyquist frequency = sampling rate / 2, the highest analyzable frequency.",
        why: lang === "zh"
          ? "采样率不足会导致混叠（aliasing），即高频信号伪装成低频信号。对于标准 EEG（<40 Hz），128 Hz 通常足够，但研究高频 γ 波（>50 Hz）需要 ≥250 Hz。"
          : "Insufficient sampling causes aliasing, where high frequencies masquerade as low frequencies. For standard EEG (<40 Hz), 128 Hz is usually sufficient, but studying gamma (>50 Hz) requires ≥250 Hz.",
        ranges: "Clinical: 128–256 Hz; Research: 250–1000+ Hz",
        cannotTell: lang === "zh"
          ? "高采样率不能补偿差的信号质量。采样率 > 1000 Hz 对常规 EEG 分析无额外收益。"
          : "High sampling rate cannot compensate for poor signal quality. Sampling >1000 Hz provides no additional benefit for routine EEG analysis.",
      }
    },
    {
      id: "noise", category: "technical", icon: "📊", iconColor: "#f59e0b",
      title: lang === "zh" ? "信号噪声与信噪比" : "Signal Noise & SNR",
      description: lang === "zh"
        ? "EEG 信号先天信噪比较低。环境电磁噪声、电极阻抗和生理伪迹都会影响数据质量。"
        : "EEG inherently has a low signal-to-noise ratio. Environmental EM noise, electrode impedance, and physiological artifacts all affect data quality.",
      details: {
        what: lang === "zh"
          ? "SNR = 信号功率 / 噪声功率。EEG 信号典型振幅为 10–100 μV，噪声来源包括：50/60 Hz 工频干扰、电极-皮肤接触噪声、受试者运动等。"
          : "SNR = signal power / noise power. EEG amplitude typically 10–100 μV. Noise sources include: 50/60 Hz power line, electrode-skin contact noise, subject movement, etc.",
        why: lang === "zh"
          ? "低 SNR 会导致频段分析、ERP 分析和连接性分析的结果不可靠。提高 SNR 的方法：低阻抗（<5 kΩ）、屏蔽环境、带通滤波（0.5–40 Hz）、多次平均。"
          : "Low SNR makes frequency, ERP, and connectivity analyses unreliable. Ways to improve SNR: low impedance (<5 kΩ), shielded environment, bandpass filtering (0.5–40 Hz), signal averaging.",
        cannotTell: lang === "zh"
          ? "没有绝对的“干净”EEG。所有 EEG 都包含一定噪声。信噪比数值不能直接跨设备比较。"
          : "There is no absolutely 'clean' EEG. All EEG contains some noise. SNR values cannot be directly compared across devices.",
      }
    },
    {
      id: "psd", category: "technical", icon: "📈", iconColor: "#8b5cf6",
      title: lang === "zh" ? "功率谱密度 (PSD)" : "Power Spectral Density (PSD)",
      description: lang === "zh"
        ? "PSD 是 EEG 频域分析的核心工具，用于量化信号在不同频率上的功率分布。"
        : "PSD is the core tool for EEG frequency-domain analysis, quantifying power distribution across frequencies.",
      details: {
        what: lang === "zh"
          ? "PSD 通过傅里叶变换（常用 Welch 方法）将时域 EEG 信号转换为频域。输出单位为 μV²/Hz 或 dB。在睡眠和认知研究中广泛应用。"
          : "PSD transforms time-domain EEG to frequency domain via Fourier transform (commonly Welch method). Units: μV²/Hz or dB. Widely used in sleep and cognitive research.",
        why: lang === "zh"
          ? "PSD 使研究者能够量化各频段的能量（bandpower），识别主导节律，比较不同条件或人群的频谱差异。是连接性、时频分析等高级方法的基础。"
          : "PSD enables quantification of band energy (bandpower), identification of dominant rhythms, comparison of spectral differences across conditions/groups. Foundation for connectivity, time-frequency analyses.",
        ranges: "Typical resolution: 0.5–2 Hz bins, analyzed 0.5–40 Hz",
        cannotTell: lang === "zh"
          ? "PSD 无法识别瞬态事件（如棘波、ERP）。PSD 是平均测度，不能反映信号的时间动态变化。"
          : "PSD cannot detect transient events (spikes, ERPs). PSD is an average measure and cannot reflect temporal dynamics of the signal.",
      }
    },
    {
      id: "bandpower", category: "technical", icon: "📶", iconColor: "#0ea5e9",
      title: lang === "zh" ? "频带能量 (Bandpower)" : "Bandpower",
      description: lang === "zh"
        ? "频带能量将 PSD 结果汇总为有意义的频段数值，是 EEG 分析最常用的指标之一。"
        : "Bandpower summarizes PSD results into meaningful band values, one of the most common EEG metrics.",
      details: {
        what: lang === "zh"
          ? "从 PSD 中提取不同频段的能量：delta (0.5–4 Hz), theta (4–8 Hz), alpha (8–12 Hz), beta (12–30 Hz)。通常以绝对功率（μV²）或相对功率（%）表示。"
          : "Extract energy per band from PSD: delta (0.5–4 Hz), theta (4–8 Hz), alpha (8–12 Hz), beta (12–30 Hz). Expressed as absolute power (μV²) or relative power (%).",
        why: lang === "zh"
          ? "频带能量是 EEG 生物标志物研究的基础。例如 α/θ 比值用于评估放松程度，θ/β 比值被研究用作 ADHD 的候选标记物（但尚未被批准用于临床诊断）。"
          : "Bandpower underpins EEG biomarker research. E.g., alpha/theta ratio assesses relaxation, theta/beta ratio has been studied as a candidate ADHD marker (but not approved for clinical diagnosis).",
        ranges: "Delta: 0.5–4 Hz; Theta: 4–8 Hz; Alpha: 8–12 Hz; Beta: 12–30 Hz",
        cannotTell: lang === "zh"
          ? "频带能量不能用于诊断任何疾病。个体间差异很大（年龄、性别、遗传、状态），没有绝对的“正常”值。"
          : "Bandpower cannot be used to diagnose any disease. There is large inter-individual variability (age, sex, genetics, state), and no absolute 'normal' value.",
      }
    },
  ];
}

// ── 页面组件 ─────────────────────────────────────────
export default function GuidePage() {
  const { lang, t } = useLang();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const cards = useMemo(() => getCards(lang), [lang]);

  const categories = [
    { key: "all", label: lang === "zh" ? "全部" : "All" },
    { key: "brainwaves", label: lang === "zh" ? "脑电波" : "Brainwaves" },
    { key: "technical", label: lang === "zh" ? "技术基础" : "Technical" },
    { key: "artifacts", label: lang === "zh" ? "伪迹" : "Artifacts" },
  ];

  const filtered = useMemo(() => {
    return cards.filter((card) => {
      const matchCategory = category === "all" || card.category === category;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        card.title.toLowerCase().includes(q) ||
        card.description.toLowerCase().includes(q) ||
        card.id.includes(q) ||
        (card.frequency && card.frequency.toLowerCase().includes(q));
      return matchCategory && matchSearch;
    });
  }, [cards, category, search]);

  return (
    <motion.div
      className="mx-auto max-w-4xl space-y-8 px-6 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* 标题区 */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/30">
          <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">{t("guideTitle")}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {lang === "zh"
              ? "交互式 EEG 知识卡片 · 点击展开详情"
              : "Interactive EEG Knowledge Cards · Click to expand"}
          </p>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "zh" ? "搜索知识卡片..." : "Search knowledge cards..."}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-primary)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10"
          />
        </div>
        <div className="flex gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`rounded-xl px-4 py-2.5 text-xs font-medium transition-all ${
                category === cat.key
                  ? "bg-blue-600 text-white shadow-sm dark:bg-blue-600 dark:text-white"
                  : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 卡片列表 */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-[var(--color-text-secondary)]">
            {lang === "zh" ? "没有找到匹配的知识卡片" : "No matching knowledge cards found"}
          </div>
        ) : (
          filtered.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <KnowledgeCard card={card} />
            </motion.div>
          ))
        )}
      </div>

      {/* 免责声明 */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-900/30 p-5">
        <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-400">
          {lang === "zh"
            ? "免责声明：以上所有知识卡片仅供 EEG 科普教育使用，不构成任何医学建议、诊断或治疗推荐。EEG 数据不能单独用于诊断任何疾病。如有健康问题，请咨询专业医生。"
            : "Disclaimer: All knowledge cards above are for EEG educational purposes only. They do not constitute medical advice, diagnosis, or treatment recommendations. EEG data alone cannot diagnose any disease. For health concerns, consult a qualified physician."}
        </p>
      </div>
    </motion.div>
  );
}
