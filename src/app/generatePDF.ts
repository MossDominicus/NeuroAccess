/**
 * PDF 报告生成工具（批量版）
 * 使用 jsPDF 将 NeuroAccess 分析结果导出为 PDF
 */
import jspdf from "jspdf";
import type { Lang } from "@/lib/translations";

export interface BatchPDFData {
  files: {
    filename: string;
    fileSize?: string;
    channelCount: number;
    samplingRate: number;
    duration: string;
    channelNames: string[];
    analysisResult?: any;
    explainText?: string;
  }[];
  lang?: Lang;
}

const DISCLAIMERS: Record<Lang, string> = {
  zh: "本报告仅用于 EEG 科普、学习和辅助理解，不构成医学诊断、医疗建议或治疗建议。" +
    "EEG 数据的专业解释需要由合格专业人员结合完整背景进行判断。" +
    "本平台不会判断疾病、心理状态、智力、人格或健康风险。",
  en: "This report is intended only for EEG literacy, education, and assisted understanding. " +
    "It is not medical advice, diagnosis, or treatment guidance. " +
    "Professional EEG interpretation requires qualified experts and full clinical or research context. " +
    "This platform does not determine disease, mental state, intelligence, personality, or health risk.",
  es: "Este informe tiene como único objetivo la alfabetización en EEG, educación y comprensión asistida. " +
    "No es un consejo médico, diagnóstico ni guía de tratamiento. " +
    "La interpretación profesional de EEG requiere expertos calificados y contexto clínico o de investigación completo. " +
    "Esta plataforma no determina enfermedades, estado mental, inteligencia, personalidad o riesgo para la salud.",
  fr: "Ce rapport est destiné uniquement à l'alphabétisation EEG, à l'éducation et à la compréhension assistée. " +
    "Ce n'est pas un conseil médical, un diagnosstic ou une orientation de traitement. " +
    "L'interprétation professionelle de l'EEG nécessite des experts qualifiés et un contexte clinique ou de recherche complet. " +
    "Cette plateforme ne détermine pas la maladie, l'état mental, l'intelligence, la personalité ou le risque pour la santé.",
  de: "Dieser Bericht dient ausschließlich der EEG-Alphabetisierung, Bildung und unterstützten Verständnis. " +
    "Er ist keine ärztliche Beratung, Diagnose oder Behandlungsleitfaden. " +
    "Die professionelle EEG-Interpretation erfordert qualifizierte Experten und vollständigen klinischen oder Forschungskontext. " +
    "Diese Plattform bestimmt keine Krankheit, psychischen Zustand, Intelligenz, Persönlichkeit oder Gesundheitsrisiko.",
  ja: "このレポートはEEGリテラシー、教育、支援付き理解のみを目的としています。" +
    "医学的アドバイス、診断、または治療ガイダンスではありません。" +
    "専門的なEEG解釈には、資格のある専門家と完全な臨床または研究コンテキストが必要です。" +
    "このプラットフォームは病気、心の状態、知能、人格、または健康リスクを判定しません。",
  ko: "이 보고서는 EEG 리터러시、교육、보조 이해만을 목적으로 합니다。" +
    "의학적 조언、진단、또는 치료 지침이 아닙니다。" +
    "전문적인 EEG 해석에는 자격을 갖춘 전문가와 완전한 임상 또는 연구 맥락이 필요합니다。" +
    "이 플랫폼은 질병、정신 상태、지능、성격、또는 건강 위험을 판단하지 않습니다。",
};

export function generatePDF(data: BatchPDFData): jspdf {
  const doc = new jspdf({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const lang = data.lang || "zh";
  const disclaimer = DISCLAIMERS[lang] || DISCLAIMERS["en"];

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  /* ── 辅助函数 ─────────── */
  const addText = (text: string, size: number, style: string = "normal") => {
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      if (y > 280) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += size * 0.5;
    });
    y += 3;
  };

  const addSeparator = () => {
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  };

  /* ── 标题 ─────────── */
  doc.setFillColor(245, 245, 247);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("NeuroAccess", margin, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const subtitle = lang === "zh" ? "EEG 分析报告 · 批量导出" : "EEG Analysis Report · Batch Export";
  doc.text(subtitle, margin, 30);
  
  doc.setTextColor(150, 150, 150);
  doc.text(`${lang === "zh" ? "生成时间：" : "Generated: "}${new Date().toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}`, margin, 37);
  
  y = 50;

  /* ── 文件概览 ─────────── */
  addText(lang === "zh" ? "文件概览" : "File Overview", 14, "bold");
  addSeparator();

  data.files.forEach((f, i) => {
    if (y > 250) { doc.addPage(); y = margin; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text(`${i + 1}. ${f.filename}`, margin, y);
    y += 6;

    if (f.analysisResult) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`${lang === "zh" ? "信号质量：" : "Signal quality:"} ${f.analysisResult.signal_quality_score}/100`, margin + 5, y);
      y += 5;
      doc.text(`${lang === "zh" ? "噪声通道：" : "Noisy channels:"} ${(f.analysisResult.noisy_channels || []).join(", ") || (lang === "zh" ? "无" : "none")}`, margin + 5, y);
      y += 5;
    } else {
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(lang === "zh" ? "（未分析）" : "(not analyzed)", margin + 5, y);
      y += 5;
    }
    y += 3;
  });

  /* ── 逐个文件详细报告 ─────────── */
  data.files.forEach((f, i) => {
    doc.addPage();
    y = margin;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(`${lang === "zh" ? "文件" : "File"} ${i + 1}: ${f.filename}`, margin, y);
    y += 10;

    addSeparator();

    /* 文件信息 */
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    [
      `${lang === "zh" ? "文件名：" : "File name:"} ${f.filename}`,
      `${lang === "zh" ? "采样率：" : "Sampling rate:"} ${f.samplingRate} Hz`,
      `${lang === "zh" ? "记录时长：" : "Duration:"} ${f.duration}`,
    ].forEach(item => {
      if (y > 280) { doc.addPage(); y = margin; }
      doc.text(`• ${item}`, margin + 5, y);
      y += 6;
    });
    y += 5;

    /* 分析结果 */
    if (f.analysisResult) {
      addText(lang === "zh" ? "分析结果" : "Analysis Result", 12, "bold");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(`${lang === "zh" ? "信号质量评分：" : "Signal quality score:"} ${f.analysisResult.signal_quality_score}/100`, margin + 5, y);
      y += 6;
      doc.text(`${lang === "zh" ? "噪声通道：" : "Noisy channels:"} ${(f.analysisResult.noisy_channels || []).join(", ") || (lang === "zh" ? "无" : "none")}`, margin + 5, y);
      y += 10;
    }

    /* AI 解释 */
    if (f.explainText) {
      addText(lang === "zh" ? "AI 解释" : "AI Explanation", 12, "bold");
      addText(f.explainText, 9);
    }

    /* 免责声明 */
    y += 5;
    doc.setFillColor(255, 251, 230);
    doc.rect(margin, y, contentWidth, 15, "F");
    doc.setFontSize(8);
    doc.setTextColor(180, 130, 0);
    const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth - 10);
    disclaimerLines.forEach((line: string, idx: number) => {
      doc.text(line, margin + 5, y + 7 + idx * 4);
    });
    y += 20;
  });

  /* ── 页脚 ─────────── */
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `NeuroAccess · ${lang === "zh" ? "批量分析报告" : "Batch Analysis Report"} · ${lang === "zh" ? "第" : "Page"} ${i} ${lang === "zh" ? "页 / 共" : "/"} ${totalPages} ${lang === "zh" ? "页" : ""}`,
      pageWidth / 2,
      290,
      { align: "center" }
    );
  }

  return doc;
}
