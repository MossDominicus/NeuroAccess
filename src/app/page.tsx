"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useLang } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { useAnalysis } from "@/lib/analysis-context";
import IntroAnimation from "@/components/IntroAnimation";
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
} from "lucide-react";

type Status = "pending" | "analyzing" | "completed" | "failed";

// ── Status badge ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Status }) {
  const { t } = useLang();
  const map: Record<Status, { key: string; color: string; Icon: any; spin?: boolean }> = {
    pending:     { key: "pending",     color: "bg-[var(--color-border)] text-[var(--color-text-secondary)]",        Icon: Clock,     spin: false },
    analyzing:   { key: "analyzing",  color: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",   Icon: Activity,  spin: true  },
    completed:   { key: "completed",   color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", Icon: CheckCircle2, spin: false },
    failed:      { key: "failed",      color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",       Icon: AlertTriangle, spin: false },
  };
  const { key, color, Icon, spin } = map[status];
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

// ── ScoreBar ────────────────────────────────────────────────────────
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

// ── FileCard ────────────────────────────────────────────────────────
function FileCard({
  item, expanded, onToggle, onRemove,
}: {
  item: any;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
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
              {(item.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={item.status} />
          <button onClick={onToggle} className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-text)]">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button onClick={onRemove} className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-red-950/30 hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {item.error && (
        <div className="mx-5 mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-2.5 text-xs text-red-700 dark:text-red-400">
          {item.error}
        </div>
      )}

      {expanded && item.status === "completed" && !item.error && (
        <div className="border-t border-[var(--color-border)] px-5 py-4 text-center">
          <a
            href="/reports"
            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          >
            {t("viewInReports") || "查看报告 →"}
          </a>
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

// ── Main Page ───────────────────────────────────────────────────────
export default function UploadAnalysisCenter() {
  const { t } = useLang();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();
  const {
    files, running, expandId, setExpandId,
    handleFileSelect, removeFile, clearAll, startAnalysis,
  } = useAnalysis();

  // ── 启动动画状态 ─────────────────────────────────────
  // showIntro: false = 显示主界面（SSR 默认，避免空白）
  // showIntro: true  = 显示动画
  const [showIntro, setShowIntro] = useState(false);

  // 客户端挂载后检查 localStorage 或 URL 参数
  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("intro");
    if (forced === "1") {
      window.sessionStorage.removeItem("neuroaccess-intro-played");
      setShowIntro(true);
    } else {
      const played = window.sessionStorage.getItem("neuroaccess-intro-played");
      if (played !== "true") {
        setShowIntro(true);
      }
    }
  }, []);

  // 动画播放完毕
  const handleIntroComplete = useCallback(() => {
    window.sessionStorage.setItem("neuroaccess-intro-played", "true");
    setShowIntro(false);
  }, []);

  // Settings 手动重播
  const replayIntro = useCallback(() => {
    window.sessionStorage.removeItem("neuroaccess-intro-played");
    setShowIntro(true);
  }, []);
  useEffect(() => {
    (window as any).__replayIntro = replayIntro;
    return () => { delete (window as any).__replayIntro; };
  }, [replayIntro]);

  // 显示动画
  if (showIntro) return <IntroAnimation onComplete={handleIntroComplete} />;

  const stats = {
    total:      files.length,
    completed:  files.filter((f: any) => f.status === "completed").length,
    failed:     files.filter((f: any) => f.status === "failed").length,
    processing:  files.filter((f: any) => f.status === "analyzing").length,
  };

  return (
    <motion.div
      className="mx-auto max-w-5xl space-y-6 px-6 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {/* Upload area */}
      <div
        className="rounded-3xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center shadow-sm transition-colors hover:border-[var(--color-text-secondary)]"
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
      >
        <UploadCloud className="mx-auto mb-4 h-10 w-10 text-[var(--color-text-secondary)]" />
        <p className="text-sm font-medium text-[var(--color-text)]">{t("dragOrClick")}</p>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{t("supportedFormats")}</p>
        <input
          ref={inputRef}
          type="file"
          accept=".edf,.bdf,.gdf,.csv"
          multiple
          className="hidden"
          onChange={(e) => { handleFileSelect(e.target.files); if (e.target) e.target.value = ""; }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-border)]"
        >
          {t("chooseFiles")}
        </button>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-4">
          {/* Stats + action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <StatBadge label={t("totalFiles")}  value={stats.total}     color="bg-[var(--color-border)] text-[var(--color-text-secondary)]" />
              <StatBadge label={t("completed")}   value={stats.completed} color="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" />
              <StatBadge label={t("failed")}      value={stats.failed}    color="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" />
              <StatBadge label={t("processing")}  value={stats.processing} color="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!user) { window.location.href = "/login"; return; }
                  startAnalysis();
                }}
                disabled={running || files.length === 0 || !user}
                className="rounded-2xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-40"
              >
                {!user ? (t("pleaseLogin") || "Please login to analyze") : (running ? t("processing") : t("startAnalysis"))}
              </button>
              <button
                onClick={clearAll}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-border)]"
              >
                <Trash2 className="inline h-4 w-4" /> {t("clearAll")}
              </button>
            </div>
          </div>

          {/* File cards */}
          {files.map((item: any) => (
            <FileCard
              key={item.id}
              item={item}
              expanded={expandId === item.id}
              onToggle={() => setExpandId(expandId === item.id ? null : item.id)}
              onRemove={() => removeFile(item.id)}
            />
          ))}

          {/* Batch summary */}
          {files.length > 1 && (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center text-sm text-[var(--color-text-secondary)]">
                {t("batchSummary")}：{stats.completed} / {stats.total} {t("completed").toLowerCase()}，{stats.failed} {t("failed").toLowerCase()}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
