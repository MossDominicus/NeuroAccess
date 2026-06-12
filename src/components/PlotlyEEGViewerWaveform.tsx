"use client";

import { useEffect, useRef } from "react";
import { loadPlotly } from "@/lib/plotly-loader";

interface Props {
  eegData: any;
  selectedChannels: Set<string>;
}

export default function PlotlyEEGViewerWaveform({
  eegData,
  selectedChannels,
}: Props) {
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!eegData || !eegData.times || !eegData.channels || !plotRef.current)
      return;

    loadPlotly().then((Plotly: any) => {
      if (!plotRef.current) return;
      const { times, channels, channel_names } = eegData;
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
          hovertemplate: `%{fullData.name}<br>Time: %{x:.2f}s<br>Amplitude: %{y:.2f}μV<extra></extra>`,
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
          text: `EEG Waveform - ${eegData.file_name}`,
          font: {
            size: 16,
            color: isDark ? "#e5e7eb" : "#111827",
          },
        },
        xaxis: {
          title: {
            text: "Time (s)",
            font: { size: 12, color: isDark ? "#9ca3af" : "#6b7280" },
          },
          showgrid: true,
          gridcolor: isDark ? "#374151" : "#e5e7eb",
          tickfont: { color: isDark ? "#9ca3af" : "#6b7280" },
        },
        yaxis: {
          title: {
            text: "Channel",
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
  }, [eegData, selectedChannels]);

  return (
    <div
      className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)]"
      ref={plotRef}
      style={{ width: "100%", height: "600px" }}
    />
  );
}
