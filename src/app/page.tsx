"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLang } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { useAnalysis } from "@/lib/analysis-context";
import {
  UploadCloud,
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Cpu, Pause,
} from "lucide-react";

type Status = "pending" | "reading" | "computing" | "analysisReady" | "explaining" | "completed" | "failed";

// ── Status badge ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Status }) {
  const { t } = useLang();
  const map: Record<Status, { key: string; color: string; Icon: any; spin?: boolean }> = {
    pending:     { key: "pending",     color: "bg-[var(--color-border)] text-[var(--color-text-secondary)]",             Icon: Clock,        spin: false },
    reading:     { key: "reading",     color: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",        Icon: UploadCloud,  spin: true  },
    computing:   { key: "computing",   color: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",    Icon: Activity,     spin: true  },
    analysisReady: { key: "analysisReady", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", Icon: CheckCircle2, spin: false },
    explaining:  { key: "explaining",  color: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400", Icon: Cpu,        spin: true  },
    completed:   { key: "completed",   color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", Icon: CheckCircle2, spin: false },
    failed:      { key: "failed",      color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",            Icon: AlertTriangle, spin: false },
  };
  const { key, color, Icon, spin } = map[status] || map.failed;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      <Icon className={`w-3.5 h-3.5 ${spin ? "animate-spin" : ""}`} />
      <span>{t(key)}</span>
    </span>
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
  item, expanded, onToggle, onRemove, running, paused,
}: {
  item: any;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  running: boolean;
  paused: boolean;
}) {
  const { t } = useLang();

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <FileText className="h-5 w-5 flex-shrink-0 text-[var(--color-text-secondary)]" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-[var(--color-text)]">{item.name}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              {(item.size / 1024 / 1024).toFixed(2)} {t("mb")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={item.status} />
          {(!running || paused) && (
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

      {expanded && (item.status === "analysisReady" || item.status === "explaining" || item.status === "completed") && !item.error && (
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
  const { user } = useAuth();
  const {
    files, running, paused, expandId, setExpandId,
    handleFileSelect, removeFile, clearAll, startAnalysis, pauseAnalysis, resumeAnalysis,
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
            className="rounded-3xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 sm:p-10 text-center shadow-sm transition-colors hover:border-[var(--color-text-secondary)] active:border-[var(--color-primary)] cursor-pointer min-h-[160px] flex flex-col items-center justify-center"
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
          >
            <UploadCloud className="mx-auto mb-3 sm:mb-4 h-8 w-8 sm:h-10 sm:w-10 text-[var(--color-text-secondary)]" />
            <span className="block text-sm sm:text-base font-medium text-[var(--color-text)]">{t("dragOrClick")}</span>
            <span className="mt-1 block text-xs sm:text-sm text-[var(--color-text-secondary)]">{t("supportedFormats")}</span>
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

      {/* AI Status Bar — 仅保留绿色对号 + qwen2.5 */}
      {aiStatus && (
        <div className="flex items-center justify-center gap-1.5 py-2 text-xs border-t border-[var(--color-border)] mt-4">
          {aiStatus.online ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
              <span className="font-medium text-green-700 dark:text-green-400">{t("aiModelLabel")}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
              <span className="font-medium text-red-700 dark:text-red-400">{t("aiOffline")}</span>
            </>
          )}
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
