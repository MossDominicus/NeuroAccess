"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useLang } from "@/lib/language-context";
import { StoredReport } from "@/lib/reports-storage";
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

const FrequencyChart = dynamic(() => import("@/components/FrequencyChart"), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-[var(--color-bg)] rounded-2xl h-64" />,
});

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

      // 替换占位符
      let finalHtml = htmlContent
        .replace("REPORT_FILE_NAME", report.fileName)
        .replace("REPORT_DATE", report.date)
        .replace("REPORT_MODE", report.mode)
        .replace("BASE64_DATA", base64Data)
        .replace("REPORT_ID", report.id)
        .replace("EXPORT_TIME", new Date().toISOString());

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
            Number(sq) >= 70 ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" :
            Number(sq) >= 50 ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400" :
            "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
          }`}>
            <Activity className="h-3.5 w-3.5" />
            {t("signalQuality")}: {sq}
          </span>
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
          <OverviewItem label={t("fileName")} value={report.fileName || overview.file_name} />
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
            color={sq >= 70 ? "text-green-600 dark:text-green-400" : sq >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}
          />
          <QualityItem
            icon={AlertTriangle}
            label={t("noisyChannels")}
            value={(signalQuality as any)?.noisy_channels?.length || (analysis as any).noisy_channels?.length || 0}
            color="text-amber-600 dark:text-amber-400"
          />
          <QualityItem
            icon={XCircle}
            label={t("clipping")}
            value={(signalQuality as any)?.clipping_detected || (analysis as any).clipping_detected ? t("yes") : t("no")}
            color={(signalQuality as any)?.clipping_detected ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}
          />
          <QualityItem
            icon={Eye}
            label={t("blinkArtifacts")}
            value={((signalQuality as any)?.possible_artifacts || (analysis as any).possible_artifacts || []).length || 0}
            color="text-amber-600 dark:text-amber-400"
          />
          <QualityItem
            icon={Radio}
            label={t("highFreqNoise")}
            value={(signalQuality as any)?.high_frequency_noise || (analysis as any).high_frequency_noise ? t("yes") : t("no")}
            color={(signalQuality as any)?.high_frequency_noise ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}
          />
          <QualityItem
            icon={AlertTriangle}
            label={t("missingData")}
            value={(() => {
              const qd = (signalQuality as any)?.quality_details || (analysis as any).quality_details || {};
              const md = (signalQuality as any)?.missing_data || (analysis as any).missing_data;
              return md ? `${Number(qd.missing_data_percentage || 0).toFixed(1)}%` : t("no");
            })()}
            color={(signalQuality as any)?.missing_data ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}
          />
          <QualityItem
            icon={Zap}
            label={t("outlierPercentage")}
            value={(() => {
              const qd = (signalQuality as any)?.quality_details || (analysis as any).quality_details || {};
              return `${Number(qd.outlier_percentage || 0).toFixed(2)}%`;
            })()}
            color="text-amber-600 dark:text-amber-400"
          />
          <QualityItem
            icon={TrendingUp}
            label={t("avgVariance")}
            value={(() => {
              const qd = (signalQuality as any)?.quality_details || (analysis as any).quality_details || {};
              return Number(qd.average_variance || 0).toFixed(4);
            })()}
            color="text-blue-600 dark:text-blue-400"
          />
        </div>

        {/* 通道级质量评分 */}
        {(() => {
          const qd = (signalQuality as any)?.quality_details || (analysis as any).quality_details || {};
          const cs = qd.channel_scores || {};
          const entries = Object.entries(cs) as [string, { score: number; reasons: string[] }][];
          if (entries.length === 0) return null;
          const sorted = entries.sort((a, b) => b[1].score - a[1].score);
          const maxScore = Math.max(...sorted.map(([, s]) => s.score), 1);
          return (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">{t("channelQualityTitle")}</h3>
              <div className="space-y-2">
                {sorted.map(([ch, info]) => {
                  const pct = Math.round((info.score / maxScore) * 100);
                  const barColor = info.score >= 2 ? "bg-red-500" : info.score === 1 ? "bg-amber-500" : "bg-emerald-500";
                  return (
                    <div key={ch} className="flex items-center gap-3">
                      <span className="w-28 truncate text-xs font-mono text-[var(--color-text-secondary)]" title={ch}>{ch}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-border)]">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-right text-xs font-medium text-[var(--color-text)]">{info.score}/3</span>
                      {info.reasons.length > 0 && (
                        <span className="text-xs text-[var(--color-text-secondary)]/70" title={info.reasons.join(", ")}>
                          {info.reasons.map(r => {
                            const reasonMap: Record<string, string> = {
                              high_variance: lang === "zh" ? "高方差" : "High Var",
                              high_gradient: lang === "zh" ? "高梯度" : "High Grad",
                            };
                            return reasonMap[r] || r.replace("kurt=", "k=");
                          }).join(", ")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 评分明细 */}
        {(() => {
          const qd = (signalQuality as any)?.quality_details || (analysis as any).quality_details || {};
          const noisyCount = (signalQuality as any)?.noisy_channels?.length || (analysis as any).noisy_channels?.length || 0;
          const artifactCount = ((signalQuality as any)?.possible_artifacts || (analysis as any).possible_artifacts || []).length || 0;
          const outlierPct = Number(qd.outlier_percentage || 0);
          const missing = (signalQuality as any)?.missing_data || (analysis as any).missing_data;
          const clipping = (signalQuality as any)?.clipping_detected || (analysis as any).clipping_detected;
          const hfNoise = (signalQuality as any)?.high_frequency_noise || (analysis as any).high_frequency_noise;

          const noisyPen = Math.min(noisyCount * 3, 30);
          const artifactPen = Math.min(artifactCount * 6, 20);
          const outlierPen = Math.min(outlierPct * 5, 15);
          const missingPen = missing ? 20 : 0;
          const clippingPen = clipping ? 15 : 0;
          const hfPen = hfNoise ? 10 : 0;
          const totalDeduct = noisyPen + artifactPen + outlierPen + missingPen + clippingPen + hfPen;
          const computedScore = Math.max(0, Math.min(100, 100 - totalDeduct));

          const rows = [
            { label: t("noisyChannels"), deduct: noisyPen, detail: `${noisyCount} ${lang === "zh" ? "个" : ""}` },
            { label: t("blinkArtifacts"), deduct: artifactPen, detail: `${artifactCount} ${lang === "zh" ? "个" : ""}` },
            { label: t("outlierPercentage"), deduct: Math.round(outlierPen), detail: `${outlierPct.toFixed(1)}%` },
            { label: t("missingData"), deduct: missingPen, detail: missing ? t("yes") : t("no") },
            { label: t("clipping"), deduct: clippingPen, detail: clipping ? t("yes") : t("no") },
            { label: t("highFreqNoise"), deduct: hfPen, detail: hfNoise ? t("yes") : t("no") },
          ].filter(r => r.deduct > 0);

          if (rows.length === 0) return null;

          return (
            <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">{t("scoreBreakdown") || (lang === "zh" ? "评分明细" : "Score Breakdown")}</h3>
                <span className="text-xs tabular-nums text-[var(--color-text-secondary)]">= {computedScore}/100</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>{lang === "zh" ? "基础分" : "Base"}</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">100</span>
                </div>
                {rows.map(r => (
                  <div key={r.label} className="flex justify-between text-xs">
                    <span className="text-[var(--color-text-secondary)]">
                      {r.label} <span className="opacity-60">({r.detail})</span>
                    </span>
                    <span className="font-mono text-red-500 dark:text-red-400">-{r.deduct}</span>
                  </div>
                ))}
                <div className="border-t border-[var(--color-border)] pt-1.5 flex justify-between text-xs font-semibold">
                  <span className="text-[var(--color-text)]">{lang === "zh" ? "最终得分" : "Final Score"}</span>
                  <span className="font-mono text-[var(--color-text)]">{computedScore}</span>
                </div>
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
          <div className="mb-6 grid grid-cols-4 gap-3">
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
