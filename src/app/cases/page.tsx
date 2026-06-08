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
      es: ["Solo se registraron 5 minutos; puede que no capture anomalías intermitentes", "No hay datos conductuales simultáneos (p. ej., eye tracking) para confirmar el bloqueo Alpha"],
      fr: ["Seulement 5 minutes enregistrées ; peut ne pas capturer les anomalies intermittentes", "Pas de données comportementales concurrentes (p. ex., eye tracking) pour confirmer le blocage Alpha"],
      de: ["Nur 5 Minuten aufgezeichnet; kann intermittierende Anomalien möglicherweise nicht erfassen", "Keine gleichzeitigen Verhaltensdaten (z. B. Eye-Tracking) zur Bestätigung der Alpha-Blockade"],
      ja: ["わずか5分間の記録；間欠的な異常を補足できない可能性があります", "同時行動データ（アイトラッキングなど）がなく、Alphaブロッキングを確認できません"],
      ko: ["단 5분만 기록됨; 간헐적 이상을 포착하지 못할 수 있음", "동시 행동 데이터 (예: 아이트래킹) 가 없어 Alpha 차단을 확인할 수 없음"],
    },
    what_this_data_cannot_tell: {
      zh: ["智商高低", "是否患有精神疾病", "具体的情绪状态"],
      en: ["Intelligence level", "Whether the person has a mental illness", "Specific emotional state"],
      es: ["Nivel de inteligencia", "Si la persona tiene una enfermedad mental", "Estado emocional específico"],
      fr: ["Niveau d'intelligence", "Si la personne a une maladie mentale", "État émotionnel spécifique"],
      de: ["Intelligenzniveau", "Ob die Person eine psychische Erkrankung hat", "Spezifischer emotionaler Zustand"],
      ja: ["知能レベル", "その人が精神疾患を持っているかどうか", "具体的な感情状態"],
      ko: ["지능 수준", "그 사람이 정신 질환을 가지고 있는지 여부", "구체적인 감정 상태"],
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
      es: "Este caso demuestra datos EEG sucios comunes en entornos del mundo real. Necesita aprender a identificar:\n\n1. Artefactos electromiográficos (EMG) (alta frecuencia, baja amplitud, comunes en el músculo temporal)\n2. Artefactos electrooculográficos (EOG) (gran amplitud, ondas lentas, comunes en la frente)\n3. Ruido de línea eléctrica (interferencia de 50/60 Hz)\n\nAprender a identificar estos artefactos es una habilidad importante en el análisis de EEG.",
      fr: "Ce cas démontre des données EEG sales communes dans des environments du monde réel. Vous devez apprendre à identifier :\n\n1. Artefacts électromyographiques (EMG) (haute fréquence, basse amplitude, communs dans le muscle temporal)\n2. Artefacts électrooculographiques (EOG) (grande amplitude, ondes lentes, communs sur le front)\n3. Bruit de réseau électrique (interférence 50/60 Hz)\n\nApprendre à identifier ces artefacts est une compétence importante dans l'analyse EEG.",
      de: "Dieser Fall zeigt häufige schmutzige EEG-Daten in Realwelt-Einstellungen. Sie müssen lernen zu identifizieren:\n\n1. Elektromyographische (EMG) Artefakte (hohe Frequenz, niedrige Amplitude, häufig im temporalen Muskel)\n2. Elektrookulographische (EOG) Artefakte (große Amplitude, langsame Wellen, häufig auf der Stirn)\n3. Netzbrummen (50/60 Hz Interferenz)\n\nZu lernen, diese Artefakte zu identifizieren, ist eine wichtige Fähigkeit in der EEG-Analyse.",
      ja: "この症例は実世界の設定で一般的な汚れたEEGデータを示しています。あなたは識別することを学ぶ必要があります：\n\n1. 筋電図（EMG）アーチファクト（高周波、低振幅、側頭筋に一般的）\n2. 眼電図（EOG）アーチファクト（大振幅、緩波、額に一般的）\n3. 電力線ノイズ（50/60 Hz 干渉）\n\nこれらのアーチファクトを識別することを学ぶことは、EEG分析の重要なスキルです。",
      ko: "이 사례는 실제 환경에서 흔한 더러운 EEG 데이터를 보여줍니다. 당신은 식별하는 방법을 배워야 합니다:\n\n1. 근전도 (EMG) 아티팩트 (고주파, 저진폭, 측두근에 흔함)\n2. 안구전도 (EOG) 아티팩트 (대진폭, 서파, 이마에 흔함)\n3. 전력선 노이즈 (50/60 Hz 간섭)\n\n이 아티팩트를 식별하는 방법을 배우는 것은 EEG 분석에서 중요한 스킬입니다."
    },
    signal_quality: 45,
    learning_readability_score: 52,
    beginner_explanation: {
      zh: "这份 EEG 有很多杂讯，就像收音机有静电干扰一样。有些通道的信号很乱，可能是因为电极接触不好，或者受试者有眨眼、动弹。",
      en: "This EEG has a lot of noise, like static on a radio. Some channels have messy signals, possibly because the electrodes aren't contacting well, or the subject is blinking or moving.",
      es: "Este EEG tiene mucho ruido, como estática en la radio. Algunos canales tienen señales desordenadas, posiblemenete porque los electrodos no están contactando bien, o el sujeto está parpadeando o moviéndose.",
      fr: "Cet EEG a beaucoup de bruit, comme de la statique sur la radio. Certains canaux ont des signaux désordonnés, possiblement parce que les électrodes ne contactent pas bien, ou le sujet est en train de cligner ou de bouger.",
      de: "Dieses EEG hat viel Rauschen, wie statisches Rauschen im Radio. Einige Kanäle haben ungeordnete Signale, möglicherweise weil die Elektroden nicht gut kontaktieren, oder das Subjekt blinzelt oder sich bewegt.",
      ja: "このEEGは多くのノイズがあります、ラジオの静電気のようです。一部のチャンネルは信号が乱雑で、おそらく電極がうまく接触していないか、または被験者がまばたきや動きをしているためです。",
      ko: "이 EEG는 많은 노이즈가 있습니다, 라디오의 정전기처럼. 일부 채널은 신호가 엉망입니다, 가능하게는 전극이 잘 접촉하지 않거나, 또는 피험자가 눈을 깜빡이거나 움직이고 있기 때문에."
    },
    student_explanation: {
      zh: "该 EEG 记录显示多处伪影：前额区域可见眼电伪影（EOG，大振幅慢波），颞叶可见肌电伪影（EMG，高频低振幅）。通道 FP1、FP2 信号质量差。建议在进行分析前先进行伪影去除（如 ICA 或带阻滤波）。",
      en: "The EEG recording shows multiple artifacts: EOG artifacts (large-amplitude slow waves) are visible in frontal areas, and EMG artifacts (high-frequency low-amplitude) are visible in temporal areas. Channels FP1, FP2 have poor signal quality. Artifact removal (e.g., ICA or notch filtering) is recommended before analysis.",
      es: "La grabación de EEG muestra múltiples artefactos: los artefactos EOG (ondas lentas de gran amplitud) son visibles en áreas frontales, y los artefactos EMG (baja amplitud de alta frecuencia) son visibles en áreas temporales. Los canales FP1, FP2 tienen mala calidad de señal. Se recomienda la eliminación de artefactos (por ejemplo, ICA o filtrado de muesca) antes del análisis.",
      fr: "L'enregistrement EEG montre plusieurs artefacts : les artefacts EOG (ondes lentes de grande amplitude) sont visibles dans les zones frontales, et les artefacts EMG (basse amplitude haute fréquence) sont visibles dans les zones temporales. Les canaux FP1, FP2 ont une mauvaise qualité de signal. L'élimination des artefacts (par exemple, ICA ou filtrage de muesca) est recommandée avant l'analyse.",
      de: "Die EEG-Aufzeichnung zeigt mehrere Artefakte: EOG-Artefakte (langsame Wellen großer Amplitude) sind in frontalen Bereichen sichtbar, und EMG-Artefakte (niedrige Amplitude hoher Frequenz) sind in temporalen Bereichen sichtbar. Die Kanäle FP1, FP2 haben schlechte Signalqualität. Artefaktentfernung (z. B. ICA oder Kerbfilterung) wird vor der Analyse empfohlen.",
      ja: "EEG記録は複数のアーチファクトを示しています：EOGアーチファクト（大振幅緩波）は前頭領域で可視であり、EMGアーチファクト（高周波低振幅）は側頭領域で可視です。チャンネルFP1、FP2は信号品質が悪いです。分析の前にアーチファクト除去（例：ICAまたはノッチフィルタリング）が推奨されます。",
      ko: "EEG 기록은 여러 아티팩트를 보여줍니다: EOG 아티팩트 (대진폭 서파) 는 전두 영역에서 가시적이며, EMG 아티팩트 (고주파 저진폭) 는 측두 영역에서 가시적입니다. 채널 FP1, FP2 는 신호 품질이 나쁩입니다. 분석 전에 아티팩트 제거 (예: ICA 또는 노치 필터링) 가 권장됩니다."
    },
    research_explanation: {
      zh: "PSD 显示 50 Hz 工频噪声（电源干扰）。多个通道 SNR < 2 dB。建议：1) 检查电极阻抗（应 < 5 kΩ）；2) 使用 notch filter 去除 50 Hz 噪声；3) 考虑使用 ICA 去除眼电和肌电伪影。当前数据不适合用于认知或临床研究。",
      en: "PSD shows 50 Hz power line noise (mains interference). Multiple channels have SNR < 2 dB. Recommendations: 1) Check electrode impedance (should be < 5 kΩ); 2) Use notch filter to remove 50 Hz noise; 3) Consider using ICA to remove EOG and EMG artifacts. Current data is not suitable for cognitive or clinical research.",
      es: "PSD muestra ruido de línea eléctrica de 50 Hz (interferencia de red). Múltiples canales tienen SNR < 2 dB. Recomendaciones: 1) Verificar impedancia de electrodos (debería ser < 5 kΩ); 2) Usar filtro de muesca para eliminar ruido de 50 Hz; 3) Considerar el uso de ICA para eliminar artefactos EOG y EMG. Los datos actuales no son adecuados para investigación cognitiva o clínica.",
      fr: "PSD montre du bruit de réseau électrique 50 Hz (interférence de secteur). Plusieurs canaux ont un SNR < 2 dB. Recommandations: 1) Vérifier l'impédance des électrodes (devrait être < 5 kΩ); 2) Utiliser un filtre de muesca pour éliminer le bruit de 50 Hz; 3) Envisager l'utilisation d'ICA pour éliminer les artefacts EOG et EMG. Les données actuelles ne sont pas adaptées à la recherche cognitive ou clinique.",
      de: "PSD zeigt 50 Hz Netzbrummen (Netzinterferenz). Mehrere Kanäle haben SNR < 2 dB. Empfehlungen: 1) Elektrodenimpedanz prüfen (sollte < 5 kΩ sein); 2) Kerbfilter verwenden, um 50 Hz Rauschen zu entfernen; 3) Erwägen Sie die Verwendung von ICA, um EOG- und EMG-Artefakte zu entfernen. Aktuelle Daten eignen sich nicht für kognitive oder klinische Forschung.",
      ja: "PSDは50Hz電力線ノイズ（電源干渉）を示しています。複数のチャンネルはSNR < 2 dBです。推奨：1）電極インピーダンスを確認（< 5 kΩであるべき）；2）ノッチフィルタを使用して50Hzノイズを除去；3）EOGとEMGアーチファクトを除去するためにICAの使用を考慮。現在のデータは認知または臨床研究に適していません。",
      ko: "PSD는 50Hz 전력선 노이즈 (전원 간섭) 를 보여줍니다. 여러 채널은 SNR < 2 dB입니다. 권장사항: 1) 전극 임피던스 확인 ( < 5 kΩ이어야 함); 2) 50Hz 노이즈를 제거하기 위해 노치 필터 사용; 3) EOG 및 EMG 아티팩트를 제거하기 위해 ICA 사용 고려. 현재 데이터는 인지 또는 임상 연구에 적합하지 않습니다."
    },
    limitations: {
      zh: ["高噪声水平严重限制了数据解读", "无法可靠地测量频段功率", "伪影去除算法可能引入额外误差"],
      en: ["High noise level severely limits data interpretation", "Cannot reliably measure band power", "Artifact removal algorithms may introduce additional errors"],
      es: ["El nivel alto de ruido limit seriamente la interpretación de datos", "No se puede medir confiablemente la potencia de banda", "Los algoritmos de eliminación de artefactos pueden introducir errores adicionales"],
      fr: ["Le niveau élevé de bruit limite sévèrement l'interprétation des données", "Impossible de mesurer fiablement la puissance de la bande", "Les algorithmes d'élimination d'artefacts peuvent introduire des erreurs supplémentaires"],
      de: ["Hohes Rauschniveau eingeschränkt die Datenerpretation stark", "Kann Bandleistung nicht zuverlässig messen", "Artefaktentfernungsalgorithmen können zusätzliche Fehler einführen"],
      ja: ["高ノイズレベルはデータ解釈を深刻に制限します", "信頼できる帯域電力測定は不可能です", "アーチファクト除去アルゴリズムは追加の誤差を導入する可能性があります"],
      ko: ["높은 노이즈 수준은 데이터 해석을 심각하게 제한합니다", "신뢰할 수 있게 밴드 전력을 측정할 수 없습니다", "아티팩트 제거 알고리즘은 추가 오차를 도입할 수 있습니다"]
    },
    what_this_data_cannot_tell: {
      zh: ["真实的脑活动模式", "准确的频段能量分布", "任何与认知相关的信息"],
      en: ["True brain activity patterns", "Accurate band power distribution", "Any cognition-related information"],
      es: ["Patrones reales de actividad cerebral", "Distribución precisa de potencia de banda", "Cualquier información relacionada con la cognición"],
      fr: ["Vrais patrons d'activité cérébrale", "Distribution précise de puissance de bande", "Toute information liée à la cognition"],
      de: ["Echte Hirnaktivitätsmuster", "Präzise Bandleistungsverteilung", "Jeglische kognitionsbezogene Information"],
      ja: ["真の脳活動パターン", "正確な帯域電力分布", "認知関連の情報"],
      ko: ["진정한 뇌 활동 패턴", "정확한 밴드 전력 분포", "인지 관련 정보"]
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
      es: "Estos datos EEG fueron grabados solo durante 30 segundos. Aunque la calidad de señal es aceptable (puntuación 68/100), el tiempo de grabación es demasiado corto para evaluar confiablemente la actividad cerebral.",
      fr: "Ces données EEG n'ont été enregistrées que pendant 30 secondes. Bien que la qualité du signal soit acceptable (score 68/100), la durée d'enregistrement est trop courte pour évaluer fiablement l'activité cérébrale.",
      de: "Diese EEG-Daten wurden nur 30 Sekunden lang aufgezeichnet. Obwohl die Signalqualität akzeptabel ist (Score 68/100), ist die Aufnahmedauer zu kurz, um die Hirnaktivität zuverlässig zu bewerten.",
      ja: "このEEGデータはわずか30秒間記録されました。信号品質は許容範囲ですが（スコア68/100）、記録時間が短すぎて脳活動を可靠に評価できません。",
      ko: "이 EEG 데이터는 겨우 30초 동안 기록되었습니다. 신호 품질은 허용 가능합니다 (점수 68/100), 하지만 기록 시간이 너무 짧아서 뇌 활동을 신뢰할 수 있게 평가할 수 없습니다."
    },
    details: {
      zh: "此案例展示了记录时长不足的问题：\n\n1. 30 秒不足以评估 Alpha 阻断等事件相关反应\n2. 频段功率估算可能不准确（需要至少 2-3 分钟）\n3. 可能无法捕捉到 intermittent 的异常活动\n\n学习 EEG 时，理解记录时长的重要性非常关键。",
      en: "This case demonstrates the problem of insufficient recording duration:\n\n1. 30 seconds is not enough to assess event-related responses like Alpha blocking\n2. Band power estimation may be inaccurate (at least 2-3 minutes needed)\n3. May not capture intermittent abnormal activities\n\nWhen learning EEG, understanding the importance of recording duration is crucial.",
      es: "Este caso demuestra el problema de la durción de grabación insuficiente:\n\n1. 30 segundos no son suficientes para evaluar respuestas relacionadas con eventos como el bloqueo Alfa\n2. La estimación de potencia de banda puede ser imprecisa (se necesitan al menos 2-3 minutos)\n3. Puede que no se capturen actividades anormales intermitentes\n\nAl aprender EEG, comprender la importancia de la durción de la grabación es crucial.",
      fr: "Ce cas démontre le problème de la durée d'enregistrement insuffisante :\n\n1. 30 secondes ne suffisent pas pour évaluer les réponses liées aux événements comme le bloquage Alfa\n2. L'estimation de la puissance de la bande peut être imprécise (au moins 2-3 minutes nécessaires)\n3. Peut-être que les activités anormales intermittentes ne sont pas capturées\n\nEn apprenant l'EEG, comprendre l'importance de la durée d'enregistrement est crucial.",
      de: "Dieser Fall zeigt das Problem der unzureichenden Aufnahmedauer:\n\n1. 30 Sekunden reichen nicht aus, um ereignisbezogene Reaktionen wie Alpha-Blockade zu bewerten\n2. Die Schätzung der Bandleistung kann ungenau sein (mindestens 2-3 Minuten erforderlich)\n3. Intermittierende anormale Aktivitäten werden möglicherweise nicht erfasst\n\nBeim Erlernen von EEG ist das Verständnis der Bedeutung der Aufnahmedauer von entscheidender Bedeutung.",
      ja: "この症例は記録時間の不足の問題を示しています：\n\n1. 30秒ではAlpha遮断などの事象関連反応を評価するには不十分です\n2. 帯域電力推定は不正確かもしれません（少なくとも2-3分必要）\n3. 間歇的な異常活動を捕捉できないかもしれません\n\nEEGを学ぶ際、記録時間の重要性を理解することは決定的に重要です。",
      ko: "이 사례는 기록 지속 시간 부족의 문제를 보여줍니다:\n\n1. 30초는 Alpha 차단과 같은 사건 관련 반응을 평가하기에 부족합니다\n2. 밴드 전력 추정은 부정확할 수 있습니다 (적어도 2-3분 필요)\n3. 간헐적인 비정상 활동을 포착하지 못할 수 있습니다\n\nEEG를 배울 때, 기록 지속 시간의 중요성을 이해하는 것은 결정적으로 중요합니다."
    },
    signal_quality: 68,
    learning_readability_score: 75,
    beginner_explanation: {
      zh: "这份 EEG 只记录了 30 秒，就像只看了书的最后一页。大脑活动是会变化的，30 秒太短了，不能代表你的整体脑电活动。",
      en: "This EEG was recorded for only 30 seconds, like reading only the last page of a book. Brain activity changes over time; 30 seconds is too short to represent your overall brain activity.",
      es: "Este EEG fue grabado solo durante 30 segundos, como leer solo la última página de un libro. La actividad cerebral cambia con el tiempo; 30 segundos son demasiado cortos para representar tu actividad cerebral general.",
      fr: "Cet EEG n'a été enregistré que pendant 30 secondes, comme si on ne lisait que la dernière page d'un livre. L'activité cérébrale change avec le temps ; 30 secondes sont trop courtes pour représenter votre activité cérébrale globale.",
      de: "Dieses EEG wurde nur 30 Sekunden lang aufgezeichnet, wie wenn man nur die letzte Seite eines Buches liest. Die Hirnaktivität ändert sich mit der Zeit; 30 Sekunden sind zu kurz, um Ihre gesamte Hirnaktivität zu repräsentieren.",
      ja: "このEEGはわずか30秒間記録されました、本の最後のページだけを読むようなものです。脳活動は時間とともに変化します；30秒では全体の脳活動を代表するには短すぎます。",
      ko: "이 EEG는 겨우 30초 동안 기록되었습니다, 책의 마지막 페이지만 읽는 것과 같습니다. 뇌 활동은 시간에 따라 변화합니다; 30초는 전체 뇌 활동을 대표하기에는 너무 짧습니다."
    },
    student_explanation: {
      zh: "该记录时长仅 30 秒，不符合最低记录时长建议（静息态 EEG 至少 2 分钟）。短时程导致频段功率估算不准确（Welch 方法需要足够多的数据段）。若需评估 Alpha 阻断等事件相关反应，建议记录 3-5 分钟。",
      en: "The recording duration is only 30 seconds, which does not meet the minimum recommended recording time (at least 2 minutes for resting-state EEG). Short duration leads to inaccurate band power estimation (Welch's method requires sufficient data segments). If assessing event-related responses like Alpha blocking, 3-5 minutes of recording is recommended.",
      es: "La durción de la grabación es solo de 30 segundos, lo cual no cumple con el tiempo mínimo recomendado de grabación (al menos 2 minutos para EEG de estado de reposo). La corta durción conduce a una estimación inaccurata de la potencia de banda (el método de Welch requiere segmentos de datos suficientes). Si se evalúan respuestas relacionadas con eventos como el bloqueo Alfa, se recomiendan 3-5 minutos de grabación.",
      fr: "La durée d'enregistrement n'est que de 30 secondes, ce qui ne respecte pas le temps d'enregistrement minimum recommandé (au moins 2 minutes pour l'EEG de l'état de repos). La courte durée conduit à une estimation inexacte de la puissance de la bande (la méthode de Welch nécessite des segments de données suffisants). Si l'on évalue les réponses liées aux événements comme le bloquage Alfa, 3-5 minutes d'enregistrement sont recommandées.",
      de: "Die Aufnahmedauer beträgt nur 30 Sekunden, was der minimal empfohlenen Aufnahmedauer nicht entspricht (mindestens 2 Minuten für ruhezustands-EEG). Kurze Dauer führt zu ungenauer Bandleistungsschätzung (Welch-Methode erfordert ausreichende Datensegmente). Bei Bewertung ereignisbezogener Reaktionen wie Alpha-Blockade werden 3-5 Minuten Aufnahme empfohlen.",
      ja: "記録時間はわずか30秒で、推奨される最小記録時間（安静状態EEGでは少なくとも2分）を満たしていません。短時間では帯域電力推定が不正確になります（Welch法には十分なデータセグメントが必要です）。Alpha遮断などの事象関連反応を評価する場合は、3-5分の記録が推奨されます。",
      ko: "기록 지속 시간은 겨우 30초입니다. 이는 권장되는 최소 기록 시간(안정 상태 EEG의 경우 적어도 2분)을 충족하지 않습니다. 짧은 지속 시간은 부정확한 밴드 전력 추정으로 이어집니다(Welch 방법에는 충분한 데이터 세그먼트가 필요합니다). Alpha 차단과 같은 사건 관련 반응을 평가하는 경우 3-5분 기록이 권장됩니다."
    },
    research_explanation: {
      zh: "30 秒记录仅包含 15 个 2-second epochs（无重叠）。根据 Welch 方法，频率分辨率 ≈ 0.5 Hz，但功率谱估计的方差很大。建议至少记录 2 分钟（120 秒 = 60 epochs），以获得稳定的 PSD 估计。此数据仅适合作为教学示例，不应用于研究。",
      en: "30-second recording contains only 15 2-second epochs (non-overlapping). According to Welch's method, frequency resolution ≈ 0.5 Hz, but the variance of power spectrum estimation is large. At least 2 minutes of recording (120 seconds = 60 epochs) is recommended for stable PSD estimation. This data is only suitable as a teaching example, not for research.",
      es: "La grabación de 30 segundos contiene solo 15 épocas de 2 segundos (sin solapamiento). Según el método de Welch, la resolución de frecuencia ≈ 0.5 Hz, pero la varianza de la estimación del espectro de potencia es grande. Se recomienda al menos 2 minutos de grabación (120 segundos = 60 épocas) para una estimación estable de PSD. Estos datos solo son adecuados como ejemplo de enseñanza, no para investigación.",
      fr: "L'enregistrement de 30 secondes ne contient que 15 époches de 2 secondes (non chevauchantes). Selon la méthode de Welch, la résolution fréquentielle ≈ 0.5 Hz, mais la variance de l'estimation du spectre de puissance est grande. Au moins 2 minutes d'enregistrement (120 secondes = 60 époches) sont recommandées pour une estimation stable de PSD. Ces données ne sont adaptées que comme exemple d'enseignement, pas pour la recherche.",
      de: "30-Sekunden-Aufnahme enthält nur 15 2-Sekunden-Epochen (nicht überlappend). Nach Welch-Methode beträgt die Frequenzauflösung ≈ 0,5 Hz, aber die Varianz der Leistungsspektrumschätzung ist groß. Mindestens 2 Minuten Aufnahme (120 Sekunden = 60 Epochen) werden für stable PSD-Schätzung empfohlen. Diese Daten eignen sich nur als Lehrbeispiel, nicht für Forschung.",
      ja: "30秒記録はわずか15個の2秒エポック（非重複）を含みます。Welch法によると、周波数分解能≈0.5Hzですが、電力スペクトル推定の分散は大きいです。安定したPSD推定には少なくとも2分（120秒=60エポック）の記録が推奨されます。このデータは教授例としてのみ適しており、研究には適していません。",
      ko: "30초 기록은 겨우 15개의 2초 에포크(비겹침)만 포함합니다. Welch 방법에 따르면, 주파수 해상도 ≈ 0.5Hz이지만, 전력 스펙트럼 추정의 분산은 큽니다. 안정적인 PSD 추정을 위해서는 적어도 2분(120초 = 60 에포크)의 기록이 권장됩니다. 이 데이터는 교수 예시로만 적합하며, 연구에는 적합하지 않습니다."
    },
    limitations: {
      zh: ["记录时长严重不足", "频段功率估计不可靠", "无法评估稳态特征"],
      en: ["Severely insufficient recording duration", "Band power estimation is unreliable", "Cannot assess steady-state characteristics"],
      es: ["Durción de grabación severamente insuficiente", "La estimación de potencia de banda es poco fiable", "No se pueden evaluar características de estado estacionario"],
      fr: ["Durée d'enregistrement sévèrement insuffisante", "L'estimation de la puissance de la bande est peu fiable", "Impossible d'évaluer les caractéristiques d'état stationnaire"],
      de: ["Schwerwiegend unzureichende Aufnahmedauer", "Bandleistungsschätzung ist unzuverlässig", "Kann stationäre Merkmale nicht bewerten"],
      ja: ["記録時間が深刻に不十分です", "帯域電力推定は信頼できません", "定常状態の特徴を評価できません"],
      ko: ["기록 지속 시간이 심각하게 불충분합니다", "밴드 전력 추정은 신뢰할 수 없습니다", "정상 상태 특성을 평가할 수 없습니다"]
    },
    what_this_data_cannot_tell: {
      zh: ["可靠的频段能量分布", "Alpha 阻断反应", "任何时序相关的变化"],
      en: ["Reliable band power distribution", "Alpha blocking response", "Any time-series related changes"],
      es: ["Distribución de potencia de banda confiable", "Respuesta de bloqueo Alfa", "Cualquier cambio relacionado con la serie temporal"],
      fr: ["Distribution de puissance de bande fiable", "Réponse de bloquage Alfa", "Tout changement lié à la série temporelle"],
      de: ["Zuverlässige Bandleistungsverteilung", "Alpha-Blockade-Reaktion", "Jeglische zeitreihenbezogene Änderungen"],
      ja: ["信頼できる帯域電力分布", "Alpha遮断反応", "時間系列関連の変化"],
      ko: ["신뢰할 수 있는 밴드 전력 분포", "Alpha 차단 반응", "시계열 관련 변화"]
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
      es: "Estos datos EEG tienen una tasa de muestreo de solo 128 Hz, por debajo de la recomendación estándar de 500 Hz. Puntuación de calidad de señal 55/100, puede perder información de alta frecuencia.",
      fr: "Ces données EEG ont un taux d'échantillonnage de seulement 128 Hz, inférieur à la recommandation standard de 500 Hz. Score de qualité du signal 55/100, peut perdre des informations haute fréquence.",
      de: "Diese EEG-Daten haben eine Abtastrate von nur 128 Hz, unterhalb der Standardempfehlung von 500 Hz. Signalqualitäts-Score 55/100, kann hochfrequente Informationen verlieren.",
      ja: "このEEGデータはサンプリングレートがわずか128Hzで、標準推奨の500Hzを下回っています。信号品質スコア55/100、高周波情報を失う可能性があります。",
      ko: "이 EEG 데이터는 샘플링 레이트가 겨우 128Hz로, 표준 권장 사항인 500Hz보다 낮습니다. 신호 품질 점수 55/100, 고주파 정보를 잃을 수 있습니다."
    },
    details: {
      zh: "此案例展示了低采样率的问题：\n\n1. 根据奈奎斯特定理，128 Hz 采样率只能可靠地记录 ≤ 64 Hz 的信号\n2. Beta 波（13-30 Hz）和 Gamma 波（30-100 Hz）的高频部分可能混叠\n3. 对于需要高频分析的 ERP 研究，此采样率不足\n\n学习 EEG 时，理解采样率对数据质量的影响非常重要。",
      en: "This case demonstrates the problem of low sampling rate:\n\n1. According to Nyquist theorem, 128 Hz sampling rate can only reliably record signals ≤ 64 Hz\n2. High-frequency parts of Beta waves (13-30 Hz) and Gamma waves (30-100 Hz) may be aliased\n3. For ERP research requiring high-frequency analysis, this sampling rate is insufficient\n\nWhen learning EEG, understanding the impact of sampling rate on data quality is very important.",
      es: "Este caso demuestra el problema de la baja tasa de muestreo:\n\n1. Según el teorema de Nyquist, la tasa de muestreo de 128 Hz solo puede registrar señales ≤ 64 Hz de forma fiable\n2. Las partes de alta frecuencia de las ondas Beta (13-30 Hz) y Gamma (30-100 Hz) pueden estar aliased\n3. Para la investigación de ERP que requiere análisis de alta frecuencia, esta tasa de muestreo es insuficiente\n\nAl aprender EEG, comprender el impacto de la tasa de muestreo en la calidad de los datos es muy importante.",
      fr: "Ce cas démontre le problème du faible taux d'échantillonnage :\n\n1. Selon le théorème de Nyquist, un taux d'échantillonnage de 128 Hz ne peut enregistrer de manière fiable que des signaux ≤ 64 Hz\n2. Les parties haute fréquence des ondes Beta (13-30 Hz) et Gamma (30-100 Hz) peuvent être aliasées\n3. Pour la recherche ERP nécessitant une analyse haute fréquence, ce taux d'échantillonnage est insuffisant\n\nEn apprenant l'EEG, comprendre l'impact du taux d'échantillonnage sur la qualité des données est très important.",
      de: "Dieser Fall zeigt das Problem der niedrigen Abtastrate:\n\n1. Nach dem Nyquist-Theorem kann eine Abtastrate von 128 Hz nur Signale ≤ 64 Hz zuverlässig aufzeichnen\n2. Hochfrequente Teile der Beta-Wellen (13-30 Hz) und Gamma-Wellen (30-100 Hz) können aliasiert sein\n3. Für ERP-Forschung, die hochfrequente Analyse erfordert, ist diese Abtastrate unzureichend\n\nBeim Erlernen von EEG ist das Verständnis der Auswirkungen der Abtastrate auf die Datenqualität sehr wichtig.",
      ja: "この症例は低サンプリングレートの問題を示しています：\n\n1. ナイキストの定理によると、128Hzサンプリングレートでは≤64Hzの信号のみを可靠に記録できます\n2. Beta波（13-30Hz）とGamma波（30-100Hz）の高周波部分はエイリアシングの可能性があります\n3. 高周波解析を必要とするERP研究では、このサンプリングレートは不十分です\n\nEEGを学ぶ際、サンプリングレートがデータ品質に与える影響を理解することは非常に重要です。",
      ko: "이 사례는 낮은 샘플링 레이트의 문제를 보여줍니다:\n\n1. 나이퀴스트 정리에 따르면, 128Hz 샘플링 레이트는 ≤64Hz 신호만을 신뢰할 수 있게 기록할 수 있습니다\n2. Beta 파(13-30Hz)와 Gamma 파(30-100Hz)의 고주파 부분은 앨리어싱될 수 있습니다\n3. 고주파 분석을 필요로 하는 ERP 연구의 경우, 이 샘플링 레이트는 불충분합니다\n\nEEG를 배울 때, 샘플링 레이트가 데이터 품질에 미치는 영향을 이해하는 것은 매우 중요합니다。"
    },
    signal_quality: 55,
    learning_readability_score: 60,
    beginner_explanation: {
      zh: "这份 EEG 的'拍照速度'比较慢（128 Hz），就像用慢速摄像机拍快速运动。可能会丢失一些快速的脑电活动信息。",
      en: "This EEG has a 'slow camera speed' (128 Hz), like using a slow-motion camera to film fast movement. It may miss some fast brain activity information.",
      es: "Este EEG tiene una 'velocidad de cámara lenta' (128 Hz), como usar una cámara lenticular para filmar movimiento rápido. Puede que se pierda algo de información rápida de actividad cerebral.",
      fr: "Cet EEG a une 'vitesse de caméra lente' (128 Hz), comme utiliser une caméra au ralenti pour filmer un mouvement rapide. Il peut manquer certaines informations rapides d'activité cérébrale.",
      de: "Dieses EEG hat eine 'langsame Kamerasgeschwindigkeit' (128 Hz), wie eine Zeitlupenkamera für schnelle Bewegung. Es kann einige schnelle Hirnaktivitätsinformationen verpassen.",
      ja: "このEEGは「カメラのスピードが遅い」（128Hz）で、高速動画を撮るのにスローモーションビデオを使うようなものです。高速な脳活動情報の一部を見逃す可能性があります。",
      ko: "이 EEG는 '느린 카메라 속도'(128Hz)를 가지고 있으며, 마치 빠른 움직임을 찍기 위해 슬로 모션 카메라를 사용하는 것과 같습니다. 빠른 뇌 활동 정보의 일부를 놓칠 수 있습니다。"
    },
    student_explanation: {
      zh: "采样率 128 Hz 意味着每秒记录 128 个数据点。根据奈奎斯特定理，最高可可靠记录频率为 64 Hz。对于在意 Beta（13-30 Hz）和 Gamma（30+ Hz）的研究，建议采样率 ≥ 500 Hz。此数据适合初步学习，但不适合高频分析。",
      en: "Sampling rate of 128 Hz means 128 data points are recorded per second. According to Nyquist theorem, the highest reliably recordable frequency is 64 Hz. For research interested in Beta (13-30 Hz) and Gamma (30+ Hz), sampling rate ≥ 500 Hz is recommended. This data is suitable for preliminary learning but not for high-frequency analysis.",
      es: "La tasa de muestreo de 128 Hz significa que se registran 128 puntos de datos por segundo. Según el teorema de Nyquist, la frecuencia máxima que se puede registrar de forma fiable es 64 Hz. Para la investigación interesada en Beta (13-30 Hz) y Gamma (30+ Hz), se recomienda una tasa de muestreo ≥ 500 Hz. Estos datos son adecuados para el aprendizaje preliminar pero no para el análisis de alta frecuencia.",
      fr: "Une taux d'échantillonnage de 128 Hz signifie que 128 points de données sont enregistrés par seconde. Selon le théorème de Nyquist, la fréquence maximale pouvant être enregistrée de manière fiable est de 64 Hz. Pour la recherche intéressée par Beta (13-30 Hz) et Gamma (30+ Hz), un taux d'échantillonnage ≥ 500 Hz est recommandé. Ces données sont adaptées à l'apprentissage préliminaire mais pas à l'analyse haute fréquence.",
      de: "Eine Abtastrate von 128 Hz bedeutet, dass 128 Datenpunkte pro Sekunde aufgezeichnet werden. Nach dem Nyquist-Theorem ist die höchste zuverlässig aufzeichnenbare Frequenz 64 Hz. Für Forschung, die an Beta (13-30 Hz) und Gamma (30+ Hz) interessiert ist, wird eine Abtastrate von ≥ 500 Hz empfohlen. Diese Daten eignen sich für das vorläufige Lernen, aber nicht für hochfrequente Analyse.",
      ja: "サンプリングレート128Hzは1秒間に128個のデータポイントが記録されることを意味します。ナイキストの定理によると、確実に記録可能な最高周波数は64Hzです。Beta（13-30Hz）とGamma（30+Hz）に興味がある研究の場合、サンプリングレート≥500Hzが推奨されます。このデータは初步学習に適していますが、高周波解析には適していません。",
      ko: "128Hz 샘플링 레이트는 초당 128개의 데이터 포인트가 기록됨을 의미합니다. 나이퀴스트 정리에 따르면, 가장 신뢰할 수 있게 기록 가능한 주파수는 64Hz입니다. Beta(13-30Hz)와 Gamma(30+Hz)에 관심이 있는 연구의 경우, 샘플링 레이트 ≥ 500Hz가 권장됩니다. 이 데이터는 예비 학습에는 적합하지만 고주파 분석에는 적합하지 않습니다。"
    },
    research_explanation: {
      zh: "128 Hz 采样率违反了对于高频神经活动（如 Gamma 振荡 30-100 Hz）的采样要求。FFT 频率分辨率受采样率限制，高频混叠可能发生。若研究涉及 ERP（事件相关电位）或高频振荡，此数据不适用。建议重新以 ≥ 500 Hz 采样率记录。",
      en: "128 Hz sampling rate violates sampling requirements for high-frequency neural activity (e.g., Gamma oscillations 30-100 Hz). FFT frequency resolution is limited by sampling rate, and high-frequency aliasing may occur. If the research involves ERPs (event-related potentials) or high-frequency oscillations, this data is not suitable. Re-recording at ≥ 500 Hz sampling rate is recommended.",
      es: "La tasa de muestreo de 128 Hz viola los requisitos de muestreo para la actividad neural de alta frecuencia (p. ej., oscilaciones Gamma 30-100 Hz). La resolución de frecuencia FFT está limitada por la tasa de muestreo, y el alias de alta frecuencia puede ocurrir. Si la investigación involucra ERPs (potenciales relacionados con eventos) u oscilaciones de alta frecuencia, estos datos no son adecuados. Se recomienda regrabar con una tasa de muestreo ≥ 500 Hz.",
      fr: "Le taux d'échantillonnage de 128 Hz viole les exigences d'échantillonnage pour l'activité neuronale haute fréquence (p. ex., oscillations Gamma 30-100 Hz). La résolution fréquentielle FFT est limitée par le taux d'échantillonnage, et l'aliasage haute fréquence peut se produire. Si la recherche implique des ERPs (potentials liés aux événements) ou des oscilations haute fréquence, ces données ne sont pas adaptées. Un nouvel enregistrement avec un taux d'échantillonnage ≥ 500 Hz est recommandé.",
      de: "Die Abtastrate von 128 Hz verstößt gegen die Abtastanforderungen für hochfrequente neuronale Aktivität (z. B. Gamma-Oszillationen 30-100 Hz). Die FFT-Frequenzauflösung ist durch die Abtastrate begrenzt, und hochfrequentes Aliasing kann auftreten. Wenn die Forschung ERPs (ereignisbezogene Potentiale) oder hochfrequente Oszillationen beinhaltet, sind diese Daten nicht geeignet. Eine Neuaufzeichnung mit einer Abtastrate von ≥ 500 Hz wird empfohlen.",
      ja: "128Hzサンプリングレートは高周波神経活動（例：Gamma振動30-100Hz）のサンプリング要件に違反します。FFT周波数分解能はサンプリングレートによって制限され、高周波エイリアシングが発生する可能性があります。研究がERP（事象関連電位）または高周波振動を含む場合、このデータは適していません。≥500Hzサンプリングレートでの再記録が推奨されます。",
      ko: "128Hz 샘플링 레이트는 고주파 신경 활동(예: Gamma 진동 30-100Hz)에 대한 샘플링 요구 사항을 위반합니다. FFT 주파수 해상도는 샘플링 레이트에 의해 제한되며, 고주파 앨리어싱이 발생할 수 있습니다. 연구가 ERP(사건 관련 전위) 또는 고주파 진동을 포함하는 경우, 이 데이터는 적합하지 않습니다. ≥500Hz 샘플링 레이트로 재기록이 권장됩니다。"
    },
    limitations: {
      zh: ["高频信息丢失", "不符合标准 EEG 研究采样率要求", "不适合 ERP 或高频分析"],
      en: ["High-frequency information loss", "Does not meet standard EEG research sampling rate requirements", "Not suitable for ERP or high-frequency analysis"],
      es: ["Pérdida de información de alta frecuencia", "No cumple con los requisitos de tasa de muestreo de investigación EEG estándar", "No es adecuado para ERP o análisis de alta frecuencia"],
      fr: ["Perte d'informations haute fréquence", "Ne respecte pas les exigences de taux d'échantillonnage de recherche EEG standard", "Pas adapté pour ERP ou analyse haute fréquence"],
      de: ["Verlust hochfrequenter Informationen", "Entspricht nicht den standard EEG-Forschungs-Abtastratenanforderungen", "Nicht geeignet für ERP oder hochfrequente Analyse"],
      ja: ["高周波情報の損失", "標準EEG研究サンプリングレート要件を満たしていません", "ERPまたは高周波解析に適していません"],
      ko: ["고주파 정보 손실", "표준 EEG 연구 샘플링 레이트 요구 사항을 충족하지 않습니다", "ERP 또는 고주파 분석에 적합하지 않습니다"]
    },
    what_this_data_cannot_tell: {
      zh: ["高频脑活动（Gamma 振荡）", "精确的 ERP 成分", "超过 64 Hz 的任何信号"],
      en: ["High-frequency brain activity (Gamma oscillations)", "Precise ERP components", "Any signal above 64 Hz"],
      es: ["Actividad cerebral de alta frecuencia (oscilaciones Gamma)", "Componentes precisos de ERP", "Cualquier señal por encima de 64 Hz"],
      fr: ["Activité cérébrale haute fréquence (oscilations Gamma)", "Composants précis d'ERP", "Tout signal au-dessus de 64 Hz"],
      de: ["Hochfrequente Hirnaktivität (Gamma-Oszillationen)", "Präzise ERP-Komponenten", "Jeglisches Signal über 64 Hz"],
      ja: ["高周波脳活動（Gamma振動）", "正確なERP成分", "64Hzを超える信号"],
      ko: ["고주파 뇌 활동(Gamma 진동)", "정확한 ERP 성분", "64Hz 이상의 신호"]
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
      es: "Estos datos EEG faltan multiples canales (solo 8 canales grabados, el estándar es 19-32). Puntuación de calidad de señal 50/100, cobertura espacial insuficiente.",
      fr: "Ces données EEG manquent de multiples canaux (seulement 8 canaux enregistrés, le standard est 19-32). Score de qualité du signal 50/100, couverture spatiale insuffisante.",
      de: "Diese EEG-Daten fehlen mehrere Kanäle (nur 8 Kanäle aufgezeichnet, Standard ist 19-32). Signalqualitäts-Score 50/100, unzureichende räumliche Abdeckung.",
      ja: "このEEGデータは複数のチャンネルが欠損しています（わずか8チャンネルのみ記録、標準は19-32）。信号品質スコア50/100、空間的カバレッジが不十分です。",
      ko: "이 EEG 데이터는 여러 채널이 누락되었습니다(기록된 채널은 8개뿐, 표준은 19-32개입니다). 신호 품질 점수 50/100, 공간 적용 범위가 불충분합니다。"
    },
    details: {
      zh: "此案例展示了通道缺失的问题：\n\n1. 标准 10-20 系统有 19 个通道，此数据仅 8 个\n2. 无法进行全面的空间分析（如源定位）\n3. 某些脑区（如颞叶）完全没有覆盖\n\n学习 EEG 时，理解电极放置和通道数量对解释的影响非常重要。",
      en: "This case demonstrates the problem of missing channels:\n\n1. Standard 10-20 system has 19 channels, this data has only 8\n2. Cannot perform comprehensive spatial analysis (e.g., source localization)\n3. Some brain regions (e.g., temporal lobes) are completely uncovered\n\nWhen learning EEG, understanding the impact of electrode placement and channel count on interpretation is very important.",
      es: "Este caso demuestra el problema de canales faltantes:\n\n1. El sistema estándar 10-20 tiene 19 canales, estos datos tienen solo 8\n2. No se puede realizar un análisis espacial comprensivo (p. ej., localización de fuente)\n3. Algunas regiones cerebrales (p. ej., lóbulos temporales) están completamente descubiertas\n\nAl aprender EEG, comprender el impacto de la colocación de electrodos y el recuento de canales en la interpretación es muy importante.",
      fr: "Ce cas démontre le problème des canaux manquants :\n\n1. Le système standard 10-20 a 19 canaux, ces données n'en ont que 8\n2. Impossible de réaliser une analyse spatiale complète (p. ex., localisation des sources)\n3. Certaines régions cérébrales (p. ex., lobes temporaux) sont complètement non couvertes\n\nEn apprenant l'EEG, comprendre l'impact du placement des électrodes et du nombre de canaux sur l'interprétation est très important.",
      de: "Dieser Fall zeigt das Problem fehlender Kanäle:\n\n1. Das Standard-10-20-System hat 19 Kanäle, diese Daten haben nur 8\n2. Kann keine umfassende räumliche Analyse durchführen (z. B. Quellenlokalisation)\n3. Einige Hirnregionen (z. B. Temporallappen) sind vollständig unbedeckt\n\nBeim Erlernen von EEG ist das Verständnis der Auswirkungen der Elektrodenplatzierung und der Kanalanzahl auf die Interpretation sehr wichtig.",
      ja: "この症例は欠損チャンネルの問題を示しています：\n\n1. 標準10-20システムは19チャンネルありますが、このデータはわずか8つです\n2. 包括的な空間解析（例：ソースローカリゼーション）を実行できません\n3. 一部の脳領域（例：側頭葉）は完全にカバーされていません\n\nEEGを学ぶ際、解釈に対する電極配置とチャンネル数の影響を理解することは非常に重要です。",
      ko: "이 사례는 누락된 채널의 문제를 보여줍니다:\n\n1. 표준 10-20 시스템은 19개 채널이 있지만, 이 데이터는 8개뿐입니다\n2. 포괄적인 공간 분석(예: 소스 로케lization)을 수행할 수 없습니다\n3. 일부 뇌 영역(예: 측두엽)은 완전히 커버되지 않았습니다\n\nEEG를 배울 때, 해석에 대한 전극 배치 및 채널 수의 영향을 이해하는 것은 매우 중요합니다。"
    },
    signal_quality: 50,
    learning_readability_score: 65,
    beginner_explanation: {
      zh: "这份 EEG 只记录了很少的通道（像只用几个麦克风录音乐会），很多脑区没有被记录到。就像拼图少了很多块，看不完整。",
      en: "This EEG only recorded a few channels (like using only a few microphones to record a concert), many brain areas are not recorded. It's like a jigsaw puzzle with many missing pieces, the picture is incomplete.",
      es: "Este EEG solo grabó unos pocos canales (como usar solo unos pocos micrófonos para grabar un concierto), muchas áreas cerebrales no están grabadas. Es como un puzle de rompecabezas con muchas piezas faltantes, la imagen está incompleta.",
      fr: "Cet EEG n'a enregistré que quelques canaux (comme utiliser seulement quelques micros pour enregistrer un concert), beaucoup de zones cérébrales ne sont pas enregistrées. C'est comme un puzle avec beaucoup de pièces manquantes, l'image est incomplète.",
      de: "Dieses EEG hat nur einige wenige Kanäle aufgezeichnet (wie nur einige wenige Mikrofone zu verwenden, um ein Konzert aufzunehmen), viele Hirnbereiche sind nicht aufgezeichnet. Es ist wie ein Puzle mit vielen fehlenden Teilen, das Bild ist unvollständig.",
      ja: "このEEGはわずか数チャンネルしか記録しませんでした（コンサートを録音するのに数個のマイクのみを使用するようなものです）、多くの脳領域は記録されていません。これは多くの欠片があるジグソーパズルをしたようなもので、絵は不完全です。",
      ko: "이 EEG는 몇 개의 채널만 기록했습니다 (콘서트를 녹음하는 데 몇 개의 마이크만 사용하는 것과 같습니다), 많은 뇌 영역이 기록되지 않았습니다. 이것은 많은 조각이 누락된 직소 퍼즐과 같으며, 그림은 불완전합니다。"
    },
    student_explanation: {
      zh: "标准 10-20 系统包含 19 个通道（扩展版可达 32 或更多）。此数据仅记录 8 个通道（可能是 Fp1、Fp2、F3、F4、C3、C4、O1、O2）。空间采样不足限制了拓扑分析和源定位的准确性。建议至少使用 19 通道记录。",
      en: "Standard 10-20 system includes 19 channels (extended versions can have 32 or more). This data only records 8 channels (possibly Fp1, Fp2, F3, F4, C3, C4, O1, O2). Insufficient spatial sampling limits the accuracy of topographic analysis and source localization. At least 19-channel recording is recommended.",
      es: "El sistema estándar 10-20 incluye 19 canales (versiones extendidas pueden tener 32 o más). Estos datos solo registran 8 canales (posiblemenete Fp1, Fp2, F3, F4, C3, C4, O1, O2). El muestreo espacial insuficiente limita la precisión del análisis topográfico y la localización de fuente. Se recomienda al menos una grabación de 19 canales.",
      fr: "Le système standard 10-20 inclut 19 canaux (des versions étendues peuvent avoir 32 ou plus). Ces données n'enregistrent que 8 canaux (possiblement Fp1, Fp2, F3, F4, C3, C4, O1, O2). L'échantillonnage spatial insuffisant limitte la précision de l'analyse topographique et de la localisation des sources. Au moins un enregistrement de 19 canaux est recommandé.",
      de: "Das Standard-10-20-System umfasst 19 Kanäle (erweiterte Versionen können 32 oder mehr haben). Diese Daten zeichnen nur 8 Kanäle auf (möglicherweise Fp1, Fp2, F3, F4, C3, C4, O1, O2). Unzureichende räumliche Abtastung begrenzt die Genauigkeit der topographischen Analyse und der Quellenlokalisation. Eine Aufzeichnung mit mindestens 19 Kanälen wird empfohlen.",
      ja: "標準10-20システムは19チャンネルを含みます（拡張版は32以上になる可能性があります）。このデータはわずか8チャンネルを記録します（おそらくFp1、Fp2、F3、F4、C3、C4、O1、O2）。不十分な空間サンプリングはトポグラフィック解析とソースローカリゼーションの精度を制限します。少なくとも19チャンネルの記録が推奨されます。",
      ko: "표준 10-20 시스템은 19개 채널을 포함합니다(확장 버전은 32개 이상일 수 있습니다). 이 데이터는 겨우 8개 채널만 기록합니다(아마도 Fp1, Fp2, F3, F4, C3, C4, O1, O2). 불충분한 공간 샘플링은 지형 분석 및 소스 현지화의 정확도를 제한합니다. 적어도 19채널 기록이 권장됩니다."
    },
    research_explanation: {
      zh: "8 通道记录不符合 10-20 标准，空间欠采样导致无法进行可靠的皮层源定位。缺少颞叶（T3、T4、T5、T6）和中央-顶叶通道限制了全脑分析。若研究需要空间信息（如 connectivity 分析），此数据不适用。建议使用高密度 EEG（64+ 通道）或至少标准 19 通道。",
      en: "8-channel recording does not meet 10-20 standards, and spatial undersampling makes reliable cortical source localization impossible. Missing temporal (T3, T4, T5, T6) and central-parietal channels limits whole-brain analysis. If the research requires spatial information (e.g., connectivity analysis), this data is not suitable. High-density EEG (64+ channels) or at least standard 19 channels is recommended.",
      es: "La grabación de 8 canales no cumple con los estándares 10-20, y el submuestreo espacial hace imposible la localización de fuente cortical confiable. La falta de canales temporales (T3, T4, T5, T6) y centrales-parietales limita el análisis de todo el cerebro. Si la investigación requiere información espacial (p. ej., análisis de conectividad), estos datos no son adecuados. Se recomienda EEG de alta densidad (64+ canales) o al menos 19 canales estándar.",
      fr: "L'enregistrement de 8 canaux ne respecte pas les standards 10-20, et la sous-échantillonnage spatial rend impossible une localisation de source corticale fiable. L'absence de canaux temporaux (T3, T4, T5, T6) et centraux-pariétaux limitte l'analyse de tout le cerveau. Si la recherche nécessite des informations spatiales (p. ex., analyse de connectivité), ces données ne sont pas adaptées. Un EEG de haute densité (64+ canaux) ou au moins 19 canaux standards est recommandé.",
      de: "Die 8-Kanal-Aufnahme entspricht nicht den 10-20-Standards, und räumliche Unterabtastung macht eine zuverlässige kortikale Quellenlokalisation unmöglich. Fehlende temporale (T3, T4, T5, T6) und zentral-parietale Kanäle begrenzen die Ganzhirn-Analyse. Wenn die Forschung räumliche Informationen erfordert (z. B. Konnektivitätsanalyse), sind diese Daten nicht geeignet. Hochdichte-EEG (64+ Kanäle) oder mindestens 19 Standardkanäle werden empfohlen.",
      ja: "8チャンネル記録は10-20標準を満たしておらず、空間的アンダーサンプリングにより信頼できる皮質ソースローカリゼーションが不可能です。側頭（T3、T4、T5、T6）と中心-頭頂チャンネルの欠損は全脳分析を制限します。研究が空間情報を必要とする場合（例：コネクティビティ解析）、このデータは適していません。高密度EEG（64+チャンネル）または少なくとも標準19チャンネルが推奨されます。",
      ko: "8채널 기록은 10-20 표준을 충족하지 않으며, 공간적 언더샘플링으로 인해 신뢰할 수 있는 피질 소스 로케라이ゼ이션이 불가능합니다. 측두(T3, T4, T5, T6) 및 중심-두정 채널 부재는 전체 뇌 분석을 제한합니다. 연구가 공간 정보를 필요로 하는 경우(예: 연결성 분석), 이 데이터는 적합하지 않습니다. 고밀도 EEG(64+ 채널) 또는 적어도 표준 19 채널이 권장됩니다。"
    },
    limitations: {
      zh: ["空间覆盖严重不足", "无法进行源定位或 connectivity 分析", "不符合 10-20 标准"],
      en: ["Severely insufficient spatial coverage", "Cannot perform source localization or connectivity analysis", "Does not meet 10-20 standards"],
      es: ["Cobertura espacial severamente insuficiente", "No se puede realizar localización de fuente o análisis de conectividad", "No cumple con los estándares 10-20"],
      fr: ["Couverture spatiale sévèrement insuffisante", "Impossible de réaliser une localisation de source ou une analyse de connectivité", "Ne respecte pas les standards 10-20"],
      de: ["Schwerwiegend unzureichende räumliche Abdeckung", "Kann keine Quellenlokalisation oder Konnektivitätsanalyse durchführen", "Entspricht nicht den 10-20-Standards"],
      ja: ["空間的カバレッジが深刻に不十分です", "ソースローカリゼーションまたはコネクティビティ解析を実行できません", "10-20標準を満たしていません"],
      ko: ["공간 적용 범위가 심각하게 불충분합니다", "소스 로케라이제이션 또는 연결성 분석을 수행할 수 없습니다", "10-20 표준을 충족하지 않습니다"]
    },
    what_this_data_cannot_tell: {
      zh: ["全脑活动模式", "精确的皮层源位置", "通道间的功能连接"],
      en: ["Whole-brain activity patterns", "Precise cortical source locations", "Functional connectivity between channels"],
      es: ["Patrones de actividad de todo el cerebro", "Ubicaciones precisas de fuente cortical", "Conectividad funcional entre canales"],
      fr: ["Modèles d'activité de tout le cerveau", "Emplacements précis de source corticale", "Connectivité fonctionnelle entre canaux"],
      de: ["Ganzhirn-Aktivitätsmuster", "Präzise kortikale Quellenorte", "Funktionelle Konnektivität zwischen Kanälen"],
      ja: ["全脳活動パターン", "正確な皮質ソース位置", "チャンネル間の機能的接続性"],
      ko: ["전체 뇌 활동 패턴", "정확한 피질 소스 위치", "채널 간의 기능적 연결성"]
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
      es: "Estos datos EEG muestran actividad de ondas Alfa muy fuerte (área occipital amplitud > 80 μV). Puntuación de calidad de señal 85/100, típico de EEG de estado relajado.",
      fr: "Ces données EEG montrent une activité d'ondes Alpha très forte (zone occipitale amplitude > 80 μV). Score de qualité du signal 85/100, typique d'un EEG d'état relaxé.",
      de: "Diese EEG-Daten zeigen sehr starke Alpha-Wellen-Aktivität (okzipitaler Bereich Amplitude > 80 μV). Signalqualitäts-Score 85/100, typisch für entspannten Zustands-EEG.",
      ja: "このEEGデータは非常に強いアルファ波活動（後頭葉領域振幅 > 80μV）を示しています。信号品質スコア85/100、典型的なリラックス状態EEGです。",
      ko: "이 EEG 데이터는 매우 강한 알파 파 활동(후두엽 영역 진폭 > 80μV)을 보여줍니다. 신호 품질 점수 85/100, 전형적인 이완 상태 EEG입니다。"
    },
    details: {
      zh: "此案例展示了典型的 Alpha 节律：\n\n1. Alpha 波（8-13 Hz）在闭眼放松状态下最为明显\n2. 一旦睁眼或注意外部刺激，Alpha 波会减弱（Alpha 阻断）\n3. Alpha 振幅和分布可以反映放松程度和注意力状态\n\n这是学习 EEG 基础节律的最佳案例之一。",
      en: "This case demonstrates typical Alpha rhythm:\n\n1. Alpha waves (8-13 Hz) are most prominent during eyes-closed relaxed state\n2. Upon opening eyes or attending to external stimuli, Alpha waves diminish (Alpha blocking)\n3. Alpha amplitude and distribution can reflect relaxation level and attention state\n\nThis is one of the best cases for learning basic EEG rhythms.",
      es: "Este caso demuestra el ritmo Alfa típico:\n\n1. Las ondas Alfa (8-13 Hz) son más promimentes durante el estado relajado de ojos cerrados\n2. Al abrir los ojos o prestar atención a estímulos externos, las ondas Alfa disminuyen (bloqueo Alfa)\n3. La amplitud y distribución Alfa pueden reflejar el nivel de relajación y el estado de atención\n\nEste es uno de los mejores casos para aprender los ritmos básicos de EEG.",
      fr: "Ce cas démontre le rythme Alpha typique :\n\n1. Les ondes Alpha (8-13 Hz) sont les plus promientes pendant l'état relaxé les yeux fermés\n2. En ouvrant les yeux ou en préstant attention à des stimulis externes, les ondes Alpha diminuent (bloquage Alpha)\n3. L'amplitude et la distribution Alpha peuvent réfléchir le nivel de relaxation et l'état d'attention\n\nC'est l'un des meilleurs cas pour apprendre les rythmes EEG de base.",
      de: "Dieser Fall zeigt den typischen Alpha-Rhythmus:\n\n1. Alpha-Wellen (8-13 Hz) sind am promientesten während des entspannten Zustands mit geschlossenen Augen\n2. Beim Öffnen der Augen oder bei Aufmerksamkeit auf externe Stimuli verringern sich die Alpha-Wellen (Alpha-Blockade)\n3. Alpha-Amplitude und -Verteilung können das Entspannungsniveau und den Aufmerksamkeitszustand reflektieren\n\nDies ist einer der besten Fälle zum Erlernen der grundlegenen EEG-Rhythmen.",
      ja: "この症例は典型的なアルファリズムを示しています：\n\n1. アルファ波（8-13Hz）は閉眼リラックス状態で最も顕著です\n2. 開眼または外部刺激に注意を向けると、アルファ波は減少します（アルファ遮断）\n3. アルファ振幅と分布はリラックスレベルと注意力状態を反映できます\n\nこれはEEGの基礎リズムを学ぶための最良の症例の一つです。",
      ko: "이 사례는 전형적인 알파 리듬을 보여줍니다:\n\n1. 알파 파(8-13Hz)는 안검 폐쇄 이완 상태에서 가장 두드러집니다\n2. 눈을 뜨거나 외부 자극에 주의를 기울이면 알파 파는 감소합니다(알파 차단)\n3. 알파 진폭과 분포는 이완 수준과 주의력 상태를 반영할 수 있습니다\n\n이것은 기본 EEG 리듬을 배우기 위한 최고의 사례 중 하나입니다。"
    },
    signal_quality: 85,
    learning_readability_score: 90,
    beginner_explanation: {
      zh: "这份 EEG 显示很强的 Alpha 波，就像大脑在'休息模式'。当你闭眼放松时，后脑会发出这种规律的波。如果睁眼或开始思考，这种波就会消失。",
      en: "This EEG shows strong Alpha waves, like the brain is in 'rest mode.' When you close your eyes and relax, the back of the brain emits this regular wave. If you open your eyes or start thinking, this wave disappears.",
      es: "Este EEG muestra ondas Alfa fuertes, como si el cerebro estuviera en 'modo de descanso'. Cuando cierras los ojos y te relajas, la parte posterior del cerebro emite esta onda regu lar. Si abres los ojos o comienzas a pensar, esta onda desaparece.",
      fr: "Cet EEG montre des ondes Alpha fortes, comme si le cerveau était en 'mode repos'. Quand vous fermez les yeux et vous détendez, l'arrière du cerveau émet cette onde régulière. Si vous ouvrez les yeux ou commencez à penser, cette onde disparaît.",
      de: "Dieses EEG zeigt starke Alpha-Wellen, wie wenn das Gehirn im 'Ruhemodus' wäre. Wenn Sie die Augen schließen und sich entspannen, sendet der hintere Teil des Gehirns diese regelmäßige Wel e. Wenn Sie die Augen öffnen oder anfangen zu denken, verschwindet diese Wel e.",
      ja: "このEEGは強いアルファ波を示しており、まるで脳が「休息モード」にあるようです。目を閉じてリラックスすると、脳の後部がこの規則的な波を発します。目を開けたり思考を始めたりすると、この波は消えます。",
      ko: "이 EEG는 강한 알파 파를 보여주며, 마치 뇌가 '휴식 모드'에 있는 것 같습니다. 눈을 감고 이완하면, 뇌의 후부가 이 규칙적인 파를 방출합니다. 눈을 뜨거나 사고를 시작하면, 이 파는 사라집니다。"
    },
    student_explanation: {
      zh: "Alpha 节律（8-13 Hz）是成人静息态 EEG 最突出的特征。枕叶区域（O1、O2）振幅通常 50-100 μV。Alpha 阻断是指视觉输入或认知任务导致 Alpha 功率下降。此案例适合学习基本的 EEG 节律和状态变化。",
      en: "Alpha rhythm (8-13 Hz) is the most prominent feature of adult resting-state EEG. Occipital areas (O1, O2) typically have amplitude 50-100 μV. Alpha blocking refers to the reduction of Alpha power due to visual input or cognitive tasks. This case is suitable for learning basic EEG rhythms and state changes.",
      es: "El ritmo Alfa (8-13 Hz) es la característica más prominente del EEG de estado de reposo en adultos. Las áreas occipitales (O1, O2) tienen típicamente una amplitud de 50-100 μV. El bloqueo Alfa se refiere a la reducción de la potencia Alfa debido a la entrada visual o tareas cognitivas. Este caso es adecuado para aprender los ritmos básicos de EEG y los cambios de estado.",
      fr: "Le rythme Alpha (8-13 Hz) est la caractéristique la plus prominente de l'EEG d'état de repos chez l'adulte. Les zones occipitales (O1, O2) ont typiquement une amplitude de 50-100 μV. Le bloquage Alpha se réfère à la réduction de la puissance Alpha due à l'entrée visuelle ou aux tâches cognitives. Ce cas est adapté pour apprendre les rythmes EEG de base et les changements d'état.",
      de: "Der Alpha-Rhythmus (8-13 Hz) ist das prominenteste Merkmal des ruhenden EEG bei Erwachsenen. Okzipitale Bereiche (O1, O2) haben typischerweise eine Amplitude von 50-100 μV. Alpha-Blockade bezieht sich auf die Reduktion der Alpha-Leistung aufgrund visueller Eingabe oder kognitiver Aufgaben. Dieser Fall ist geeignet zum Erlernen grundlegeneder EEG-Rhythmen und Zustandsänderungen.",
      ja: "アルファ・リズム（8-13Hz）は成人安静状態EEGの最も顕著な特徴です。後頭葉領域（O1、O2）は典型的に50-100μVの振幅を持ちます。アルファ遮断は、視覚入力または認知課題によるアルファパワーの減少を指します。この症例は、基本的なEEGリズムと状態変化を学ぶのに適しています。",
      ko: "알파 리듬(8-13Hz)은 성인 안정 상태 EEG의 가장 두드러진 특징입니다. 후두엽 영역(O1, O2)은 일반적으로 50-100μV의 진폭을 가집니다. 알파 차단은 시각 입력 또는 인지 과제로 인한 알파 전력 감소를 의미합니다. 이 사례는 기본 EEG 리듬과 상태 변화를 배우는 데 적합합니다。"
    },
    research_explanation: {
      zh: "PSD 分析显示枕叶区域 Alpha peak 在 10 Hz，功率谱密度 ~15 μV²/Hz。Alpha/Theta 比值约为 2.5。根据文献，强 Alpha 活动与放松状态、降低的焦虑水平、以及良好的认知储备相关。此数据适合用于研究个体差异和状态依赖性变化。",
      en: "PSD analysis shows Alpha peak at 10 Hz in occipital areas, power spectral density ~15 μV²/Hz. Alpha/Theta ratio is approximately 2.5. According to literature, strong Alpha activity is associated with relaxed state, reduced anxiety levels, and good cognitive reserve. This data is suitable for studying individual differences and state-dependent changes.",
      es: "El análisis PSD muestra el pico Alfa a 10 Hz en áreas occipitales, densidad espectral de potencia ~15 μV²/Hz. La relación Alfa/Theta es aproximadamente 2,5. Según la literatura, la fuerte actividad Alfa está asociada con el estado relajado, niveles reducidos de ansiedad y buena reserva cognitiva. Estos datos son adecuados para estudiar diferencias individuales y cambios dependientes del estado.",
      fr: "L'analyse PSD montre le pic Alpha à 10 Hz dans les zones occipitales, densité spectrale de puissance ~15 μV²/Hz. Le rapport Alpha/Theta est approximativement de 2,5. Selon la littérature, la forte activité Alpha est associée à l'état relaxé, aux niveaux réduits d'anxiété et à une bonne réserve cognitive. Ces données sont adaptées pour étudier les différences individuelles et les changements dépendants de l'état.",
      de: "Die PSD-Analyse zeigt den Alpha-Peak bei 10 Hz in okzipitalen Bereichen, Leistungsdichte ~15 μV²/Hz. Das Alpha/Theta-Verhältnis beträgt ungefähr 2,5. Laut Literatur ist starke Alpha-Aktivität mit entspanntem Zustand, reduzierten Angstniveaus und guter kognitiver Reserve assoziiert. Diese Daten eignen sich zum Studium von individuellen Unterschieden und zustandsabhängigen Änderungen.",
      ja: "PSD分析は後頭葉領域でAlphaピークが10Hz、電力スペクトル密度〜15μV²/Hzであることを示しています。Alpha/Theta比は約2.5です。文献によると、強いAlpha活動はリラックス状態、低下した不安レベル、および良好な認知予備と関連しています。このデータは個人の差異と状態依存性変化を研究するのに適しています。",
      ko: "PSD 분석은 후두엽 영역에서 Alpha 피크가 10Hz, 전력 스펙트럼 밀도 ~15μV²/Hz임을 보여줍니다. Alpha/Theta 비율은 약 2.5입니다. 문헌에 따르면, 강한 Alpha 활동은 이완 상태, 낮아진 불안 수준,以及良好的认知储备相关。此数据适合用于研究个体差异和状态依赖性变化。"
    },
    limitations: {
      zh: ["仅静息态记录，无任务条件对比", "未记录同时的行为数据（如 Alpha 阻断测试）", "个体差异未考虑（如 Alpha 优势个体差异）"],
      en: ["Only resting-state recording, no task condition comparison", "No concurrent behavioral data (e.g., Alpha blocking test)", "Individual differences not considered (e.g., individual differences in Alpha dominance)"],
      es: ["Solo grabación de estado de reposo, sin comparación de condiciones de tarea", "No se registraron datos conductuales simultáneos (p. ej., prueba de bloqueo Alfa)", "Diferencias individuales no consideradas (p. ej., diferencias individuales en dominancia Alfa)"],
      fr: ["Seulment enregistrement d'état de repos, sans comparaison de conditions de tâche", "Aucune donnée compportementale concurrente enregistrée (p. ex., test de bloquage Alpha)", "Différences individuelles non considérées (p. ex., différences individuelles dans la dominance Alpha)"],
      de: ["Nur Aufnahme des Ruhezustands, kein Vergleich von Aufgabenbedingungen", "Keine gleichzeitigen Verhaltensdaten aufgezeichnet (z. B. Alpha-Blockade-Test)", "Individuelle Unterschiede nicht berücksichtigt (z. B. individuelle Unterschiede in Alpha-Dominanz)"],
      ja: ["安静状態の記録のみ、課題条件比較なし", "同時の行動データは記録されていません（例：Alpha遮断テスト）", "個人差は考慮されていません（例：Alpha優勢の個人差）"],
      ko: ["오직 안정 상태 기록, 과제 조건 비교 없음", "동시 행동 데이터 기록 안 됨(예: Alpha 차단 테스트)", "개인차 고려 안 됨(예: Alpha 우세 개인차)"]
    },
    what_this_data_cannot_tell: {
      zh: ["智商或认知能力", "情绪状态的具体细节", "是否患有神经系统疾病"],
      en: ["IQ or cognitive ability", "Specific details of emotional state", "Whether the person has a neurological disease"],
      es: ["CI o capacidad cognitiva", "Detalles específicos del estado emocional", "Si la persona tiene una enfermedad neurológica"],
      fr: ["QI ou capacité cognitive", "Détails spécifiques de l'état émotionnel", "Si la personne a une maladie neurologique"],
      de: ["IQ oder kognitive Fähigkeit", "Spezifische Details des emotionalen Zustands", "Ob die Person eine neurologische Krankheit hat"],
      ja: ["IQまたは認知能力", "情緒状態の具体的詳細", "神経系疾患を持っているかどうか"],
      ko: ["IQ 또는 인지 능력", "감정 상태의 구체적 세부사항", "신경계 질환을 앓고 있는지 여부"]
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
      es: "Estos datos EEG contienen múltiples ruidos complejos (EMG, EOG, línea de potencia, electrodes sueltos). La puntuación de calidad de señal es de solo 30/100, un caso desafiante para el procesamiento de ruido.",
      fr: "Ces données EEG contiennent plusieurs bruits complexes (EMG, EOG, réseau électrique, électrodes lâches). Le score de qualité du signal n'est que de 30/100, un cas diffcile pour le traitement du bruit.",
      de: "Diese EEG-Daten enthalten mehrere komplexe Rauscharten (EMG, EOG, Stromnetz, lose Elektroden). Die Signalqualitäts-Bewertung beträgt nur 30/100, ein herausfordernder Fall für die Rauschverarbeitung.",
      ja: "このEEGデータは複数の複雑なノイズ（EMG、EOG、電力線、緩い電極）を含みます。信号品質スコアはわずか30/100で、ノイズ処理の挑戦的な症例です。",
      ko: "이 EEG 데이터는 여러 복잡한 노이즈(EMG, EOG, 전력선, 헐거운 전극)을 포함합니다. 신호 품질 점수는 겨우 30/100으로, 노이즈 처리의 도젼적인 사례입니다。"
    },
    details: {
      zh: "此案例展示了真实世界中最具挑战性的 EEG 数据：\n\n1. 多种伪影同时出现（肌电 + 眼电 + 工频噪声）\n2. 某些通道完全不可用（信号质量评分 < 20）\n3. 需要高级预处理（ICA、带阻滤波、分段）才能提取有效信息\n\n这是学习 EEG 预处理流程的高级案例。",
      en: "This case demonstrates the most challenging EEG data in real-world settings:\n\n1. Multiple artifacts appear simultaneously (EMG + EOG + power line noise)\n2. Some channels are completely unusable (signal quality score < 20)\n3. Advanced preprocessing (ICA, notch filtering, segmentation) is needed to extract valid information\n\nThis is an advanced case for learning EEG preprocessing workflows.",
      es: "Este caso demuestra los datos EEG más desafiantes en configuraciones del mundo real:\n\n1. Múltiples artefactos aparecen simultáneamente (EMG + EOG + ruido de línea de potencia)\n2. Algunos canales están completamente inutilizables (puntuación de calidad de señal < 20)\n3. Preprocesamiento avanzado (ICA, filtrado de muesca, segmentación) es necesario para extraer información válida\n\nEste es un caso avanzado para aprender los flujos de trabajo de preprocesamiento de EEG.",
      fr: "Ce cas démontre les données EEG les plus difficiles dans des paramétrages du monde réel :\n\n1. Plusieurs artefacts apparaissent simultanément (EMG + EOG + bruit de réseau électrique)\n2. Certains canaux sont complètement inutilisables (score de qualité du signal < 20)\n3. Un prétraitement avancé (ICA, filtrage de muesca, segmentation) est nécessaire pour extraire des informations valides\n\nC'est un cas avancé pour apprendre les flux de travail de prétraitement EEG.",
      de: "Dieser Fall zeigt die herausforderndsten EEG-Daten in Einstellungen der realen Welt:\n\n1. Mehrere Artefakte erscheinen gleichzeitig (EMG + EOG + Netzbrummen)\n2. Einige Kanäle sind vollständig unbrauchbar (Signalqualitäts-Score < 20)\n3. Fortgeschrittene Vorverarbeitung (ICA, Kerbfilterung, Segmentierung) ist erforderlich, um gültige Informationen zu extrahieren\n\nDies ist ein fortgeschrittener Fall zum Erlernen von EEG-Vorverarbeitungs-Workflows.",
      ja: "この症例は実世界の設定で最も挑戦的なEEGデータを示しています：\n\n1. 複数のアーチファクトが同時に現れます（EMG + EOG + 電力線ノイズ）\n2. 一部のチャンネルは完全に使用不可能です（信号品質スコア < 20）\n3. 有効な情報を抽出するには高度な前処理（ICA、ノッチフィルタリング、セグメンテーション）が必要です\n\nこれはEEG前処理ワークフローを学ぶための高度な症例です。",
      ko: "이 사례는 실제 세계 설정에서 가장 도젼적인 EEG 데이터를 보여줍니다:\n\n1. 여러 아티팩트가 동시에 나타납니다 (EMG + EOG + 전력선 노이즈)\n2. 일부 채널은 완전히 사용 불가능합니다 (신호 품질 점수 < 20)\n3. 유효한 정보를 추출하려면 고급 전처리 (ICA, 노치 필터링, 세그먼테이션) 이 필요합니다\n\n이는 EEG 전처리 워크플로우를 배우기 위한 고급 사례입니다。"
    },
    signal_quality: 30,
    learning_readability_score: 40,
    beginner_explanation: {
      zh: "这份 EEG 噪声非常多，就像在嘈杂的餐厅里试图听清一个人的说话。很多通道的信号完全不可用，需要专业人士进行大量清理工作。",
      en: "This EEG has a lot of noise, like trying to hear one person speak in a noisy restaurant. Many channels have completely unusable signals, requiring professionals to do a lot of cleaning work.",
      es: "Este EEG tiene mucho ruido, como tratar de escuchar a una persona hablar en un restaurante ruidoso. Muchos canales tienen señales completamente inutilizables, requiriendo profesionales para hacer mucho trabajo de limpieza.",
      fr: "Cet EEG a beaucoup de bruit, comme essayer d'entendre une personne parler dans un restaurant bruyant. Beaucoup de canaux ont des signaux complètement inutilisables, nécessitant des professionels pour faire beaucoup de travail de nettoyage.",
      de: "Dieses EEG hat viel Rauschen, wie zu versuchen, eine Person in einem lauten Restaurant sprechen zu hören. Viele Kanäle haben vollständig unbrauchbare Signale, was professionelle braucht, um viel Reinigungsarbeit zu leisten.",
      ja: "このEEGはノイズがたくさんあります、うるさいレストランで一人が話すのを聞こうとするようです。多くのチャンネルは完全に使用不能な信号で、専門家がたくさんの清掃作業を行う必要があります。",
      ko: "이 EEG는 노이즈가 많습니다, 시끄러운 식당에서 한 사람이 말하는 것을 듣으려는 것과 같습니다. 많은 채널은 완전히 사용 불가능한 신호를 가지고 있으며, 전문가가 많은 청소 작업을 수행할 필요가 있습니다。"
    },
    student_explanation: {
      zh: "该 EEG 记录包含多种伪影的叠加：前额区域有眼电伪影（EOG），颞叶和中央区域有肌电伪影（EMG），且存在 50 Hz 工频噪声。多个通道（如 FP1、F7、T3）信号质量 < 20。建议的预处理流程：1) 检查并拒绝坏通道；2) 使用 ICA 去除眼电和肌电伪影；3) 应用 notch filter 去除工频噪声；4) 分段并基线校正。",
      en: "The EEG recording contains a superposition of multiple artifacts: EOG artifacts in frontal areas, EMG artifacts in temporal and central areas, and 50 Hz power line noise. Multiple channels (e.g., FP1, F7, T3) have signal quality < 20. Recommended preprocessing pipeline: 1) Identify and reject bad channels; 2) Use ICA to remove EOG and EMG artifacts; 3) Apply notch filter to remove power line noise; 4) Segment and baseline correct.",
      es: "El registro EEG contiene una superposición de múltiples artefactos: artefactos EOG en áreas frontales, artefactos EMG en áreas temporales y centrales, y ruido de línea de 50 Hz. Múltiples canales (p. ej., FP1, F7, T3) tienen calidad de señal < 20. Flujo de preprocesamiento recomendado: 1) Identificar y rechazar canales malos; 2) Usar ICA para eliminar artefactos EOG y EMG; 3) Aplicar filtro notch para eliminar ruido de línea; 4) Segmentar y corregir baseline.",
      fr: "L'enregistrement EEG contient une superposition de multiples artefacts : artefacts EOG dans les zones frontales, artefacts EMG dans les zones temporales et centrales, et bruit de réseau de 50 Hz. Plusieurs canaux (p. ex., FP1, F7, T3) ont une qualité de signal < 20. Pipeline de prétraitement recommandé : 1) Identifier et rejeter les mauvais canaux ; 2) Utiliser ICA pour supprimer les artefacts EOG et EMG ; 3) Appliquer un filtre notch pour supprimer le bruit de réseau ; 4) Segmenter et corriger la baseline.",
      de: "Das EEG-Recording enthält eine Überlagerung mehrerer Artefakte: EOG-Artefakte in frontalen Bereichen, EMG-Artefakte in temporalen und zentralen Bereichen sowie 50 Hz Netzbrummen. Mehrere Kanäle (z. B. FP1, F7, T3) haben Signalqualität < 20. Empfohlene Preprocessing-Pipeline: 1) Identifizieren und ablehnen schlechter Kanäle; 2) ICA verwenden, um EOG- und EMG-Artefakte zu entfernen; 3) Notch-Filter anwenden, um Netzbrummen zu entfernen; 4) Segmentieren und Baseline korrigieren.",
      ja: "このEEG記録は複数のアーティファクトの重ね合わせを含みます：前頭領域にEOGアーティファクト、側頭および中心領域にEMGアーティファクト、そして50 Hz電力線ノイズがあります。複数のチャンネル（例：FP1、F7、T3）は信号品質 < 20です。推奨される前処理パイプライン：1）不良チャンネルを特定して拒否；2）ICAを使用してEOGおよびEMGアーティファクトを除去；3）ノッチフィルタを適用して電力線ノイズを除去；4）セグメント化とベースライン補正。",
      ko: "이 EEG 기록은 여러 아티팩트의 중첩을 포함합니다: 전두 영역에 EOG 아티팩트, 측두 및 중앙 영역에 EMG 아티팩트, 그리고 50 Hz 전력선 노이즈가 있습니다. 여러 채널(FP1, F7, T3 등)은 신호 품질 < 20입니다. 권장 전처리 파이프라인: 1) 불량 채널 식별 및 거부; 2) ICA를 사용하여 EOG 및 EMG 아티팩트 제거; 3) 노치 필터 적용하여 전력선 노이즈 제거; 4) 세그먼트화 및 베이스라인 보정.",
    },
    research_explanation: {
      zh: "此数据的 SNR 极低（多个通道 < 1 dB）。ICA 分解显示 3-4 个明显的伪影成分（眼电、肌电、工频、心跳）。建议：1) 使用 ADJUST 或 MARA 算法自动识别伪影成分；2) 考虑使用 EEGLAB 的 `clean_rawdata` 插件；3) 如果超过 30% 的通道损坏，建议重新记录。对于研究用途，此数据仅适合作为伪影处理教学案例，不应直接用于分析。",
      en: "The SNR of this data is extremely low (multiple channels < 1 dB). ICA decomposition shows 3-4 distinct artifact components (EOG, EMG, power line, heartbeat). Recommendations: 1) Use ADJUST or MARA algorithm to automatically identify artifact components; 2) Consider using EEGLAB's `clean_rawdata` plugin; 3) If more than 30% of channels are corrupted, re-recording is recommended. For research purposes, this data is only suitable as a teaching case for artifact processing, not for direct analysis.",
      es: "La SNR de estos datos es extremadamente baja (múltiples canales < 1 dB). La descomposición ICA muestra 3-4 componentes de artefactos distintos (EOG, EMG, línea de potencia, latido cardíaco). Recomendaciones: 1) Usar el algoritmo ADJUST o MARA para identificar automáticamente componentes de artefactos; 2) Considerar usar el plugin `clean_rawdata` de EEGLAB; 3) Si más del 30% de los canales están corrompidos, se recomienda regrabar. Para propósitos de investigación, estos datos solo son adecuados como caso de enseñanza para procesamiento de artefactos, no para análisis directo.",
      fr: "Le SNR de ces données est extrêmement faible (plusieurs canaux < 1 dB). La décomposition ICA montre 3 à 4 composants d'artefacts distincts (EOG, EMG, réseau électrique, battement de cœur). Recommandations : 1) Utiliser l'algorithme ADJUST ou MARA pour identifier automatiquement les composants d'artefacts ; 2) Envisager d'utiliser le plugin `clean_rawdata` d'EEGLAB ; 3) Si plus de 30 % des canaux sont corrompus, un nouvel enregistrement est recommandé. À des fins de recherche, ces données ne conviennent que comme cas d'enseignement pour le traitement des artefacts, pas pour une analyse directe.",
      de: "Die SNR dieser Daten ist extrem niedrig (mehrere Kanäle < 1 dB). Die ICA-Zerlegung zeigt 3-4 deutliche Artefakt-Komponenten (EOG, EMG, Stromnetz, Herzschlag). Empfehlungen: 1) ADJUST- oder MARA-Algorithmus verwenden, um Artefakt-Komponenten automatisch zu identifizieren; 2) Das `clean_rawdata`-Plugin von EEGLAB in Betracht ziehen; 3) Wenn mehr als 30 % der Kanäle beschädigt sind, wird eine Neuregistrierung empfohlen. Für Forschungszwecke eignen sich diese Daten nur als Lehrfall für Artefakt-Verarbeitung, nicht für direkte Analyse.",
      ja: "このデータのSNRは極めて低いです（複数チャンネル < 1 dB）。ICA分解は3〜4つの明確なアーティファクト成分（EOG、EMG、電力線、心拍）を示します。推奨：1）ADJUSTまたはMARAアルゴリズムを使用してアーティファクト成分を自動識別；2）EEGLABの `clean_rawdata` プラグインの使用を検討；3）30％以上のチャンネルが破損している場合、再記録が推奨されます。研究目的では、このデータはアーティファクト処理の教育事例としてのみ適しており、直接分析には適していません。",
      ko: "이 데이터의 SNR은 극히 낮습니다 (여러 채널 < 1 dB). ICA 분해는 3-4개의 뚜렷한 아티팩트 성분(EOG, EMG, 전력선, 심박)을 보여줍니다. 권장 사항: 1) ADJUST 또는 MARA 알고리즘을 사용하여 아티팩트 성분을 자동 식별; 2) EEGLAB의 `clean_rawdata` 플러그인 사용 고려; 3) 30% 이상의 채널이 손상된 경우 재기록이 권장됩니다. 연구 목적으로는, 이 데이터는 아티팩트 처리 교육 사례로만 적합하며, 직접 분석에는 적합하지 않습니다.",
    },
    limitations: {
      zh: ["多种伪影叠加，分离困难", "超过 30% 的通道可能不可用", "预处理可能引入额外误差"],
      en: ["Multiple overlapping artifacts, difficult to separate", "Over 30% of channels may be unusable", "Preprocessing may introduce additional errors"],
      es: ["Múltiples artefactos superpuestos, difícil de separar", "Más del 30% de los canales pueden estar inutilizables", "El preprocesamiento puede introducir errores adicionales"],
      fr: ["Plusieurs artefacts superposés, difícile à séparer", "Plus de 30 % des canaux peuvent être inutilisables", "Le prétraitement peut introduire des erreurs supplémentaires"],
      de: ["Mehrere überlagernde Artefakte, schwer zu trennen", "Über 30 % der Kanäle können unbrauchbar sein", "Vorverarbeitung kann zusätzliche Fehler einführen"],
      ja: ["複数の重ね合わせアーティファクト、分離が困難", "30％以上のチャンネルが使用不可能な可能性", "前処理が追加の誤差を導入する可能性"],
      ko: ["여러 중첩 아티팩트, 분리困难", "30% 이상의 채널이 사용 불가능할 수 있음", "전처리가 추가 오류를 도입할 수 있음"],
    },
    what_this_data_cannot_tell: {
      zh: ["可靠的脑活动模式", "任何与认知或临床相关的信息", "准确的频段功率或 connectivity"],
      en: ["Reliable brain activity patterns", "Any cognition- or clinically-related information", "Accurate band power or connectivity"],
      es: ["Patrones de actividad cerebral confiables", "Cualquier información relacionada con la cognición o clínica", "Potencia de banda o conectividad precisa"],
      fr: ["Modèles d'activité cérébrale fiables", "Toute information liée à la cognition ou à la clinique", "Puissance de bande ou connectivité précise"],
      de: ["Zuverlässige Hirnaktivitätsmuster", "Jeglische kognitions- oder klinikbezogene Informationen", "Genae Bandpower oder Konnektivität"],
      ja: ["信頼できる脳活動パターン", "認知または臨床関連情報", "正確なバンドパワーまたはコネクティビティ"],
      ko: ["신뢰할 수 있는 뇌 활동 패턴", "인지 또는 임상 관련 정보", "정확한 밴드 파워 또는 연결성"],
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
      es: "Estos datos EEG están diseñados específicamente como un caso de enseñanza para principiantes de EEG. Puntuación de calidad de señal 75/100, contiene características típicas de EEG, adecuadas para practicar habilidades básicas de interpretación.",
      fr: "Ces données EEG sont spécifiquement conçues comme un cas d'enseignement pour les débutants en EEG. Score de qualité du signal 75/100, contiennent des caractéristiques typiques de l'EEG, appropriées pour pratiquer les compétences d'interprétation de base.",
      de: "Diese EEG-Daten sind spezifisch als Lehrfall für EEG-Anfänger konzipiert. Signalqualitäts-Score 75/100, enthält typische EEG-Merkmale, geeignet zum Üben grundlegender Interpretationsfähigkeiten.",
      ja: "このEEGデータはEEG初心者のための教育事例として特別に設計されています。信号品質スコア75/100、典型的なEEG特徴を含み、基礎的解釈スキルの練習に適しています。",
      ko: "이 EEG 데이터는 EEG 초보자를 위한 교육 사례로 특별히 설계되었습니다. 신호 품질 점수 75/100, 전형적인 EEG 특징을 포함하며, 기초 해석 기술 연습에 적합합니다.",
    },
    details: {
      zh: "此案例是 EEG 学习的起点：\n\n1. 信号质量适中（75/100），有一些噪声但不严重\n2. 可以清楚地看到 Alpha 和 Theta 波\n3. 适合练习识别基本波形和计算频段功率\n4. 附带详细的逐步解读指南\n\n建议使用此案例练习 EEG 基础解读，然后再尝试更复杂的案例。",
      en: "This case is the starting point for EEG learning:\n\n1. Moderate signal quality (75/100), some noise but not severe\n2. Alpha and Theta waves can be clearly seen\n3. Suitable for practicing identifying basic waveforms and calculating band power\n4. Comes with detailed step-by-step interpretation guide\n\nIt is recommended to use this case to practice basic EEG interpretation, then try more complex cases.",
      es: "Este caso es el punto de partida para el aprendizaje de EEG:\n\n1. Calidad de señal moderada (75/100), algo de ruido pero no severo\n2. Las ondas Alfa y Theta se pueden ver claramente\n3. Adecuado para practicar la identificación de formas de onda básicas y el cálculo de potencia de banda\n4. Viene con una guía de interpretación detallada paso a paso\n\nSe recomienda usar este caso para practicar la interpretación básica de EEG, luego intentar casos más complejos.",
      fr: "Ce cas est le point de départ de l'apprentissage de l'EEG :\n\n1. Qualité du signal modérée (75/100), un peu de bruit mais pas sévère\n2. Les ondes Alpha et Theta peuvent être vues clairement\n3. Appropprié pour pratiquer l'identification des formes d'onde de base et le calcul de la puissance de bande\n4. Livré avec un guide d'interprétation détaillé étape par étape\n\nIl est recommandé d'utiliser ce cas pour pratiquer l'interprétation de base de l'EEG, puis essayer des cas plus complexes.",
      de: "Dieser Fall ist der Startpunkt für EEG-Lernen:\n\n1. Mäßige Signalqualität (75/100), etwas Rauschen aber nicht schwerwiegend\n2. Alpha- und Theta-Wellen können deutlich gesehen werden\n3. Geeignet zum Üben der Identifizierung grundlegender Wellenformen und der Berechnung der Bandpower\n4. Kommt mit einer detaillierten Schritt-für-Schritt-Interpretationsanleitung\n\nEs wird empfohlen, diesen Fall zu verwenden, um grundlegende EEG-Interpretation zu üben, dann komplexere Fälle zu versuchen.",
      ja: "この症例はEEG学習の出発点です：\n\n1. 信号品質は適度（75/100）、 someノイズがありますが深刻ではありません\n2. アルファ波とシータ波をはっきりと見ることができます\n3. 基本的な波形の識別とバンドパワーの計算を練習するのに適しています\n4. 詳細なステップバイステップ解釈ガイドが付属します\n\nこの症例を使用して基本的なEEG解釈を練習し、その後より複雑な症例を試すことをお勧めします。",
      ko: "이 사례는 EEG 학습의 출발점입니다:\n\n1. 적당한 신호 품질 (75/100), 약간의 노이즈가 있지만 심각하지 않음\n2. 알파파와 세타파를 명확하게 볼 수 있음\n3. 기본 파형 식별 및 밴드 파워 계산 연습에 적합\n4. 상세한 단계별 해석 가이드 포함\n\n이 사례를 사용하여 기본 EEG 해석을 연습한 다음, 더 복잡한 사례를 시도하는 것이 권장됩니다.",
    },
    signal_quality: 75,
    learning_readability_score: 95,
    beginner_explanation: {
      zh: "这份 EEG 很适合学习！信号质量不错，你可以看到脑电的基本波形。就像学骑自行车，从一个不太陡的坡开始。",
      en: "This EEG is great for learning! The signal quality is good, and you can see basic brainwave patterns. It's like learning to ride a bicycle, starting on a gentle slope.",
      es: "¡Este EEG es genial para aprender! La calidad de la señal es buena y puedes ver patrones básicos de ondas cerebrales. Es como aprender a montar en bicicleta, empezando en una pendiente suave.",
      fr: "Cet EEG est génial pour apprendre ! La qualité du signal est bonne et vous pouvez voir des modèles d'ondes cérébrales de base. C'est comme apprendre à faire du vélo, en commençant sur une pente douce.",
      de: "Dieses EEG ist großartig zum Lernen! Die Signalqualität ist gut und Sie können grundlegende Hirnwellenmuster sehen. Es ist wie das Fahrradfahrenlernen, beginnend auf einer sanften Steigung.",
      ja: "このEEGは学習に最適です！信号品質は良好で、基本的な脳波パターンを見ることができます。それは自転車に乗ることを学ぶようなもので、緩やかな斜面から始めます。",
      ko: "이 EEG는 학습하기에 훌륭합니다! 신호 품질이 좋고 기본 뇌파 패턴을 볼 수 있습니다. 그것은 자전거 타는 법을 배우는 것과 같습니다, 완만한 경사로에서 시작하는.",
    },
    student_explanation: {
      zh: "该 EEG 记录适合初学者练习基础解读技能。可以观察到：1) 枕叶区域 Alpha 波（8-13 Hz）；2) 额叶区域 Theta 波（4-8 Hz）轻微升高；3) 信号质量评分 75/100，有轻度噪声但不影响学习。建议练习：计算各频段功率、识别伪影、练习 Alpha 阻断实验。",
      en: "This EEG recording is suitable for beginners to practice basic interpretation skills. You can observe: 1) Alpha waves (8-13 Hz) in occipital areas; 2) Slightly elevated Theta waves (4-8 Hz) in frontal areas; 3) Signal quality score 75/100, with mild noise that does not affect learning. Recommended exercises: Calculate band power, identify artifacts, practice Alpha blocking experiment.",
      es: "Este registro EEG es adecuado para que los principiantes practiquen habilidades básicas de interpretación. Puede observar: 1) Ondas Alfa (8-13 Hz) en áreas occipitales; 2) Ondas Theta (4-8 Hz) ligeramente elevadas en áreas frontales; 3) Puntuación de calidad de señal 75/100, con ruido leve que no afecta el aprendizaje. Ejercicios recomendados: Calcular potencia de banda, identificar artefactos, practicar experimento de bloqueo Alfa.",
      fr: "Cet enregistrement EEG est approprié pour que les débutants pratiquent les compétences d'interprétation de base. Vous pouvez observer : 1) Ondes Alpha (8-13 Hz) dans les zones occipitales ; 2) Ondes Theta (4-8 Hz) légèrement élevées dans les zones frontales ; 3) Score de qualité du signal 75/100, avec un bruit léger qui n'affecte pas l'apprentissage. Exercices recommandés : Calculer la puissance de la bande, identifier les artefacts, pratiquer l'expérience de blocage Alpha.",
      de: "Diese EEG-Aufzeichnung ist für Anfänger geeignet, um grundlegende Interpretationsfähigkeiten zu üben. Sie können beobachten: 1) Alpha-Wellen (8-13 Hz) in okzipitalen Bereichen; 2) Leicht erhöhte Theta-Wellen (4-8 Hz) in frontalen Bereichen; 3) Signalqualitäts-Score 75/100, mit leichtem Rauschen, das das Lernen nicht beeinträchtigt. Empfohlene Übungen: Bandpower berechnen, Artefakte identifizieren, Alpha-Blockierungs-Experiment üben.",
      ja: "このEEG記録は初心者が基礎解釈スキルを練習するのに適しています。観察できること：1）後頭領域のアルファ波（8-13Hz）；2）前頭領域のシータ波（4-8Hz）が軽度上昇；3）信号品質スコア75/100、学習に影響しない軽度のノイズ。推奨練習：各バンドパワー計算、アーティファクト識別、アルファ阻断実験練習。",
      ko: "이 EEG 기록은 초보자가 기초 해석 기술을 연습하기에 적합합니다. 관찰할 수 있는 것: 1) 후두부 영역의 알파파(8-13Hz); 2) 전두부 영역의 세타파(4-8Hz)가 경미하게 상승; 3) 신호 품질 점수 75/100, 학습에 영향을 미치지 않는 경미한 노이즈. 권장 연습: 밴드 파워 계산, 아티팩트 식별, 알파 차단 실험 연습.",
    },
    research_explanation: {
      zh: "此案例设计为教学用途，包含典型的 EEG 特征：Alpha peak ~10 Hz，Theta ~6 Hz，低振幅 Beta（13-20 Hz）。PSD 估计基于 2-second 分段（Hanning 窗）。采样率 250 Hz，符合教学标准。数据已进行轻度预处理（带通滤波 1-40 Hz， notch 50 Hz）。适合用于教学演示 PSD、bandpower、以及基础伪影识别。",
      en: "This case is designed for teaching purposes and contains typical EEG features: Alpha peak ~10 Hz, Theta ~6 Hz, low-amplitude Beta (13-20 Hz). PSD estimation is based on 2-second segments (Hanning window). Sampling rate 250 Hz, meets teaching standards. Data has undergone mild preprocessing (bandpass filter 1-40 Hz, notch 50 Hz). Suitable for teaching PSD, bandpower, and basic artifact identification.",
      es: "Este caso está diseñado con propósitos de enseñanza y contiene características típicas de EEG: pico Alfa ~10 Hz, Theta ~6 Hz, Beta de baja amplitud (13-20 Hz). La estimación de PSD se basa en segmentos de 2 segundos (ventana Hanning). Frecuencia de muestreo 250 Hz, cumple con estándares de enseñanza. Los datos han sufrido un preprocesamiento leve (filtro paso de banda 1-40 Hz, notch 50 Hz). Adecuado para enseñar PSD, bandpower e identificación básica de artefactos.",
      fr: "Ce cas est conçu à des fins d'enseignement et contient des caractéristiques typiques de l'EEG : pic Alpha ~10 Hz, Theta ~6 Hz, Beta de faible amplitude (13-20 Hz). L'estimation PSD est basée sur des segments de 2 secondes (fenêtre Hanning). Fréquence d'échantillonnage 250 Hz, répond aux normes d'enseignement. Les données ont subi un prétraitement léger (filtre passe-bande 1-40 Hz, notch 50 Hz). Appropprié pour enseigner la PSD, la bandpower et l'identification d'artefacts de base.",
      de: "Dieser Fall ist für Lehrzwecke konzipiert und enthält typische EEG-Merkmale: Alpha-Peak ~10 Hz, Theta ~6 Hz, niedrigamplitunden Beta (13-20 Hz). PSD-Schätzung basiert auf 2-Sekunden-Segmenten (Hanning-Fenster). Abtastrate 250 Hz, entspricht Lehrnormen. Daten haben eine milde Vorverarbeitung durchlaufen (Bandpassfilter 1-40 Hz, Notch 50 Hz). Geeignet zum Lehren von PSD, Bandpower und grundlegender Artefaktidentifizierung.",
      ja: "この症例は教育目的で設計されており、典型的なEEG特徴を含みます：アルファピーク〜10Hz、シータ〜6Hz、低振幅ベータ（13-20Hz）。PSD推定は2秒セグメント（Hanning窓）に基づきます。サンプリングレート250Hz、教育基準を満たします。データは軽度の前処理（バンドパスフィルタ1-40Hz、ノッチ50Hz）を行っています。PSD、バンドパワー、および基礎アーティファクト識別の教育に適しています。",
      ko: "이 사례는 교육 목적으로 설계되었으며 전형적인 EEG 특징을 포함합니다: 알파 피크 ~10Hz, 세타 ~6Hz, 저진폭 베타(13-20Hz). PSD 추정은 2초 세그먼트(Hanning 윈도우)에 기초합니다. 샘플링 레이트 250Hz, 교육 기준을 충족합니다. 데이터는 경미한 전처리(대역통과 필터 1-40Hz, 노치 50Hz)를 거쳤습니다. PSD, 밴드파워 및 기초 아티팩트 식별 교육에 적합합니다.",
    },
    limitations: {
      zh: ["专为教学设计的简化数据", "可能不包含真实世界的复杂噪声", "频段功率估算基于较短的记录"],
      en: ["Simplified data designed for teaching", "May not include complex noise from real-world settings", "Band power estimation based on shorter recording"],
      es: ["Datos simplificados diseñados para enseñanza", "Puede que no incluyan ruido complejo de configuraciones del mundo real", "Estimación de potencia de banda basada en registro más corto"],
      fr: ["Données simplifiées conçues pour l'enseignement", "Peut ne pas inclure de bruit complexe de paramétrages du monde réel", "Estimation de la puissance de la bande basée sur un enregistrement plus court"],
      de: ["Vereinfachte Daten, die für Lehrzwecke konzipiert sind", "Enthalten möglicherweise keinen komplexen Lärm aus Einstellungen der realen Welt", "Bandpower-Schätzung basiert auf kürzerer Aufzeichnung"],
      ja: ["教育用に設計された簡略化データ", "実世界の複雑なノイズを含まない可能性がある", "短い記録に基づくバンドパワー推定"],
      ko: ["교육용으로 설계된 단순화된 데이터", "실제 세계 설정의 복잡한 노이즈를 포함하지 않을 수 있음", "짧은 기록에 기초한 밴드 파워 추정"],
    },
    what_this_data_cannot_tell: {
      zh: ["临床或诊断信息", "复杂的认知状态", "个体差异或疾病标记"],
      en: ["Clinical or diagnostic information", "Complex cognitive states", "Individual differences or disease markers"],
      es: ["Información clínica o diagnóstica", "Estados cognitivos complejos", "Diferencias individuales o marcadores de enfermedad"],
      fr: ["Information clinique ou diagnostique", "États cognitifs complexes", "Différences individuelles ou marqueurs de maladie"],
      de: ["Klinische oder diagnostische Informationen", "Komplexe kognitive Zustände", "Individualle Unterschiede oder Krankheitsmarker"],
      ja: ["臨床または診断情報", "複雑な認知状態", "個人差または疾患マーカー"],
      ko: ["임상 또는 진단 정보", "복잡한 인지 상태", "개인 차이 또는 질병 마커"],
    },
    tags: ["teaching", "beginnerTag", "basicInterp", "alpha", "theta"],
    readTime: "10 分钟",
  },
  /* ---- c9: 癫痫发作期 EEG ---- */
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
                                <span className="text-[var(--color-text-secondary)]">•</span>
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
