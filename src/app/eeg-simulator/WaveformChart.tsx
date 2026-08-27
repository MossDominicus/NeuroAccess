"use client";

import { useState } from "react";
import { buildWaveformSvg, svgToDataUrl } from "@/lib/waveform-svg";
import { useLang } from "@/lib/language-context";

/**
 * 模拟器波形：与报告详情波形图使用完全相同的渲染方式
 * （src/lib/waveform-svg.ts buildWaveformSvg）——深色底、单色天蓝波形线、
 * 固定通道行高、全局振幅基准、clip 削波、底部 2s 刻度时间条。
 */
interface WaveformChartProps {
  /** 模拟器生成接口的完整响应：{ channels, times, sampling_rate, duration_seconds, channel_names } */
  resultData: any;
}

export default function WaveformChart({ resultData }: WaveformChartProps) {
  const { t } = useLang();
  const [page, setPage] = useState(0);

  const channels: Record<string, number[]> = resultData?.channels || {};
  const times: number[] = resultData?.times || [];
  const chNames: string[] = resultData?.channel_names || [];
  if (!times.length || chNames.length === 0) return null;

  const analysis = {
    waveform_preview: {
      channels,
      times,
      sampling_rate: resultData.sampling_rate || 250,
      duration_seconds: resultData.duration_seconds,
    },
  };

  // 分页计算与报告波形一致：≤30s 整段显示，长文件每屏 10s
  const dur =
    parseFloat(resultData.duration_seconds || 0) ||
    (times.length > 1 ? Math.max(times[times.length - 1] - times[0], 1e-9) : 0);
  const pageSeconds = dur <= 30 ? dur : 10;
  const totalPages = Math.max(1, Math.ceil(dur / pageSeconds));
  const canPaginate = totalPages > 1;

  const svg = buildWaveformSvg(analysis, page);
  if (!svg) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="w-full overflow-x-auto">
        <img
          src={svgToDataUrl(svg)}
          alt="EEG Waveform"
          className="block h-auto select-none"
          style={{ minWidth: "100%", width: "auto", maxWidth: "none" }}
          draggable={false}
        />
      </div>
      {canPaginate && (
        <div className="flex items-center justify-center gap-3 px-5 py-2.5 border-t border-[var(--color-border)]">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page <= 0}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-bg)]"
          >
            {t("prevPage")}
          </button>
          <span className="text-xs text-[var(--color-text-secondary)] font-mono">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-bg)]"
          >
            {t("nextPage")}
          </button>
        </div>
      )}
    </div>
  );
}
