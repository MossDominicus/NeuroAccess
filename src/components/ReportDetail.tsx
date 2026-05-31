"use client";

import { useState, useCallback } from "react";
import { useLang } from "@/lib/language-context";
import { StoredReport } from "@/lib/reports-storage";
import FrequencyChart from "@/components/FrequencyChart";
import AIExplanation from "@/components/AIExplanation";
import {
  FileText, Activity, BarChart3, Brain, TrendingUp,
  Shield, AlertTriangle, CheckCircle, XCircle, Zap,
  Download, Clock, Radio, Eye, User, GraduationCap, Microscope, Loader2,
} from "lucide-react";
import {
  getConfidenceLevelText, getConfidenceBadgeClass, getConfidenceReasons,
  getLimitations, getCannotTell, normalizeLevel,
} from "@/lib/report-i18n";

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

      // 先给元素加一个极淡的文字水印层（CSS），让 OCR 无法识别
      const watermarkDiv = document.createElement("div");
      Object.assign(watermarkDiv.style, {
        position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
        pointerEvents: "none", zIndex: "9999", opacity: "0.04",
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(0,0,0,0.3) 40px, rgba(0,0,0,0.3) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(0,0,0,0.3) 40px, rgba(0,0,0,0.3) 41px)",
        backgroundSize: "41px 41px",
      });
      watermarkDiv.className = "pdf-watermark-overlay";
      reportEl.style.position = "relative";
      reportEl.appendChild(watermarkDiv);

      const dataUrl = await domtoimage.toPng(reportEl, {
        scale: 2, bgcolor: "#0a0e1a", quality: 0.92,
      });

      // 移除水印层
      reportEl.removeChild(watermarkDiv);
      reportEl.style.position = "";

      // 获取图片尺寸
      const getSize = (): Promise<{w: number, h: number}> => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.width, h: img.height });
        img.src = dataUrl;
      });
      const { w, h } = await getSize();

      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();   // 210
      const pageH = pdf.internal.pageSize.getHeight();  // 297
      const margin = 8;
      const imgW = pageW - margin * 2; // 194
      const pxPerMm = w / imgW; // 图片像素密度
      const sliceH_px = Math.floor((pageH - margin * 2) * pxPerMm); // 每页切多少像素

      let remain = h;
      let srcY = 0;
      while (remain > 0) {
        const thisH = Math.min(sliceH_px, remain);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = thisH;
        const ctx = canvas.getContext("2d")!;
        const srcImg = new Image();
        await new Promise<void>((resolve) => {
          srcImg.onload = () => {
            ctx.drawImage(srcImg, 0, srcY, w, thisH, 0, 0, w, thisH);
            resolve();
          };
          srcImg.src = dataUrl;
        });

        // 叠加噪声，干扰 OCR（每像素±15，足够干扰但人眼不可见）
        const imgData = ctx.getImageData(0, 0, w, thisH);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const n = (Math.random() - 0.5) * 30;
          data[i]     = Math.min(255, Math.max(0, data[i] + n));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
        }
        ctx.putImageData(imgData, 0, 0);

        const sliceDataUrl = canvas.toDataURL("image/png");
        const sliceH_mm = (thisH / pxPerMm);
        if (srcY > 0) pdf.addPage();
        pdf.addImage(sliceDataUrl, "PNG", margin, margin, imgW, sliceH_mm);

        srcY += thisH;
        remain -= thisH;
      }

      // ── 页脚标识（英文，避免字体渲染问题） ───────────
      const pdfPageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pdfPageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 150);
        pdf.setFont("helvetica", "normal");
        const footerText = `NeuroAccess · System-Generated Report · For Reference Only · ${new Date().toISOString()} · ID:${report.id}`;
        pdf.text(footerText, pageW / 2, pageH - 5, { align: "center" });
      }

      // PDF 元数据
      pdf.setProperties({
        title: `NeuroAccess Report - ${report.fileName}`,
        subject: "EEG Analysis Report",
        creator: "NeuroAccess (system-generated)",
        author: "NeuroAccess",
        keywords: "EEG, neuroaccess, report, system-generated",
      });

      pdf.save(`${report.fileName.replace(/\.[^.]+$/, "")}_NeuroAccess_Report.pdf`);
    } catch (err: any) {
      console.error("PDF export failed:", err);
      alert(t("pdfExportFailed") + (err?.message || "Unknown error"));
    } finally {
      setExporting(false);
    }
  }, [report]);

  // 提取各层数据
  const overview = analysis;
  const signalQuality = (analysis as any).signal_quality || analysis;
  const freqAnalysis = (analysis as any).frequency_analysis || {};
  const literacyScores = (analysis as any).eeg_literacy_scores || (analysis as any).literacy_scores || {};
  const confidence = (analysis as any).confidence || (analysis as any).interpretation_confidence || {};
  const lims = getLimitations(lang as any);
  const cannotTellList = getCannotTell(lang as any);
  const sq = (signalQuality as any).signal_quality_score || (analysis as any).signal_quality_score || 0;
  const bandpowerPercent = (analysis as any).bandpower_percent || (freqAnalysis as any).bandpower_percent || {};

  return (
    <div id="report-detail-content" className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      {/* ── 页面标题 ──────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            {report.fileName}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {report.date} · {report.mode}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
            Number(sq) >= 70 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
            Number(sq) >= 40 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" :
            "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
          }`}>
            <Activity className="h-3.5 w-3.5" />
            {t("signalQuality")}: {sq}
          </span>
          <button
            id="export-pdf-btn"
            onClick={handleExportPDF}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-gray-900 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {exporting ? "Exporting..." : t("exportPdf")}
          </button>
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <OverviewItem label={t("fileName")} value={overview.file_name || report.fileName} />
          <OverviewItem label={t("duration")} value={overview.duration || "-"} />
          <OverviewItem label={t("samplingRate")} value={overview.sampling_rate ? `${overview.sampling_rate} Hz` : "-"} />
          <OverviewItem label={t("channelCount")} value={overview.channel_count || "-"} />
          <OverviewItem label={t("channelNames")} value={Array.isArray(overview.channel_names) ? overview.channel_names.join(", ") : "-"} />
        </div>
      </section>

      {/* ── Section 2: Signal Quality ───────────────── */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
            <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-base font-bold text-[var(--color-text)]">{t("signalQuality")}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QualityItem
            icon={Activity}
            label={t("signalQuality")}
            value={`${sq}/100`}
            color={sq >= 70 ? "text-emerald-600" : sq >= 40 ? "text-amber-600" : "text-red-600"}
          />
          <QualityItem
            icon={AlertTriangle}
            label={t("noisyChannels")}
            value={(signalQuality as any)?.noisy_channels?.length || (analysis as any).noisy_channels?.length || 0}
            color="text-amber-600"
          />
          <QualityItem
            icon={XCircle}
            label="Clipping"
            value={(signalQuality as any)?.clipping_detected || (analysis as any).clipping_detected ? t("yes") || "Yes" : t("no") || "No"}
            color={(signalQuality as any)?.clipping_detected ? "text-red-600" : "text-emerald-600"}
          />
          <QualityItem
            icon={Eye}
            label="Blink Artifacts"
            value={((signalQuality as any)?.possible_artifacts || (analysis as any).possible_artifacts || []).length || 0}
            color="text-amber-600"
          />
          <QualityItem
            icon={Radio}
            label="High Freq Noise"
            value={(signalQuality as any)?.high_frequency_noise || (analysis as any).high_frequency_noise ? t("yes") || "Yes" : t("no") || "No"}
            color={(signalQuality as any)?.high_frequency_noise ? "text-red-600" : "text-emerald-600"}
          />
        </div>
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
          <div className="mb-6 grid grid-cols-4 gap-3">
            {[
              { key: "delta", label: "δ Delta", color: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" },
              { key: "theta", label: "θ Theta", color: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400" },
              { key: "alpha", label: "α Alpha", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" },
              { key: "beta", label: "β Beta", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" },
            ].map(({ key, label, color }) => (
              <div key={key} className={`rounded-xl px-4 py-3 text-center ${color}`}>
                <div className="text-lg font-bold">{(bandpowerPercent as any)[key] || "0%"}</div>
                <div className="text-[10px] font-medium uppercase tracking-wider">{label}</div>
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

      {/* ── Section 6: Confidence & Limitations ─────── */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30">
            <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-base font-bold text-[var(--color-text)]">{t("interpretationConfidence")}</h2>
        </div>
        <div className="space-y-4">
          {(() => {
            const levelKey = normalizeLevel((confidence as any).level);
            const badgeClass = getConfidenceBadgeClass(levelKey);
            const levelText = getConfidenceLevelText(levelKey, lang as any);
            const reasons = getConfidenceReasons(analysis as any, lang as any);
            const lims2 = getLimitations(lang as any);
            return (
              <>
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${badgeClass}`}>
                  <TrendingUp className="h-4 w-4" />
                  {levelText}
                </div>
                {reasons.length > 0 && (
                  <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {reasons.join("\uff1b")}
                  </p>
                )}
                {lims2.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-[var(--color-text)]">{t("whatDataCannotTell")}</h4>
                    <ul className="space-y-1">
                      {lims2.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </section>

      {/* \u2580\u2014 Section 7: What This Data Cannot Tell You \u2580\u2014\u2014\u2014\u2014\u2014 */}

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
            {t("platformCannotDetermine") || "This platform cannot determine:"}
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

      {/* ── Section 8: Export PDF ───────────────────── */}
      <div className="flex justify-center pt-4">
        <button
          id="export-pdf-bottom"
          onClick={handleExportPDF}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 dark:bg-white px-8 py-3 text-sm font-semibold text-white dark:text-gray-900 shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:scale-100"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exporting ? "Exporting..." : `${t("exportPdf")} — ${report.fileName}`}
        </button>
      </div>

      {/* ── Section 9: Understanding Feedback ─────────── */}
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
