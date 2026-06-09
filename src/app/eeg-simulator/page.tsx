"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLang } from "@/lib/language-context";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function EegSimulatorPage() {
  const { t } = useLang();

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
        setError(data.error || "生成失败");
        setLoading(false);
        return;
      }

      setResult(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "请求失败");
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
      { name: "δ Delta", value: params.delta_power, range: "0.5-4 Hz", fill: "#a78bfa" },
      { name: "θ Theta", value: params.theta_power, range: "4-8 Hz", fill: "#60a5fa" },
      { name: "α Alpha", value: params.alpha_power, range: "8-13 Hz", fill: "#34d399" },
      { name: "β Beta", value: params.beta_power, range: "13-30 Hz", fill: "#fbbf24" },
    ];
  }, [params]);

  const CHANNEL_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

  // 渲染滑块控制
  const renderSlider = (
    label: string,
    key: string,
    min: number,
    max: number,
    step: number
  ) => (
    <div key={key} className="mb-4">
      <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
        {label}: <span className="text-[var(--color-primary)] font-bold">{params[key as keyof typeof params]}</span>
      </label>
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

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：控制面板 */}
          <div className="lg:col-span-1">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
                {t("signalParameters")}
              </h2>

              {/* 频段功率 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                  {t("bandPower")}
                </h3>
                {renderSlider("Alpha (8-13 Hz)", "alpha_power", 0, 2, 0.1)}
                {renderSlider("Beta (13-30 Hz)", "beta_power", 0, 2, 0.1)}
                {renderSlider("Theta (4-8 Hz)", "theta_power", 0, 2, 0.1)}
                {renderSlider("Delta (0.5-4 Hz)", "delta_power", 0, 2, 0.1)}
              </div>

              {/* 频段频率 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                  {t("bandFrequency")}
                </h3>
                {renderSlider("Alpha Freq (Hz)", "alpha_freq", 8, 13, 0.5)}
                {renderSlider("Beta Freq (Hz)", "beta_freq", 13, 30, 1)}
                {renderSlider("Theta Freq (Hz)", "theta_freq", 4, 8, 0.5)}
                {renderSlider("Delta Freq (Hz)", "delta_freq", 0.5, 4, 0.5)}
              </div>

              {/* 噪声和伪影 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                  {t("noiseAndArtifacts")}
                </h3>
                {renderSlider("Noise Level", "noise_level", 0, 1, 0.05)}

                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.artifact_blink}
                    onChange={(e) => setParams({ ...params, artifact_blink: e.target.checked })}
                    className="rounded accent-[var(--color-primary)]"
                  />
                  <span className="text-sm text-[var(--color-text)]">
                    {t("artifactBlink")}
                  </span>
                </label>

                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.artifact_muscle}
                    onChange={(e) => setParams({ ...params, artifact_muscle: e.target.checked })}
                    className="rounded accent-[var(--color-primary)]"
                  />
                  <span className="text-sm text-[var(--color-text)]">
                    {t("artifactMuscle")}
                  </span>
                </label>

                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.artifact_powerline}
                    onChange={(e) => setParams({ ...params, artifact_powerline: e.target.checked })}
                    className="rounded accent-[var(--color-primary)]"
                  />
                  <span className="text-sm text-[var(--color-text)]">
                    {t("artifactPowerline")}
                  </span>
                </label>
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
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={waveformData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                          <XAxis
                            dataKey="time"
                            stroke="var(--color-text-secondary)"
                            label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: 'var(--color-text-secondary)', fontSize: 11 }}
                            tick={{ fontSize: 10 }}
                          />
                          <YAxis
                            stroke="var(--color-text-secondary)"
                            label={{ value: 'μV', angle: -90, position: 'insideLeft', fill: 'var(--color-text-secondary)', fontSize: 11 }}
                            tick={{ fontSize: 10 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                          {(result.channel_names || []).map((ch: string, i: number) => (
                            <Line
                              key={ch}
                              type="monotone"
                              dataKey={ch}
                              stroke={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
                              dot={false}
                              strokeWidth={1}
                              isAnimationActive={false}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
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
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={psdData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis
                              dataKey="freq"
                              stroke="var(--color-text-secondary)"
                              label={{ value: 'Frequency (Hz)', position: 'insideBottom', offset: -5, fill: 'var(--color-text-secondary)', fontSize: 11 }}
                              tick={{ fontSize: 10 }}
                            />
                            <YAxis
                              stroke="var(--color-text-secondary)"
                              label={{ value: 'Power (μV²/Hz)', angle: -90, position: 'insideLeft', fill: 'var(--color-text-secondary)', fontSize: 11 }}
                              tick={{ fontSize: 10 }}
                              tickFormatter={(v) => v.toExponential(0)}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                              formatter={(value: any) => Number(value).toExponential(2)}
                            />
                            <Line
                              type="monotone"
                              dataKey="power"
                              stroke="var(--color-primary)"
                              dot={false}
                              strokeWidth={1.5}
                              isAnimationActive={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* 当前频段功率对比 */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">
                      {t("bandPower")}
                    </h3>
                    <div className="bg-[var(--color-bg)] rounded-xl p-4 border border-[var(--color-border)]">
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={bandData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                          <XAxis dataKey="name" stroke="var(--color-text-secondary)" tick={{ fontSize: 11 }} />
                          <YAxis stroke="var(--color-text-secondary)" tick={{ fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                            {bandData.map((entry, index) => (
                              <Bar key={index} dataKey="value" fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
