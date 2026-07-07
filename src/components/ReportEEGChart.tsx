"use client";

import { useLang } from "@/lib/language-context";
import { Waves, Download, Move, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useRef, useState, useEffect, useMemo } from "react";

interface ReportEEGChartProps {
  reportFileName: string;
  eegData?: any;
  analysis?: any;
}

const BAND_COLORS: Record<string, string> = {
  delta: "#ef4444",  // 红
  theta: "#facc15",  // 亮黄
  alpha: "#3b82f6",  // 蓝
  beta:  "#22c55e",  // 绿
};
const BAND_ORDER = ["delta", "theta", "alpha", "beta"];

// 频段定义 (Hz)
const BAND_LIMITS: Record<string, [number, number]> = {
  delta: [0.5, 4],
  theta: [4, 8],
  alpha: [8, 13],
  beta:  [13, 30],
};

export default function ReportEEGChart({ reportFileName, eegData: savedEegData, analysis }: ReportEEGChartProps) {
  const { t } = useLang();

  // ── 原始通道数据（真实 EEG 波形）───────────────────
  const channelData = useMemo(() => {
    let rawTimes: number[] = savedEegData?.times || [];
    let rawChs: Record<string, number[]> = savedEegData?.channels || {};
    let rawNames: string[] = Object.keys(rawChs);
    if (rawNames.length === 0 && analysis) {
      const wp = analysis.waveform_preview || {};
      const at = wp.times || analysis.eeg_times || analysis.times;
      const ac = wp.channels || analysis.eeg_channels || analysis.channels;
      if (Array.isArray(at) && at.length > 2 && ac && typeof ac === 'object') {
        rawTimes = at; rawChs = ac; rawNames = Object.keys(ac);
      }
    }
    if (rawNames.length === 0) return null;
    const step = Math.max(1, Math.floor(rawTimes.length / 500));
    const downTimes: number[] = [];
    const downChs: Record<string, number[]> = {};
    for (const ch of rawNames) downChs[ch] = [];
    for (let i = 0; i < rawTimes.length; i += step) {
      downTimes.push(rawTimes[i]);
      for (const ch of rawNames) downChs[ch].push((rawChs[ch]?.[i] ?? 0));
    }
    return { times: downTimes, channels: downChs, chNames: rawNames };
  }, [savedEegData, analysis]);

  // ── 按频段比例分配通道颜色 ─────────────────────────
  const channelColors = useMemo(() => {
    if (!channelData) return null;
    const colorMap: Record<string, string> = {};

    // 从分析结果中获取各频段的相对比例
    let bandRatios: Record<string, number> = { delta: 25, theta: 25, alpha: 25, beta: 25 };
    try {
      const bp = analysis?.frequency_analysis?.bandpower_percent
        || analysis?.frequency_analysis?.bandpower
        || analysis?.bandpower_percent
        || analysis?.bandpower;
      if (bp && typeof bp === 'object') {
        const parsed: Record<string, number> = {};
        let total = 0;
        for (const b of BAND_ORDER) {
          const v = bp[b];
          if (v != null) {
            const num = typeof v === 'string' ? parseFloat(v) : Number(v);
            if (!isNaN(num) && num > 0) { parsed[b] = num; total += num; }
          }
        }
        if (total > 0) {
          for (const b of BAND_ORDER) {
            bandRatios[b] = (parsed[b] || 0) / total * 100;
          }
        }
      }
    } catch { /* fallback to equal ratios */ }

    // 按信号方差排序通道（方差大的更活跃）
    const chVariance = channelData.chNames.map((ch) => {
      const sig = channelData.channels[ch] || [];
      if (sig.length < 2) return 0;
      const mean = sig.reduce((a, b) => a + b, 0) / sig.length;
      const varVal = sig.reduce((a, b) => a + (b - mean) ** 2, 0) / sig.length;
      return varVal;
    });

    // 按方差降序排列通道（活跃的排在前面）
    const sortedChs = channelData.chNames
      .map((ch, i) => ({ name: ch, variance: chVariance[i] }))
      .sort((a, b) => b.variance - a.variance);

    // 按比例分配通道到各频段
    const nCh = channelData.chNames.length;
    const assignments: { name: string; band: string }[] = [];
    let idx = 0;
    for (const b of BAND_ORDER) {
      const count = Math.round((bandRatios[b] / 100) * nCh);
      for (let i = 0; i < count && idx < sortedChs.length; i++) {
        assignments.push({ name: sortedChs[idx].name, band: b });
        idx++;
      }
    }
    // 剩余通道分配到 Beta
    while (idx < sortedChs.length) {
      assignments.push({ name: sortedChs[idx].name, band: "beta" });
      idx++;
    }

    for (const a of assignments) {
      colorMap[a.name] = BAND_COLORS[a.band];
    }
    return colorMap;
  }, [channelData, analysis]);

  // ── 统计各频段通道数 ────────────────────────────────
  const bandChannelCount = useMemo(() => {
    if (!channelColors || !channelData) return null;
    const counts: Record<string, number> = { delta: 0, theta: 0, alpha: 0, beta: 0 };
    for (const ch of channelData.chNames) {
      const c = channelColors[ch];
      for (const b of BAND_ORDER) {
        if (BAND_COLORS[b] === c) { counts[b]++; break; }
      }
    }
    return counts;
  }, [channelColors, channelData]);

  const hasData = !!channelData;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanMode, setIsPanMode] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  // ── 绘制 ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
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

    if (!channelData || !channelColors) return;

    // ── 全部通道原始波形，按主导频段着色 ──────────
    const { times: cTimes, channels: cChs, chNames: cNames } = channelData;
    const nCh = cNames.length;
    const padV = 12;
    const chH = (h - padV * 2) / nCh;
    const padH = 36;

    // 网格线（从 CSS 变量读取颜色，自动适配亮/暗模式）
    const gridColor = getComputedStyle(container).getPropertyValue("--color-border").trim() || "#e5e7eb";
    for (let ch = 0; ch < nCh; ch++) {
      const midY = padV + ch * chH + chH / 2;
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.3;
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(padH, midY); ctx.lineTo(w, midY); ctx.stroke();
      ctx.setLineDash([]);
    }

    // 通道标签（从 CSS 变量读取颜色，自动适配亮/暗模式）
    const labelColor = getComputedStyle(container).getPropertyValue("--color-text-secondary").trim() || "#6b7280";
    ctx.fillStyle = labelColor;
    ctx.font = "10px -apple-system, sans-serif";
    ctx.textAlign = "right";
    for (let ch = 0; ch < nCh; ch++) {
      const midY = padV + ch * chH + chH / 2;
      ctx.fillText(cNames[ch], padH - 6, midY + 3);
    }
    ctx.textAlign = "start";

    // 绘制每个通道 — 颜色由其主导频段决定
    const nPts = cTimes.length;
    const pxPerPt = w / nPts;
    for (let ch = 0; ch < nCh; ch++) {
      const vals = cChs[cNames[ch]];
      if (!vals || vals.length < 2) continue;
      const midY = padV + ch * chH + chH / 2;
      const sorted = [...vals].map(Math.abs).sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || 1;
      const ampScale = Math.min(chH / (p95 * 2.5), chH / 2);

      // 主导频段颜色
      const chColor = channelColors[cNames[ch]] || "#3b82f6";
      ctx.strokeStyle = chColor;
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      for (let j = 0; j < nPts && j < vals.length; j++) {
        const x = padH + j * pxPerPt;
        const y = midY - vals[j] * ampScale;
        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, [channelData, channelColors]);

  // 鼠标平移
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

  // 触摸平移（移动端支持）
  const onTouchStart = (e: React.TouchEvent) => {
    if (scale <= 1.01 && !isPanMode) return;
    if (e.touches.length !== 1) return;
    dragging.current = true;
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    panStart.current = { x: panX, y: panY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current || e.touches.length !== 1) return;
    setPanX(panStart.current.x + (e.touches[0].clientX - dragStart.current.x));
    setPanY(panStart.current.y + (e.touches[0].clientY - dragStart.current.y));
  };
  const onTouchEnd = () => { dragging.current = false; };

  const onDownload = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = reportFileName + "_waveform.png";
    a.click();
  };

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Waves className="h-12 w-12 text-[var(--color-text-secondary)]/50 mb-4" />
        <p className="text-sm text-[var(--color-text-secondary)]">{t("noEegData")}</p>
      </div>
    );
  }

  const src = savedEegData || analysis;

  return (
    <div className="space-y-6">
      {/* ── 文件信息 ──────────────────────────────────────── */}
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border)]">
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">{t("fileInfo")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-[var(--color-text-secondary)]">{t("fileNameEeg")}:</span><p className="font-medium text-[var(--color-text)] truncate">{src?.file_name || reportFileName}</p></div>
          <div><span className="text-[var(--color-text-secondary)]">{t("channelCountEeg")}:</span><p className="font-medium text-[var(--color-text)]">{src?.channel_count || savedEegData?.total_channels || channelData?.chNames?.length || "—"}</p></div>
          <div><span className="text-[var(--color-text-secondary)]">{t("samplingRateEeg")}:</span><p className="font-medium text-[var(--color-text)]">{src?.sampling_rate || savedEegData?.sampling_rate}</p></div>
          <div><span className="text-[var(--color-text-secondary)]">{t("totalDurationEeg")}:</span><p className="font-medium text-[var(--color-text)]">{src?.duration || savedEegData?.duration_seconds} s</p></div>
        </div>
      </div>

      {/* ── 波形图 ─────────────────────────────────────────── */}
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

        {/* ── 频段图例 ──────────────────────────────────── */}
        {channelData && channelColors ? (
          <div className="px-4 sm:px-5 pb-2">
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">{channelData.chNames.length} {t("channelCountEeg")}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {BAND_ORDER.map((band) => {
                const cnt = bandChannelCount?.[band] ?? 0;
                const label = band.charAt(0).toUpperCase() + band.slice(1)
                  + (cnt > 0 ? ` (${cnt})` : "");
                return (
                  <span key={band} className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: BAND_COLORS[band] }} />
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* ── Canvas ────────────────────────────────────────── */}
        <div
          ref={containerRef}
          className={`relative w-full bg-[var(--color-bg)] overflow-hidden ${isPanMode || scale > 1.01 ? "cursor-grab" : "cursor-default"}`}
          style={{ height: "min(320px, 50vh)" }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
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
      </div>
    </div>
  );
}
