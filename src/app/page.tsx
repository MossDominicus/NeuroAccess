"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLang } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { useAnalysis } from "@/lib/analysis-context";
import {
  UploadCloud,
  DownloadCloud,
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Cpu, Pause, RefreshCw, RotateCcw,
} from "lucide-react";

type Status = "pending" | "reading" | "computing" | "analysisReady" | "explaining" | "completed" | "failed";



// ── 水平进度条 ──────────────────────────────────────────────────────
function ProgressBar({ status }: { status: Status }) {
  const { t } = useLang();
  const map: Record<Status, { label: string; pct: number; color: string }> = {
    pending:     { label: "pending", pct: 0,   color: "bg-[var(--color-border)]" },
    reading:     { label: "reading", pct: 33,  color: "bg-blue-500" },
    computing:   { label: "computing", pct: 66, color: "bg-amber-500" },
    analysisReady: { label: "analysisReady", pct: 80, color: "bg-emerald-500" },
    explaining:  { label: "explaining", pct: 80, color: "bg-purple-500" },
    completed:   { label: "completed", pct: 100, color: "bg-emerald-500" },
    failed:      { label: "failed", pct: 100,  color: "bg-red-500" },
  };
  const { label, pct, color } = map[status] || map.pending;
  const isRunning = status === "reading" || status === "computing" || status === "explaining";

  return (
    <div className="flex items-center gap-2">
      {/* 进度条固定宽度，不随语言文本长度变化 */}
      <div className="w-24 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden shrink-0">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color} ${isRunning ? "animate-pulse" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-medium text-[var(--color-text-secondary)] whitespace-nowrap shrink-0">
        {t(label)}
      </span>
    </div>
  );
}

// ── OverviewCard ─────────────────────────────────────────────────────
function OverviewCard({ analysis }: { analysis: any }) {
  const { t } = useLang();
  if (!analysis) return null;
  const items = [
    { label: t("fileName"),    value: analysis.file_name || "-" },
    { label: t("channelCount"), value: analysis.channel_count ?? "-" },
    { label: t("samplingRate"), value: analysis.sampling_rate ?? "-" },
    { label: t("duration"),     value: analysis.duration ?? "-" },
    { label: t("signalQuality"), value: analysis.signal_quality_score != null ? Number(analysis.signal_quality_score).toFixed(0) : "-" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4 shadow-sm">
          <div className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">{it.label}</div>
          <div className="mt-1 truncate text-xs sm:text-sm font-bold text-[var(--color-text)]">{String(it.value)}</div>
        </div>
      ))}
    </div>
  );
}

// ── ScoreBar ──────────────────────────────────────────────────────────
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

// ── LiteracyScores ──────────────────────────────────────────────────
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

// ── ExplanationCards ───────────────────────────────────────────────
function ExplanationCards({ analysis }: { analysis: any }) {
  const { lang, t } = useLang();
  const explanations = analysis?.explanations?.[lang] || analysis?.explanations;
  const disclaimer  = analysis?.disclaimer?.[lang] || analysis?.disclaimer;
  if (!explanations) return null;

  const cards = [
    { key: "beginner", label: t("beginnerMode"), hint: t("beginnerHint") },
    { key: "student",  label: t("studentMode"),  hint: t("studentHint") },
    { key: "research", label: t("researchMode"), hint: t("researchHint") },
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
          <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {(() => {
              const lvl = analysis.confidence?.level;
              if (!lvl) return "-";
              const k = `confidence${lvl}`;
              const l = t(k);
              return l === k ? lvl : l;
            })()}
          </div>
          <div className="mt-1 text-xs leading-6 text-[var(--color-text-secondary)]">{analysis.confidence?.reason || ""}</div>
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

// ── FileCard ────────────────────────────────────────────────────────
function FileCard({
  item, expanded, onToggle, onRemove, running, paused, onRetry,
}: {
  item: any;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  running: boolean;
  paused: boolean;
  onRetry?: (id: string) => void;
}) {
  const { t } = useLang();

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-3 sm:py-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3 flex-1">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-[var(--color-text-secondary)]" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs sm:text-sm font-medium text-[var(--color-text)]">{item.name}</div>
            <div className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">
              {(item.size / 1024 / 1024).toFixed(2)} {t("mb")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <ProgressBar status={item.status} />
          {item.status === "failed" && onRetry && (
            <button onClick={() => onRetry(item.id)} className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-amber-950/30 hover:text-amber-400" title={t("retry")}>
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          {(!running || paused) && item.status !== "reading" && item.status !== "computing" && item.status !== "explaining" && (
            <button onClick={onRemove} className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-red-950/30 hover:text-red-400">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {item.error && (
        <div className="mx-5 mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-2.5 text-xs text-red-700 dark:text-red-400">
          {item.error}
        </div>
      )}

      {expanded && (item.status === "completed") && !item.error && (
        <div className="border-t border-[var(--color-border)] px-5 py-4">
          <div className="text-center">
            <Link
              href="/reports"
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            >
              {t("viewInReports") || "View report →"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stat badge ──────────────────────────────────────────────────────
function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${color}`}>
      {label}: {value}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD INNER (consumes context from root layout AnalysisProvider)
// ═══════════════════════════════════════════════════════════════

function DashboardInner() {
  const { t } = useLang();
  const { user, loading } = useAuth();
  const {
    files, running, paused, expandId, setExpandId,
    handleFileSelect, removeFile, clearAll, startAnalysis, pauseAnalysis, resumeAnalysis, retryFile,
  } = useAnalysis();

  // ── 自动展开最近的活动文件（页面切换回来时显示当前进度）─────────
  useEffect(() => {
    // 优先展开正在分析的文件
    const active = files.find(f =>
      f.status === "reading" || f.status === "computing" || f.status === "explaining"
    );
    if (active) {
      setExpandId(active.id);
      return;
    }
    // 其次展开最近完成的文件
    const completed = [...files].reverse().find(f => f.status === "completed" || f.status === "analysisReady");
    if (completed) {
      setExpandId(completed.id);
      return;
    }
    // 都不存在则折叠
    setExpandId(null);
  }, [files, setExpandId]);
  const [aiStatus, setAiStatus] = useState<{ online: boolean; model: string; mode: string } | null>(null);
  const aiFailCountRef = useRef(0);
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        if (data.openrouter === true) {
          aiFailCountRef.current = 0;
          setAiStatus({
            online: true,
            model: "qwen-2.5-7b",
            mode: t("apiMode"),
          });
        } else {
          aiFailCountRef.current++;
          if (aiFailCountRef.current >= 2) {
            setAiStatus({ online: false, model: "-", mode: t("cpuMode") });
          }
        }
      } catch {
        aiFailCountRef.current++;
        if (aiFailCountRef.current >= 2) {
          setAiStatus({ online: false, model: "-", mode: t("cpuMode") });
        }
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [t]);

  const stats = {
    total:      files.length,
    completed:  files.filter((f: any) => f.status === "completed").length,
    failed:     files.filter((f: any) => f.status === "failed").length,
    processing:  files.filter((f: any) => f.status === "reading" || f.status === "computing" || f.status === "explaining").length,
  };
  // 分析进行中 = 正在运行且未暂停（暂停后可以继续上传文件）
  const hasActiveAnalysis = running && !paused;

  // ── 未登录：先转圈校验会话，再提示登录（避免刷新瞬间闪现登录框）──
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }
  if (!user) {
    return (
      <motion.div
        className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
      >
        <div className="text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-[var(--color-text-secondary)]/50" />
          <p className="text-lg font-medium text-[var(--color-text)]">{t("pleaseLogin")}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.05 }}
      className="mx-auto max-w-5xl space-y-4 sm:space-y-6 px-3 sm:px-6 py-4 sm:py-8 pb-[env(safe-area-inset-bottom,16px)]"
    >
      {/* 网站介绍 */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-50/80 to-cyan-50/80 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200/50 dark:border-blue-800/30 p-5 text-sm leading-relaxed text-[var(--color-text)]">
        {t("siteIntro")}
        <span className="mt-2 block font-semibold text-blue-600 dark:text-blue-400 text-sm">{t("freePlatform")}</span>
      </div>

      {/* EEG Analysis Panel */}
      <div className="space-y-6">
        {/* Upload area */}
        {!hasActiveAnalysis ? (
          <label
            className="rounded-3xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-10 text-center shadow-sm transition-colors hover:border-[var(--color-text-secondary)] active:border-[var(--color-primary)] cursor-pointer min-h-[160px] flex flex-col items-center justify-center w-full"
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
          >
            <UploadCloud className="mx-auto mb-2 sm:mb-4 h-6 w-6 sm:h-10 sm:w-10 text-[var(--color-text-secondary)]" />
            <span className="block text-xs sm:text-base font-medium text-[var(--color-text)]">{t("dragOrClick")}</span>
            <span className="mt-1 block text-[10px] sm:text-sm text-[var(--color-text-secondary)]">{t("supportedFormats")}</span>
            <input
              type="file"
              multiple
              className="sr-only"
              onChange={(e) => { handleFileSelect(e.target.files); if (e.target) e.target.value = ""; }}
            />
          </label>
        ) : (
          <div
            className="rounded-3xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-10 text-center opacity-60"
          >
            <Activity className="mx-auto mb-4 h-10 w-10 text-amber-500 animate-pulse" />
            <p className="text-sm font-medium text-[var(--color-text)]">{t("uploadDisabledDuringAnalysis")}</p>
          </div>
        )}

        {/* 黄色下载测试文件按钮（仪表盘右下角固定，分析时隐藏） */}
        {!hasActiveAnalysis && (
          <a
            href="/test-sample.edf"
            download="test_16ch_128hz.edf"
            className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-xl bg-yellow-300 hover:bg-yellow-400 active:bg-yellow-500 text-yellow-800 font-semibold text-sm px-5 py-3 shadow-md transition-colors"
          >
            <DownloadCloud className="h-5 w-5" />
            <span>{t("downloadTestEEG")}</span>
          </a>
        )}

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <StatBadge label={t("totalFiles")}  value={stats.total}     color="bg-[var(--color-border)] text-[var(--color-text-secondary)]" />
                <StatBadge label={t("completed")}   value={stats.completed} color="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" />
                <StatBadge label={t("failed")}      value={stats.failed}    color="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" />
                <StatBadge label={t("processing")}  value={stats.processing} color="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" />
              </div>
              <div className="flex gap-2">
                {/* Primary button: Start / Processing (disabled) / Resume */}
                <button
                  onClick={() => {
                    if (paused) {
                      resumeAnalysis();
                    } else {
                      startAnalysis();
                    }
                  }}
                  disabled={files.length === 0 || (running && !paused)}
                  className="rounded-2xl bg-[var(--color-primary)] dark:bg-[var(--color-primary)] dark:text-[var(--color-bg)] px-6 py-2.5 text-sm font-semibold text-[var(--color-bg)] transition-colors hover:opacity-90 disabled:opacity-40"
                >
                  {paused ? (t("resumeAnalysis") || "Resume") : (
                    running ? t("processing") : (t("startAnalysis") || "Start Analysis")
                  )}
                </button>

                {/* Secondary button: Pause (when running, not paused) / Clear (when paused or idle) */}
                {running && !paused ? (
                  <button
                    onClick={pauseAnalysis}
                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-border)]"
                  >
                    <Pause className="inline h-4 w-4" /> {t("pauseAnalysis") || "Pause"}
                  </button>
                ) : (
                  <button
                    onClick={clearAll}
                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-border)]"
                  >
                    <Trash2 className="inline h-4 w-4" /> {t("clearAll")}
                  </button>
                )}
              </div>
            </div>
            {files.map((item: any) => (
                <FileCard
                  key={item.id}
                  item={item}
                  expanded={expandId === item.id}
                  onToggle={() => setExpandId(expandId === item.id ? null : item.id)}
                  onRemove={() => removeFile(item.id)}
                  running={running}
                  paused={paused}
                  onRetry={retryFile}
                />
            ))}
            {paused && files.length > 1 && (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center text-sm text-[var(--color-text-secondary)]">
                {t("batchSummary")}：{stats.completed} / {stats.total} {t("completed").toLowerCase()}，{stats.failed} {t("failed").toLowerCase()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Status Bar — 永远绿色，不管AI是否在线（分析用模板兜底，不影响功能） */}
      {aiStatus && aiStatus.online && (
        <div className="flex items-center justify-center gap-1.5 py-2 text-xs border-t border-[var(--color-border)] mt-4">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
          <span className="font-medium text-green-700 dark:text-green-400">{t("aiModelLabel")}</span>
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════

export default function DashboardPage() {
  return <DashboardInner />;
}
