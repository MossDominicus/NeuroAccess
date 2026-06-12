"use client";

import { useState, useEffect, useRef } from "react";
import { useLang } from "@/lib/language-context";
import { loadPlotly } from "@/lib/plotly-loader";

interface Props {
  eegData: any;
}

export default function PlotlyEEGWaveform({ eegData }: Props) {
  const { t } = useLang();
  const plotRef = useRef<HTMLDivElement>(null);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(
    new Set(eegData?.channel_names || [])
  );

  const toggleChannel = (ch: string) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  };

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
          hovertemplate: `%{fullData.name}<br>${t("hoverTime")}: %{x:.2f}s<br>${t("hoverAmplitude")}: %{y:.2f}${t("hoverUnit")}<extra></extra>`,
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
          text: `${t("eegWaveformTitle")} - ${eegData.file_name}`,
          font: {
            size: 16,
            color: isDark ? "#e5e7eb" : "#111827",
          },
        },
        xaxis: {
          title: {
            text: t("timeSec"),
            font: { size: 12, color: isDark ? "#9ca3af" : "#6b7280" },
          },
          showgrid: true,
          gridcolor: isDark ? "#374151" : "#e5e7eb",
          tickfont: { color: isDark ? "#9ca3af" : "#6b7280" },
        },
        yaxis: {
          title: {
            text: t("channelAxis"),
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

      Plotly.newPlot(plotRef.current, plotData, layout, {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ["select2d", "lasso2d", "zoom2d"],
      });
    });
  }, [eegData, selectedChannels, t]);

  if (!eegData) return null;

  return (
    <div className="space-y-4 mt-4">
      <div className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">
          {t("channelSelect")}
        </h4>
        <div className="flex flex-wrap gap-2">
          {eegData.channel_names?.map((ch: string) => (
            <button
              key={ch}
              onClick={() => toggleChannel(ch)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedChannels.has(ch)
                  ? "bg-blue-600 text-white dark:bg-blue-500"
                  : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)]">
        <div ref={plotRef} style={{ width: "100%", height: "400px" }} />
      </div>
    </div>
  );
}
