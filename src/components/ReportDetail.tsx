"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/lib/language-context";
import { StoredReport } from "@/lib/reports-storage";
import AIExplanation from "@/components/AIExplanation";

import {
  FileText, Activity, BarChart3, Brain, TrendingUp,
  Shield, XCircle, Zap,
} from "lucide-react";
import {
  getLimitations, getCannotTell,
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
  const analysis = report.analysis || {};

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
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

          // 真实算法分项满分（与后端 analysis.py 及"评分逻辑"弹窗完全一致）：
          // 后端 quality_details 已直接返回各分项在 0~100 体系下的取值（SNR 0~15 / 一致性 0~10 / 频谱 0~15 / 基础 0~25 / 伪影 0~10 / 完整性 0~15 / 漂移 0~10），无 ×2.5；七项相加 = 总分。
          const M_SNR = 15;    // 信噪比 0~15
          const M_CONS = 10;   // 通道一致性 0~10
          const M_SPEC = 15;   // 频谱特征 0~15
          const M_BASE = 25;   // 基础分 0~25（动态）
          const M_ART = 10;    // 伪影扣分 0~10
          const M_INT = 15;    // 完整性扣分 0~15
          const M_DRIFT = 10;  // 基线漂移 0~10

          // 直接使用后端返回的真实分项分数（已是用户尺度，无需再缩放），
          // 每个分项如实反映其在真实算法中的取值与满分；总分在后端 = 七项之和（无 ×2.5）。
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

        {/* ── 噪声通道与伪影（数据存在但此前未渲染） ── */}
        {(() => {
          const noisy = (signalQuality as any).noisy_channels || (analysis as any).noisy_channels || [];
          const artifacts = (signalQuality as any).possible_artifacts || (analysis as any).possible_artifacts || [];
          if (noisy.length === 0 && artifacts.length === 0) return null;
          return (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {noisy.length > 0 && (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
                  <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">{t("noisyChannels")}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {noisy.map((n: string) => (
                      <span key={n} className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">{n}</span>
                    ))}
                  </div>
                </div>
              )}
              {artifacts.length > 0 && (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
                  <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">{t("scoringArtifact")}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {artifacts.map((a: string) => (
                      <span key={a} className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">{a}</span>
                    ))}
                  </div>
                </div>
              )}
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
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { key: "alpha", bandKey: "bandAlpha", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" },
              { key: "beta", bandKey: "bandBeta", color: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" },
              { key: "delta", bandKey: "bandDelta", color: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" },
              { key: "theta", bandKey: "bandTheta", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400" },
              { key: "gamma", bandKey: "bandGamma", color: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400" },
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
        <div className="flex items-center gap-4">
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
