"use client";

import { useLang } from "@/lib/language-context";

interface Props {
  eegData: any;
  selectedChannels: Set<string>;
}

export default function PlotlyEEGViewerWaveform({ eegData }: Props) {
  const { t } = useLang();
  const waveformImage = eegData?.waveform_image || eegData?.waveform?.waveform_image || null;

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)]">
      <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">
        {t("waveformPreviewTitle")}
      </h3>
      {waveformImage ? (
        <img
          src={`data:image/png;base64,${waveformImage}`}
          alt={t("waveformPreviewAlt")}
          className="w-full rounded-xl border border-zinc-800 bg-black"
        />
      ) : (
        <div className="flex items-center justify-center h-[400px] text-zinc-400">
          {t("noWaveformPreview")}
        </div>
      )}
    </div>
  );
}
