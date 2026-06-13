"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import nextDynamic from "next/dynamic";
import { useLang } from "@/lib/language-context";
import { Info } from "lucide-react";
import { motion } from "framer-motion";

export const dynamic = "force-static";


// 动态导入图表组件（recharts 太大，客户端才加载）
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

// 每个参数的中文科普说明 (7 语言 key 都会自动翻译)
const PARAM_HELP_KEYS: Record<string, string> = {
  alpha_power: "alphaPowerHelp",
  beta_power: "betaPowerHelp",
  theta_power: "thetaPowerHelp",
  delta_power: "deltaPowerHelp",
  alpha_freq: "alphaFreqHelp",
  beta_freq: "betaFreqHelp",
  theta_freq: "thetaFreqHelp",
  delta_freq: "deltaFreqHelp",
  noise_level: "noiseHelp",
  artifact_blink: "artifactBlinkHelp",
  artifact_muscle: "artifactMuscleHelp",
  artifact_powerline: "artifactPowerlineHelp",
};

export default function EegSimulatorPage() {
  const { t } = useLang();

  // 设置页面标题
  useEffect(() => {
    document.title = `NeuroAccess`;
  }, [t]);

  // 每个滑块可展开的注释面板状态
  const [helpOpen, setHelpOpen] = useState<Set<string>>(new Set());
  const toggleHelp = (key: string) => {
    setHelpOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // 模拟参数
  const [params, setParams] = useState({
    duration_sec: 10,
    sampling_rate: 250,
    n_channels: 8,
    alpha_power: 1.0,
    beta_power: 0.5,
    theta_power: 0.3,
    delta_power: 0.8,
    alpha_freq: 10.0,
    beta_freq: 20.0,
    theta_freq: 6.0,
    delta_freq: 3.0,
    noise_level: 0.1,
    artifact_blink: false,
    artifact_muscle: false,
    artifact_powerline: false,
  });

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 生成 EEG 信号
  const generateEEG = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("neuroaccess_token") || localStorage.getItem("neuroaccess-token") || "";
      const resp = await fetch("/api/eeg-simulator/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      const data = await resp.json();
      if (!data.success) {
        setError(data.error || t("generatingEEG") || "生成失败");
        setLoading(false);
        return;
      }

      setResult(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || t("networkErrorMsg") || "请求失败");
      setLoading(false);
    }
  }, [params]);

  // 准备时域波形图数据（采样到 ~250 点）
  const waveformData = useMemo(() => {
    if (!result) return [];
    const times: number[] = result.times || [];
    const channels: Record<string, number[]> = result.channels || {};
    const chNames: string[] = result.channel_names || [];
    if (times.length === 0 || chNames.length === 0) return [];

    // 下采样到 ~250 点
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
  }, [result]);

  // 准备 PSD 频谱图数据（每个通道平均）
  const psdData = useMemo(() => {
    if (!result?.psd?.frequencies || !result?.psd?.powers) return [];
    const freqs: number[] = result.psd.frequencies;
    const powers: number[][] = result.psd.powers;
    // 平均所有通道
    const avgPowers = freqs.map((_, i) => {
      const sum = powers.reduce((acc, ch) => acc + (ch[i] || 0), 0);
      return sum / powers.length;
    });
    // 采样到 ~100 点
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
  }, [result]);

  // 频段功率对比图数据
  const bandData = useMemo(() => {
    return [
      { name: `δ ${t("bandDelta")}`, value: params.delta_power, range: "0.5-4 Hz", fill: "#a78bfa" },
      { name: `θ ${t("bandTheta")}`, value: params.theta_power, range: "4-8 Hz", fill: "#60a5fa" },
      { name: `α ${t("bandAlpha")}`, value: params.alpha_power, range: "8-13 Hz", fill: "#34d399" },
      { name: `β ${t("bandBeta")}`, value: params.beta_power, range: "13-30 Hz", fill: "#fbbf24" },
    ];
  }, [params, t]);

  const CHANNEL_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

  // 渲染滑块控制
  const renderSlider = (
    label: string,
    key: string,
    min: number,
    max: number,
    step: number
  ) => {
    const helpKey = PARAM_HELP_KEYS[key];
    const helpText = helpKey ? t(helpKey) : "";
    const isOpen = helpOpen.has(key);
    return (
      <div key={key} className="mb-4">
        <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text)] mb-1">
          <span>{label}: <span className="text-[var(--color-primary)] font-bold">{params[key as keyof typeof params]}</span></span>
          {helpText && helpText !== helpKey && (
            <button
              type="button"
              onClick={() => toggleHelp(key)}
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors ${
                isOpen
                  ? "bg-[var(--color-primary)] text-[var(--color-bg)]"
                  : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
              }`}
              title="查看注释"
            >
              <Info className="w-3 h-3" />
            </button>
          )}
        </label>
        {isOpen && helpText && helpText !== helpKey && (
          <div className="mb-2 p-3 text-xs leading-relaxed text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-sm">
            {helpText}
          </div>
        )}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={params[key as keyof typeof params] as number}
          onChange={(e) => setParams({ ...params, [key]: parseFloat(e.target.value) })}
            className="w-full accent-[var(--color-primary)]"
        />
      </div>
    );
  };

  // 渲染复选框（含注释按钮）
  const renderCheckbox = (
    label: string,
    key: string,
  ) => {
    const helpKey = PARAM_HELP_KEYS[key];
    const helpText = helpKey ? t(helpKey) : "";
    const isOpen = helpOpen.has(key);
    return (
      <div key={key} className="mt-3">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer flex-1">
            <input
              type="checkbox"
              checked={params[key as keyof typeof params] as boolean}
              onChange={(e) => setParams({ ...params, [key]: e.target.checked })}
              className="rounded accent-[var(--color-primary)]"
            />
            <span className="text-sm text-[var(--color-text)]">
              {label}
            </span>
          </label>
          {helpText && helpText !== helpKey && (
            <button
              type="button"
              onClick={() => toggleHelp(key)}
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors shrink-0 ${
                isOpen
                  ? "bg-[var(--color-primary)] text-[var(--color-bg)]"
                  : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
              }`}
              title="查看注释"
            >
              <Info className="w-3 h-3" />
            </button>
          )}
        </div>
        {isOpen && helpText && helpText !== helpKey && (
          <div className="mt-2 p-3 text-xs leading-relaxed text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-sm">
            {helpText}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      className="min-h-screen bg-[var(--color-bg)]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.05 }}
    >
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：控制面板 */}
          <div className="lg:col-span-1">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
                {t("signalParameters")}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mb-4 italic">
                {t("hoverAnySlider")}
              </p>

              {/* 频段功率 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                  {t("bandPower")}
                </h3>
                {renderSlider(`${t("bandAlpha")} (8-13 Hz)`, "alpha_power", 0, 2, 0.1)}
                {renderSlider(`${t("bandBeta")} (13-30 Hz)`, "beta_power", 0, 2, 0.1)}
                {renderSlider(`${t("bandTheta")} (4-8 Hz)`, "theta_power", 0, 2, 0.1)}
                {renderSlider(`${t("bandDelta")} (0.5-4 Hz)`, "delta_power", 0, 2, 0.1)}
              </div>

              {/* 频段频率 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                  {t("bandFrequency")}
                </h3>
                {renderSlider(`${t("bandAlpha")} ${t("timeUnitSec") !== "s" ? "Freq (Hz)" : "Freq (Hz)"}`, "alpha_freq", 8, 13, 0.5)}
                {renderSlider(`${t("bandBeta")} Freq (Hz)`, "beta_freq", 13, 30, 1)}
                {renderSlider(`${t("bandTheta")} Freq (Hz)`, "theta_freq", 4, 8, 0.5)}
                {renderSlider(`${t("bandDelta")} Freq (Hz)`, "delta_freq", 0.5, 4, 0.5)}
              </div>

              {/* 噪声和伪影 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                  {t("noiseAndArtifacts")}
                </h3>
                {renderSlider("Noise Level", "noise_level", 0, 1, 0.05)}

                {renderCheckbox(t("artifactBlink"), "artifact_blink")}
                {renderCheckbox(t("artifactMuscle"), "artifact_muscle")}
                {renderCheckbox(t("artifactPowerline"), "artifact_powerline")}
              </div>

              {/* 生成按钮 */}
              <button
                onClick={generateEEG}
                disabled={loading}
                className="w-full px-6 py-3 bg-[var(--color-primary)] text-[var(--color-bg)] rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
              >
                {loading ? t("generatingEEG") : t("generateEEG")}
              </button>

              {error && (
                <div className="mt-4 p-3 rounded-lg text-sm bg-red-500/10 text-red-600 border border-red-500/30">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* 右侧：可视化 */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
                {t("visualization")}
              </h2>

              {!result && !loading && (
                <div className="text-center py-20 text-[var(--color-text-secondary)]">
                  <svg className="mx-auto h-16 w-16 mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p>{t("clickToGenerate")}</p>
                </div>
              )}

              {loading && (
                <div className="text-center py-20 text-[var(--color-text-secondary)]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
                  <p>{t("generatingEEG")}</p>
                </div>
              )}

              {result && !loading && (
                <div>
                  {/* 统计指标 */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-[var(--color-bg)] rounded-lg p-3 border border-[var(--color-border)]">
                      <p className="text-xs text-[var(--color-text-secondary)]">{t("channelCount")}</p>
                      <p className="text-lg font-bold text-[var(--color-text)]">{result.channel_names?.length || 0}</p>
                    </div>
                    <div className="bg-[var(--color-bg)] rounded-lg p-3 border border-[var(--color-border)]">
                      <p className="text-xs text-[var(--color-text-secondary)]">{t("samplingRate")}</p>
                      <p className="text-lg font-bold text-[var(--color-text)]">{result.sampling_rate} Hz</p>
                    </div>
                    <div className="bg-[var(--color-bg)] rounded-lg p-3 border border-[var(--color-border)]">
                      <p className="text-xs text-[var(--color-text-secondary)]">{t("duration")}</p>
                      <p className="text-lg font-bold text-[var(--color-text)]">{result.duration_seconds} s</p>
                    </div>
                  </div>

                  {/* 时域波形 */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">
                      {t("timeDomainWaveform")}
                    </h3>
                    <div className="bg-[var(--color-bg)] rounded-xl p-4 border border-[var(--color-border)]">
                      <WaveformChart data={waveformData} channelNames={result.channel_names} channelColors={CHANNEL_COLORS} />
                    </div>
                  </div>

                  {/* PSD 频谱 */}
                  {result.psd && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">
                        {t("psdSpectrum")}
                      </h3>
                      <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                        {t("psdDescription")}
                      </p>
                      <div className="bg-[var(--color-bg)] rounded-xl p-4 border border-[var(--color-border)]">
                        <PSDChart data={psdData} />
                      </div>
                    </div>
                  )}

                  {/* 当前频段功率对比 */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">
                      {t("bandPower")}
                    </h3>
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
