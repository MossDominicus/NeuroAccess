"use client";

import { useLang } from "@/lib/language-context";
import { formatDuration } from "@/lib/duration";
import { Download, Waves, ZoomIn, ZoomOut, Move, Maximize2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { buildWaveformSvg, svgToDataUrl, isPlaceholderSvg } from "@/lib/waveform-svg";

interface ReportEEGChartProps {
  reportFileName: string;
  eegData?: any;
  analysis?: any;
  id?: string;
}

/** 与 buildWaveformSvg 同源的分页计算，用于渲染翻页控件 */
function computeTotalPages(analysis: any): number {
  const wp = analysis?.waveform_preview;
  const chs = wp?.channels || {};
  const names = Object.keys(chs);
  if (!names.length) return 1;
  const npts = chs[names[0]]?.length || 0;
  const times = wp?.times || [];
  const durFromWp = parseFloat(wp?.duration_seconds || 0) || 0;
  let fs = parseFloat(wp?.sampling_rate || 128) || 128;
  if (times.length > 1 && times[1] - times[0] > 0 && times[1] - times[0] < 1) fs = 1 / (times[1] - times[0]);
  const dur = durFromWp > 0
    ? durFromWp
    : (times.length > 1 ? Math.max(times[times.length - 1] - times[0], 1e-9) : Math.max(npts / fs, 1e-9));
  const pageSeconds = dur <= 30 ? dur : 10;
  return Math.max(1, Math.ceil(dur / pageSeconds));
}

export default function ReportEEGChart({ reportFileName, analysis, id }: ReportEEGChartProps) {
  const { t } = useLang();
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanMode, setIsPanMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const dragStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  // 指针（鼠标/触摸）状态表：支持单指/单键拖拽平移、双指捏合缩放
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);

  const reportId = id || "";
  // 最终生效的图片 URL：默认请求服务器，若报告未同步到服务器（返回占位 SVG），
  // 回退用本地 analysis.waveform_preview 直接生成 SVG data URL。
  const [effectiveUrl, setEffectiveUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // 上一个 Blob URL（服务端大 SVG 用 objectURL 加载更快），切换/卸载时释放避免内存泄漏
  const prevUrlRef = useRef<string | null>(null);
  const assignUrl = (url: string | null) => {
    if (prevUrlRef.current && prevUrlRef.current.startsWith("blob:")) {
      URL.revokeObjectURL(prevUrlRef.current);
    }
    prevUrlRef.current = url && url.startsWith("blob:") ? url : null;
    setEffectiveUrl(url);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // 本地已有波形预览：立即同步渲染（零延迟，本地波形已降采样到足够真实），不发请求
      const localChannels = analysis?.waveform_preview?.channels;
      const hasLocalData = !!analysis?.band_waveforms || (localChannels && typeof localChannels === "object" && Object.keys(localChannels).length > 0);
      if (hasLocalData) {
        const localSvg = buildWaveformSvg(analysis, currentPage);
        if (!cancelled) {
          assignUrl(localSvg ? svgToDataUrl(localSvg) : null);
          setLoading(false);
        }
        return;
      }
      // 本地无数据：回退服务端分页（无 reportId 直接放弃）
      if (!reportId) {
        if (!cancelled) { assignUrl(null); setLoading(false); }
        return;
      }
      const serverUrl = `/api/waveform-image?rid=${encodeURIComponent(reportId)}&page=${currentPage}&_t=${Date.now()}`;
      try {
        const resp = await fetch(serverUrl);
        const text = await resp.text();
        if (!cancelled) {
          if (resp.ok && text.includes("<svg") && !isPlaceholderSvg(text)) {
            const blob = new Blob([text], { type: "image/svg+xml" });
            assignUrl(URL.createObjectURL(blob));
          } else {
            assignUrl(null);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) { assignUrl(null); setLoading(false); }
      }
    };
    setLoading(true);
    load();
    return () => {
      cancelled = true;
      if (prevUrlRef.current && prevUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, currentPage, analysis]);

  const imageUrl = effectiveUrl;

  // 频段计数 = 每个频段"主导"的通道数（逐通道 FFT 算主导频段），不是百分比
  // 优先从 waveform_preview.channels 取通道数；为空时回退 analysis.channel_count
  const wpChCount = analysis?.waveform_preview?.channels ? Object.keys(analysis.waveform_preview.channels).length : 0;
  const nTotal = wpChCount > 0 ? wpChCount : (analysis?.channel_count || 0);
  const totalPages = computeTotalPages(analysis);

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

  // 指针（鼠标/触摸统一）交互：单指/单键拖拽平移、双指捏合缩放。
  // 平移受"平移按钮"门控：未开启时不响应拖拽（波形固定不动）；缩放（捏合/Ctrl滚轮/+/-）始终可用。
  const onPointerDown = (e: React.PointerEvent) => {
    if (!isPanMode) return; // 未开启平移：不响应拖拽，也不捕获指针
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      dragStart.current = { x: e.clientX, y: e.clientY, px: panX, py: panY };
    } else if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStart.current = { dist, scale };
      dragStart.current = null;
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && pinchStart.current) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const next = Math.max(0.5, Math.min(8, pinchStart.current.scale * (dist / pinchStart.current.dist)));
      setScale(next);
    } else if (pointers.current.size === 1 && dragStart.current) {
      setPanX(dragStart.current.px + (e.clientX - dragStart.current.x));
      setPanY(dragStart.current.py + (e.clientY - dragStart.current.y));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) dragStart.current = null;
  };

  // 滚轮：Ctrl/⌘+滚轮 = 缩放（始终可用）；普通滚轮仅在平移按钮开启时平移波形，
  // 未开启时不做拦截、让页面正常滚动。
  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setScale(s => Math.max(0.5, Math.min(8, s * (e.deltaY < 0 ? 1.1 : 0.9))));
    } else if (isPanMode) {
      e.preventDefault();
      setPanX(px => px - e.deltaX);
      setPanY(py => py - e.deltaY);
    }
  };

  const canPaginate = totalPages > 1;

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border)]">
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">{t("fileInfo")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
          <div><span className="text-[var(--color-text-secondary)]">{t("fileNameEeg")}:</span><p className="font-medium text-[var(--color-text)] truncate">{reportFileName}</p></div>
          <div><span className="text-[var(--color-text-secondary)]">{t("channelCountEeg")}:</span><p className="font-medium text-[var(--color-text)]">{nTotal}</p></div>
          <div><span className="text-[var(--color-text-secondary)]">{t("samplingRateEeg")}:</span><p className="font-medium text-[var(--color-text)]">{analysis?.waveform_preview?.sampling_rate || "—"}</p></div>
          <div><span className="text-[var(--color-text-secondary)]">{t("totalDurationEeg")}:</span><p className="font-medium text-[var(--color-text)]">{formatDuration(analysis, t)}</p></div>
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
        {loading ? (
          <div className="flex items-center justify-center h-48 text-[var(--color-text-secondary)] text-sm">
            <Loader2 className="h-8 w-8 mr-2 opacity-50 animate-spin" />{t("loading")}
          </div>
        ) : imageUrl ? (
          <div ref={containerRef}
               onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onPointerCancel={onPointerUp}
               onWheel={onWheel}
               className={`w-full bg-[var(--color-bg)] overflow-hidden ${isPanMode ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
               style={{ minHeight: 200, maxHeight: "75vh", touchAction: isPanMode ? "none" : "auto" }}>
            <img ref={imgRef} src={imageUrl} alt="EEG Waveform" draggable={false} className="block h-auto select-none"
                 style={{ transform: `translate(${panX}px, ${panY}px) scale(${scale})`, transformOrigin: "0 0", width: "auto", height: "auto", maxWidth: "100%" }} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 text-[var(--color-text-secondary)] text-sm">
            <Waves className="h-8 w-8 mr-2 opacity-50" />{t("noEegData")}
          </div>
        )}
        {canPaginate && (
          <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-[var(--color-border)]">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage <= 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-bg)]"
            >
              <ChevronLeft size={14} />{t("prevPage")}
            </button>
            <span className="text-xs text-[var(--color-text-secondary)] font-mono">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-bg)]"
            >
              {t("nextPage")}<ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
