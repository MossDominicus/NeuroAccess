"use client";

import { useMemo } from "react";
import { useLang } from "@/lib/language-context";

interface Props {
  eegData: any;
  selectedChannels?: Set<string>;
}

// 渲染 /api/eeg/viewer 返回的真实通道时间序列（每通道一条折线，垂直堆叠）
export default function PlotlyEEGViewerWaveform({ eegData, selectedChannels }: Props) {
  const { t } = useLang();
  const channels = eegData?.channels || {};
  const times = eegData?.times || [];

  const names = useMemo(
    () => Object.keys(channels).filter((n) => !selectedChannels || selectedChannels.has(n)),
    [channels, selectedChannels]
  );

  if (!names.length || !Array.isArray(times) || times.length < 2) {
    return (
      <div className="rounded-2xl bg-[var(--color-surface)] p-4 shadow-sm border border-[var(--color-border)]">
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">{t("waveformPreviewTitle")}</h3>
        <div className="flex h-[400px] items-center justify-center text-zinc-500 dark:text-zinc-400">
          {t("noWaveformPreview")}
        </div>
      </div>
    );
  }

  const MAX = 1500;
  const W = 1000;
  const laneH = Math.max(20, Math.min(48, Math.floor(600 / Math.max(1, names.length))));
  const H = laneH * names.length + 20;
  const step = Math.max(1, Math.floor(times.length / MAX));

  return (
    <div className="rounded-2xl bg-[var(--color-surface)] p-4 shadow-sm border border-[var(--color-border)]">
      <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">{t("waveformPreviewTitle")}</h3>
      <div className="max-h-[75vh] overflow-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          preserveAspectRatio="none"
          style={{ minWidth: 800, height: H }}
          role="img"
          aria-label="EEG waveforms"
        >
          {names.map((n, idx) => {
            const vals = channels[n];
            if (!Array.isArray(vals) || vals.length < 2) return null;
            const pts: number[] = [];
            for (let i = 0; i < vals.length; i += step) pts.push(vals[i]);
            if (pts.length < 2) return null;
            const min = Math.min(...pts), max = Math.max(...pts);
            const range = (max - min) || 1;
            const y = idx * laneH + laneH / 2;
            const path = "M" + pts.map((v, i) =>
              `${((i / (pts.length - 1)) * W).toFixed(1)},${(y - ((v - min) / range - 0.5) * (laneH * 0.9)).toFixed(1)}`
            ).join(" ");
            return (
              <g key={n}>
                <line x1="0" y1={y} x2={W} y2={y} stroke="#333" strokeWidth="0.5" strokeDasharray="3 3" />
                <text x="6" y={y + 3} fill="#aab" fontSize="10">{n}</text>
                <path d={path} fill="none" stroke="#38bdf8" strokeWidth="1" />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
