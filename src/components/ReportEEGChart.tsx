"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLang } from "@/lib/language-context";
import { Waves } from "lucide-react";
import { loadPlotly } from "@/lib/plotly-loader";

interface ReportEEGChartProps {
  reportFileName: string;
  eegData?: any;
}

export default function ReportEEGChart({ reportFileName, eegData: savedEegData }: ReportEEGChartProps) {
  const { t } = useLang();
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(
    savedEegData ? new Set(savedEegData.channel_names || []) : new Set()
  );
  const plotRef = useRef<HTMLDivElement>(null);
  const plotlyRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const moRef = useRef<MutationObserver | null>(null);
  const noRef = useRef<MutationObserver | null>(null);
  const cancelledRef = useRef(false);

  const toggleChannel = (ch: string) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  };

  // 翻译 key 映射（大小写不敏感）
  const getTooltipKey = useCallback((rawTitle: string): string | null => {
    const map: Record<string, string> = {
      pan: "plotlyPan",
      "box select": "plotlyBoxSelect",
      "zoom in": "plotlyZoomIn",
      "zoom out": "plotlyZoomOut",
      autoscale: "plotlyAutoscale",
      "reset axes": "plotlyResetAxes",
      "download plot as a png": "plotlyDownloadPng",
      "toggle hover": "plotlyToggleHover",
      "show closest data on hover": "plotlyToggleHover",
    };
    return map[rawTitle.toLowerCase()] ?? null;
  }, []);

  // 清理所有 tooltip 相关元素，处理 data-title
  const sanitizeToolbar = useCallback(() => {
    if (!plotRef.current) return;

    plotRef.current.querySelectorAll(".modebar-btn").forEach((btn: any) => {
      // 1. 移除原生 title 属性（浏览器 tooltip）
      btn.removeAttribute("title");

      // 2. 翻译 data-title 为当前语言
      const raw = btn.getAttribute("data-title") || "";
      const key = getTooltipKey(raw);
      if (key) {
        const translated = t(key);
        if (translated) {
          btn.setAttribute("data-title", translated);
        }
      }

      // 3. 删除 SVG <title> 元素（另一种原生 tooltip 来源）
      btn.querySelectorAll("title").forEach((t: any) => t.remove());

      // 4. 删掉 Plotly 的 tooltip div
      btn.querySelectorAll(".modebar-tooltip").forEach((el: any) => el.remove());

      // 5. 全局也清理一遍
      document.querySelectorAll(".modebar-tooltip").forEach((el: any) => el.remove());
    });
  }, [t, getTooltipKey]);

  // 初始化 Plotly
  const initPlotly = useCallback(() => {
    if (initializedRef.current || !savedEegData || !plotRef.current) return;
    initializedRef.current = true;
    cancelledRef.current = false;

    loadPlotly().then((Plotly: any) => {
      plotlyRef.current = Plotly;
      if (cancelledRef.current || !plotRef.current) return;

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
          hovertemplate: `${t("hoverTime") || "Time"}: %{x:.2f}${t("timeUnitSec") || "s"}<br>${t("hoverAmplitude") || "Amplitude"}: %{y:.2f}${t("hoverUnit") || "μV"}<extra></extra>`,
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
          title: { text: t("timeSec") || "Time (s)", font: { size: 12, color: isDark ? "#9ca3af" : "#6b7280" } },
          showgrid: true,
          gridcolor: isDark ? "#374151" : "#e5e7eb",
          tickfont: { color: isDark ? "#9ca3af" : "#6b7280" },
        },
        yaxis: {
          title: { text: t("channelAxis") || "Channel", font: { size: 12, color: isDark ? "#9ca3af" : "#6b7280" } },
          tickmode: "array" as const,
          tickvals: yTicks,
          ticktext: yTickLabels,
          showgrid: true,
          gridcolor: isDark ? "#374151" : "#e5e7eb",
          tickfont: { size: 11, color: isDark ? "#9ca3af" : "#6b7280" },
          automargin: true,
        },
        plot_bgcolor: isDark ? "transparent" : "#fafafa",
        paper_bgcolor: "transparent",
        margin: { t: 50, r: 30, l: 120, b: 50 },
        showlegend: false,
        hovermode: "closest" as const,
        autosize: true,
        font: { color: isDark ? "#e5e7eb" : "#111827" },
      };

      const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ["select2d", "lasso2d", "zoom2d", "toggleHover", "resetScale"],
      };

      // 动态高度
      const activeChannelCount = yTickLabels.length;
      const calculatedHeight = Math.min(1200, Math.max(500, activeChannelCount * 22 + 100));
      if (plotRef.current) {
        plotRef.current.style.height = `${calculatedHeight}px`;
      }

      Plotly.newPlot(plotRef.current, plotData, layout, config).then(() => {
        if (cancelledRef.current || !plotRef.current) return;

        // 强制 resize 确保尺寸正确
        Plotly.Plots.resize(plotRef.current);

        // 立即清理 toolbar
        sanitizeToolbar();

        // 持续监听 DOM 变化
        const mo = new MutationObserver(() => {
          if (cancelledRef.current) return;
          sanitizeToolbar();
        });
        mo.observe(plotRef.current, { childList: true, subtree: true });
        moRef.current = mo;

        // 隐藏下载快照通知
        const hideSnapshot = () => {
          document.querySelectorAll('.notifier-note, .notifier-note--visible, [class*="notifier"]')
            .forEach((el: any) => {
              if (el.textContent?.includes('Snapshot') || el.textContent?.includes('snapshot')) {
                el.style.display = 'none';
              }
            });
        };
        const no = new MutationObserver(hideSnapshot);
        no.observe(document.body, { childList: true, subtree: true });
        noRef.current = no;
      });
    });
  }, [savedEegData, selectedChannels, reportFileName, t, sanitizeToolbar]);

  // 主 effect：用 requestAnimationFrame 轮询直到容器可见，再初始化 Plotly
  useEffect(() => {
    if (!savedEegData || !savedEegData.times || !savedEegData.channels) return;
    if (!plotRef.current) return;

    cancelledRef.current = false;
    initializedRef.current = false;

    const waitForVisible = () => {
      if (cancelledRef.current) return;
      if (!plotRef.current) return;
      // offsetParent === null 表示元素或父元素 display: none
      if (plotRef.current.offsetParent !== null) {
        initPlotly();
      } else {
        requestAnimationFrame(waitForVisible);
      }
    };
    requestAnimationFrame(waitForVisible);

    return () => {
      cancelledRef.current = true;
      moRef.current?.disconnect();
      noRef.current?.disconnect();
    };
  }, [savedEegData, selectedChannels, initPlotly]);

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
            <p className="font-medium text-[var(--color-text)]">{savedEegData.duration_seconds} {t("timeUnitSec") || "s"}</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border)]">
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">{t("channelSelect") || "Select channels"}</h3>
        <div className="flex flex-wrap gap-2">
          {savedEegData.channel_names?.map((ch: string) => (
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
        <div ref={plotRef} style={{ width: "100%", minHeight: "500px" }} />
      </div>
    </div>
  );
}
