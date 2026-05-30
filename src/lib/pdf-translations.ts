/**
 * PDF 报告生成翻译文件
 * 包含所有 PDF 生成过程中使用的多语言字符串
 */
import type { Lang } from "./translations";

export interface PDFTranslations {
  // 标题区
  reportTitle: string;        // "EEG 分析报告 · 批量导出"
  generatedAt: string;        // "生成时间："（日期前缀）
  dateLocale: string;         // "zh-CN" | "en-US" 等

  // 文件概览区
  fileOverview: string;       // "文件概览"
  signalQuality: string;      // "信号质量："
  noisyChannels: string;      // "噪声通道："
  none: string;               // "无"
  notAnalyzed: string;        // "（未分析）"

  // 详细报告区
  file: string;              // "文件"
  fileName: string;           // "文件名："
  samplingRate: string;       // "采样率："
  duration: string;           // "记录时长："
  analysisResult: string;     // "分析结果"
  signalQualityScore: string; // "信号质量评分："
  aiExplanation: string;      // "AI 解释"

  // 页脚
  reportType: string;         // "批量分析报告"（用于页脚）
  pageIndicator: string;      // "第{current}页 / 共{total}页"（含占位符）
}

export const PDF_TRANSLATIONS: Record<Lang, PDFTranslations> = {
  zh: {
    reportTitle: "EEG 分析报告 · 批量导出",
    generatedAt: "生成时间：",
    dateLocale: "zh-CN",
    fileOverview: "文件概览",
    signalQuality: "信号质量：",
    noisyChannels: "噪声通道：",
    none: "无",
    notAnalyzed: "（未分析）",
    file: "文件",
    fileName: "文件名：",
    samplingRate: "采样率：",
    duration: "记录时长：",
    analysisResult: "分析结果",
    signalQualityScore: "信号质量评分：",
    aiExplanation: "AI 解释",
    reportType: "批量分析报告",
    pageIndicator: "第{current}页 / 共{total}页",
  },
  en: {
    reportTitle: "EEG Analysis Report · Batch Export",
    generatedAt: "Generated: ",
    dateLocale: "en-US",
    fileOverview: "File Overview",
    signalQuality: "Signal quality:",
    noisyChannels: "Noisy channels:",
    none: "none",
    notAnalyzed: "(not analyzed)",
    file: "File",
    fileName: "File name:",
    samplingRate: "Sampling rate:",
    duration: "Duration:",
    analysisResult: "Analysis Result",
    signalQualityScore: "Signal quality score:",
    aiExplanation: "AI Explanation",
    reportType: "Batch Analysis Report",
    pageIndicator: "Page {current} / {total}",
  },
  es: {
    reportTitle: "Informe de Análisis EEG · Exportación por Lotes",
    generatedAt: "Generado: ",
    dateLocale: "es-ES",
    fileOverview: "Resumen de Archivos",
    signalQuality: "Calidad de señal:",
    noisyChannels: "Canales ruidosos:",
    none: "ninguno",
    notAnalyzed: "(no analizado)",
    file: "Archivo",
    fileName: "Nombre de archivo:",
    samplingRate: "Frecuencia de muestreo:",
    duration: "Duración:",
    analysisResult: "Resultado del Análisis",
    signalQualityScore: "Puntuación de calidad de señal:",
    aiExplanation: "Explicación de IA",
    reportType: "Informe de Análisis por Lotes",
    pageIndicator: "Página {current} de {total}",
  },
  fr: {
    reportTitle: "Rapport d'Analyse EEG · Export par Lots",
    generatedAt: "Généré: ",
    dateLocale: "fr-FR",
    fileOverview: "Aperçu des Fichiers",
    signalQuality: "Qualité du signal:",
    noisyChannels: "Canaux bruités:",
    none: "aucun",
    notAnalyzed: "(non analysé)",
    file: "Fichier",
    fileName: "Nom du fichier:",
    samplingRate: "Fréquence d'échantillonnage:",
    duration: "Durée:",
    analysisResult: "Résultat de l'Analyse",
    signalQualityScore: "Score de qualité du signal:",
    aiExplanation: "Explication IA",
    reportType: "Rapport d'Analyse par Lots",
    pageIndicator: "Page {current} sur {total}",
  },
  de: {
    reportTitle: "EEG-Analysebericht · Stapel-Export",
    generatedAt: "Generiert: ",
    dateLocale: "de-DE",
    fileOverview: "Dateiübersicht",
    signalQuality: "Signalqualität:",
    noisyChannels: "Rauschhafte Kanäle:",
    none: "keine",
    notAnalyzed: "(nicht analysiert)",
    file: "Datei",
    fileName: "Dateiname:",
    samplingRate: "Abtastrate:",
    duration: "Dauer:",
    analysisResult: "Analyseergebnis",
    signalQualityScore: "Signalqualitäts-Score:",
    aiExplanation: "KI-Erklärung",
    reportType: "Stapel-Analysebericht",
    pageIndicator: "Seite {current} von {total}",
  },
  ja: {
    reportTitle: "EEG 分析レポート · バッチエクスポート",
    generatedAt: "生成時間: ",
    dateLocale: "ja-JP",
    fileOverview: "ファイル概要",
    signalQuality: "信号品質:",
    noisyChannels: "ノイズチャンネル:",
    none: "なし",
    notAnalyzed: "（未分析）",
    file: "ファイル",
    fileName: "ファイル名:",
    samplingRate: "サンプリングレート:",
    duration: "記録時間:",
    analysisResult: "分析結果",
    signalQualityScore: "信号品質スコア:",
    aiExplanation: "AI 説明",
    reportType: "バッチ分析レポート",
    pageIndicator: "{current}ページ / 全{total}ページ",
  },
  ko: {
    reportTitle: "EEG 분석 리포트 · 일괄 내보내기",
    generatedAt: "생성 시간: ",
    dateLocale: "ko-KR",
    fileOverview: "파일 개요",
    signalQuality: "신호 품질:",
    noisyChannels: "노이즈 채널:",
    none: "없음",
    notAnalyzed: "(분석되지 않음)",
    file: "파일",
    fileName: "파일 이름:",
    samplingRate: "샘플링 레이트:",
    duration: "기록 시간:",
    analysisResult: "분석 결과",
    signalQualityScore: "신호 품질 점수:",
    aiExplanation: "AI 설명",
    reportType: "일괄 분석 리포트",
    pageIndicator: "{current}페이지 / 전체 {total}페이지",
  },
};
