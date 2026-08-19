"use client";

import { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from "react";
import nextDynamic from "next/dynamic";
import { useLang } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { Info, Loader2, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { EEGGenerationManager as gen } from "@/lib/eeg-generation-manager";


const WaveformChart = nextDynamic(() => import("./WaveformChart"), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-[var(--color-bg)] rounded-xl h-64" />,
});
const PSDChart = nextDynamic(() => import("./PSDChart"), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-[var(--color-bg)] rounded-xl h-64" />,
});
const BandPowerChart = nextDynamic(() => import("./BandPowerChart"), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-[var(--color-bg)] rounded-xl h-48" />,
});

const PARAM_HELP_KEYS: Record<string, string> = {
  alpha_power: "alphaPowerHelp", beta_power: "betaPowerHelp",
  theta_power: "thetaPowerHelp", delta_power: "deltaPowerHelp", gamma_power: "gammaPowerHelp",
  alpha_freq: "alphaFreqHelp", beta_freq: "betaFreqHelp",
  theta_freq: "thetaFreqHelp", delta_freq: "deltaFreqHelp", gamma_freq: "gammaFreqHelp",
  noise_level: "noiseHelp",
  artifact_blink: "artifactBlinkHelp", artifact_muscle: "artifactMuscleHelp",
  artifact_powerline: "artifactPowerlineHelp",
};

const DEFAULT_PARAMS = {
  duration_sec: 10, sampling_rate: 250, n_channels: 8,
  alpha_power: 1.0, beta_power: 0.5, theta_power: 0.3, delta_power: 0.8, gamma_power: 0.1,
  alpha_freq: 10.0, beta_freq: 20.0, theta_freq: 6.0, delta_freq: 3.0, gamma_freq: 50.0,
  noise_level: 0.1,
  artifact_blink: false, artifact_muscle: false, artifact_powerline: false,
};

// ── sessionStorage: 滑块参数持久化 ───────────────────────────────────
const SS_PARAMS_KEY = "neuroaccess-sim-params";
function loadParams(): any {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SS_PARAMS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveParams(p: any) {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(SS_PARAMS_KEY, JSON.stringify(p)); } catch {}
}

export default function EegSimulatorPage() {
  const { t } = useLang();
  const { user, loading } = useAuth();

  // ── 生成状态（从 EEGGenerationManager 订阅，独立于组件生命周期）────
  const genState = useSyncExternalStore(
    useCallback((cb: () => void) => gen.subscribe(cb), []),
    () => gen.getState(),
    () => gen.getState(),
  );

  const genResult = useSyncExternalStore(
    useCallback((cb: () => void) => gen.subscribe(cb), []),
    () => gen.getResult(),
    () => gen.getResult(),
  );

  // 本地派生状态
  const isRunning = genState.status === "running";
  const isFailed = genState.status === "failed";
  const hasResult = !!genResult;
  const resultData = genResult?.data || null;

  // ── 滑块参数 ───────────────────────────────────────────────────────
  const [params, setParams] = useState<any>(() => ({ ...DEFAULT_PARAMS }));
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const saved = loadParams();
    if (saved) setParams(saved);
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) saveParams(params);
  }, [params, hydrated]);

  // init manager (client-side only)
  useEffect(() => { gen.init(); }, []);

  const [helpOpen, setHelpOpen] = useState<Set<string>>(new Set());
  const toggleHelp = (key: string) => setHelpOpen(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  // ── 动作 ───────────────────────────────────────────────────────────
  const startGenerate = () => gen.start(params);
  const cancelGenerate = () => gen.cancel();
  const clearResult = () => gen.clearResult();

  // ── 图表数据 ───────────────────────────────────────────────────────
  const waveformData = useMemo(() => {
    if (!resultData) return [];
    const times: number[] = resultData.times || [];
    const channels: Record<string, number[]> = resultData.channels || {};
    const chNames: string[] = resultData.channel_names || [];
    if (!times.length || !chNames.length) return [];
    const targetPoints = 250;
    const step = Math.max(1, Math.floor(times.length / targetPoints));
    const data: any[] = [];
    for (let i = 0; i < times.length; i += step) {
      const point: any = { time: parseFloat(times[i].toFixed(2)) };
      for (const ch of chNames) {
        point[ch] = parseFloat((channels[ch]?.[i] || 0).toFixed(3));
      }
      data.push(point);
    }
    return data;
  }, [resultData]);

  const psdData = useMemo(() => {
    if (!resultData?.psd?.frequencies || !resultData?.psd?.powers) return [];
    const freqs: number[] = resultData.psd.frequencies;
    const powers: number[][] = resultData.psd.powers;
    const avgPowers = freqs.map((_, i) => {
      const sum = powers.reduce((acc, ch) => acc + (ch[i] || 0), 0);
      return sum / powers.length;
    });
    const targetPoints = 100;
    const step = Math.max(1, Math.floor(freqs.length / targetPoints));
    const data: any[] = [];
    for (let i = 0; i < freqs.length; i += step) {
      data.push({
        freq: parseFloat(freqs[i].toFixed(2)),
        power: parseFloat(avgPowers[i].toExponential(2)),
      });
    }
    return data;
  }, [resultData]);

  const bandData = useMemo(() => [
    { name: `δ ${t("bandDelta")}`, value: params.delta_power, range: "0.5-4 Hz", fill: "#a78bfa" },
    { name: `θ ${t("bandTheta")}`, value: params.theta_power, range: "4-8 Hz", fill: "#60a5fa" },
    { name: `α ${t("bandAlpha")}`, value: params.alpha_power, range: "8-13 Hz", fill: "#34d399" },
    { name: `β ${t("bandBeta")}`, value: params.beta_power, range: "13-30 Hz", fill: "#fbbf24" },
    { name: `γ ${t("bandGamma")}`, value: params.gamma_power, range: "30-100 Hz", fill: "#ec4899" },
  ], [params, t]);

  const CHANNEL_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

  // ── 渲染辅助 ───────────────────────────────────────────────────────
  const renderSlider = (label: string, key: string, min: number, max: number, step: number) => {
    const helpKey = PARAM_HELP_KEYS[key];
    const helpText = helpKey ? t(helpKey) : "";
    const isOpen = helpOpen.has(key);
    return (
      <div key={key} className="mb-4">
        <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text)] mb-1">
          <span>{label}: <span className="text-[var(--color-primary)] font-bold">{params[key]}</span></span>
          {helpText && helpText !== helpKey && (
            <button type="button" onClick={() => toggleHelp(key)}
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors ${isOpen ? "bg-[var(--color-primary)] text-[var(--color-bg)]" : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"}`}>
              <Info className="w-3 h-3" />
            </button>
          )}
        </label>
        {isOpen && helpText && helpText !== helpKey && (
          <div className="mb-2 p-3 text-xs leading-relaxed text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-sm">{helpText}</div>
        )}
        <input type="range" min={min} max={max} step={step} value={params[key]}
          onChange={(e) => setParams({ ...params, [key]: parseFloat(e.target.value) })}
          className="w-full accent-[var(--color-primary)]" disabled={isRunning} />
      </div>
    );
  };

  const renderCheckbox = (label: string, key: string) => {
    const helpKey = PARAM_HELP_KEYS[key];
    const helpText = helpKey ? t(helpKey) : "";
    const isOpen = helpOpen.has(key);
    return (
      <div key={key} className="mt-3">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer flex-1">
            <input type="checkbox" checked={params[key]} disabled={isRunning}
              onChange={(e) => setParams({ ...params, [key]: e.target.checked })}
              className="rounded accent-[var(--color-primary)]" />
            <span className="text-sm text-[var(--color-text)]">{label}</span>
          </label>
          {helpText && helpText !== helpKey && (
            <button type="button" onClick={() => toggleHelp(key)}
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors shrink-0 ${isOpen ? "bg-[var(--color-primary)] text-[var(--color-bg)]" : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"}`}>
              <Info className="w-3 h-3" />
            </button>
          )}
        </div>
        {isOpen && helpText && helpText !== helpKey && (
          <div className="mt-2 p-3 text-xs leading-relaxed text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-sm">{helpText}</div>
        )}
      </div>
    );
  };

  // ── 未登录：先转圈校验会话，再提示登录 ──────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
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
    <motion.div className="min-h-screen bg-[var(--color-bg)]"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.05 }}>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* ── 状态条 ────────────────────────────────────────────────── */}
        {isRunning && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <div>
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">{t("generatingEEG")}</span>
                <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">({genState.progress}%)</span>
              </div>
            </div>
            <button onClick={cancelGenerate}
              className="text-xs px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 hover:bg-blue-200 transition-colors">
              Cancel
            </button>
          </div>
        )}

        {isFailed && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-sm font-semibold text-red-700 dark:text-red-400">Generation Failed</span>
              {genState.error && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{genState.error}</p>}
            </div>
            <button onClick={() => gen.reset()}
              className="text-xs px-3 py-1 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 hover:bg-red-200 transition-colors">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── 左侧控制面板 ─────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">{t("signalParameters")}</h2>
              <p className="text-xs text-[var(--color-text-secondary)] mb-4 italic">{t("hoverAnySlider")}</p>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">{t("bandPower")}</h3>
                {renderSlider(`${t("bandAlpha")} (8-13 Hz)`, "alpha_power", 0, 2, 0.1)}
                {renderSlider(`${t("bandBeta")} (13-30 Hz)`, "beta_power", 0, 2, 0.1)}
                {renderSlider(`${t("bandTheta")} (4-8 Hz)`, "theta_power", 0, 2, 0.1)}
                {renderSlider(`${t("bandDelta")} (0.5-4 Hz)`, "delta_power", 0, 2, 0.1)}
                {renderSlider(`${t("bandGamma")} (30-100 Hz)`, "gamma_power", 0, 2, 0.1)}
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">{t("bandFrequency")}</h3>
                {renderSlider(`${t("bandAlpha")} Freq (Hz)`, "alpha_freq", 8, 13, 0.5)}
                {renderSlider(`${t("bandBeta")} Freq (Hz)`, "beta_freq", 13, 30, 1)}
                {renderSlider(`${t("bandTheta")} Freq (Hz)`, "theta_freq", 4, 8, 0.5)}
                {renderSlider(`${t("bandDelta")} Freq (Hz)`, "delta_freq", 0.5, 4, 0.5)}
                {renderSlider(`${t("bandGamma")} Freq (Hz)`, "gamma_freq", 30, 100, 1)}
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">{t("noiseAndArtifacts")}</h3>
                {renderSlider("Noise Level", "noise_level", 0, 1, 0.05)}
                {renderCheckbox(t("artifactBlink"), "artifact_blink")}
                {renderCheckbox(t("artifactMuscle"), "artifact_muscle")}
                {renderCheckbox(t("artifactPowerline"), "artifact_powerline")}
              </div>

              {/* Generate / Cancel */}
              {!isRunning ? (
                <button onClick={startGenerate} disabled={isRunning}
                  className="w-full px-6 py-3 bg-[var(--color-primary)] text-[var(--color-bg)] rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50">
                  {hasResult ? t("generateEEG") + " (New)" : t("generateEEG")}
                </button>
              ) : (
                <button onClick={cancelGenerate}
                  className="w-full px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium">
                  Cancel Generation ({genState.progress}%)
                </button>
              )}
            </div>
          </div>

          {/* ── 右侧可视化 ───────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--color-text)]">{t("visualization")}</h2>
                {hasResult && !isRunning && (
                  <button onClick={clearResult}
                    className="text-xs px-2 py-1 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors">
                    Clear
                  </button>
                )}
              </div>

              {/* Empty state */}
              {!resultData && !isRunning && (
                <div className="text-center py-20 text-[var(--color-text-secondary)]">
                  <svg className="mx-auto h-16 w-16 mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p>{t("clickToGenerate")}</p>
                </div>
              )}

              {/* Running state */}
              {isRunning && !resultData && (
                <div className="text-center py-20">
                  <Loader2 className="mx-auto h-12 w-12 text-[var(--color-primary)] animate-spin mb-4" />
                  <p className="text-[var(--color-text)] font-medium">{t("generatingEEG")}...</p>
                  <div className="mt-4 w-64 mx-auto bg-[var(--color-bg)] rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
                      style={{ width: `${genState.progress}%` }} />
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-2">{genState.progress}%</p>
                </div>
              )}

              {/* Results */}
              {resultData && (
                <div>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-[var(--color-bg)] rounded-lg p-3 border border-[var(--color-border)]">
                      <p className="text-xs text-[var(--color-text-secondary)]">{t("channelCount")}</p>
                      <p className="text-lg font-bold text-[var(--color-text)]">{resultData.channel_names?.length || 0}</p>
                    </div>
                    <div className="bg-[var(--color-bg)] rounded-lg p-3 border border-[var(--color-border)]">
                      <p className="text-xs text-[var(--color-text-secondary)]">{t("samplingRate")}</p>
                      <p className="text-lg font-bold text-[var(--color-text)]">{resultData.sampling_rate} Hz</p>
                    </div>
                    <div className="bg-[var(--color-bg)] rounded-lg p-3 border border-[var(--color-border)]">
                      <p className="text-xs text-[var(--color-text-secondary)]">{t("duration")}</p>
                      <p className="text-lg font-bold text-[var(--color-text)]">{resultData.duration_seconds} s</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">{t("timeDomainWaveform")}</h3>
                    <div className="bg-[var(--color-bg)] rounded-xl p-4 border border-[var(--color-border)]">
                      <WaveformChart data={waveformData} channelNames={resultData.channel_names} channelColors={CHANNEL_COLORS} />
                    </div>
                  </div>

                  {resultData.psd && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">{t("psdSpectrum")}</h3>
                      <p className="text-xs text-[var(--color-text-secondary)] mb-2">{t("psdDescription")}</p>
                      <div className="bg-[var(--color-bg)] rounded-xl p-4 border border-[var(--color-border)]">
                        <PSDChart data={psdData} />
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">{t("bandPower")}</h3>
                    <div className="bg-[var(--color-bg)] rounded-xl p-4 border border-[var(--color-border)]">
                      <BandPowerChart data={bandData} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </motion.div>
  );
}
