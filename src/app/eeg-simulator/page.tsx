"use client";

import { useState, useEffect, useCallback } from "react";
import { useLang } from "@/lib/language-context";
import TopNav from "@/components/TopNav";

export default function EegSimulatorPage() {
  const { lang, t } = useLang();
  
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
  const [gameMode, setGameMode] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<any>(null);
  const [userGuess, setUserGuess] = useState("");
  const [gameResult, setGameResult] = useState("");
  
  // 生成 EEG 信号
  const generateEEG = useCallback(async () => {
    setLoading(true);
    setError("");
    setGameResult("");
    
    try {
      const token = localStorage.getItem("neuroaccess_token") || "";
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
  
  // 加载预设状态
  const loadPresets = useCallback(async () => {
    try {
      const resp = await fetch("/api/eeg-simulator/presets");
      const data = await resp.json();
      if (data.success) {
        return data.presets;
      }
    } catch (err) {
      console.error("Failed to load presets:", err);
    }
    return [];
  }, []);
  
  // 开始游戏模式
  const startGame = useCallback(async () => {
    const presets = await loadPresets();
    if (presets.length === 0) {
      setError("无法加载预设");
      return;
    }
    
    const randomPreset = presets[Math.floor(Math.random() * presets.length)];
    setCurrentPreset(randomPreset);
    setParams({ ...params, ...randomPreset.params });
    setGameMode(true);
    setUserGuess("");
    setGameResult("");
    
    // 自动生成 EEG
    setTimeout(() => {
      generateEEG();
    }, 100);
  }, [loadPresets, params, generateEEG]);
  
  // 提交猜测
  const submitGuess = useCallback(() => {
    if (!currentPreset) return;
    
    if (userGuess === currentPreset.name || userGuess === currentPreset.name_en) {
      setGameResult("correct");
    } else {
      setGameResult(`wrong:${currentPreset.name}`);
    }
  }, [currentPreset, userGuess]);
  
  // 渲染滑块控制
  const renderSlider = (
    label: string,
    key: string,
    min: number,
    max: number,
    step: number,
    description?: string
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
        className="w-full"
      />
      {description && (
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">{description}</p>
      )}
    </div>
  );
  
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNav />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text)] mb-2">
            {t("eegSimulator") || "EEG 模拟器"}
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            {t("eegSimulatorDesc") || "调整参数，生成合成 EEG 信号，观察不同脑电状态"}
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：控制面板 */}
          <div className="lg:col-span-1">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
                {t("signalParameters") || "信号参数"}
              </h2>
              
              {/* 游戏模式切换 */}
              <div className="mb-6 p-4 bg-[var(--color-bg)] rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gameMode}
                    onChange={(e) => setGameMode(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {t("gameMode") || "游戏模式：猜猜这是什么状态？"}
                  </span>
                </label>
                
                {gameMode && (
                  <div className="mt-3">
                    <button
                      onClick={startGame}
                      className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                    >
                      {t("newGame") || "新游戏"}
                    </button>
                    
                    {currentPreset && (
                      <div className="mt-3 p-3 bg-white rounded-lg">
                        <p className="text-sm text-[var(--color-text)] mb-2">
                          {t("whatStateIsThis") || "这是什么脑电状态？"}
                        </p>
                        <input
                          type="text"
                          value={userGuess}
                          onChange={(e) => setUserGuess(e.target.value)}
                          placeholder={t("enterYourGuess") || "输入你的猜测..."}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
                        />
                        <button
                          onClick={submitGuess}
                          className="mt-2 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                        >
                          {t("submitGuess") || "提交猜测"}
                        </button>
                        
                        {gameResult === "correct" && (
                          <div className="mt-2 p-2 bg-green-100 text-green-800 rounded-lg text-sm text-center">
                            ✅ {t("correctGuess") || "正确！"}
                          </div>
                        )}
                        
                        {gameResult.startsWith("wrong") && (
                          <div className="mt-2 p-2 bg-red-100 text-red-800 rounded-lg text-sm text-center">
                            ❌ {t("wrongGuess") || "错误！正确答案是："}{gameResult.split(":")[1]}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* 频段功率 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                  {t("bandPower") || "频段功率"}
                </h3>
                {renderSlider("Alpha (8-13 Hz)", "alpha_power", 0, 2, 0.1)}
                {renderSlider("Beta (13-30 Hz)", "beta_power", 0, 2, 0.1)}
                {renderSlider("Theta (4-8 Hz)", "theta_power", 0, 2, 0.1)}
                {renderSlider("Delta (0.5-4 Hz)", "delta_power", 0, 2, 0.1)}
              </div>
              
              {/* 频段频率 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                  {t("bandFrequency") || "频段频率"}
                </h3>
                {renderSlider("Alpha Freq (Hz)", "alpha_freq", 8, 13, 0.5)}
                {renderSlider("Beta Freq (Hz)", "beta_freq", 13, 30, 1)}
                {renderSlider("Theta Freq (Hz)", "theta_freq", 4, 8, 0.5)}
                {renderSlider("Delta Freq (Hz)", "delta_freq", 0.5, 4, 0.5)}
              </div>
              
              {/* 噪声和伪影 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                  {t("noiseAndArtifacts") || "噪声与伪影"}
                </h3>
                {renderSlider("Noise Level", "noise_level", 0, 1, 0.05)}
                
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.artifact_blink}
                    onChange={(e) => setParams({ ...params, artifact_blink: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-[var(--color-text)]">
                    {t("artifactBlink") || "眨眼伪影"}
                  </span>
                </label>
                
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.artifact_muscle}
                    onChange={(e) => setParams({ ...params, artifact_muscle: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-[var(--color-text)]">
                    {t("artifactMuscle") || "肌电伪影"}
                  </span>
                </label>
                
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.artifact_powerline}
                    onChange={(e) => setParams({ ...params, artifact_powerline: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-[var(--color-text)]">
                    {t("artifactPowerline") || "工频干扰 (50Hz)"}
                  </span>
                </label>
              </div>
              
              {/* 生成按钮 */}
              <button
                onClick={generateEEG}
                disabled={loading}
                className="w-full px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
              >
                {loading ? (t("generating") || "生成中...") : (t("generateEEG") || "生成 EEG")}
              </button>
              
              {error && (
                <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
          
          {/* 右侧：可视化 */}
          <div className="lg:col-span-2">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
                {t("visualization") || "可视化"}
              </h2>
              
              {!result && !loading && (
                <div className="text-center py-20 text-[var(--color-text-secondary)]">
                  <p>{t("clickToGenerate") || "点击生成 EEG 按钮开始"}</p>
                </div>
              )}
              
              {loading && (
                <div className="text-center py-20 text-[var(--color-text-secondary)]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
                  <p>{t("generatingEEG") || "正在生成 EEG 信号..."}</p>
                </div>
              )}
              
              {result && !loading && (
                <div>
                  {/* 时域波形 */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">
                      {t("timeDomainWaveform") || "时域波形"}
                    </h3>
                    <div className="bg-[var(--color-bg)] rounded-xl p-4 overflow-x-auto">
                      <pre className="text-xs text-[var(--color-text-secondary)]">
                        {JSON.stringify(result.channels, null, 2).slice(0, 500)}...
                      </pre>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                        {t("channelCount") || "通道数"}: {result.channel_names?.length} | 
                        {t("samplingRate") || "采样率"}: {result.sampling_rate} Hz | 
                        {t("duration") || "时长"}: {result.duration_seconds} s
                      </p>
                    </div>
                  </div>
                  
                  {/* PSD 频谱 */}
                  {result.psd && (
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">
                        {t("psdSpectrum") || "PSD 频谱"}
                      </h3>
                      <div className="bg-[var(--color-bg)] rounded-xl p-4">
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {t("psdDescription") || "功率谱密度（Power Spectral Density）显示各频段的能量分布"}
                        </p>
                        <pre className="text-xs text-[var(--color-text-secondary)] mt-2">
                          {JSON.stringify({
                            frequencies: result.psd.frequencies?.slice(0, 20),
                            powers: result.psd.powers?.[0]?.slice(0, 20),
                          }, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
