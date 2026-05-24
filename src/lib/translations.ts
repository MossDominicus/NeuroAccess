// src/lib/translations.ts
export type Lang = "zh" | "en";

export const translations: Record<Lang, Record<string, string>> = {
  zh: {
    // 导航
    title: "NeuroAccess",
    uploadEEG: "上传与分析中心",
    batchAnalysis: "批量分析",
    cases: "案例库",
    guide: "使用指南",
    sidebarGuide: "EEG 知识",
    reports: "报告",
    dashboard: "仪表盘",

    // Hero
    heroTitle: "EEG 数据，一眼看懂",
    heroSubtitle: "用 AI 把复杂的脑电数据变成可理解的解释。仅用于教育与 EEG 素养，不用于医疗诊断。",

    // 上传区域
    uploadAreaTitle: "点击或拖拽上传 EEG 文件",
    uploadAreaSubtitle: "支持 .edf / .bdf / .gdf / .csv 文件",
    chooseFiles: "选择文件",
    dragOrClick: "点击或拖拽上传文件",
    supportedFormats: "支持 .edf / .bdf / .gdf / .csv",

    // 分析按钮
    startAnalysis: "开始分析",
    analyzing: "分析中...",
    generating: "生成中...",
    processing: "处理中...",

    // 状态
    pending: "等待中",
    uploading: "上传中",
    analyzingStatus: "分析中",
    explaining: "生成解释中",
    completed: "已完成",
    failed: "失败",
    waitingToStart: "等待开始",
    allCompleted: "全部完成",
    hasFailures: "个失败",

    // 文件
    fileList: "文件列表",
    currentFile: "当前文件",
    noFilesSelected: "尚未选择文件",
    selectedFiles: "已选择文件",
    totalFiles: "文件总数",
    clearAll: "清空",
    reupload: "重新上传",
    fileTooLarge: "文件过大",
    removeFile: "移除",

    // 结果区标题
    eegOverview: "EEG 概览",
    signalQuality: "信号质量",
    frequencyAnalysis: "频段分析",
    eegLiteracyScores: "EEG 素养评分",
    interpretationConfidence: "解释置信度",
    whatDataCannotTell: "这份数据不能说明什么",
    nonMedicalDisclaimer: "非医疗免责声明",
    aiExplanation: "AI 解释",
    noExplanationYet: "尚未生成解释",
    explanationFailed: "该层解释生成失败",

    // 三层解释标签
    beginnerMode: "入门解释（普通人）",
    studentMode: "进阶解释（学习者）",
    researchMode: "研究解释（研究者/技师）",
    beginnerHint: "避免术语，简短易懂",
    studentHint: "解释频段与质量",
    researchHint: "包含技术与局限",

    // 概览字段
    fileName: "文件名",
    channelCount: "通道数",
    samplingRate: "采样率",
    duration: "记录时长",
    noisyChannels: "噪声通道",
    channelNames: "通道名称",

    // 评分项
    learningReadability: "可读性评分",
    signalClarity: "信号清晰度",
    beginnerFriendliness: "入门友好度",
    researchUsefulness: "研究可用性",
    noiseComplexity: "噪声复杂度",

    // 案例库
    casesTitle: "案例库",
    casesSubtitle: "点击案例卡片查看详细解释和 AI 分析",
    filter: "筛选",
    all: "全部",
    beginnerFilter: "入门",
    studentFilter: "进阶",
    researchFilter: "研究",
    readTime: "分钟阅读",
    caseDetails: "案例详情",
    signalQualityScore: "信号质量评分",
    dataLimitations: "数据局限性",
    tags: "标签",

    // 报告页面 (reports)
    reportsTitle: "报告",
    reportsSubtitle: "查看、导出和管理您的 EEG 分析报告",
    exportAllPdf: "导出全部（PDF）",
    totalReports: "总报告数",
    beginnerModeLabel: "入门模式",
    studentModeLabel: "学生模式",
    researchModeLabel: "研究模式",
    noReports: "暂无报告",
    noReportsDesc: "上传并分析 EEG 文件后，报告将显示在这里",
    date: "日期",
    mode: "模式",
    quality: "信号质量",
    actions: "操作",
    exportPdf: "导出 PDF",
    delete: "删除",
    close: "关闭",
    confirm: "确认",
    cancel: "取消",
    confirmDelete: "确认删除",
    confirmDeleteDesc: "删除后无法恢复，是否继续？",
    batchDelete: "批量删除",
    batchDeleteCount: "批量删除 ({count} 条)",
    viewDetail: "查看详情",
    reportDetail: "报告详情",
    bandpower: "频段能量",
    channels: "通道",

    // 指南页面 (guide)
    guideTitle: "EEG 知识库",
    guideSubtitle: "脑电图（EEG）记录的是大脑的电活动。下面是一些基础知识，帮助你理解 EEG 数据能告诉你什么、不能告诉你什么。",
    brainwaveTypes: "脑电波的几种基本类型",
    alphaDesc: "Alpha 波是大脑在放松、闭眼状态下最主要的脑电活动。它通常出现在后头部区域，是大脑「休息」状态的标志。",
    alphaDetail1: "当你闭眼放松时，Alpha 波会增强",
    alphaDetail2: "睁眼或集中注意力时，Alpha 波会减弱（Alpha 阻断）",
    alphaDetail3: "Alpha 波的强度可以反映你的大脑是否处于放松状态",
    betaDesc: "Beta 波与活跃的思维、注意力集中、问题解决和焦虑状态相关。当你在思考、计算或感到紧张时，Beta 波会增强。",
    betaDetail1: "Beta 波在大脑额叶区域最明显",
    betaDetail2: "高强度思维活动时会增强",
    betaDetail3: "某些焦虑状态下 Beta 波可能过度活跃",
    thetaDesc: "Theta 波通常出现在深度放松、冥想、浅睡眠或创造性思维状态。它在儿童脑电中更常见，成人出现 Theta 波可能提示困倦或某些特殊状态。",
    thetaDetail1: "Theta 波在入睡初期出现",
    thetaDetail2: "冥想和有创造力的人可能有更多 Theta 波",
    thetaDetail3: "过度出现的 Theta 波可能提示注意力不集中",
    deltaDesc: "Delta 波是频率最低的脑电活动，主要出现在深度睡眠中。清醒状态下出现 Delta 波通常是异常的，可能提示脑功能受损。",
    deltaDetail1: "Delta 波在深度睡眠（N3 期）中出现",
    deltaDetail2: "婴儿和幼儿脑电中 Delta 波更常见",
    deltaDetail3: "清醒时出现 Delta 波可能提示脑损伤或代谢问题",
    eegCanTell: "EEG 能告诉你什么",
    eegCannotTell: "EEG 不能告诉你什么",
    canTell1: "大脑的基本电活动",
    canTell2: "不同脑区的激活程度差异",
    canTell3: "睡眠阶段（如果你在睡觉）",
    canTell4: "某些类型的癫痫发作（但需要专业医生判断）",
    canTell5: "大脑对某些刺激的反应",
    cannotTell1: "智商高低",
    cannotTell2: "性格特征",
    cannotTell3: "心理健康状况（如抑郁症、焦虑症）",
    cannotTell4: "是否患有特定疾病（需要专业医生诊断）",
    cannotTell5: "情绪状态（开心、悲伤、愤怒等）",
    cannotTell6: "注意力缺陷（如 ADHD）",
    cannotTell7: "你的想法或记忆内容",
    disclaimerTitle: "免责声明",
    disclaimerGuide: "NeuroAccess 是一个 EEG 科普教育平台，旨在帮助普通人理解 EEG 数据。我们不是医疗机构，不提供诊断服务。EEG 数据的解读需要专业训练，如果你有健康疑虑，请咨询专业医生。本报告中的所有解释均由本地 AI 模型生成，仅供科普学习使用。",

    // 错误提示
    cannotConnectBackend: "无法连接到后端服务器，请确认后端已启动",
    invalidJsonFromBackend: "后端返回了非 JSON 响应",
    emptyResponseFromBackend: "后端返回空响应",
    ollamaNotRunning: "Ollama 未运行，请执行 ollama serve",
    modelNotFound: "模型未找到，请执行 ollama pull qwen2.5:7b",
    serverActionNotFound: "请求地址错误，未找到对应的后端接口",

    // 免责声明（统一，中英文各自独立）
    disclaimerText:
      "本报告仅用于 EEG 科普、学习和辅助理解，不构成医学诊断、医疗建议或治疗建议。EEG 数据的专业解释需要由合格专业人员结合完整背景进行判断。本平台不会判断疾病、心理状态、智力、人格或健康风险。",

    // TopNav 状态
    checkingAIStatus: "检查 AI 状态...",
    aiOnline: "AI 在线",
    aiOffline: "AI 离线",
    modelNotLoaded: "模型未加载",
    gpuAvailable: "GPU 可用",
    cpuMode: "CPU 模式",

    // 语言切换按钮
    langSwitch: "EN",

    // DashboardCards
    signalQualityCard: "信号质量",
    readabilityScoreCard: "可读性评分",
    confidenceCard: "解释可信度",
    dataLimitsCard: "数据限制",
    noisyChannelsDesc: "噪声通道",
    beginnerFriendlinessDesc: "初学者友好度",
    eegCannotTellDesc: "EEG 不能判断的事项",

    // FrequencyChart
    frequencyAnalysisTitle: "频段分析",
    avgBandpowerTitle: "平均频段能量",
    avgBandpowerSubtitle: "平均频段能量分布",
    frequencyDistributionTitle: "频率分布",
    energyLabel: "能量",

    // 置信度等级
    confidenceHigh: "高",
    confidenceModerate: "中",
    confidenceLow: "低",

    // 案例库分类
    catquality: "质量",
    catduration: "时长",
    cattechnical: "技术",
    catpatterns: "波形",
    cateducation: "教育",

    // 案例库难度
    diffbeginner: "入门",
    diffintermediate: "进阶",
    diffadvanced: "高级",

    // 导出
    exportAllHint: "请逐条查看报告并导出 PDF",

    // Settings
    settings: "设置",
    theme: "主题",
    lightMode: "浅色",
    darkMode: "深色",
    systemMode: "跟随系统",
    language: "语言",
    account: "账号",
    notLoggedIn: "暂未登录",
    defaultMode: "默认分析模式",
    animation: "页面动画",
    ollamaModel: "Ollama 模型",
    beginner: "入门",
    student: "学生",
    research: "研究",
    on: "开启",
    off: "关闭",
    about: "关于 NeuroAccess",
    version: "版本",
    replayIntro: "重播启动动画",
    clearAllData: "清除所有数据",
    clearDataConfirm: "确定要清除所有报告和数据吗？此操作不可恢复。",
    dataCleared: "所有数据已清除",
  },

  en: {
    // Navigation
    title: "NeuroAccess",
    uploadEEG: "Upload & Analysis Center",
    batchAnalysis: "Batch Analysis",
    cases: "Case Studies",
    guide: "Guide",
    sidebarGuide: "EEG Knowledge",
    reports: "Reports",
    dashboard: "Dashboard",

    // Hero
    heroTitle: "EEG Data, Made Simple",
    heroSubtitle:
      "Turn complex brainwave data into understandable explanations with AI. For education and EEG literacy only, not medical diagnosis.",

    // Upload area
    uploadAreaTitle: "Click or drag to upload EEG files",
    uploadAreaSubtitle: "Supports .edf / .bdf / .gdf / .csv files",
    chooseFiles: "Choose Files",
    dragOrClick: "Click or drag to upload files",
    supportedFormats: "Supports .edf / .bdf / .gdf / .csv",

    // Analysis buttons
    startAnalysis: "Start Analysis",
    analyzing: "Analyzing...",
    generating: "Generating...",
    processing: "Processing...",

    // Status
    pending: "Pending",
    uploading: "Uploading",
    analyzingStatus: "Analyzing",
    explaining: "Explaining",
    completed: "Completed",
    failed: "Failed",
    waitingToStart: "Waiting to start",
    allCompleted: "All Completed",
    hasFailures: "failed",

    // Files
    fileList: "File List",
    currentFile: "Current File",
    noFilesSelected: "No files selected",
    selectedFiles: "Selected Files",
    totalFiles: "Total Files",
    clearAll: "Clear All",
    reupload: "Re-upload",
    fileTooLarge: "File too large",
    removeFile: "Remove",

    // Result section titles
    eegOverview: "EEG Overview",
    signalQuality: "Signal Quality",
    frequencyAnalysis: "Frequency Analysis",
    eegLiteracyScores: "EEG Literacy Scores",
    interpretationConfidence: "Interpretation Confidence",
    whatDataCannotTell: "What This Data Cannot Tell You",
    nonMedicalDisclaimer: "Non-Medical Disclaimer",
    aiExplanation: "AI Explanation",
    noExplanationYet: "No explanation generated yet",
    explanationFailed: "Explanation generation failed",

    // Three-level explanation labels
    beginnerMode: "Beginner (General)",
    studentMode: "Student (Learner)",
    researchMode: "Research (Researcher/Tech)",
    beginnerHint: "Minimal jargon, short",
    studentHint: "Explains bands & quality",
    researchHint: "Technical, includes limitations",

    // Overview fields
    fileName: "File Name",
    channelCount: "Channels",
    samplingRate: "Sampling (Hz)",
    duration: "Duration",
    noisyChannels: "Noisy Channels",
    channelNames: "Channel Names",

    // Score items
    learningReadability: "Readability",
    signalClarity: "Signal Clarity",
    beginnerFriendliness: "Beginner Friendliness",
    researchUsefulness: "Research Usefulness",
    noiseComplexity: "Noise Complexity",

    // Case Studies
    casesTitle: "Case Studies",
    casesSubtitle: "Click a case card to view detailed explanations and AI analysis",
    filter: "Filter",
    all: "All",
    beginnerFilter: "Beginner",
    studentFilter: "Student",
    researchFilter: "Research",
    readTime: "min read",
    caseDetails: "Case Details",
    signalQualityScore: "Signal Quality Score",
    dataLimitations: "Data Limitations",
    tags: "Tags",

    // TopNav status
    checkingAIStatus: "Checking AI status...",
    aiOnline: "AI Online",
    aiOffline: "AI Offline",
    modelNotLoaded: "Model not loaded",
    gpuAvailable: "GPU Available",
    cpuMode: "CPU Mode",

    // Language switch button
    langSwitch: "中文",

    // Error messages
    cannotConnectBackend: "Cannot connect to backend server. Please ensure backend is running.",
    invalidJsonFromBackend: "Backend returned non-JSON response",
    emptyResponseFromBackend: "Backend returned empty response",
    ollamaNotRunning: "Ollama is not running. Run: ollama serve",
    modelNotFound: "Model not found. Run: ollama pull qwen2.5:7b",
    serverActionNotFound: "Request URL error: backend endpoint not found",

    // Disclaimer (unified)
    disclaimerText:
      "This report is intended only for EEG literacy, education, and assisted understanding. It is not medical advice, diagnosis, or treatment guidance. Professional EEG interpretation requires qualified experts and full clinical or research context. This platform does not determine disease, mental state, intelligence, personality, or health risk.",

    // Reports page
    reportsTitle: "Reports",
    reportsSubtitle: "View, export, and manage your EEG analysis reports",
    exportAllPdf: "Export All (PDF)",
    totalReports: "Total Reports",
    beginnerModeLabel: "Beginner",
    studentModeLabel: "Student",
    researchModeLabel: "Research",
    noReports: "No reports yet",
    noReportsDesc: "Reports will appear here after you upload and analyze EEG files",
    date: "Date",
    mode: "Mode",
    quality: "Quality",
    actions: "Actions",
    exportPdf: "Export PDF",
    delete: "Delete",
    close: "Close",
    confirm: "Confirm",
    cancel: "Cancel",
    confirmDelete: "Confirm Delete",
    confirmDeleteDesc: "This action cannot be undone. Continue?",
    batchDelete: "Batch Delete",
    batchDeleteCount: "Batch Delete ({count})",
    viewDetail: "View Detail",
    reportDetail: "Report Detail",
    bandpower: "Bandpower",
    channels: "Channels",

    // Guide page
    guideTitle: "EEG Knowledge Base",
    guideSubtitle: "EEG records the electrical activity of your brain. Here are some basics to help you understand what EEG data can and cannot tell you.",
    brainWaveTypes: "Basic Types of Brain Waves",
    alphaDesc: "Alpha waves are the dominant brain activity when you are relaxed with eyes closed. They typically appear in posterior regions and signal a \"resting\" state.",
    alphaDetail1: "Alpha waves increase when you close your eyes and relax",
    alphaDetail2: "Alpha blocks when you open your eyes or focus attention",
    alphaDetail3: "Alpha intensity reflects whether your brain is in a relaxed state",
    betaDesc: "Beta waves are associated with active thinking, concentration, problem-solving, and anxiety. Beta increases when you are thinking, calculating, or feeling tense.",
    betaDetail1: "Beta is most prominent in frontal regions",
    betaDetail2: "Increases with high-intensity mental activity",
    betaDetail3: "Beta may become overactive in some anxiety states",
    thetaDesc: "Theta waves typically appear during deep relaxation, meditation, light sleep, or creative thinking. More common in children; in adults, theta may indicate drowsiness or special states.",
    thetaDetail1: "Theta appears in early sleep stages",
    thetaDetail2: "Meditative and creative individuals may have more theta",
    thetaDetail3: "Excessive theta may indicate poor attention",
    deltaDesc: "Delta waves are the lowest frequency activity, mainly present in deep sleep. Delta in wakefulness is usually abnormal and may indicate impaired brain function.",
    deltaDetail1: "Delta appears in deep sleep (N3 stage)",
    deltaDetail2: "Delta is more common in infants and young children",
    deltaDetail3: "Wakeful delta may indicate brain injury or metabolic issues",
    eegCanTell: "What EEG Can Tell You",
    eegCannotTell: "What EEG Cannot Tell You",
    canTell1: "Basic electrical activity of the brain",
    canTell2: "Differences in activation across brain regions",
    canTell3: "Sleep stages (if you were sleeping)",
    canTell4: "Certain types of seizures (requires professional diagnosis)",
    canTell5: "Brain responses to stimuli",
    cannotTell1: "IQ level",
    cannotTell2: "Personality traits",
    cannotTell3: "Mental health conditions (depression, anxiety)",
    cannotTell4: "Specific diseases (requires professional diagnosis)",
    cannotTell5: "Emotional states (happy, sad, angry, etc.)",
    cannotTell6: "Attention deficits (e.g., ADHD)",
    cannotTell7: "Your thoughts or memories",
    disclaimerTitle: "Disclaimer",
    disclaimerGuide: "NeuroAccess is an EEG literacy education platform designed to help ordinary people understand EEG data. We are not a medical institution and do not provide diagnostic services. EEG interpretation requires professional training. If you have health concerns, please consult a professional doctor. All explanations in this report are generated by local AI models for educational purposes only.",

    // DashboardCards
    signalQualityCard: "Signal Quality",
    readabilityScoreCard: "Readability Score",
    confidenceCard: "Interpretation Confidence",
    dataLimitsCard: "Data Limits",
    noisyChannelsDesc: "Noisy channels",
    beginnerFriendlinessDesc: "Beginner friendliness",
    eegCannotTellDesc: "What EEG cannot tell",

    // FrequencyChart
    frequencyAnalysisTitle: "Frequency Analysis",
    avgBandpowerTitle: "Average Bandpower",
    avgBandpowerSubtitle: "Average bandpower distribution",
    frequencyDistributionTitle: "Frequency Distribution",
    energyLabel: "Energy",

    // Confidence levels
    confidenceHigh: "High",
    confidenceModerate: "Moderate",
    confidenceLow: "Low",

    // Case categories
    catquality: "Quality",
    catduration: "Duration",
    cattechnical: "Technical",
    catpatterns: "Patterns",
    cateducation: "Education",

    // Case difficulty
    diffbeginner: "Beginner",
    diffintermediate: "Intermediate",
    diffadvanced: "Advanced",

    // Export
    exportAllHint: "Please view reports individually and export PDF",

    // Settings
    settings: "Settings",
    theme: "Theme",
    lightMode: "Light",
    darkMode: "Dark",
    systemMode: "System",
    language: "Language",
    account: "Account",
    notLoggedIn: "Not logged in",
    defaultMode: "Default Analysis Mode",
    animation: "Page Animation",
    ollamaModel: "Ollama Model",
    beginner: "Beginner",
    student: "Student",
    research: "Research",
    on: "On",
    off: "Off",
    about: "About NeuroAccess",
    version: "Version",
    replayIntro: "Replay Intro",
    clearAllData: "Clear All Data",
    clearDataConfirm: "Are you sure you want to delete all reports and data? This action cannot be undone.",
    dataCleared: "All data has been cleared",
  },
};

/** 获取翻译文本（兼容 language-context.tsx 的导入） */
export function getText(lang: Lang, key: string): string {
  return translations[lang]?.[key] ?? key;
}

/** 更简洁的调用方式：t(lang, key) */
export function t(lang: Lang, key: string): string {
  return translations[lang]?.[key] ?? key;
}
