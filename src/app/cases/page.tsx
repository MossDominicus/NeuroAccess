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
  source?: LangString;  // 数据来源说明（教学示例/模拟/脱敏）
}

const cases: CaseStudy[] = [
  {
    id: "c1",
    title: {
      zh: "全面性癫痫发作期 EEG（Generalized Seizure）",
      en: "Generalized Seizure EEG (Ictal)",
    },
    categoryKey: "patterns",
    difficultyKey: "advanced",
    description: {
      zh: "该案例展示全面性（全身性）癫痫发作期的典型 EEG 特征：双侧弥漫性、同步的高幅棘波-慢波复合放电（约 3 Hz），发作期间背景节律被广泛抑制。",
      en: "This case shows the typical ictal EEG of a generalized (whole-brain) seizure: bilateral, diffuse, synchronous high-amplitude spike-and-slow-wave discharges (~3 Hz) with suppression of background rhythms.",
    },
    details: {
      zh: "1. 发作期出现双侧同步的 3 Hz 棘波-慢波复合放电，波幅高、节律规则\n2. 放电期间正常背景节律（α 等）消失\n3. 发作终止后常见短暂的后发作性慢波\n\n此类放电模式在全身性强直-阵挛发作的教学描述中最具代表性，也是失神发作的经典模式。",
      en: "1. Bilateral synchronous 3 Hz spike-and-wave discharges with high amplitude and regular rhythm\n2. Background rhythms (e.g., alpha) disappear during the discharge\n3. Brief post-ictal slowing commonly follows the seizure\n\nThis discharge pattern is the classic teaching example for generalized tonic-clonic and absence seizures.",
    },
    signal_quality: 68,
    learning_readability_score: 74,
    beginner_explanation: {
      zh: "这份脑电记录里出现了许多「尖尖的」异常放电波，它们是大范围脑区异常同步放电的表现，医学上称为棘波。在教材中，这类波形常与癫痫发作（尤其是全身性发作）放在一起讲解。需要说明：脑电上的棘波不能单独确诊癫痫，必须结合临床发作表现。",
      en: "This EEG contains many sharp abnormal discharges — signs of widespread, abnormally synchronized brain activity, known as spikes. Textbooks associate this pattern with seizures, especially generalized ones. Important: spikes alone cannot diagnose epilepsy; clinical seizures are required.",
    },
    student_explanation: {
      zh: "发作期可见双侧弥漫性 3 Hz 棘慢波复合放电（GSW），随发作进展频率可减慢、波幅增高；发作后呈弥漫性慢波。发作间期背景可正常或轻度异常。此模式是全身性癫痫（如失神、强直-阵挛发作）的经典 EEG 表现。",
      en: "The ictal record shows bilateral diffuse 3 Hz spike-and-wave discharges (GSW); frequency may slow and amplitude increase as the seizure evolves. Post-ictal diffuse slowing follows. Interictal background may be normal or mildly abnormal. This is the classic EEG pattern of generalized epilepsy (absence, tonic-clonic).",
    },
    research_explanation: {
      zh: "发作期：双侧同步 3 Hz 棘慢波放电，额区-中央区优势，波幅递增；发作后 θ/δ 慢波持续数十秒。注意与正常睡眠中良性瞬时性棘波（BETS）和药物性三相波鉴别。EEG 对癫痫的定位、分型与药物疗效评估具有重要价值，但确诊需结合临床发作史。",
      en: "Ictal: bilateral synchronous 3 Hz spike-and-wave discharges, fronto-central maximum, crescendo amplitude; followed by post-ictal theta/delta slowing for tens of seconds. Distinguish from benign epileptiform transients of sleep (BETS) and drug-induced triphasic waves. EEG supports seizure classification and treatment monitoring, but diagnosis requires clinical seizure history.",
    },
    limitations: {
      zh: ["模拟案例无法展示真实患者完整的临床背景", "单次记录可能无法捕捉到发作的完整演变过程", "需视频-EEG 同步监测才能确认发作的临床相关性"],
      en: ["Simulated case without full clinical history", "A single recording may not capture the full ictal evolution", "Video-EEG monitoring is needed to confirm clinical correlation of discharges"],
    },
    what_this_data_cannot_tell: {
      zh: ["是否真的患有癫痫（需临床诊断）", "发作的具体诱因", "患者发作时的意识状态"],
      en: ["Whether the person truly has epilepsy (clinical diagnosis required)", "The specific trigger of the seizure", "The patient's level of consciousness during the event"],
    },
    source: {
      zh: "教学示意案例：基于公开医学文献中典型 EEG 特征的描述构建，非真实患者数据。",
      en: "Educational illustration built from typical EEG features described in public medical literature; not real patient data.",
    },
    tags: ["seizure", "epilepsy", "spike", "generalized", "ictal"],
    readTime: "5 分钟",
  },
  {
    id: "c2",
    title: {
      zh: "局灶性癫痫发作间期 EEG（Focal Epilepsy Interictal）",
      en: "Focal Epilepsy EEG (Interictal)",
    },
    categoryKey: "patterns",
    difficultyKey: "intermediate",
    description: {
      zh: "该案例展示局灶性癫痫发作间期的典型 EEG 特征：颞区反复出现局灶性棘波/尖波，背景节律基本保留。",
      en: "This case shows the typical interictal EEG of focal epilepsy: recurrent focal spikes/sharp waves over the temporal region with preserved background rhythms.",
    },
    details: {
      zh: "1. 左颞区（F7、T3）可见反复出现的局灶性棘波/尖波\n2. 背景 α 节律存在，但左侧可轻度减弱\n3. 未见全面性放电\n\n局灶性放电提示痫样活动源于特定脑区，颞叶是最常见的起源部位之一（教学描述）。",
      en: "1. Recurrent focal spikes/sharp waves over the left temporal region (F7, T3)\n2. Background alpha rhythm preserved, slightly reduced on the left\n3. No generalized discharges\n\nFocal discharges suggest epileptiform activity arising from a specific brain region; the temporal lobe is one of the most common origins.",
    },
    signal_quality: 75,
    learning_readability_score: 78,
    beginner_explanation: {
      zh: "这份记录在左侧耳朵附近的区域反复出现「尖尖的」异常波，而其他大部分地方看起来比较正常。这种只出现在局部的异常放电，在教材里常与大脑某个区域源性的癫痫（局灶性癫痫）放在一起讲，最常见的位置是颞叶。",
      en: "This record shows repeated sharp abnormal waves near the left temple, while most other areas look fairly normal. Localized discharges like these are linked in textbooks to epilepsy arising from one brain region (focal epilepsy), most often the temporal lobe.",
    },
    student_explanation: {
      zh: "发作间期痫样放电（IED）：颞区（F7/T3）局灶性尖波，偶发或反复出现，波幅约 100 μV，背景节律基本正常。局灶性 IED 是局灶性癫痫（尤其颞叶癫痫）的标志性 EEG 发现，定位价值高，但需结合临床症状。",
      en: "Interictal epileptiform discharges (IEDs): focal sharp waves over the temporal region (F7/T3), sporadic or recurrent, ~100 µV, with preserved background. Focal IEDs are a hallmark finding in focal epilepsy (especially temporal lobe epilepsy) and have high localizing value.",
    },
    research_explanation: {
      zh: "记录显示颞区局灶性尖波（F7、T3），单次或成簇出现，后接慢波；背景 α 节律枕区优势，左侧稍减弱。局灶性 IED 与颞叶癫痫高度相关；定位需结合视频 EEG 与 MRI。约 1-3% 无癫痫人群亦可出现良性棘波，解读需谨慎。",
      en: "Focal sharp waves over the temporal region (F7, T3), single or in runs, followed by slow waves; occipital-dominant alpha slightly reduced on the left. Focal IEDs strongly correlate with temporal lobe epilepsy; localization requires video-EEG and MRI. Benign spikes occur in 1-3% of non-epileptic people, so interpretation must be cautious.",
    },
    limitations: {
      zh: ["发作间期放电可能间歇出现，短时记录易漏检", "模拟案例不包含真实患者病史与影像资料", "棘波可见于少数无癫痫人群，不能单独诊断"],
      en: ["Interictal discharges may be intermittent and missed in short recordings", "Simulated case without real history or imaging", "Spikes occur in a minority of people without epilepsy and cannot diagnose alone"],
    },
    what_this_data_cannot_tell: {
      zh: ["是否真的患有癫痫", "放电起源于哪一侧的哪个具体脑区（需综合定位）", "下次发作的时间"],
      en: ["Whether the person truly has epilepsy", "The exact region of origin (requires combined localization)", "When the next seizure will occur"],
    },
    source: {
      zh: "教学示意案例：基于公开医学文献中典型 EEG 特征的描述构建，非真实患者数据。",
      en: "Educational illustration built from typical EEG features described in public medical literature; not real patient data.",
    },
    tags: ["epilepsy", "focal", "temporalLobe", "interictal", "spike"],
    readTime: "5 分钟",
  },
  {
    id: "c3",
    title: {
      zh: "阿尔茨海默病早期 EEG（Early Alzheimer's Disease）",
      en: "Early Alzheimer's Disease EEG",
    },
    categoryKey: "clinical",
    difficultyKey: "intermediate",
    description: {
      zh: "该案例展示早期阿尔茨海默病（AD）的典型 EEG 特征：α 峰值频率减慢、弥漫性 θ 活动增多、后部优势节律对睁闭眼反应减弱。",
      en: "This case shows the typical EEG features of early Alzheimer's disease (AD): slowed alpha peak frequency, increased diffuse theta activity, and reduced reactivity of the posterior dominant rhythm.",
    },
    details: {
      zh: "1. 枕区 α 峰值频率减慢至约 8 Hz（健康成人多在 9-11 Hz）\n2. 弥漫性 θ 波（4-8 Hz）活动明显增多\n3. 后部优势节律（PDR）在睁眼时衰减减弱\n\n上述改变是认知功能下降相关疾病（尤其是 AD）最常描述的 EEG 表现，属于弥漫性而非局灶性改变。",
      en: "1. Occipital alpha peak slowed to ~8 Hz (healthy adults usually 9-11 Hz)\n2. Diffuse theta (4-8 Hz) activity markedly increased\n3. Reduced attenuation of the posterior dominant rhythm (PDR) on eye opening\n\nThese changes are the most commonly described EEG findings in cognitive decline (especially AD) and are diffuse rather than focal.",
    },
    signal_quality: 82,
    learning_readability_score: 70,
    beginner_explanation: {
      zh: "这份记录的脑波比正常放松时「慢了一档」，后脑勺的放松波（α 波）变弱、反应变差。教材里常提到：脑波整体变慢、α 波减弱，可能与记忆力、思考能力下降相关的情况（比如阿尔茨海默病早期）有关，但脑电只能作为辅助参考。",
      en: "The brainwaves here are slower than normal relaxed ones, and the occipital alpha (relaxation) waves are weaker and less reactive. Textbooks note that overall slowing with weaker alpha may relate to conditions involving declining memory and thinking (e.g., early Alzheimer's disease), but EEG is only an auxiliary reference.",
    },
    student_explanation: {
      zh: "早期 AD 的 EEG 特征：α 峰值频率减慢（<8.5 Hz）、θ 功率增加、PDR 反应性下降。这些改变反映皮层-皮层下网络功能减退，对认知障碍的辅助评估有价值，但需结合神经心理测验与影像学，不能单独确诊。",
      en: "Early AD EEG features: slowed alpha peak (<8.5 Hz), increased theta power, reduced PDR reactivity. These reflect cortico-subcortical network dysfunction and support cognitive assessment, but must be combined with neuropsychological tests and imaging; they cannot diagnose alone.",
    },
    research_explanation: {
      zh: "静息态 EEG：枕区 α 峰值约 8 Hz（减慢），θ 相对功率升高，睁眼时 PDR 衰减不充分。文献中 α 减慢与 MMSE 等认知评分呈负相关，且随病程进展慢波进一步增多；EEG 作为无创、廉价的辅助生物标志物，可用于纵向随访，但不能单独诊断 AD。",
      en: "Resting EEG: occipital alpha peak ~8 Hz (slowed), elevated relative theta power, incomplete PDR attenuation on eye opening. Literature shows alpha slowing correlates negatively with cognitive scores (e.g., MMSE) and worsens with disease progression. EEG is a non-invasive, low-cost auxiliary biomarker for longitudinal follow-up, but cannot diagnose AD alone.",
    },
    limitations: {
      zh: ["α 减慢也可见于正常衰老、用药或睡眠不足", "模拟案例不含认知量表评分等临床信息", "不能区分 AD 与其他类型痴呆"],
      en: ["Alpha slowing also occurs in normal aging, medication, or sleep deprivation", "Simulated case without cognitive test scores or clinical data", "Cannot distinguish AD from other dementias"],
    },
    what_this_data_cannot_tell: {
      zh: ["是否患有阿尔茨海默病（需临床诊断）", "认知功能下降的具体原因", "疾病的当前严重程度"],
      en: ["Whether the person has Alzheimer's disease (clinical diagnosis required)", "The specific cause of cognitive decline", "Current disease severity"],
    },
    source: {
      zh: "教学示意案例：基于公开医学文献中典型 EEG 特征的描述构建，非真实患者数据。",
      en: "Educational illustration built from typical EEG features described in public medical literature; not real patient data.",
    },
    tags: ["alzheimer", "dementia", "slowing", "alpha", "clinical"],
    readTime: "5 分钟",
  },
  {
    id: "c4",
    title: {
      zh: "代谢性脑病 EEG（Metabolic Encephalopathy）",
      en: "Metabolic Encephalopathy EEG",
    },
    categoryKey: "clinical",
    difficultyKey: "intermediate",
    description: {
      zh: "该案例展示代谢性脑病的典型 EEG 特征：弥漫性 δ 慢波（1-4 Hz）占主导、α 活动明显减少、对外界刺激的反应性降低。",
      en: "This case shows the typical EEG of metabolic encephalopathy: diffuse delta slow waves (1-4 Hz) dominating, markedly reduced alpha, and decreased reactivity to external stimulation.",
    },
    details: {
      zh: "1. 弥漫性多形性 δ 慢波显著增多并占主导\n2. α 与 β 活动明显减少\n3. 对睁眼、呼唤等刺激的反应性减弱\n\n此类谱形常见于肝肾功能异常、电解质紊乱、缺氧等全身代谢问题影响大脑时（教学描述），慢波程度一般与意识障碍程度平行。",
      en: "1. Diffuse polymorphic delta activity markedly increased and dominant\n2. Alpha and beta markedly reduced\n3. Reduced reactivity to eye opening or calling\n\nThis pattern is typical when systemic metabolic problems (hepatic/renal dysfunction, electrolyte imbalance, hypoxia) affect the brain. The degree of slowing usually parallels the level of consciousness impairment.",
    },
    signal_quality: 60,
    learning_readability_score: 72,
    beginner_explanation: {
      zh: "这份脑电几乎全是大而慢的波浪，正常的放松波很少见。教材里讲：大脑整体活动明显变慢，常和身体代谢出问题（如肝肾不好、电解质紊乱、缺氧）有关。这类情况是可逆的，关键在于治疗原发病。",
      en: "This EEG is dominated by large slow waves, with few normal rhythms. Textbooks explain that pronounced global slowing often relates to metabolic problems (liver/kidney issues, electrolyte imbalance, hypoxia). These are often reversible when the underlying cause is treated.",
    },
    student_explanation: {
      zh: "代谢性脑病的 EEG：弥漫性多形性 δ 慢波为主，背景节律消失，对外部刺激反应性下降。慢波程度通常与意识水平（嗜睡-昏迷）平行，是可逆性指标。需与结构病变、镇静药物效应、低温等鉴别。",
      en: "Metabolic encephalopathy EEG: diffuse polymorphic delta predominance, loss of background rhythms, reduced reactivity. The degree of slowing usually parallels consciousness level (lethargy to coma) and is potentially reversible. Exclude structural lesions, sedative effects, and hypothermia.",
    },
    research_explanation: {
      zh: "全导联弥漫性 δ（1-4 Hz）活动占优势，α/β 显著衰减，对外部刺激反应性差。此类谱形见于代谢性脑病各阶段，其慢波程度通常与代谢紊乱严重度及意识障碍程度平行，治疗后多可恢复；注意三相波可能随病情进展出现。",
      en: "Diffuse delta (1-4 Hz) predominance with marked attenuation of alpha/beta and poor reactivity. This pattern is seen across stages of metabolic encephalopathy; the degree of slowing usually parallels severity and often reverses with treatment. Triphasic waves may emerge as the condition progresses.",
    },
    limitations: {
      zh: ["慢波同样可见于退行性疾病或药物影响", "模拟案例不含血生化等实验室数据", "无法判断具体是哪种代谢紊乱"],
      en: ["Slowing also occurs in neurodegenerative disease or drug effects", "Simulated case without laboratory data", "Cannot identify the specific metabolic disturbance"],
    },
    what_this_data_cannot_tell: {
      zh: ["具体是哪种代谢紊乱（需查血等）", "是否会造成永久性脑损伤", "患者能否完全康复"],
      en: ["Which specific metabolic disturbance (requires labs)", "Whether permanent brain damage exists", "Whether full recovery is possible"],
    },
    source: {
      zh: "教学示意案例：基于公开医学文献中典型 EEG 特征的描述构建，非真实患者数据。",
      en: "Educational illustration built from typical EEG features described in public medical literature; not real patient data.",
    },
    tags: ["metabolic", "encephalopathy", "delta", "slowing", "clinical"],
    readTime: "5 分钟",
  },
  {
    id: "c5",
    title: {
      zh: "肝性脑病 EEG（Hepatic Encephalopathy）",
      en: "Hepatic Encephalopathy EEG",
    },
    categoryKey: "clinical",
    difficultyKey: "advanced",
    description: {
      zh: "该案例展示肝性脑病的标志性 EEG 特征：前额优势的三相波（triphasic waves）叠加在弥漫性慢波背景上。",
      en: "This case shows the hallmark EEG of hepatic encephalopathy: frontal-dominant triphasic waves superimposed on a diffuse slow-wave background.",
    },
    details: {
      zh: "1. 三相波（正-负-正）在前额区（Fz 附近）最明显，频率约 1.5-2.5 Hz\n2. 背景为弥漫性 δ 慢波\n3. 三相波随意识状态（嗜睡/昏迷）的变化而出现或消失\n\n三相波是肝性脑病最著名的 EEG 标志，但并非特异，也可见于尿毒症等其他代谢性脑病。",
      en: "1. Triphasic waves (positive-negative-positive) most prominent near Fz, ~1.5-2.5 Hz\n2. Diffuse delta background\n3. Triphasic waves appear/disappear with the level of consciousness\n\nTriphasic waves are the most famous EEG hallmark of hepatic encephalopathy but are not specific; they also occur in uremia and other metabolic encephalopathies.",
    },
    signal_quality: 55,
    learning_readability_score: 68,
    beginner_explanation: {
      zh: "这份记录里有一种「一上、一下、再上」的特殊波浪，集中在额头附近，背景脑波也明显变慢。教材里把这种特殊波形和肝脏功能严重受损后大脑受影响的情况（肝性脑病）联系在一起，也提醒它不是肝病独有的。",
      en: "This record shows a distinctive 'up-down-up' wave concentrated near the forehead, over a clearly slowed background. Textbooks associate this wave with hepatic encephalopathy (severe liver failure affecting the brain), while noting it is not exclusive to liver disease.",
    },
    student_explanation: {
      zh: "三相波：前额优势、双同步，频率 1.5-2.5 Hz，每波前后波幅递减。背景弥漫性 δ 慢化。三相波与血氨升高相关，是肝性脑病 II-III 期的经典表现；同样可见于尿毒症、缺氧等，需结合临床与实验室判断。",
      en: "Triphasic waves: frontal-dominant, bisynchronous, 1.5-2.5 Hz, with decreasing amplitude across each wave. Diffuse delta background. Triphasic waves correlate with hyperammonemia and are classic in hepatic encephalopathy stages II-III; they also occur in uremia and hypoxia, requiring clinical and laboratory correlation.",
    },
    research_explanation: {
      zh: "记录显示前额优势三相波（约 2 Hz，前后波幅递减），背景弥漫性 δ 慢化；三相波的出现与消退通常与血氨水平及意识状态平行。鉴别诊断包括尿毒症性脑病、锂中毒与克雅氏病。EEG 对肝性脑病严重度分级与疗效评估有辅助价值。",
      en: "Frontal-dominant triphasic waves (~2 Hz, decreasing amplitude across waves) over a diffusely slowed background; appearance and resolution usually parallel ammonia levels and consciousness. Differential includes uremic encephalopathy, lithium toxicity, and Creutzfeldt-Jakob disease. EEG supports grading and treatment monitoring in hepatic encephalopathy.",
    },
    limitations: {
      zh: ["三相波非肝病特有", "模拟案例不含血氨等检验数据", "无法判断肝功能的具体损伤程度"],
      en: ["Triphasic waves are not specific to liver disease", "Simulated case without ammonia/lab data", "Cannot grade the degree of liver dysfunction"],
    },
    what_this_data_cannot_tell: {
      zh: ["是否真的患有肝性脑病（需综合诊断）", "肝脏损伤的具体病因", "患者预后"],
      en: ["Whether the person truly has hepatic encephalopathy", "The specific cause of liver injury", "Patient prognosis"],
    },
    source: {
      zh: "教学示意案例：基于公开医学文献中典型 EEG 特征的描述构建，非真实患者数据。",
      en: "Educational illustration built from typical EEG features described in public medical literature; not real patient data.",
    },
    tags: ["hepatic", "triphasic", "delta", "clinical", "advanced"],
    readTime: "5 分钟",
  },
  {
    id: "c6",
    title: {
      zh: "发作性睡病 EEG（Narcolepsy）",
      en: "Narcolepsy EEG",
    },
    categoryKey: "sleep",
    difficultyKey: "intermediate",
    description: {
      zh: "该案例展示发作性睡病的典型 EEG 特征：白天嗜睡期出现睡眠起始快速眼动（SOREM）、清醒期 θ 活动增多、频繁微睡眠。",
      en: "This case shows the typical EEG of narcolepsy: sleep-onset REM (SOREM) during daytime naps, increased theta activity while awake, and frequent microsleeps.",
    },
    details: {
      zh: "1. 清醒期 θ 活动增多、α 反应性下降\n2. 入睡后 15 分钟内出现 REM（SOREM）\n3. 记录中可见多次微睡眠（microsleep）片段\n\nSOREM 是发作性睡病诊断的重要支持指标，也是多次睡眠潜伏期试验（MSLT）的核心判据之一。",
      en: "1. Increased theta and reduced alpha reactivity while awake\n2. REM appears within 15 minutes of sleep onset (SOREM)\n3. Multiple microsleep episodes during the recording\n\nSOREM is an important supporting criterion for narcolepsy and a core metric of the multiple sleep latency test (MSLT).",
    },
    signal_quality: 70,
    learning_readability_score: 76,
    beginner_explanation: {
      zh: "这份记录显示这个人在白天也频繁「滑进睡眠」，而且入睡后很快进入做梦（REM）阶段。教材里把白天不可抑制地犯困、一睡就做梦的情况，和发作性睡病放在一起讲，并强调确诊需要做整夜睡眠监测和多次小睡试验。",
      en: "This record shows the person repeatedly slipping into sleep during the day, entering REM (dreaming) very quickly after sleep onset. Textbooks link uncontrollable daytime sleepiness with sleep-onset dreaming to narcolepsy, and emphasize diagnosis requires overnight sleep study and MSLT.",
    },
    student_explanation: {
      zh: "发作性睡病（1 型）EEG 特点：清醒期 θ 增多，MSLT 平均入睡潜伏期显著缩短（<8 min）且出现 ≥2 次 SOREM；夜间多导睡眠图可见入睡期 REM。需排除睡眠剥夺、睡眠呼吸暂停等其他引起嗜睡的原因。",
      en: "Narcolepsy type 1 EEG features: increased awake theta, markedly shortened mean sleep latency (<8 min) with ≥2 SOREMs on MSLT; nocturnal PSG may show sleep-onset REM. Exclude sleep deprivation, sleep apnea, and other causes of hypersomnia.",
    },
    research_explanation: {
      zh: "清醒背景弥漫性 θ 活动增多，多次微睡眠；MSLT 平均入睡潜伏期显著缩短并出现多次 SOREM。SOREM 的病理生理基础与下丘脑食欲素（orexin）神经元缺失相关（1 型）。EEG/PSG 是客观诊断的核心工具，但需结合猝倒等临床表现。",
      en: "Diffuse theta increase in wakefulness with repeated microsleeps; markedly shortened MSLT mean latency with multiple SOREMs. SOREM pathophysiology relates to hypothalamic orexin neuron loss (type 1). EEG/PSG are core objective diagnostic tools but must be combined with clinical features such as cataplexy.",
    },
    limitations: {
      zh: ["白天嗜睡可见于睡眠不足等多种原因", "模拟案例不含 MSLT 完整数据", "单次小睡记录不足以诊断"],
      en: ["Daytime sleepiness has many causes (e.g., sleep deprivation)", "Simulated case without full MSLT data", "A single nap recording is insufficient for diagnosis"],
    },
    what_this_data_cannot_tell: {
      zh: ["是否真的患有发作性睡病（需综合诊断）", "白天嗜睡的根本原因", "猝倒等伴随症状是否存在"],
      en: ["Whether the person truly has narcolepsy", "The root cause of daytime sleepiness", "Whether cataplexy or other symptoms are present"],
    },
    source: {
      zh: "教学示意案例：基于公开医学文献中典型 EEG 特征的描述构建，非真实患者数据。",
      en: "Educational illustration built from typical EEG features described in public medical literature; not real patient data.",
    },
    tags: ["narcolepsy", "sleep", "sorem", "theta", "clinical"],
    readTime: "5 分钟",
  },
  {
    id: "c7",
    title: {
      zh: "深度睡眠 N3 期 EEG（Deep Sleep N3）",
      en: "Deep Sleep N3 EEG",
    },
    categoryKey: "sleep",
    difficultyKey: "beginner",
    description: {
      zh: "该案例展示深度睡眠（N3 期）的典型 EEG 特征：高幅慢波（δ，0.5-2 Hz，>75 μV）占主导，穿插睡眠纺锤波与 K 复合波。",
      en: "This case shows the typical EEG of deep sleep (N3): high-amplitude slow waves (delta, 0.5-2 Hz, >75 µV) dominating, with sleep spindles and K-complexes.",
    },
    details: {
      zh: "1. 高幅 δ 慢波（0.5-2 Hz，振幅 >75 μV）占记录 20% 以上\n2. 可见睡眠纺锤波（12-14 Hz）与 K 复合波\n3. 这是非快速眼动（NREM）睡眠最深的阶段，与身体修复和记忆巩固密切相关\n\n深度睡眠是健康睡眠的重要组成部分，通常在入睡后首个睡眠周期最多。",
      en: "1. High-amplitude delta slow waves (0.5-2 Hz, >75 µV) occupy over 20% of the record\n2. Sleep spindles (12-14 Hz) and K-complexes present\n3. This is the deepest NREM stage, crucial for physical restoration and memory consolidation\n\nDeep sleep is most abundant in the first sleep cycle of the night.",
    },
    signal_quality: 85,
    learning_readability_score: 80,
    beginner_explanation: {
      zh: "这份记录显示大脑正处在很深的睡眠里：到处是「又高又宽」的慢波，这是身体进入深度修复阶段的标志。人在这个阶段很难被叫醒，睡眠质量好不好，很大程度上取决于深度睡眠够不够。",
      en: "This record shows the brain in deep sleep: large, broad slow waves everywhere — a sign of deep restoration. People are hard to wake at this stage, and sleep quality largely depends on getting enough deep sleep.",
    },
    student_explanation: {
      zh: "N3 期（慢波睡眠）判读：高幅 δ 慢波（>75 μV，0.5-2 Hz）占 ≥20%；纺锤波（12-14 Hz）与 K 复合波出现在 N2 期并延续至 N3。此阶段与生长激素分泌、突触稳态调节和记忆巩固密切相关。",
      en: "N3 (slow-wave sleep) scoring: high-amplitude delta (>75 µV, 0.5-2 Hz) occupying ≥20%; spindles (12-14 Hz) and K-complexes appear in N2 and continue into N3. This stage relates to growth hormone secretion, synaptic homeostasis, and memory consolidation.",
    },
    research_explanation: {
      zh: "慢波活动（SWA，0.5-2 Hz 高幅）占 N3 期主导，纺锤波密度较高；SWA 与睡眠压力正相关（睡眠剥夺后显著增加），是睡眠稳态（process S）的核心电生理指标，也是衰老研究中随年龄递减的标志性变化之一。",
      en: "Slow-wave activity (SWA, high-amplitude 0.5-2 Hz) dominates N3 with notable spindle density. SWA correlates positively with sleep pressure (markedly increased after sleep deprivation), serving as the core electrophysiological marker of sleep homeostasis (Process S) and a hallmark of age-related decline.",
    },
    limitations: {
      zh: ["深度睡眠量受年龄、药物、作息影响", "模拟案例不含呼吸/心电等同步监测", "无法评估整夜睡眠结构"],
      en: ["Deep sleep quantity varies with age, drugs, and schedule", "Simulated case without respiratory/ECG channels", "Cannot assess whole-night sleep architecture"],
    },
    what_this_data_cannot_tell: {
      zh: ["睡眠质量的好坏（需结合整夜结构与主观感受）", "是否存在睡眠障碍（如呼吸暂停）", "做梦的内容"],
      en: ["Overall sleep quality (requires full-night architecture and subjective report)", "Whether a sleep disorder (e.g., apnea) is present", "Dream content"],
    },
    source: {
      zh: "教学示意案例：基于公开医学文献中典型 EEG 特征的描述构建，非真实患者数据。",
      en: "Educational illustration built from typical EEG features described in public medical literature; not real patient data.",
    },
    tags: ["sleep", "n3", "delta", "slowwave", "spindle"],
    readTime: "5 分钟",
  },
  {
    id: "c8",
    title: {
      zh: "偏头痛发作间期 EEG（Migraine Interictal）",
      en: "Migraine Interictal EEG",
    },
    categoryKey: "clinical",
    difficultyKey: "beginner",
    description: {
      zh: "该案例展示偏头痛患者发作间期的常见 EEG 表现：间歇性慢波活动、光刺激下增强的光驱动反应，背景节律基本正常。",
      en: "This case shows common interictal EEG findings in migraine patients: intermittent slow waves and enhanced photic driving during photic stimulation, with otherwise normal background.",
    },
    details: {
      zh: "1. 背景节律基本正常，可见间歇性 θ 慢波\n2. 闪光刺激（IPS）时枕区出现增强的光驱动反应\n3. 上述改变多为非特异性，可见于部分偏头痛患者发作间期\n\nEEG 在偏头痛诊断中主要用于排除其他原因（如癫痫），本身不用于确诊偏头痛。",
      en: "1. Background largely normal with intermittent theta slow waves\n2. Enhanced occipital photic driving during intermittent photic stimulation (IPS)\n3. These changes are non-specific and seen in some migraine patients between attacks\n\nEEG in migraine workup mainly serves to exclude other causes (e.g., epilepsy); it does not diagnose migraine itself.",
    },
    signal_quality: 78,
    learning_readability_score: 75,
    beginner_explanation: {
      zh: "这份脑电大部分是正常的，但做闪光刺激时脑波对闪光的「跟随反应」比常人更强，还偶尔有些慢波。教材里提到，偏头痛的人在发作间期做脑电，有时能看到这样的表现；但脑电不能用来确诊偏头痛。",
      en: "This EEG is mostly normal, but during flashing-light stimulation the brain's 'following response' is stronger than usual, with occasional slow waves. Textbooks note that people with migraine may show this between attacks; EEG, however, cannot diagnose migraine.",
    },
    student_explanation: {
      zh: "偏头痛发作间期 EEG 多为非特异性改变：间歇性慢波、光驱动反应增强（枕区）。约 10-30% 的患者可有枕区慢波。此类改变对偏头痛无诊断特异性，主要价值在于排除症状性病因（如癫痫、占位性病变）。",
      en: "Interictal migraine EEG shows non-specific changes: intermittent slow waves and enhanced photic driving (occipital). Occipital slow waves occur in ~10-30% of patients. These findings lack diagnostic specificity and mainly serve to exclude symptomatic causes (epilepsy, structural lesions).",
    },
    research_explanation: {
      zh: "发作间期记录：间歇性 θ 活动，IPS 下枕区光驱动反应显著增强；背景 α 节律保留。此类非特异性改变在偏头痛患者中较对照组更常见，但诊断价值有限。EEG 的主要临床用途是排除癫痫与其他结构性病因；偏头痛诊断仍以临床标准（ICHD）为准。",
      en: "Interictal record: intermittent theta activity and markedly enhanced occipital photic driving under IPS; preserved alpha background. Such non-specific changes are more common in migraine than controls but have limited diagnostic value. EEG mainly serves to exclude epilepsy and structural causes; migraine diagnosis follows clinical criteria (ICHD).",
    },
    limitations: {
      zh: ["间歇性慢波无特异性，可见于多种情况", "模拟案例不含头痛发作时间等临床信息", "光驱动增强同样可见于部分正常人"],
      en: ["Intermittent slow waves are non-specific", "Simulated case without headache timing/clinical data", "Enhanced photic driving also occurs in some healthy people"],
    },
    what_this_data_cannot_tell: {
      zh: ["是否真的患有偏头痛（需临床诊断）", "头痛的具体类型", "未来发作的频率或时间"],
      en: ["Whether the person truly has migraine (clinical diagnosis required)", "The specific headache type", "Future attack frequency or timing"],
    },
    source: {
      zh: "教学示意案例：基于公开医学文献中典型 EEG 特征的描述构建，非真实患者数据。",
      en: "Educational illustration built from typical EEG features described in public medical literature; not real patient data.",
    },
    tags: ["migraine", "slowing", "photophobia", "interictal", "clinical"],
    readTime: "5 分钟",
  },
  {
    id: "c9",
    title: {
      zh: "癫痫发作期 EEG（Seizure EEG）",
      en: "Seizure EEG (Ictal Recording)",
      es: "EEG de Crisis (Registro Ictal)",
      fr: "EEG de Crise (Enregistrement Ictal)",
      de: "Anfall-EEG (Iktale Aufzeichnung)",
      ja: "発作期EEG（Iktal記録）",
      ko: "발작기 EEG (Iktal 기록)",
    },
    categoryKey: "clinical",
    difficultyKey: "advanced",
    description: {
      zh: "这份 EEG 数据来自一名癫痫患者在癫痫发作期间的记录。信号质量评分 68/100，显示典型的发作期图案：节律性尖波放电，频率 3-5 Hz，主要分布在颞叶区域。",
      en: "This EEG data is from an epilepsy patient during a seizure episode. Signal quality score 68/100, showing typical ictal patterns: rhythmic spike-and-wave discharges at 3-5 Hz, predominantly in temporal regions.",
      es: "Estos datos EEG son de un paciente con epilepsia durante un episodio de crisis. Puntuación de calidad de señal 68/100, muestra patrones ictales típicos: descargas rítmicas punta-onda a 3-5 Hz, predominantemente en regiones temporales.",
      fr: "Ces données EEG proviennent d'un patient épileptique pendant un épisode de crise. Score de qualité du signal 68/100, montrant des motifs ictaux typiques : décharges rythmiques pointe-onde à 3-5 Hz, principalement dans les régions temporales.",
      de: "Diese EEG-Daten stammen von einem Epilepsie-Patienten während einer Anfallsepisode. Signalqualitätsscore 68/100, zeigt typische iktale Muster: rhythmische Spike-Wave-Entladungen bei 3-5 Hz, vorwiegend in temporalen Regionen.",
      ja: "このEEGデータはてんかん患者の発作エピソード中の記録です。信号品質スコア68/100、典型的な発作期パターンを示します：3-5Hzのリズミカルなスパイク・波放電、主に側頭領域に分布。",
      ko: "이 EEG 데이터는 발작 에피소드 중 간질 환자의 것입니다. 신호 품질 점수 68/100, 전형적인 발작기 패턴 표시: 3-5Hz의 리듬감 있는 첨단-파 방전, 주로 측두부 영역에 분포.",
    },
    details: {
      zh: "此案例展示癫痫发作期的典型 EEG 特征：\n\n1. 节律性尖波-慢波复合体（3-5 Hz），主要位于颞叶（T3、T4、T5、T6）\n2. 发作扩散：从局部开始，逐渐扩散到同侧半球\n3. 振幅逐渐增高，频率逐渐减慢\n4. 发作后可见弥漫性慢波（post-ictal suppression）\n\n这是识别癫痫发作期图案的关键案例，对临床 EEG 解读具有重要意义。",
      en: "This case demonstrates typical ictal EEG features:\n\n1. Rhythmic spike-and-slow-wave complexes (3-5 Hz), mainly in temporal lobes (T3, T4, T5, T6)\n2. Seizure spread: starts locally, gradually spreads to ipsilateral hemisphere\n3. Amplitude gradually increases, frequency gradually slows\n4. Post-ictal diffuse slow waves (post-ictal suppression) visible after seizure\n\nThis is a key case for recognizing ictal patterns, critical for clinical EEG interpretation.",
      es: "Este caso demuestra características típicas de EEG ictal:\n\n1. Complejos rítmicos punta-onda lenta (3-5 Hz), principalmente en lóbulos temporales (T3, T4, T5, T6)\n2. Propagación de la crisis: comienza localmente, se extiende gradualmente al hemisferio ipsilateral\n3. La amplitud aumenta gradualmente, la frecuencia disminuye gradualmente\n4. Ondas lentas difusas post-ictales (supresión post-ictal) visibles después de la crisis\n\nEste es un caso clave para reconocer patrones ictales, crítico para la interpretación clínica de EEG.",
      fr: "Ce cas démontre les caractéristiques typiques d'EEG ictal :\n\n1. Complexes rythmiques pointe-onde lente (3-5 Hz), principalement dans les lobes temporaux (T3, T4, T5, T6)\n2. Propagation de la crise : commence localement, s'étend progressivement à l'hémisphère ipsilatéral\n3. L'amplitude augmente progressivement, la fréquence diminue progressivement\n4. Ondes lentes diffuses post-ictales (suppression post-ictale) visibles après la crise\n\nC'est un cas clé pour reconnaître les motifs ictaux, critique pour l'interprétation clinique de l'EEG.",
      de: "Dieser Fall demonstriert typische iktale EEG-Merkmale:\n\n1. Rhythmische Spike-und-Langsamwelle-Komplexe (3-5 Hz), hauptsächlich in den Temporallappen (T3, T4, T5, T6)\n2. Anfallausbreitung: beginnt lokal, breitet sich allmählich auf die ipsilaterale Hemisphäre aus\n3. Amplitude steigt allmählich, Frequenz verlangsamt sich allmählich\n4. Postiktale diffuse Langsamwellen (postiktale Suppression) nach dem Anfall sichtbar\n\nDies ist ein Schlüsselfall zum Erkennen iktaler Muster, kritisch für die klinische EEG-Interpretation.",
      ja: "この症例は典型的な発作期EEG特徴を提示します：\n\n1. リズミカルなスパイク・緩徐波複合（3-5Hz）、主に側頭葉（T3、T4、T5、T6）\n2. 発作伝播：局所から開始、同側半球へ次第に拡大\n3. 振幅は次第に増大、周波数は次第に減速\n4. 発作後びまん性緩除波（post-ictal suppression）が観察可能\n\nこれは発作期パターンを認識するための重要な症例で、臨床EEG解釈にとって極めて重要です。",
      ko: "이 사례는 전형적인 발작기 EEG 특징을 보여줍니다:\n\n1. 리듬감 있는 첨단-서파 복합체(3-5Hz), 주로 측두엽(T3, T4, T5, T6)\n2. 발작 전파: 국소에서 시작, 동측 반구로 점진적으로 확산\n3. 진폭은 점진적으로 증가, 주파수는 점진적으로 감소\n4. 발작 후 미만성 서파(post-ictal suppression) 관찰 가능\n\n이는 발작기 패턴을 인식하는 데 중요한 사례이며, 임상 EEG 해석에 매우 중요합니다.",
    },
    signal_quality: 68,
    learning_readability_score: 72,
    beginner_explanation: {
      zh: "这份 EEG 显示大脑正在经历癫痫发作！可以看到规律的尖波放电，就像大脑在'尖叫'。需要立即医疗关注。",
      en: "This EEG shows the brain is having a seizure! You can see regular spike discharges, like the brain is 'screaming'. Needs immediate medical attention.",
    },
    student_explanation: {
      zh: "该 EEG 记录显示癫痫发作期的典型特征：1) 颞叶区域 3-5 Hz 节律性尖波-慢波放电；2) 发作从左侧颞叶（T3）开始，逐渐扩散到左侧半球；3) 随着发作进展，频率从 5 Hz 减慢到 3 Hz；4) 发作后可见弥漫性 delta 活动（post-ictal suppression）。这是颞叶癫痫的典型 ictal 图案。",
      en: "This EEG recording shows typical ictal features of seizure: 1) 3-5 Hz rhythmic spike-and-slow-wave discharges in temporal regions; 2) Seizure starts in left temporal (T3), gradually spreads to left hemisphere; 3) As seizure progresses, frequency slows from 5 Hz to 3 Hz; 4) Post-ictal diffuse delta activity (post-ictal suppression) visible. This is typical ictal pattern of temporal lobe epilepsy.",
    },
    research_explanation: {
      zh: "此 ictal EEG 记录符合颞叶癫痫（TLE）的典型特征。PSD 分析显示 3-5 Hz 能量峰值（发作期放电频率）。Bandpower 分析：Delta 45%，Theta 30%，Alpha 15%，Beta 10%。发作开始时高频活动（Beta/Gamma）增加，随后逐渐被慢波取代。采样率 256 Hz，符合临床 EEG 标准。该案例可用于研究癫痫发作的传播动力学和终止机制。",
      en: "This ictal EEG recording is consistent with typical features of temporal lobe epilepsy (TLE). PSD analysis shows 3-5 Hz energy peak (ictal discharge frequency). Bandpower analysis: Delta 45%, Theta 30%, Alpha 15%, Beta 10%. High-frequency activity (Beta/Gamma) increases at seizure onset, then gradually replaced by slow waves. Sampling rate 256 Hz, meets clinical EEG standards. This case can be used to study seizure propagation dynamics and termination mechanisms.",
    },
    limitations: {
      zh: ["仅记录单次发作，无法观察发作频率模式", "缺少同步视频记录，无法确认临床症状", "仅覆盖部分头皮区域，可能遗漏远端传播"],
      en: ["Only single seizure recorded, cannot observe seizure frequency patterns", "No simultaneous video recording, cannot confirm clinical symptoms", "Only covers partial scalp regions, may miss remote propagation"],
      es: ["Solo se registró una sola crisis, no se pueden observar patrones de frecuencia de crisis", "Sin grabación de video simultánea, no se pueden confirmar síntomas clínicos", "Solo cubre regiones parciales del cuero cabelludo, puede perder propagación remota"],
      fr: ["Seulement une seule crise enregistrée, impossible d'observer les modèles de fréquence des crises", "Pas d'enregistrement vidéo simultané, impossible de confirmer les symptômes cliniques", "Ne couvre que des régions partielles du cuir chevelu, peut manquer une propagation éloignée"],
      de: ["Nur ein einzelner Anfall aufgezeichnet, Anfallsfrequenzmuster können nicht beobachtet werden", "Keine gleichzeitige Videoaufzeichnung, klinische Symptome können nicht bestätigt werden", "Deckt nur partielle Schädelregionen ab, ferne Ausbreitung kann übersehen werden"],
      ja: ["単発の発作のみ記録、発作頻度パターンを観察できない", "同期ビデオ記録がない、臨床症状を確認できない", "頭皮領域の一部のみカバー、遠位伝播を見逃す可能性がある"],
      ko: ["단일 발작만 기록, 발작 빈도 패턴을 관찰할 수 없음", "동시 비디오 기록 없음, 임상 증상을 확인할 수 없음", "두피 영역 일부만 커버, 원위 전파를 놓칠 수 있음"],
    },
    what_this_data_cannot_tell: {
      zh: ["患者的长期预后", "发作的具体触发因素", "是否需要手术治疗"],
      en: ["Patient's long-term prognosis", "Specific seizure triggers", "Whether surgical treatment is needed"],
      es: ["Pronóstico a largo plazo del paciente", "Desencadenantes específicos de la crisis", "Si es necesario el tratamiento quirúrgico"],
      fr: ["Pronostic à long terme du patient", "Déclencheurs spécifiques de la crise", "Si un traitement chirurgical est nécessaire"],
      de: ["Langzeitprognose des Patienten", "Spezifische Anfallauslöser", "Ob eine chirurgische Behandlung notwendig ist"],
      ja: ["患者の長期予後", "具体的な発作誘発因子", "外科的治療が必要かどうか"],
      ko: ["환자의 장기 예후", "구체적인 발작 유발 요인", "수술적 치료가 필요한지 여부"],
    },
    tags: ["seizure", "epilepsy", "temporalLobe", "clinical", "ictal"],
    readTime: "15 分钟",
  },
  /* ---- c10: 睡眠纺锤波 EEG ---- */
  {
    id: "c10",
    title: {
      zh: "睡眠纺锤波 EEG（Sleep Spindles）",
      en: "Sleep Spindles EEG",
      es: "Husos de Sueño EEG",
      fr: "Fuseaux de Sommeil EEG",
      de: "Schlafspindeln EEG",
      ja: "睡眠紡錘波 EEG（Sleep Spindles）",
      ko: "수면 방추파 EEG (Sleep Spindles)",
    },
    categoryKey: "sleep",
    difficultyKey: "intermediate",
    description: {
      zh: "这份 EEG 数据来自一名健康成人在 N2 睡眠阶段（ stage 2）的记录。信号质量评分 82/100，显示典型的睡眠纺锤波（12-16 Hz，持续 0.5-3 秒），主要位于中央区域（C3、C4）。",
      en: "This EEG data is from a healthy adult during N2 sleep stage (stage 2). Signal quality score 82/100, showing typical sleep spindles (12-16 Hz, lasting 0.5-3 seconds), mainly in central regions (C3, C4).",
      es: "Estos datos EEG son de un adulto sano durante la etapa de sueño N2 (etapa 2). Puntuación de calidad de señal 82/100, muestra husos de sueño típicos (12-16 Hz, duran 0.5-3 segundos), principalmente en regiones centrales (C3, C4).",
      fr: "Ces données EEG proviennent d'un adulte sain pendant le stade de sommeil N2 (stade 2). Score de qualité du signal 82/100, montrant des fuseaux de sommeil typiques (12-16 Hz, durant 0,5-3 secondes), principalement dans les régions centrales (C3, C4).",
      de: "Diese EEG-Daten stammen von einem gesunden Erwachsenen während des N2-Schlafstadiums (Stadium 2). Signalqualitätsscore 82/100, zeigt typische Schlafspindeln (12-16 Hz, dauernd 0,5-3 Sekunden), hauptsächlich in zentralen Regionen (C3, C4).",
      ja: "このEEGデータは健康な成人のN2睡眠段階（ステージ2）中の記録です。信号品質スコア82/100、典型的な睡眠紡錘波（12-16Hz、0.5-3秒持続）を表示、主に中心領域（C3、C4）。",
      ko: "이 EEG 데이터는 건강한 성인의 N2 수면 단계(스테이지 2) 중 기록입니다. 신호 품질 점수 82/100, 전형적인 수면 방추파(12-16Hz, 0.5-3초 지속) 표시, 주로 중심 영역(C3, C4).",
    },
    details: {
      zh: "此案例展示 N2 睡眠阶段的典型 EEG 特征——睡眠纺锤波：\n\n1. 纺锤波频率 12-16 Hz（平均 14 Hz），持续时间 0.5-3 秒\n2. 主要位于中央区域（C3、C4），有时扩散到额中央区域\n3. 纺锤波是睡眠纺锤体（由丘脑网状核产生）的标志\n4. 每个纺锤波代表一次丘脑-皮质循环的激活\n\n睡眠纺锤波是睡眠分期的重要指标，也是研究睡眠依赖的记忆巩固的关键窗口。",
      en: "This case shows typical EEG features of N2 sleep stage — sleep spindles:\n\n1. Spindle frequency 12-16 Hz (average 14 Hz), duration 0.5-3 seconds\n2. Mainly located in central regions (C3, C4), sometimes spreading to centrofrontal regions\n3. Spindles are markers of sleep spindles (generated by thalamic reticular nucleus)\n4. Each spindle represents one thalamocortical oscillatory cycle\n\nSleep spindles are important markers for sleep staging and a key window for studying sleep-dependent memory consolidation.",
      es: "Este caso muestra características típicas de EEG de la etapa de sueño N2 — husos de sueño:\n\n1. Frecuencia del huso 12-16 Hz (promedio 14 Hz), duración 0.5-3 segundos\n2. Ubicados principalmente en regiones centrales (C3, C4), a veces se extienden a regiones centrofrontales\n3. Los husos son marcadores de husos de sueño (generados por la nucleo reticular talámica)\n4. Cada huso representa un ciclo oscilatorio talamocortical\n\nLos husos de sueño son marcadores importantes para la estratificación del sueño y una ventana clave para estudiar la consolidación de la memoria dependiente del sueño.",
      fr: "Ce cas montre les caractéristiques typiques d'EEG du stade de sommeil N2 — les fuseaux de sommeil :\n\n1. Fréquence du fuseau 12-16 Hz (moyenne 14 Hz), durée 0,5-3 secondes\n2. Principalement situés dans les régions centrales (C3, C4), parfois s'étendant aux régions centrofrontales\n3. Les fuseaux sont des marqueurs de fuseaux de sommeil (générés par le noyau réticulaire thalamique)\n4. Chaque fuseau représente un cycle oscillatoire thalamocortical\n\nLes fuseaux de sommeil sont des marqueurs importants pour le staging du sommeil et une fenêtre clé pour étudier la consolidation mémorielle dépendante du sommeil.",
      de: "Dieser Fall zeigt typische EEG-Merkmale des N2-Schlafstadiums — Schlafspindeln:\n\n1. Spindelfrequenz 12-16 Hz (Durchschnitt 14 Hz), Dauer 0,5-3 Sekunden\n2. Hauptsächlich in zentralen Regionen lokalisiert (C3, C4), manchmal Ausbreitung zu zentrofrontalen Regionen\n3. Spindeln sind Marker von Schlafspindeln (generiert vom thalamischen retikulären Kern)\n4. Jede Spindel repräsentiert einen thalamokortikalen oszillatorischen Zyklus\n\nSchlafspindeln sind wichtige Marker für die Schlafstadieneinteilung und ein Schlüsselfenster zum Studium der schlafabhängigen Gedächtniskonsolidierung.",
      ja: "この症例はN2睡眠段階の典型的なEEG特徴――睡眠紡錘波を提示します：\n\n1. 紡錘波周波数12-16Hz（平均14Hz）、持続時間0.5-3秒\n2. 主に中心領域（C3、C4）に位置、時々中心前野領域に拡散\n3. 紡錘波は睡眠紡錘（視床網様核で生成）のマーカー\n4. 各紡錘波は1回の視床-皮質振動サイクルを表す\n\n睡眠紡錘波は睡眠ステージングの重要なマーカーであり、睡眠依存性記憶固定を研究するための重要な窓口です。",
      ko: "이 사례는 N2 수면 단계의 전형적인 EEG 특징――수면 방추파를 보여줍니다:\n\n1. 방추파 주파수 12-16Hz(평균 14Hz), 지속 시간 0.5-3초\n2. 주로 중심 영역(C3, C4)에 위치, 때때로 중심전두 영역으로 확산\n3. 방추파는 수면 방추(시상 망상핵에서 생성)의 마커\n4. 각 방추파는 1회의 시상-피질 진동 주기를 나타냄\n\n수면 방추파는 수면 스테이징의 중요한 마커이며, 수면 의존적 기억 공고화를 연구하기 위한 핵심 창입니다.",
    },
    signal_quality: 82,
    learning_readability_score: 85,
    beginner_explanation: {
      zh: "这份 EEG 显示大脑在睡觉！可以看到纺锤形状的波形（像纺锤一样），这是深度睡眠的标志。每个纺锤代表大脑在'整理记忆'。",
      en: "This EEG shows the brain is sleeping! You can see spindle-shaped waves (like a spindle), which is a sign of deep sleep. Each spindle represents the brain 'organizing memories'.",
    },
    student_explanation: {
      zh: "该 EEG 记录显示 N2 睡眠阶段的典型特征：睡眠纺锤波（12-16 Hz，持续 0.5-3 秒）。纺锤波由丘脑网状核产生，通过丘脑-皮质回路传播。主要位于中央区域（C3、C4），有时可扩散到额中央区域。纺锤波密度与睡眠依赖的记忆巩固正相关。此案例适合练习睡眠分期和纺锤波检测。",
      en: "This EEG recording shows typical features of N2 sleep stage: sleep spindles (12-16 Hz, lasting 0.5-3 seconds). Spindles are generated by the thalamic reticular nucleus and propagate through thalamocortical circuits. Mainly located in central regions (C3, C4), sometimes spreading to centrofrontal regions. Spindle density correlates positively with sleep-dependent memory consolidation. This case is suitable for practicing sleep staging and spindle detection.",
    },
    research_explanation: {
      zh: "此 N2 睡眠 EEG 记录显示密集的纺锤波活动。PSD 分析显示 12-16 Hz 范围内的能量峰值（纺锤波频带）。Bandpower 分析：Sigma（12-16 Hz）18%，Beta 15%，Alpha 10%，Theta 25%，Delta 32%。纺锤波密度约为 4.2 个/分钟，平均持续时间 1.1 秒，平均振幅 35 μV。采样率 256 Hz，符合睡眠 EEG 标准。该案例可用于研究纺锤波与记忆巩固的关系，以及纺锤波在丘脑-皮质网络中的产生机制。",
      en: "This N2 sleep EEG recording shows dense spindle activity. PSD analysis shows energy peak in 12-16 Hz range (spindle frequency band). Bandpower analysis: Sigma (12-16 Hz) 18%, Beta 15%, Alpha 10%, Theta 25%, Delta 32%. Spindle density approximately 4.2 per minute, average duration 1.1 seconds, average amplitude 35 μV. Sampling rate 256 Hz, meets sleep EEG standards. This case can be used to study the relationship between spindles and memory consolidation, and the generation mechanism of spindles in thalamocortical networks.",
    },
    limitations: {
      zh: ["仅记录单个夜间，无法观察纺锤波的长期变化", "缺少同时采集的 EMG/EOG，无法完全确认睡眠分期", "纺锤波检测依赖算法参数，可能有主观偏差"],
      en: ["Only single night recorded, cannot observe long-term changes in spindles", "No simultaneous EMG/EOG acquisition, cannot fully confirm sleep staging", "Spindle detection depends on algorithm parameters, may have subjective bias"],
      es: ["Solo una sola noche registrada, no se pueden observar cambios a largo plazo en husos", "Sin adquisición simultánea de EMG/EOG, no se puede confirmar completamente el estadiaje del sueño", "La detección de husos depende de parámetros del algoritmo, puede tener sesgo subjetivo"],
      fr: ["Seulement une seule nuit enregistrée, impossible d'observer les changements à long terme des fuseaux", "Pas d'acquisition EMG/EOG simultanée, impossible de confirmer complètement le staging du sommeil", "La détection des fuseaux dépend des paramètres de l'algorithme, peut avoir un biais subjectif"],
      de: ["Nur eine einzelne Nacht aufgezeichnet, langfristige Veränderungen der Spindeln können nicht beobachtet werden", "Keine gleichzeitige EMG/EOG-Akquisition, Schlafstaging kann nicht vollständig bestätigt werden", "Spindeldetektion hängt von Algorithmusparametern ab, kann subjektive Bias haben"],
      ja: ["単一夜のみ記録、紡錘波の長期変化を観察できない", "同時EMG/EOG取得がない、睡眠ステージングを完全に確認できない", "紡錘波検出はアルゴリズムパラメータに依存、主観的バイアスがある可能性がある"],
      ko: ["단일 밤만 기록, 방추파의 장기 변화를 관찰할 수 없음", "동시 EMG/EOG 획득 없음, 수면 스테이징을 완전히 확인할 수 없음", "방추파 검출은 알고리즘 매개변수에 의존, 주관적 편향이 있을 수 있음"],
    },
    what_this_data_cannot_tell: {
      zh: ["梦的内容", "具体的记忆巩固效果", "个体的睡眠质量主观感受"],
      en: ["Dream content", "Specific memory consolidation effect", "Individual's subjective sleep quality perception"],
      es: ["Contenido del sueño", "Efecto específico de consolidación de la memoria", "Percepción subjetiva de la calidad del sueño del individuo"],
      fr: ["Contenu du rêve", "Effet spécifique de consolidation mémorielle", "Perception subjective de la qualité du sommeil de l'individu"],
      de: ["Trauminhalt", "Spezifischer Gedächtniskonsolidierungseffekt", "Subjektive Schlafqualitätswahrnehmung des Individuums"],
      ja: ["夢の内容", "具体的な記憶固定効果", "個人の主観的な睡眠品質知覚"],
      ko: ["꿈의 내용", "구체적인 기억 공고화 효과", "개인의 주관적인 수면 품질 지각"],
    },
    tags: ["sleep", "N2", "spindle", "memory", "thalamus"],
    readTime: "12 分钟",
  },
  /* ---- c11: 阿尔茨海默病 EEG ---- */
  {
    id: "c11",
    title: {
      zh: "阿尔茨海默病 EEG（Alzheimer's EEG）",
      en: "Alzheimer's Disease EEG",
      es: "EEG de la Enfermedad de Alzheimer",
      fr: "EEG de la Maladie d'Alzheimer",
      de: "EEG bei Alzheimer-Krankheit",
      ja: "アルツハイマー病EEG（Alzheimer's EEG）",
      ko: "알츠하이머병 EEG (Alzheimer's EEG)",
    },
    categoryKey: "clinical",
    difficultyKey: "advanced",
    description: {
      zh: "这份 EEG 数据来自一名阿尔茨海默病（AD）患者，轻度认知障碍阶段。信号质量评分 72/100，显示典型的 AD EEG 特征：弥漫性 theta 活动增加（4-8 Hz），Alpha 波峰值频率减慢（< 8 Hz），以及前额-颞叶连接性降低。",
      en: "This EEG data is from an Alzheimer's disease (AD) patient at mild cognitive impairment stage. Signal quality score 72/100, showing typical AD EEG features: increased diffuse theta activity (4-8 Hz), slowed Alpha peak frequency (< 8 Hz), and reduced frontotemporal connectivity.",
      es: "Estos datos EEG son de un paciente con enfermedad de Alzheimer (EA) en etapa de deterioro cognitivo leve. Puntuación de calidad de señal 72/100, muestra características típicas de EEG de EA: aumento de actividad theta difusa (4-8 Hz), frecuencia de pico Alfa lentificada (< 8 Hz) y conectividad frontotemporal reducida.",
      fr: "Ces données EEG proviennent d'un patient atteint de la maladie d'Alzheimer (MA) au stade de déficit cognitif léger. Score de qualité du signal 72/100, montrant des caractéristiques typiques d'EEG de la MA : activité theta diffuse augmentée (4-8 Hz), fréquence de pic Alpha ralentie (< 8 Hz) et connectivité frontotemporale réduite.",
      de: "Diese EEG-Daten stammen von einem Alzheimer-Patienten (AD) im Stadium der leichten kognitiven Beeinträchtigung. Signalqualitätsscore 72/100, zeigt typische AD-EEG-Merkmale: vermehrte diffuse Theta-Aktivität (4-8 Hz), verlangsamte Alpha-Peak-Frequenz (< 8 Hz) und reduzierte frontotemporale Konnektivität.",
      ja: "このEEGデータはアルツハイマー病（AD）患者、軽度認知障害段階のものです。信号品質スコア72/100、典型的なAD EEG特徴を示します：びまん性シータ活動増加（4-8Hz）、アルファピーク周波数の低下（<8Hz）、および前頭-側頭連結性の低下。",
      ko: "이 EEG 데이터는 알츠하이머병(AD) 환자, 경도 인지 장애 단계의 것입니다. 신호 품질 점수 72/100, 전형적인 AD EEG 특징 표시: 증가된 미만성 세타 활동(4-8Hz), 느려진 알파 피크 주파수(<8Hz), 그리고 감소된 전두-측두 연결성.",
    },
    details: {
      zh: "此案例展示阿尔茨海默病（AD）早期的典型 EEG 生物标记：\n\n1. Alpha 峰值频率（APF）减慢：从正常的 ~10 Hz 减慢到 < 8 Hz\n2. 弥漫性 theta 活动（4-8 Hz）增加，尤其在额叶和颞叶区域\n3. 脑网络连接性降低：前额-颞叶功能连接减弱\n4. 背景活动整体变慢，delta 活动轻微增加\n\n这些 EEG 特征可用于 AD 的早期识别和疾病进展监测，是神经退行性疾病研究的重要窗口。",
      en: "This case demonstrates typical EEG biomarkers in early Alzheimer's disease (AD):\n\n1. Alpha peak frequency (APF) slowing: from normal ~10 Hz to < 8 Hz\n2. Increased diffuse theta activity (4-8 Hz), especially in frontal and temporal regions\n3. Reduced brain network connectivity: weakened frontotemporal functional connectivity\n4. Overall background activity slowing, slight delta activity increase\n\nThese EEG features can be used for early AD identification and disease progression monitoring, an important window for neurodegenerative disease research.",
      es: "Este caso demuestra biomarcadores típicos de EEG en la enfermedad de Alzheimer (EA) temprana:\n\n1. Enlentecimiento de la frecuencia de pico Alfa (APF): de ~10 Hz normal a < 8 Hz\n2. Aumento de actividad theta difusa (4-8 Hz), especialmente en regiones frontales y temporales\n3. Reducción de la conectividad de la red cerebral: conectividad funcional frontotemporal debilitada\n4. Enlentecimiento general de la actividad de fondo, ligero aumento de actividad delta\n\nEstas características de EEG pueden utilizarse para la identificación temprana de EA y el monitoreo de la progresión de la enfermedad, una ventana importante para la investigación de enfermedades neurodegenerativas.",
      fr: "Ce cas démontre les biomarqueurs typiques d'EEG dans la maladie d'Alzheimer (MA) précoce :\n\n1. Ralentissement de la fréquence de pic Alpha (APF) : de ~10 Hz normal à < 8 Hz\n2. Augmentation de l'activité theta diffuse (4-8 Hz), surtout dans les régions frontales et temporales\n3. Réduction de la connectivité du réseau cérébral : connectivité fonctionnelle frontotemporale affaiblie\n4. Ralentissement général de l'activité de fond, légère augmentation de l'activité delta\n\nCes caractéristiques d'EEG peuvent être utilisées pour l'identification précoce de la MA et le suivi de la progression de la maladie, une fenêtre importante pour la recherche sur les maladies neurodégénératives.",
      de: "Dieser Fall demonstriert typische EEG-Biomarker bei früher Alzheimer-Krankheit (AD):\n\n1. Alpha-Peak-Frequenz (APF) Verlangsamung: von normal ~10 Hz auf < 8 Hz\n2. Zunahme diffuser Theta-Aktivität (4-8 Hz), besonders in frontalen und temporalen Regionen\n3. Reduzierte Hirnnetzwerk-Konnektivität: geschwächte frontotemporale funktionelle Konnektivität\n4. Generelle Verlangsamung der Hintergrundaktivität, leichter Anstieg der Delta-Aktivität\n\nDiese EEG-Merkmale können für die frühe AD-Identifizierung und Krankheitsprogessionsüberwachung verwendet werden, ein wichtiges Fenster für neurodegenerative Erkrankungsforschung.",
      ja: "この症例は早期アルツハイマー病（AD）の典型的なEEGバイオマーカーを提示します：\n\n1. アルファピーク周波数（APF）の低下：正常な~10Hzから<8Hzへ\n2. びまん性シータ活動（4-8Hz）の増加、特に前頭および側頭領域\n3. 脳ネットワーク連結性の低下：前頭-側頭機能的連結性の減弱\n4. 全体的な背景活動の低下、デルタ活動の軽度増加\n\nこれらのEEG特徴はADの早期識別および疾患進行モニタリングに使用でき、神経変性疾患研究の重要な窓口です。",
      ko: "이 사례는 초기 알츠하이머병(AD)의 전형적인 EEG 바이오마커를 보여줍니다:\n\n1. 알파 피크 주파수(APF) 감소: 정상 ~10Hz에서 <8Hz로\n2. 증가된 미만성 세타 활동(4-8Hz), 특히 전두 및 측두 영역\n3. 감소된 뇌 네트워크 연결성: 약화된 전두-측두 기능적 연결성\n4. 전반적인 배경 활동 감소, 경미한 델타 활동 증가\n\n이러한 EEG 특징은 조기 AD 식별 및 질병 진행 모니터링에 사용될 수 있으며, 신경퇴행성 질환 연구의 중요한 창입니다.",
    },
    signal_quality: 72,
    learning_readability_score: 78,
    beginner_explanation: {
      zh: "这份 EEG 显示大脑在'变慢'——就像一台老电脑运行变慢一样。阿尔茨海默病让大脑的电活动整体变慢，尤其是 Alpha 波变慢了。",
      en: "This EEG shows the brain is 'slowing down' — like an old computer running slower. Alzheimer's makes the brain's electrical activity slow down overall, especially Alpha waves slow down.",
    },
    student_explanation: {
      zh: "该 EEG 记录显示阿尔茨海默病早期的神经生理特征：1) Alpha 峰值频率（APF）从 ~10 Hz 减慢到 < 8 Hz；2) 弥漫性 theta 活动（4-8 Hz）增加，尤其在额叶和颞叶；3) 脑网络连接性降低，前额-颞叶功能连接减弱；4) 背景活动整体变慢，delta 活动轻微增加。这些特征与神经元丢失、突触功能下降和神经网络断开一致。此案例适合研究神经退行性疾病的 EEG 生物标记。",
      en: "This EEG recording shows neurophysiological features of early Alzheimer's disease: 1) Alpha peak frequency (APF) slows from ~10 Hz to < 8 Hz; 2) Increased diffuse theta activity (4-8 Hz), especially in frontal and temporal regions; 3) Reduced brain network connectivity, weakened frontotemporal functional connectivity; 4) Overall background activity slowing, slight delta activity increase. These features are consistent with neuronal loss, synaptic dysfunction, and neural network disconnection. This case is suitable for studying EEG biomarkers in neurodegenerative diseases.",
    },
    research_explanation: {
      zh: "此 AD 患者 EEG 记录显示典型的神经退行性疾病 EEG 特征。PSD 分析显示 Alpha 峰值频率 ~7.8 Hz（正常 ~10 Hz），theta 频带（4-8 Hz）功率增加 35%。Bandpower 分析：Delta 22%，Theta 38%，Alpha 28%，Beta 12%。脑网络分析（基于相位锁定值 PLV）显示前额-颞叶连接性降低 28%。采样率 256 Hz，64 通道 EEG，符合临床神经生理标准。该案例可用于研究 AD 的早期生物标记、疾病进展监测，以及 EEG 生物标记与认知评分（MMSE）的相关性。",
      en: "This AD patient EEG recording shows typical neurodegenerative disease EEG features. PSD analysis shows Alpha peak frequency ~7.8 Hz (normal ~10 Hz), theta band (4-8 Hz) power increased by 35%. Bandpower analysis: Delta 22%, Theta 38%, Alpha 28%, Beta 12%. Brain network analysis (based on phase locking value PLV) shows reduced frontotemporal connectivity by 28%. Sampling rate 256 Hz, 64-channel EEG, meets clinical neurophysiology standards. This case can be used to study early AD biomarkers, disease progression monitoring, and correlation between EEG biomarkers and cognitive scores (MMSE).",
    },
    limitations: {
      zh: ["仅代表轻度认知障碍阶段，无法观察疾病全程", "缺少脑脊液 biomarkers（Aβ、p-tau）对照", "样本量小（n=1），无法进行群体统计比较"],
      en: ["Only represents mild cognitive impairment stage, cannot observe full disease course", "Lacks CSF biomarkers (Aβ, p-tau) for comparison", "Small sample size (n=1), cannot perform group statistical comparison"],
      es: ["Solo representa la etapa de deterioro cognitivo leve, no se puede observar el curso completo de la enfermedad", "Falta biomarcadores de LCR (Aβ, p-tau) para comparación", "Tamaño de muestra pequeño (n=1), no se puede realizar comparación estadística de grupo"],
      fr: ["Ne représente que le stade de déficit cognitif léger, impossible d'observer toute la progression de la maladie", "Manque de biomarqueurs LCR (Aβ, p-tau) pour comparaison", "Petite taille d'échantillon (n=1), impossible de réaliser une comparaison statistique de groupe"],
      de: ["Repräsentiert nur das Stadium der leichten kognitiven Beeinträchtigung, kann nicht den gesamten Krankheitsverlauf beobachten", "Fehlen CSF-Biomarker (Aβ, p-tau) zum Vergleich", "Kleine Stichprobengröße (n=1), kann keinen Gruppenstatistikvergleich durchführen"],
      ja: ["軽度認知障害段階のみを代表、疾患全経過を観察できない", "CSFバイオマーカー（Aβ、p-tau）対照が欠けている", "サンプルサイズ小（n=1）、集団統計比較ができない"],
      ko: ["경도 인지 장애 단계만 대표, 전체 질병 과정을 관찰할 수 없음", "CSF 바이오마커(Aβ, p-tau) 비교가 없음", "작은 샘플 크기(n=1), 그룹 통계 비교를 수행할 수 없음"],
    },
    what_this_data_cannot_tell: {
      zh: ["具体的病理改变（Aβ斑块、tau缠结）", "个体的疾病进展速度", "治疗效果或药物反应"],
      en: ["Specific pathological changes (Aβ plaques, tau tangles)", "Individual's disease progression speed", "Treatment effect or drug response"],
      es: ["Cambios patológicos específicos (placas Aβ, ovillos tau)", "Velocidad de progresión de la enfermedad del individuo", "Efecto del tratamiento o respuesta al fármaco"],
      fr: ["Changements pathologiques spécifiques (plaques Aβ, enchevêtrements tau)", "Vitesse de progression de la maladie de l'individu", "Effet du traitement ou réponse au médicament"],
      de: ["Spezifische pathologische Veränderungen (Aβ-Plaques, Tau-Tangles)", "Krankheitsprogressionsgeschwindigkeit des Individuums", "Behandlungseffekt oder Arzneimittelreaktion"],
      ja: ["具体的な病理変化（Aβプラーク、tauタングル）", "個人の疾患進行速度", "治療効果または薬物反応"],
      ko: ["구체적인 병리 변화(Aβ 플라크, tau tangles)", "개인의 질병 진행 속도", "치료 효과 또는 약물 반응"],
    },
    tags: ["alzheimer", "dementia", "neurodegenerative", "theta", "slowing"],
    readTime: "18 分钟",
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
      transition={{ duration: 0.05 }}
    >
      <section className="max-w-6xl mx-auto px-3 sm:px-5 py-4 sm:py-8 pb-[env(safe-area-inset-bottom,16px)]">
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
                      ? "bg-blue-600 text-white dark:bg-blue-500 border-blue-600 dark:bg-blue-600 dark:text-white"
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
                      ? "bg-blue-600 text-white dark:bg-blue-500 border-blue-600 dark:bg-blue-600 dark:text-white"
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
                {t("tag" + selectedTag.charAt(0).toUpperCase() + selectedTag.slice(1)) || selectedTag}
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

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.015 }}
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
                      transition={{ duration: 0.05 }}
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
                                <User className="w-4 h-4 text-green-600 dark:text-green-400" />
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
                              {t("tag" + tag.charAt(0).toUpperCase() + tag.slice(1)) || tag}
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
