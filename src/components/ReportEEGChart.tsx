"use client";

import { useLang } from "@/lib/language-context";
import { Waves, Download, Move, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useRef, useState, useEffect, useMemo } from "react";

interface ReportEEGChartProps {
  reportFileName: string;
  eegData?: any;
  analysis?: any;
}

// 4 频段固定颜色
const BAND_COLORS: Record<string, string> = {
  delta: "#ef4444", // red
  theta: "#f97316", // orange
  alpha: "#eab308", // amber/yellow
  beta:  "#3b82f6", // blue
};

const BAND_ORDER = ["delta", "theta", "alpha", "beta"];

export default function ReportEEGChart({ reportFileName, eegData: savedEegData, analysis }: ReportEEGChartProps) {
  const { t } = useLang();

  const src = analysis || savedEegData;
  const times: number[] = savedEegData?.times || [];
  const channels: Record<string, number[]> = savedEegData?.channels || {};
  const chNames: string[] = Object.keys(channels);

  // ── 频段波形数据（优先，跨通道平均后的 Delta/Theta/Alpha/Beta）─────
  const bandData = useMemo(() => {
    const bw = src?.band_waveforms;
    if (bw && bw.times && bw.times.length > 0 && bw.delta) {
      return bw; // { times, delta, theta, alpha, beta }
    }
    return null;
  }, [src?.band_waveforms]);

  // hasData: 有通道波形或有频段波形
  const hasData = (times.length > 0 && chNames.length > 0) || !!bandData;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanMode, setIsPanMode] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  // Draw canvas — 4 frequency bands with fixed colors
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !bandData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w <= 0 || h <= 0) return;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const bt = bandData.times as number[];
    const nPts = bt.length;
    const pxPerPt = w / nPts;

    // ── 4 频段垂直堆叠 ──────────────────────────────────
    const nBands = 4;
    const padV = 12;
    const bandH = (h - padV * 2) / nBands;
    const padH = 40; // left padding for labels

    // Grid lines per band
    for (let b = 0; b < nBands; b++) {
      const baseY = padV + b * bandH;
      const midY = baseY + bandH / 2;
      ctx.strokeStyle = "#27272a";
      ctx.lineWidth = 0.4;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(padH, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Band labels (left side)
    ctx.fillStyle = "#9ca3af";
    ctx.font = "11px -apple-system, sans-serif";
    ctx.textAlign = "right";
    for (let b = 0; b < nBands; b++) {
      const baseY = padV + b * bandH;
      const midY = baseY + bandH / 2;
      ctx.fillText(BAND_ORDER[b], padH - 8, midY + 4);
    }
    ctx.textAlign = "start";

    // Waveforms
    const dataSpan = 8; // auto-scale: ±4 μV around 0
    for (let b = 0; b < nBands; b++) {
      const bandName = BAND_ORDER[b];
      const vals = bandData[bandName] as number[];
      if (!vals || vals.length < 2) continue;

      const baseY = padV + b * bandH;
      const midY = baseY + bandH / 2;
      const ampScale = bandH / (dataSpan * 2); // map ±dataSpan to band height

      ctx.strokeStyle = BAND_COLORS[bandName];
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();

      for (let j = 0; j < nPts && j < vals.length; j++) {
        const x = padH + j * pxPerPt;
        // vals are cross-channel averages in μV, center at 0
        const clamped = Math.max(-dataSpan, Math.min(dataSpan, vals[j]));
        const y = midY - clamped * ampScale;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, [bandData]);

  // Mouse panning
  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1.01 && !isPanMode) return;
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { x: panX, y: panY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setPanX(panStart.current.x + (e.clientX - dragStart.current.x));
    setPanY(panStart.current.y + (e.clientY - dragStart.current.y));
  };
  const onMouseUp = () => { dragging.current = false; };

  // Download
  const onDownload = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = reportFileName + "_waveform.png";
    a.click();
  };

  if (!src && !hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Waves className="h-12 w-12 text-[var(--color-text-secondary)]/50 mb-4" />
        <p className="text-sm text-[var(--color-text-secondary)]">{t("noEegData")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border)]">
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">{t("fileInfo")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-[var(--color-text-secondary)]">{t("fileNameEeg")}:</span><p className="font-medium text-[var(--color-text)] truncate">{src?.file_name || reportFileName}</p></div>
          <div><span className="text-[var(--color-text-secondary)]">{t("channelCountEeg")}:</span><p className="font-medium text-[var(--color-text)]">{src?.channel_count || savedEegData?.total_channels || chNames.length}</p></div>
          <div><span className="text-[var(--color-text-secondary)]">{t("samplingRateEeg")}:</span><p className="font-medium text-[var(--color-text)]">{src?.sampling_rate || savedEegData?.sampling_rate}</p></div>
          <div><span className="text-[var(--color-text-secondary)]">{t("totalDurationEeg")}:</span><p className="font-medium text-[var(--color-text)]">{src?.duration || savedEegData?.duration_seconds} s</p></div>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 pt-3 sm:pt-4 pb-1 sm:pb-2">
          <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text)]">{t("waveformPreviewTitle")}</h3>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button onClick={onDownload} title={t("plotlyDownloadPng")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-bg)] hover:text-[var(--color-text)] transition-colors"><Download size={16} /><span className="hidden sm:inline">{t("plotlyDownloadPng")}</span></button>
            <button onClick={() => setIsPanMode(v => !v)} title={t("plotlyPan")} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${isPanMode ? "bg-blue-600 text-white" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-bg)] hover:text-[var(--color-text)]"}`}><Move size={16} /><span className="hidden sm:inline">{t("plotlyPan")}</span></button>
            <button onClick={() => setScale(s => Math.min(s * 1.3, 8))} title={t("plotlyZoomIn")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-bg)] hover:text-[var(--color-text)] transition-colors"><ZoomIn size={16} /><span className="hidden sm:inline">{t("plotlyZoomIn")}</span></button>
            <button onClick={() => setScale(s => Math.max(s / 1.3, 0.25))} title={t("plotlyZoomOut")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-bg)] hover:text-[var(--color-text)] transition-colors"><ZoomOut size={16} /><span className="hidden sm:inline">{t("plotlyZoomOut")}</span></button>
            <button onClick={() => { setScale(1); setPanX(0); setPanY(0); }} title={t("plotlyResetAxes")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-bg)] hover:text-[var(--color-text)] transition-colors"><RotateCcw size={16} /><span className="hidden sm:inline">{t("plotlyResetAxes")}</span></button>
          </div>
        </div>

        {bandData ? (
          <>
            {/* 频段颜色图例 */}
            <div className="px-4 sm:px-5 pb-2">
              <p className="text-xs text-[var(--color-text-secondary)]">{t("bandColorLegend")}</p>
              <div className="flex flex-wrap gap-3 mt-1">
                {BAND_ORDER.map((band) => (
                  <span key={band} className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: BAND_COLORS[band] }} />
                    {t(band + "Band")}
                  </span>
                ))}
              </div>
            </div>

            <div
              ref={containerRef}
              className={`relative w-full bg-[#0a0a0a] overflow-hidden ${isPanMode || scale > 1.01 ? "cursor-grab" : "cursor-default"}`}
              style={{ height: "min(320px, 50vh)" }}
              onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
            >
              <canvas
                ref={canvasRef}
                className="block absolute top-0 left-0"
                style={{
                  transform: `scale(${scale}) translate(${panX / scale}px, ${panY / scale}px)`,
                  transformOrigin: "0 0",
                  transition: dragging.current ? "none" : "transform 0.1s ease-out",
                }}
              />
              {Math.abs(scale - 1) > 0.01 && (
                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md font-mono backdrop-blur-sm z-10">
                  {Math.round(scale * 100)}%
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[320px] text-zinc-500 gap-2">
            <Waves className="h-10 w-10 opacity-40" /><p className="text-sm">{t("noBandWaveform")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
