"use client";

import { useLang } from "@/lib/language-context";
import { Download, Waves, ZoomIn, ZoomOut, Move, Maximize2 } from "lucide-react";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { computeBandDominantCounts } from "@/lib/band-waveform-generator";

interface ReportEEGChartProps {
  reportFileName: string;
  eegData?: any;
  analysis?: any;
  id?: string;
}

const BAND_ORDER = ["alpha", "beta", "delta", "theta", "gamma"];
const BAND_COLORS: Record<string, string> = {
  delta: "#ef4444", theta: "#facc15", alpha: "#3b82f6", beta: "#22c55e", gamma: "#a855f7",
};

export default function ReportEEGChart({ reportFileName, analysis, id }: ReportEEGChartProps) {
  const { t } = useLang();
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanMode, setIsPanMode] = useState(false);
  const dragStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const reportId = id || "";
  // 只在 reportId 变化时重建 URL（带时间戳破缓存）；缩放/平移的 setState 重渲染不再刷新图片
  const imageUrl = useMemo(
    () => (reportId ? `/api/waveform-image?rid=${encodeURIComponent(reportId)}&_t=${Date.now()}` : null),
    [reportId]
  );

  // 频段计数 = 每个频段"主导"的通道数（逐通道 FFT 算主导频段），不是百分比
  // 优先从 waveform_preview.channels 取通道数；为空时回退 analysis.channel_count
  const wpChCount = analysis?.waveform_preview?.channels ? Object.keys(analysis.waveform_preview.channels).length : 0;
  const nTotal = wpChCount > 0 ? wpChCount : (analysis?.channel_count || 0);
  const wpChannels = analysis?.waveform_preview?.channels || {};
  const wpSr = analysis?.waveform_preview?.sampling_rate || analysis?.sampling_rate || 0;
  const wpTimes = analysis?.waveform_preview?.times;
  const domCounts = computeBandDominantCounts(wpChannels, wpSr, wpTimes);
  const bandCount: Record<string, number> = domCounts || { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 };

  const onDownload = async () => {
    if (!imageUrl) return;
    try {
      const resp = await fetch(imageUrl);
      const svgText = await resp.text();
      const blob = new Blob([svgText], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const cvs = document.createElement("canvas");
        cvs.width = img.naturalWidth * 2;
        cvs.height = img.naturalHeight * 2;
        const ctx = cvs.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(url); return; }
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        const a = document.createElement("a");
        a.href = cvs.toDataURL("image/png");
        a.download = reportFileName + "_waveform.png";
        a.click();
        URL.revokeObjectURL(url);
      };
      img.onerror = () => { URL.revokeObjectURL(url); };
      img.src = url;
    } catch (e) {
      console.error("Download waveform PNG failed", e);
    }
  };

  const zoomIn = () => setScale(s => Math.min(8, s * 1.25));
  const zoomOut = () => setScale(s => Math.max(0.5, s / 1.25));
  const resetView = () => { setScale(1); setPanX(0); setPanY(0); setIsPanMode(false); };

  // 鼠标拖拽平移 — 只有点了平移按钮才能拖动（无论缩放与否）
  const onMouseDown = (e: React.MouseEvent) => {
    if (!isPanMode) {
      e.preventDefault();
      return;
    }
    dragStart.current = { x: e.clientX, y: e.clientY, px: panX, py: panY };
    e.preventDefault();
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragStart.current) return;
    setPanX(dragStart.current.px + (e.clientX - dragStart.current.x));
    setPanY(dragStart.current.py + (e.clientY - dragStart.current.y));
  };
  const onMouseUp = () => { dragStart.current = null; };

  // 滚轮不做缩放（只用 +/- 按钮）
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
    };
    c.addEventListener("wheel", onWheel, { passive: false });
    return () => c.removeEventListener("wheel", onWheel as any);
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border)]">
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">{t("fileInfo")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
          <div><span className="text-[var(--color-text-secondary)]">{t("fileNameEeg")}:</span><p className="font-medium text-[var(--color-text)] truncate">{reportFileName}</p></div>
          <div><span className="text-[var(--color-text-secondary)]">{t("channelCountEeg")}:</span><p className="font-medium text-[var(--color-text)]">{nTotal}</p></div>
          <div><span className="text-[var(--color-text-secondary)]">{t("samplingRateEeg")}:</span><p className="font-medium text-[var(--color-text)]">{analysis?.waveform_preview?.sampling_rate || "—"}</p></div>
          <div><span className="text-[var(--color-text-secondary)]">{t("totalDurationEeg")}:</span><p className="font-medium text-[var(--color-text)]">{analysis?.duration || (analysis?.recording_duration_seconds != null ? Math.round(analysis.recording_duration_seconds) + " s" : "—")}</p></div>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)]">
        <div className="flex items-center justify-between px-5 pt-4 pb-1 flex-wrap gap-2">
          <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text)]">{t("waveformPreviewTitle")}</h3>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsPanMode(p => !p)} title={t("plotlyPan")} className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${isPanMode ? "bg-blue-500 text-white" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-bg)]"}`}><Move size={14} /></button>
            <button onClick={zoomOut} title={t("plotlyZoomOut")} className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-bg)]"><ZoomOut size={14} /></button>
            <button onClick={zoomIn} title={t("plotlyZoomIn")} className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-bg)]"><ZoomIn size={14} /></button>
            <button onClick={resetView} title={t("plotlyResetAxes")} className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-bg)]"><Maximize2 size={14} /></button>
            <span className="text-xs text-[var(--color-text-secondary)] px-2 font-mono">{Math.round(scale * 100)}%</span>
            <button onClick={onDownload} title={t("plotlyDownloadPng")} className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-bg)]"><Download size={14} /></button>
          </div>
        </div>
        <div className="px-5 pb-2">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">{nTotal} {t("channelCountEeg")}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {BAND_ORDER.map(b => (
              <span key={b} className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: BAND_COLORS[b] }} />
                {b.charAt(0).toUpperCase() + b.slice(1)} ({bandCount[b] ?? 0})
              </span>
            ))}
          </div>
        </div>
        {imageUrl ? (
          <div ref={containerRef}
               onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
               className={`w-full bg-[var(--color-bg)] overflow-auto ${isPanMode ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
               style={{ minHeight: 200 }}>
            <img ref={imgRef} src={imageUrl} alt="EEG Waveform" draggable={false} className="block w-full h-auto select-none"
                 style={{ transform: `scale(${scale}) translate(${panX / scale}px, ${panY / scale}px)`, transformOrigin: "50% 50%", minWidth: "100%" }} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 text-[var(--color-text-secondary)] text-sm">
            <Waves className="h-8 w-8 mr-2 opacity-50" />{t("noEegData")}
          </div>
        )}
      </div>
    </div>
  );
}
