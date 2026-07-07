"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useLang } from "@/lib/language-context";
import { StoredReport } from "@/lib/reports-storage";
import AIExplanation from "@/components/AIExplanation";

import {
  FileText, Activity, BarChart3, Brain, TrendingUp,
  Shield, AlertTriangle, CheckCircle, XCircle, Zap,
  Download, Clock, User, GraduationCap, Microscope, Loader2,
} from "lucide-react";
import {
  getLimitations, getCannotTell,
} from "@/lib/report-i18n";

const FrequencyChart = dynamic(() => import("@/components/FrequencyChart"), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-[var(--color-bg)] rounded-2xl h-64" />,
});

// ── HTML 转义 — 防止 XSS ────────────────────────────────
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── 辅助：小进度条 ──────────────────────────────────────
function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-[var(--color-text-secondary)]">
        <span>{label}</span>
        <span className="font-medium">{Math.round(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

// ── 主组件 ─────────────────────────────────────────────
export default function ReportDetail({ report }: { report: StoredReport }) {
  const { lang, t } = useLang();
  const [exporting, setExporting] = useState(false);
  const analysis = report.analysis || {};

  const handleExportPDF = useCallback(async () => {
    setExporting(true);
    try {
      // @ts-ignore: dom-to-image-more has no type declarations
      const domtoimage = (await import("dom-to-image-more")).default;
      const jsPDF = (await import("jspdf")).default;
      const reportEl = document.getElementById("report-detail-content");
      if (!reportEl) throw new Error("Report element not found");
      const dataUrl = await domtoimage.toPng(reportEl, {
        scale: 1.5, bgcolor: "#0a0e1a", quality: 1,
      });
      const getSize = (): Promise<{w: number, h: number}> => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.width, h: img.height });
        img.src = dataUrl;
      });
      const { w, h } = await getSize();
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth - 20;
      const imgHeight = (h * imgWidth) / w;
      let heightLeft = imgHeight;
      let position = 10;
      pdf.addImage(dataUrl, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight() - 20;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(dataUrl, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight() - 20;
      }
      pdf.save(`${report.fileName.replace(/\.[^.]+$/, "")}_NeuroAccess_Report.pdf`);
    } catch (err: any) {
      console.error("PDF export failed:", err);
      alert(t("pdfExportFailed") + ": " + (err?.message || t("unknownError")));
    } finally {
      setExporting(false);
    }
  }, [report, t]);

  const handleExportHTML = useCallback(async () => {
    setExporting(true);
    try {
      // @ts-ignore: dom-to-image-more has no type declarations
      const domtoimage = (await import("dom-to-image-more")).default;

      const reportEl = document.getElementById("report-detail-content");
      if (!reportEl) throw new Error("Report element not found");

      // 截图前临时收窄容器宽度到 800px，适配 A4 比例
      const origWidth = (reportEl as HTMLElement).style.width;
      const origMaxW = (reportEl as HTMLElement).style.maxWidth;
      (reportEl as HTMLElement).style.width = "800px";
      (reportEl as HTMLElement).style.maxWidth = "800px";

      const dataUrl = await domtoimage.toPng(reportEl, {
        scale: 2, bgcolor: "#0a0e1a", quality: 0.92,
      });

      // 恢复原始宽度
      (reportEl as HTMLElement).style.width = origWidth;
      (reportEl as HTMLElement).style.maxWidth = origMaxW;

      // 将 data URL 转为 base64
      const base64Data = dataUrl.split(",")[1];

      // 翻译字符串
      const msgReportTitle = t("neuroAccessReport");
      const msgFileLabel = t("reportFileLabel");
      const msgDateLabel = t("reportDateLabel");
      const msgModeLabel = t("reportModeLabel");
      const msgGeneratedBy = t("reportGeneratedBy");
      const msgForReference = t("forReferenceOnly");
      const msgReportId = t("reportIdLabel");
      const msgExportTime = t("exportTimeLabel");

      // 生成 HTML 内容（自包含，无外部依赖）
      const htmlContent = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${msgReportTitle}</title>
<style>
  * { margin:0; padding:0; box-sizing: border-box; }
  body { background: #0a0e1a; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .container { max-width: 900px; margin:0 auto; padding: 20px; }
  .header { border-bottom: 1px solid #2a2f45; padding-bottom: 15px; margin-bottom: 20px; }
  .header h1 { color: #6ee7b7; font-size: 24px; margin-bottom: 5px; }
  .header p { color: #8892a4; font-size: 14px; }
  .report-img { width: 100%; height: auto; display: block; margin: 20px 0; border-radius: 8px; }
  .footer { border-top: 1px solid #2a2f45; padding-top: 15px; margin-top: 30px; color: #5a6478; font-size: 12px; text-align: center; }
  .footer a { color: #6ee7b7; text-decoration: none; }
  .wm { position: fixed; bottom: 10px; right: 10px; color: rgba(255,255,255,0.08); font-size: 11px; pointer-events: none; user-select: none; }
</style>
</head>
<body>
<div class="wm">NeuroAccess</div>
<div class="container">
  <div class="header">
    <h1>${msgReportTitle}</h1>
    <p>${msgFileLabel}REPORT_FILE_NAME | ${msgDateLabel}REPORT_DATE | ${msgModeLabel}REPORT_MODE</p>
  </div>
  <img class="report-img" src="data:image/png;base64,BASE64_DATA" alt="${msgReportTitle}">
  <div class="footer">
    <p>${msgGeneratedBy}</p>
    <p>${msgForReference}</p>
    <p>${msgReportId}REPORT_ID | ${msgExportTime}EXPORT_TIME</p>
  </div>
</div>
</body>
</html>`;

      // 替换占位符（使用 HTML 转义防止 XSS）
      let finalHtml = htmlContent
        .replace("REPORT_FILE_NAME", escapeHtml(report.fileName))
        .replace("REPORT_DATE", escapeHtml(report.date))
        .replace("REPORT_MODE", escapeHtml(report.mode))
        .replace("BASE64_DATA", base64Data)
        .replace("REPORT_ID", escapeHtml(report.id))
        .replace("EXPORT_TIME", escapeHtml(new Date().toISOString()));

      // 下载 HTML 文件
      const blob = new Blob([finalHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.fileName.replace(/\.[^.]+$/, "")}_NeuroAccess_Report.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err: any) {
      console.error("HTML export failed:", err);
      alert(t("htmlExportFailed") + (err?.message || t("unknownError")));
    } finally {
      setExporting(false);
    }
  }, [report, t]);

  // 提取各层数据
  const overview = analysis;
  const signalQuality = (analysis as any).signal_quality || analysis;
  const freqAnalysis = (analysis as any).frequency_analysis || {};
  const literacyScores = (analysis as any).eeg_literacy_scores || (analysis as any).literacy_scores || {};
  const confidence = (analysis as any).confidence || (analysis as any).interpretation_confidence || {};
  const lims = getLimitations(lang as any);
  const cannotTellList = getCannotTell(lang as any);
  const sq = (signalQuality as any).signal_quality_score || (analysis as any).signal_quality_score || 0;
  const sqColor = Number(sq) >= 70 ? "text-emerald-600 dark:text-emerald-400" :
                  Number(sq) >= 50 ? "text-yellow-600 dark:text-yellow-400" :
                  "text-red-600 dark:text-red-400";
  const bandpowerPercent = (analysis as any).bandpower_percent || (freqAnalysis as any).bandpower_percent || {};

  return (
    <div id="report-detail-content" className="mx-auto max-w-4xl space-y-6 sm:space-y-8 px-4 sm:px-6 py-4 sm:py-8 pb-[env(safe-area-inset-bottom,16px)]">
      {/* ── 页面标题 ──────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text)]">
            {report.fileName}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--color-text-secondary)]">
            {report.date}
          </p>
        </div>
      </div>

      {/* ── Section 1: EEG Overview ─────────────────── */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-base font-bold text-[var(--color-text)]">{t("eegOverview")}</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewItem label={t("fileName")} value={report.fileName || overview.file_name} />
          <OverviewItem label={t("duration")} value={overview.duration || "-"} />
          <OverviewItem label={t("samplingRate")} value={overview.sampling_rate ? `${overview.sampling_rate} Hz` : "-"} />
          <OverviewItem label={t("channelCount")} value={overview.channel_count || "-"} />
        </div>
      </section>

      {/* ── Section 2: Signal Quality ───────────────── */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
              <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-base font-bold text-[var(--color-text)]">{t("signalQuality")}</h2>
          </div>
          <div className={`text-2xl font-bold tabular-nums ${sqColor}`}>{Number(sq).toFixed(0)}</div>
        </div>

        {/* ── Score Breakdown ─────────────────────── */}
        {(() => {
          const qd = (signalQuality as any)?.quality_details || (analysis as any).quality_details || {};
          const hasBreakdown = qd.snr_component !== undefined;
          if (!hasBreakdown) return null;

          // 真实算法分项满分（与后端 analysis.py 及"评分逻辑"弹窗完全一致）
          // 原始分量之和 ×2.5 线性重映射到 0~100（保底 5 分），满分 SNR 15 / 一致性 10 / 频谱 15 / 基础 25
          const M_SNR = 15;    // 信噪比 0~15
          const M_CONS = 10;   // 通道一致性 0~10
          const M_SPEC = 15;   // 频谱特征 0~15
          const M_BASE = 25;   // 基础分 0~25（动态）
          const M_ART = 10;    // 伪影扣分 0~10
          const M_INT = 15;    // 完整性扣分 0~15
          const M_DRIFT = 10;  // 基线漂移 0~10

          // 直接使用后端返回的真实分项分数（每个分项已是原始分量，未缩放），
          // 每个分项都如实反映其在真实算法中的取值与满分。总分在后端 = 分量之和 ×2.5。
          const vSnr = Number(qd.snr_component) || 0;
          const vCons = Number(qd.consistency_component) || 0;
          const vSpec = Number(qd.spectral_component) || 0;
          const vBase = Number(qd.base_score) || 0;
          const vArt = Number(qd.artifact_penalty) || 0;
          const vInt = Number(qd.integrity_penalty) || 0;
          const vDrift = Number(qd.drift_penalty) || 0;

          const items = [
            { key: "snr", label: t("snrComponent"), value: Math.min(Math.round(vSnr), M_SNR), maxVal: M_SNR, color: "text-emerald-600 dark:text-emerald-400" },
            { key: "consistency", label: t("consistencyComponent"), value: Math.min(Math.round(vCons), M_CONS), maxVal: M_CONS, color: "text-blue-600 dark:text-blue-400" },
            { key: "spectral", label: t("spectralComponent"), value: Math.min(Math.round(vSpec), M_SPEC), maxVal: M_SPEC, color: "text-indigo-600 dark:text-indigo-400" },
            { key: "base", label: t("baseScoreLabel"), value: Math.min(Math.round(vBase), M_BASE), maxVal: M_BASE, color: "text-teal-600 dark:text-teal-400" },
            { key: "artifact", label: t("artifactPenalty"), value: Math.min(Math.round(vArt), M_ART), maxVal: M_ART, color: "text-red-600 dark:text-red-400", isPenalty: true },
            { key: "integrity", label: t("integrityPenalty"), value: Math.min(Math.round(vInt), M_INT), maxVal: M_INT, color: "text-amber-600 dark:text-amber-400", isPenalty: true },
            { key: "drift", label: t("driftPenalty"), value: Math.min(Math.round(vDrift), M_DRIFT), maxVal: M_DRIFT, color: "text-orange-600 dark:text-orange-400", isPenalty: true },
          ];

          return (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">{t("scoreBreakdown")}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {items.slice(0, 4).map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
                    <span className="text-xs text-[var(--color-text-secondary)]">{item.label}</span>
                    <span className={`text-sm font-bold tabular-nums ${item.color}`}>{item.value}/{item.maxVal}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {items.slice(4).map((item) => {
                  // 扣分项显示的是"满分-扣分"，即该维度对总分的实际贡献，
                  // 这样七个卡片数值相加等于总分。
                  const goodScore = Math.max(0, item.maxVal - item.value);
                  const ratio = item.maxVal > 0 ? goodScore / item.maxVal : 0;
                  const colorClass = ratio >= 0.8
                    ? "text-emerald-600 dark:text-emerald-400"
                    : ratio >= 0.5
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-600 dark:text-red-400";
                  return (
                    <div key={item.key} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
                      <span className="text-xs text-[var(--color-text-secondary)]">{item.label}</span>
                      <span className={`text-sm font-bold tabular-nums ${colorClass}`}>{goodScore}/{item.maxVal}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      </section>

      {/* ── Section 3: Frequency Analysis ───────────── */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/30">
            <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-base font-bold text-[var(--color-text)]">{t("frequencyAnalysis")}</h2>
        </div>
        {/* Bandpower 百分比概览 */}
        {Object.keys(bandpowerPercent).length > 0 && (
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: "delta", bandKey: "bandDelta", color: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" },
              { key: "theta", bandKey: "bandTheta", color: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400" },
              { key: "alpha", bandKey: "bandAlpha", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" },
              { key: "beta", bandKey: "bandBeta", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" },
            ].map(({ key, bandKey, color }) => (
              <div key={key} className={`rounded-xl px-4 py-3 text-center ${color}`}>
                <div className="text-lg font-bold">{(bandpowerPercent as any)[key] || "0%"}</div>
                <div className="text-[10px] font-medium uppercase tracking-wider">{t(bandKey)}</div>
              </div>
            ))}
          </div>
        )}
        <FrequencyChart frequencyData={freqAnalysis} />
      </section>

      {/* ── Section 4: EEG Literacy Scores ──────────── */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/30">
            <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <h2 className="text-base font-bold text-[var(--color-text)]">{t("eegLiteracyScores")}</h2>
        </div>
        <div className="space-y-3">
          <ScoreBar label={t("learningReadability")} value={(literacyScores as any).learning_readability_score || 0} color="bg-blue-500" />
          <ScoreBar label={t("signalClarity")} value={(literacyScores as any).signal_clarity_score || 0} color="bg-emerald-500" />
          <ScoreBar label={t("beginnerFriendliness")} value={(literacyScores as any).beginner_friendliness_score || 0} color="bg-violet-500" />
          <ScoreBar label={t("researchUsefulness")} value={(literacyScores as any).research_usefulness_score || 0} color="bg-amber-500" />
          <ScoreBar label={t("noiseComplexity")} value={(literacyScores as any).noise_complexity_score || 0} color="bg-rose-500" />
        </div>
      </section>

      {/* ── Section 5: AI Explanations ──────────────── */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-950/30">
            <Zap className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h2 className="text-base font-bold text-[var(--color-text)]">{t("aiExplanation")}</h2>
        </div>
        <AIExplanation data={analysis as any} />
      </section>

      {/* ── Section 6: Signal Quality Hint ──────────── */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30">
            <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {t("confidenceHint")}
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 7: What This Data Cannot Tell You ─ */}
      {cannotTellList.length > 0 && (
        <section className="rounded-2xl border border-red-100 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900/30 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30">
              <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-base font-bold text-red-800 dark:text-red-300">
              {t("whatDataCannotTell")}
            </h2>
          </div>
          <p className="mb-3 text-sm text-red-700/80 dark:text-red-400/80">
            {t("platformCannotDetermine")}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {cannotTellList.map((item: string, i: number) => (
              <li key={i} className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ── 辅助组件 ────────────────────────────────────────
function OverviewItem({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">{label}</div>
      <div className="mt-1 truncate text-sm font-bold text-[var(--color-text)]">{String(value)}</div>
    </div>
  );
}

function QualityItem({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <Icon className={`h-5 w-5 flex-shrink-0 ${color}`} />
      <div>
        <div className="text-[11px] font-medium text-[var(--color-text-secondary)]">{label}</div>
        <div className="text-sm font-bold text-[var(--color-text)]">{String(value)}</div>
      </div>
    </div>
  );
}
