"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  FileText,
  Download,
  Trash2,
  X,
  Calendar,
  Brain,
  FileDown,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { useLang } from "@/lib/language-context";
import {
  StoredReport,
  loadReports,
  deleteReport as deleteReportFromStorage,
} from "@/lib/reports-storage";

/* 模式颜色 */
const modeColor: Record<string, string> = {
  Beginner: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  Student: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  Research: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
};

const modeKey: Record<string, string> = {
  Beginner: "beginnerModeLabel",
  Student: "studentModeLabel",
  Research: "researchModeLabel",
};

/* ── 复用 Dashboard 的分析显示组件 ───────────────────────────── */

function OverviewCard({ analysis }: { analysis: any }) {
  const { t } = useLang();
  if (!analysis) return null;
  const items = [
    { label: t("fileName"),    value: analysis.file_name || "-" },
    { label: t("channelCount"), value: analysis.channel_count ?? "-" },
    { label: t("samplingRate"), value: analysis.sampling_rate ?? "-" },
    { label: t("duration"),     value: analysis.duration ?? "-" },
    { label: t("signalQuality"), value: analysis.signal_quality_score ?? "-" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
          <div className="text-xs text-[var(--color-text-secondary)]">{it.label}</div>
          <div className="mt-1 truncate text-sm font-bold text-[var(--color-text)]">{String(it.value)}</div>
        </div>
      ))}
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-[var(--color-text-secondary)]">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function LiteracyScores({ scores }: { scores: any }) {
  const { t } = useLang();
  if (!scores || typeof scores !== "object") return null;
  const list = [
    { key: "learning_readability_score",  label: t("learningReadability"), color: "bg-blue-500" },
    { key: "signal_clarity_score",        label: t("signalClarity"),       color: "bg-emerald-500" },
    { key: "beginner_friendliness_score", label: t("beginnerFriendliness"), color: "bg-violet-500" },
    { key: "research_usefulness_score",  label: t("researchUsefulness"),  color: "bg-amber-500" },
    { key: "noise_complexity_score",     label: t("noiseComplexity"),     color: "bg-rose-500" },
  ];
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
      <div className="mb-3 text-sm font-bold text-[var(--color-text)]">{t("eegLiteracyScores")}</div>
      <div className="space-y-3">
        {list.map((it) => (
          <ScoreBar key={it.key} label={it.label} value={scores[it.key] ?? 0} color={it.color} />
        ))}
      </div>
    </div>
  );
}

function ExplanationCards({ analysis }: { analysis: any }) {
  const { lang, t } = useLang();
  // 支持新旧两种数据结构
  const explanations = analysis?.explanations?.[lang] || analysis?.explanations;
  const disclaimer  = analysis?.disclaimer?.[lang] || analysis?.disclaimer;
  if (!explanations) return null;

  const cards = [
    { key: "beginner", label: t("beginnerMode"), hint: t("beginnerHint") },
    { key: "student",  label: t("studentMode"),  hint: t("studentHint") },
    { key: "research", label: t("researchMode"),  hint: t("researchHint") },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.key} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">{c.hint}</div>
            <h4 className="text-sm font-bold text-[var(--color-text)]">{c.label}</h4>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--color-text-secondary)]">
              {explanations[c.key] || t("explanationFailed")}
            </p>
          </div>
        ))}
      </div>

      {/* Confidence + Limitations */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="text-sm font-bold text-[var(--color-text)]">{t("interpretationConfidence")}</div>
          <div className="mt-2 text-sm text-[var(--color-text-secondary)]">{analysis.confidence?.level || "-"}</div>
          <div className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">{analysis.confidence?.reason || ""}</div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 lg:col-span-2">
          <div className="text-sm font-bold text-[var(--color-text)]">{t("whatDataCannotTell")}</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--color-text-secondary)]">
            {(analysis.limitations || []).map((x: string, i: number) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Disclaimer */}
      {disclaimer && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-xs leading-6 text-amber-800 dark:text-amber-400">
          <strong>{t("nonMedicalDisclaimer")}：</strong>
          {disclaimer}
        </div>
      )}
    </div>
  );
}

function BandpowerChart({ bandpowerPercent }: { bandpowerPercent: Record<string, string> | undefined }) {
  if (!bandpowerPercent || Object.keys(bandpowerPercent).length === 0) return null;
  const entries = Object.entries(bandpowerPercent);
  const maxVal = Math.max(...entries.map(([, v]) => parseFloat(v)), 1);
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
      <div className="mb-3 text-sm font-bold text-[var(--color-text)]">频段能量（百分比）</div>
      <div className="space-y-2">
        {entries.map(([band, val]) => {
          const num = parseFloat(val);
          return (
            <div key={band} className="flex items-center gap-3">
              <span className="w-12 capitalize text-xs font-medium text-[var(--color-text-secondary)]">{band}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((num / maxVal) * 100, 100)}%`,
                    backgroundColor:
                      band === "delta" ? "#8b5cf6" :
                      band === "theta" ? "#06b6d4" :
                      band === "alpha" ? "#10b981" :
                      band === "beta"  ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
              <span className="w-16 text-right text-xs font-mono text-[var(--color-text-secondary)]">{val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 导出 PDF：新窗口打开报告 HTML 再打印 ─────────────────────── */

function buildReportHtml(report: StoredReport, lang: string, t: (key: string) => string): string {
  const a = report.analysis as any;
  const bp = a?.bandpower as Record<string, number> | undefined;
  const scores = a?.eeg_literacy_scores as Record<string, number> | undefined;
  // 支持新旧两种数据结构
  const explanations = (a?.explanations?.[lang] || a?.explanations) as Record<string, string> | undefined;
  const disclaimer  = (a?.disclaimer?.[lang] || a?.disclaimer) as string | undefined;

  const scoreList = scores ? [
    { key: "learning_readability_score", label: t("learningReadability") },
    { key: "signal_clarity_score", label: t("signalClarity") },
    { key: "beginner_friendliness_score", label: t("beginnerFriendliness") },
    { key: "research_usefulness_score", label: t("researchUsefulness") },
    { key: "noise_complexity_score", label: t("noiseComplexity") },
  ] : [];

  const expCards = explanations ? [
    { key: "beginner", label: t("beginnerMode"), hint: t("beginnerHint") },
    { key: "student", label: t("studentMode"), hint: t("studentHint") },
    { key: "research", label: t("researchMode"), hint: t("researchHint") },
  ] : [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>NeuroAccess Report - ${report.fileName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; background: #fff; padding: 40px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .subtitle { font-size: 13px; color: #666; margin-bottom: 28px; }
  h2 { font-size: 15px; font-weight: 600; margin: 24px 0 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px; }
  .meta-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; }
  .meta-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
  .meta-value { font-size: 14px; font-weight: 600; margin-top: 2px; color: #111; }
  .overview-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
  .overview-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
  .overview-label { font-size: 11px; color: #6b7280; }
  .overview-value { font-size: 13px; font-weight: 700; margin-top: 2px; }
  .bp-row { display: flex; align-items: center; gap: 12px; margin-bottom: 7px; }
  .bp-label { width: 50px; font-size: 12px; text-transform: capitalize; color: #374151; }
  .bp-bar { flex: 1; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
  .bp-fill { height: 100%; border-radius: 4px; }
  .bp-val { width: 48px; font-size: 12px; text-align: right; font-family: monospace; color: #374151; }
  .score-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .score-label { width: 160px; font-size: 12px; color: #374151; }
  .score-bar { flex: 1; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
  .score-fill { height: 100%; border-radius: 4px; }
  .score-val { width: 40px; font-size: 12px; text-align: right; color: #374151; }
  .exp-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; }
  .exp-hint { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
  .exp-title { font-size: 14px; font-weight: 600; margin-bottom: 7px; color: #111; }
  .exp-text { font-size: 13px; line-height: 1.7; color: #374151; white-space: pre-line; }
  .confidence-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin-bottom: 12px; flex: 1; }
  .limitations-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin-bottom: 12px; flex: 2; }
  .box-title { font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #111; }
  .box-text { font-size: 12px; color: #374151; line-height: 1.6; }
  .disclaimer { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px 14px; margin-top: 24px; font-size: 12px; color: #92400e; line-height: 1.6; }
  .two-col { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; margin-bottom: 12px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <h1>NeuroAccess EEG Report</h1>
  <p class="subtitle">${report.fileName} &nbsp;·&nbsp; ${report.date}</p>

  <div class="meta-grid">
    <div class="meta-item"><div class="meta-label">${t("fileName")}</div><div class="meta-value">${report.fileName}</div></div>
    <div class="meta-item"><div class="meta-label">${t("date")}</div><div class="meta-value">${report.date}</div></div>
    <div class="meta-item"><div class="meta-label">${t("mode")}</div><div class="meta-value">${report.mode}</div></div>
    <div class="meta-item"><div class="meta-label">${t("signalQuality")}</div><div class="meta-value">${a?.signal_quality_score ?? "-"}</div></div>
    <div class="meta-item"><div class="meta-label">${t("channelCount")}</div><div class="meta-value">${a?.channel_count ?? "-"}</div></div>
    <div class="meta-item"><div class="meta-label">${t("samplingRate")}</div><div class="meta-value">${a?.sampling_rate ?? "-"} Hz</div></div>
  </div>

  ${bp && Object.keys(bp).length > 0 ? `
  <h2>Bandpower</h2>
  <div style="margin-bottom:20px">
    ${Object.entries(bp).map(([band, value]) => {
      const max = Math.max(...Object.values(bp));
      const pct = max > 0 ? (Number(value) / max) * 100 : 0;
      const color = band === "delta" ? "#8b5cf6" : band === "theta" ? "#06b6d4" : band === "alpha" ? "#10b981" : band === "beta" ? "#f59e0b" : "#ef4444";
      return `<div class="bp-row"><span class="bp-label">${band}</span><div class="bp-bar"><div class="bp-fill" style="width:${pct}%;background:${color}"></div></div><span class="bp-val">${Number(value).toFixed(1)}</span></div>`;
    }).join("")}
  </div>` : ""}

  ${scores ? `
  <h2>${t("eegLiteracyScores")}</h2>
  <div style="margin-bottom:20px">
    ${scoreList.map(it => {
      const v = scores[it.key] ?? 0;
      const barColors = ["#3b82f6","#10b981","#8b5cf6","#f59e0b","#f43f5e"];
      const idx = scoreList.indexOf(it);
      return `<div class="score-row"><span class="score-label">${it.label}</span><div class="score-bar"><div class="score-fill" style="width:${Math.min(100,Math.max(0,v))}%;background:${barColors[idx]}"></div></div><span class="score-val">${v}</span></div>`;
    }).join("")}
  </div>` : ""}

  ${explanations ? `
  <h2>Interpretations</h2>
  <div style="margin-bottom:20px">
    ${expCards.map(c => `<div class="exp-card"><div class="exp-hint">${c.hint}</div><div class="exp-title">${c.label}</div><div class="exp-text">${explanations[c.key] || "-"}</div></div>`).join("")}
  </div>
  <div class="two-col">
    <div class="confidence-box"><div class="box-title">${t("interpretationConfidence")}</div><div class="box-text">${a?.confidence?.level || "-"}</div><div style="font-size:11px;color:#6b7280;margin-top:4px">${a?.confidence?.reason || ""}</div></div>
    <div class="limitations-box"><div class="box-title">${t("whatDataCannotTell")}</div><ul style="padding-left:18px;font-size:12px;color:#374151;line-height:1.7">${(a?.limitations || []).map((x: any)=>`<li>${x}</li>`).join("")}</ul></div>
  </div>` : ""}

  ${disclaimer ? `<div class="disclaimer"><strong>${t("nonMedicalDisclaimer")}：</strong>${disclaimer}</div>` : ""}

  <script>
    // 自动触发打印对话框，打印后自动关闭窗口
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
        // 打印对话框关闭后（或取消后）自动关闭窗口
        setTimeout(function() { window.close(); }, 500);
      }, 300);
    });
  <\/script>
</body>
</html>`;
}

/* ── Reports Page ─────────────────────────────────────────────── */

export default function ReportsPage() {
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<StoredReport | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const { lang, t } = useLang();

  // 加载时从 localStorage 读取报告
  useEffect(() => {
    setReports(loadReports());
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const allSelected = reports.length > 0 && selected.length === reports.length;
  const toggleSelectAll = () => {
    setSelected(allSelected ? [] : reports.map((r) => r.id));
  };

  const handleExport = (report: StoredReport) => {
    const html = buildReportHtml(report, lang, t);
    const printWin = window.open("", "_blank", "width=1000,height=800,scrollbars=yes");
    if (printWin) {
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
    } else {
      // 弹窗被拦截，提示用户允许弹窗
      alert(t("popupBlocked"));
    }
  };

  // 导出全部
  const handleExportAll = () => {
    if (reports.length === 0) return;
    alert(t("exportAllHint") || "请逐条查看报告并导出 PDF");
  };

  const handleDelete = (report: StoredReport) => {
    setDeleteTarget(report);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setReports((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    deleteReportFromStorage(deleteTarget.id);
    setSelected((prev) => prev.filter((id) => id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const confirmBatchDelete = () => {
    setReports((prev) => prev.filter((r) => !selected.includes(r.id)));
    selected.forEach((id) => deleteReportFromStorage(id));
    setSelected([]);
    setBatchDeleteOpen(false);
  };

  const statCards = [
    { labelKey: "totalReports", value: reports.length, icon: FileText },
  ];

  return (
    <motion.div
      className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <section className="mx-auto max-w-6xl px-5 py-8">
        {/* 标题栏 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("reportsTitle")}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t("reportsSubtitle")}</p>
          </div>
          {selected.length > 0 ? (
            <button
              onClick={() => setBatchDeleteOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-600/10 transition-all duration-300 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
              {t("batchDeleteCount").replace("{count}", String(selected.length))}
            </button>
          ) : (
            <button
              onClick={handleExportAll}
              disabled={reports.length === 0}
              className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-gray-900/10 transition-all duration-300 hover:bg-gray-800 disabled:opacity-40"
            >
              <FileDown className="h-4 w-4" />
              {t("exportAllPdf")}
            </button>
          )}
        </div>

        {/* 统计卡片 */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  <span className="text-xs text-[var(--color-text-secondary)]">{t(card.labelKey)}</span>
                </div>
                <div className="text-xl font-bold text-[var(--color-text)]">{card.value}</div>
              </motion.div>
            );
          })}
        </div>

        {/* 报告列表 */}
        {reports.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-16 text-center"
          >
            <FileText className="mx-auto mb-4 h-12 w-12 text-[var(--color-text-secondary)]/70" />
            <p className="text-[var(--color-text-secondary)]">{t("noReports")}</p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]/70">{t("noReportsDesc")}</p>
          </motion.div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            {/* 表头 */}
            <div className="grid grid-cols-[40px_1fr_140px_100px_120px] gap-4 px-5 py-3 text-xs font-medium text-[var(--color-text-secondary)]">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
                />
              </div>
              <div>{t("fileName")}</div>
              <div>{t("date")}</div>
              <div>{t("quality")}</div>
              <div className="text-right">{t("actions")}</div>
            </div>

            {/* 行 */}
            <AnimatePresence>
              {reports.map((report, i) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                  transition={{ delay: i * 0.05 }}
                  className="grid grid-cols-[40px_1fr_140px_100px_120px] gap-4 px-5 py-3.5 border-t border-[var(--color-border)] hover:bg-[var(--color-bg)]/50 transition-colors items-center"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(report.id)}
                    onChange={(e) => { e.stopPropagation(); toggleSelect(report.id); }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
                  />
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 flex-shrink-0 text-[var(--color-text-secondary)]" />
                    <span className="truncate text-sm font-mono">{report.fileName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                    <Calendar className="h-3 w-3" />
                    {report.date}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${report.quality >= 80 ? "bg-green-500" : report.quality >= 60 ? "bg-yellow-500" : "bg-red-500"}`} />
                    <span className="text-sm font-medium">{report.quality}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/reports/${report.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] inline-flex"
                      title={t("viewDetail")}
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleExport(report); }}
                      className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
                      title={t("exportPdf")}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(report); }}
                      className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-red-50 hover:text-red-500"
                      title={t("delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* 批量删除确认弹窗 */}
      <AnimatePresence>
        {batchDeleteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => setBatchDeleteOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-sm overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-2xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[var(--color-text)]">{t("batchDelete")}</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {lang === "zh"
                    ? `将删除 ${selected.length} 条报告，此操作不可恢复，是否继续？`
                    : `This will delete ${selected.length} reports. This action cannot be undone. Continue?`}
                </p>
              </div>
              <div className="flex items-center gap-2 border-t border-[var(--color-border)] px-6 py-4">
                <button
                  onClick={() => setBatchDeleteOpen(false)}
                  className="flex-1 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg)]"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={confirmBatchDelete}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  {t("confirm")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-sm overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-2xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[var(--color-text)]">{t("confirmDelete")}</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">{t("confirmDeleteDesc")}</p>
              </div>
              <div className="flex items-center gap-2 border-t border-[var(--color-border)] px-6 py-4">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg)]"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  {t("confirm")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
