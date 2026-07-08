"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import nextDynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";



const EEGViewerPlot = nextDynamic(() => import("@/components/PlotlyEEGViewerWaveform"), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-[var(--color-bg)] rounded-xl h-96" />,
});

export default function EEGViewerPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [eegData, setEegData] = useState<any>(null);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    const token = localStorage.getItem("neuroaccess-token") || "";
    if (!token) router.push("/login");
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError("");
      setEegData(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      setError("");
      setEegData(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("neuroaccess-token") || "";
      if (!token) {
        setError(t("pleaseLoginFirst"));
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("duration", duration.toString());

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
      const url = apiBase ? `${apiBase}/api/eeg/viewer` : "/api/eeg/viewer";
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      // 检查响应内容类型，防止非JSON错误
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        setError(`${t("serverError")} (${res.status}): ${text.slice(0, 200)}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        setError(data.error || t("uploadFailed"));
        setLoading(false);
        return;
      }

      setEegData(data);
      setSelectedChannels(new Set(data.channel_names || []));
    } catch (err: any) {
      setError(err.message || t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = (ch: string) => {
    setSelectedChannels(prev => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
          {t("eegViewer") || "EEG 查看器"}
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          {t("eegViewerDesc")}
        </p>
      </div>

      {/* 上传区域 */}
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border)] mb-8">
        <label
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="block border-2 border-dashed border-[var(--color-border)] rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
        >
          <input
            id="eeg-file-input"
            type="file"
            onChange={handleFileChange}
            className="sr-only"
          />
          <div className="text-[var(--color-text-secondary)]/70 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-[var(--color-text)] font-medium">
            {file ? file.name : t("clickOrDropEeg")}
          </p>
          <p className="text-[var(--color-text-secondary)]/70 text-sm mt-1">
            {t("supportedFormats")}
          </p>
        </label>

        {/* 参数设置 */}
        <div className="mt-4 flex items-center gap-4">
          <label className="text-sm text-[var(--color-text-secondary)]">
            {t("viewDurationSec")}
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(Math.max(1, parseInt(e.target.value) || 30))}
              className="ml-2 w-20 px-2 py-1 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-surface)] text-[var(--color-text)]"
              min={1}
              max={300}
            />
          </label>
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="px-6 py-2 bg-[var(--color-primary)] text-[var(--color-bg)] rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity text-sm font-medium"
          >
            {loading ? t("processing") : t("uploadAndView")}
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mt-4 p-3 bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* EEG 波形显示 */}
      {eegData && (
        <div className="space-y-6">
          {/* 文件信息 */}
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">{t("fileInfo")}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-[var(--color-text-secondary)]">{t("fileNameEeg")}</span>
                <p className="font-medium text-[var(--color-text)]">{eegData.file_name}</p>
              </div>
              <div>
                <span className="text-[var(--color-text-secondary)]">{t("channelCountEeg")}</span>
                <p className="font-medium text-[var(--color-text)]">{eegData.total_channels}</p>
              </div>
              <div>
                <span className="text-[var(--color-text-secondary)]">{t("samplingRateEeg")}</span>
                <p className="font-medium text-[var(--color-text)]">{eegData.sampling_rate} Hz</p>
              </div>
              <div>
                <span className="text-[var(--color-text-secondary)]">{t("totalDurationEeg")}</span>
                <p className="font-medium text-[var(--color-text)]">{eegData.duration_seconds} {t("timeUnitSec")}</p>
              </div>
            </div>
          </div>

          {/* 通道选择 */}
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">{t("channelSelect")}</h3>
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

          {/* 波形图 */}
          <EEGViewerPlot eegData={eegData} selectedChannels={selectedChannels} />
        </div>
      )}
    </div>
  );
}
