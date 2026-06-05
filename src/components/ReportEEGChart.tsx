"use client";

import { useState, useEffect, useRef } from "react";
import { useLang } from "@/lib/language-context";
import { Waves } from "lucide-react";

interface ReportEEGChartProps {
  reportFileName: string;
  eegData?: any; // 报告保存的波形数据，如有则直接显示
}

export default function ReportEEGChart({ reportFileName, eegData: savedEegData }: ReportEEGChartProps) {
  const { t } = useLang();
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(
    savedEegData ? new Set(savedEegData.channel_names || []) : new Set()
  );
  const plotRef = useRef<HTMLDivElement>(null);

  const toggleChannel = (ch: string) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  };

  // Plotly chart rendering
  useEffect(() => {
    if (!savedEegData || !savedEegData.times || !savedEegData.channels || !plotRef.current)
      return;

    // @ts-expect-error no types for plotly.js-dist
    import("plotly.js-dist").then((Plotly: any) => {
      if (!plotRef.current) return;
      const { times, channels, channel_names } = savedEegData;
      const plotData: any[] = [];

      channel_names.forEach((chName: string, idx: number) => {
        if (!selectedChannels.has(chName)) return;
        const chData = channels[chName];
        if (!chData) return;

        const offset = -idx * 100;
        const yData = chData.map((v: number) => v + offset);

        plotData.push({
          x: times,
          y: yData,
          type: "scatter",
          mode: "lines",
          name: chName,
          line: { width: 1 },
          hovertemplate: `${t("hoverTime") || "Time"}: %{x:.2f}s<br>${t("hoverAmplitude") || "Amplitude"}: %{y:.2f}${t("hoverUnit") || "μV"}<extra></extra>`,
        });
      });

      const yTicks: number[] = [];
      const yTickLabels: string[] = [];
      channel_names.forEach((chName: string, idx: number) => {
        if (selectedChannels.has(chName)) {
          yTicks.push(-idx * 100);
          yTickLabels.push(chName);
        }
      });

      const isDark = document.documentElement.classList.contains("dark");
      const layout = {
        title: {
          text: `${t("eegWaveformTitle") || "EEG Waveform"} - ${savedEegData.file_name || reportFileName}`,
          font: { size: 16, color: isDark ? "#e5e7eb" : "#111827" },
        },
        xaxis: {
          title: {
            text: t("timeSec") || "Time (s)",
            font: { size: 12, color: isDark ? "#9ca3af" : "#6b7280" },
          },
          showgrid: true,
          gridcolor: isDark ? "#374151" : "#e5e7eb",
          tickfont: { color: isDark ? "#9ca3af" : "#6b7280" },
        },
        yaxis: {
          title: {
            text: t("channelAxis") || "Channel",
            font: { size: 12, color: isDark ? "#9ca3af" : "#6b7280" },
          },
          tickmode: "array" as const,
          tickvals: yTicks,
          ticktext: yTickLabels,
          showgrid: true,
          gridcolor: isDark ? "#374151" : "#e5e7eb",
          tickfont: { color: isDark ? "#9ca3af" : "#6b7280" },
        },
        plot_bgcolor: isDark ? "transparent" : "#fafafa",
        paper_bgcolor: "transparent",
        margin: { t: 50, r: 30, l: 80, b: 50 },
        showlegend: false,
        hovermode: "closest" as const,
        font: { color: isDark ? "#e5e7eb" : "#111827" },
      };

      const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ["select2d", "lasso2d", "zoom2d"],
      };

      Plotly.newPlot(plotRef.current, plotData, layout, config);
    });
  }, [savedEegData, selectedChannels, reportFileName]);

  // 没有 EEG 数据
  if (!savedEegData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Waves className="h-12 w-12 text-[var(--color-text-secondary)]/50 mb-4" />
        <p className="text-sm text-[var(--color-text-secondary)]">
          {t("noEegData") || "该报告未保存 EEG 波形数据"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* File info */}
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border)]">
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">
          {t("fileInfo") || "File info"}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-[var(--color-text-secondary)]">{t("fileName") || "Filename"}:</span>
            <p className="font-medium text-[var(--color-text)]">{savedEegData.file_name || reportFileName}</p>
          </div>
          <div>
            <span className="text-[var(--color-text-secondary)]">{t("channelCount") || "Channels"}:</span>
            <p className="font-medium text-[var(--color-text)]">{savedEegData.total_channels}</p>
          </div>
          <div>
            <span className="text-[var(--color-text-secondary)]">{t("samplingRate") || "Sampling rate"}:</span>
            <p className="font-medium text-[var(--color-text)]">{savedEegData.sampling_rate} Hz</p>
          </div>
          <div>
            <span className="text-[var(--color-text-secondary)]">{t("duration") || "Duration"}:</span>
            <p className="font-medium text-[var(--color-text)]">{savedEegData.duration_seconds} s</p>
          </div>
        </div>
      </div>

      {/* Channel selection */}
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border)]">
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">{t("channelSelect") || "Select channels"}</h3>
        <div className="flex flex-wrap gap-2">
          {savedEegData.channel_names?.map((ch: string) => (
            <button
              key={ch}
              onClick={() => toggleChannel(ch)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedChannels.has(ch)
                  ? "bg-blue-600 text-white"
                  : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)]">
        <div ref={plotRef} style={{ width: "100%", height: "600px" }} />
      </div>
    </div>
  );
}
