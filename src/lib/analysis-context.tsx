"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { useLang } from "@/lib/language-context";
import { addReport, type StoredReport } from "@/lib/reports-storage";

// ── Types ───────────────────────────────────────────────────────────
export type Status = "pending" | "analyzing" | "completed" | "failed";

export interface FileJob {
  id: string;
  file: File;
  name: string;
  size: number;
  status: Status;
  result?: any;
  eegData?: any;
  error?: string;
}

// ── safeJsonFetch ───────────────────────────────────────────────────
const API_BASE = ""; // 使用相对路径，由nginx代理到后端
const FETCH_TIMEOUT = 300_000; // 5分钟：MNE分析(120s) + enhance + AI解释(60s)，防止大文件/多通道文件超时

async function safeJsonFetch(url: string, options: RequestInit = {}): Promise<any> {
  // Attach JWT token if available
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("neuroaccess-token");
    if (token) {
      options.headers = {
        ...(options.headers as Record<string, string> || {}),
        "Authorization": `Bearer ${token}`,
      };
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    if (!text.trim()) throw new Error("Empty response from backend");
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON from backend: ${text.slice(0, 300)}`);
    }
    if (!res.ok || data?.success === false) {
      const msg = data?.error || data?.detail || `HTTP ${res.status}`;
      throw new Error(String(msg));
    }
    return data;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Analysis timed out. Please check backend or Ollama.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Context ──────────────────────────────────────────────────────────
interface AnalysisContextValue {
  files: FileJob[];
  running: boolean;
  paused: boolean;
  expandId: string | null;
  setExpandId: (id: string | null) => void;
  handleFileSelect: (selected: FileList | null) => void;
  removeFile: (id: string) => void;
  clearAll: () => void;
  startAnalysis: () => void;
  pauseAnalysis: () => void;
  resumeAnalysis: () => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysis must be used within AnalysisProvider");
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────
export function AnalysisProvider({ children }: { children: ReactNode }) {
  const { lang, t } = useLang();
  const [files, setFiles] = useState<FileJob[]>([]);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [expandId, setExpandId] = useState<string | null>(null);
  const runningRef = useRef(false);
  const shouldPauseRef = useRef(false);
  const startAnalysisRef = useRef<(() => void) | null>(null);
  const runIdRef = useRef(0); // 追踪分析轮次，防止旧轮次干扰

  // 语言切换 → 清空已完成文件的解释（不打断正在分析的文件）
  useEffect(() => {
    setFiles((prev) =>
      prev.map((item) => {
        if (item.status === "analyzing" || item.status === "pending") return item;
        if (item.result) {
          return { ...item, result: { ...item.result, explanations: undefined } };
        }
        return item;
      }),
    );
    setExpandId(null);
  }, [lang]);

  // ── 文件选择 ─────────────────────────────────────────────────
  const handleFileSelect = useCallback((selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    const valid = Array.from(selected).filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ["edf", "bdf", "gdf"].includes(ext || "");
    });
    if (valid.length === 0) return;
    setFiles((prev) => [
      ...prev,
      ...valid.map((file) => ({
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        name: file.name,
        size: file.size,
        status: "pending" as Status,
        result: undefined,
        error: undefined,
      })),
    ]);
  }, []);

  // ── 删除文件 ─────────────────────────────────────────────────
  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // ── 清空全部 ─────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    setFiles([]);
    setExpandId(null);
    setRunning(false);
    setPaused(false);
    runningRef.current = false;
    shouldPauseRef.current = false;
    runIdRef.current = 0;
    // 注意：不清空 reports（报告页独立管理，仪表盘清空不影响已保存的报告）
  }, []);

  // ── 暂停分析 ─────────────────────────────────────────────────
  const pauseAnalysis = useCallback(() => {
    shouldPauseRef.current = true;
    setPaused(true);
    // 使当前轮次失效，防止旧 fetch 完成后的状态更新干扰
    runIdRef.current++;
    // 把正在分析的文件状态改回 pending
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "analyzing" ? { ...f, status: "pending" } : f
      )
    );
  }, []);

  // ── 恢复分析 ─────────────────────────────────────────────────
  const resumeAnalysis = useCallback(() => {
    shouldPauseRef.current = false;
    setPaused(false);
    // 使可能仍在运行的旧轮次失效
    runIdRef.current++;
    runningRef.current = false;
    // 启动新分析
    if (startAnalysisRef.current) startAnalysisRef.current();
  }, []);

  // ── 开始分析（核心逻辑）────────────────────────────────────
  const startAnalysis = useCallback(() => {
    if (files.length === 0 || runningRef.current) return;
    const myRunId = ++runIdRef.current; // 新轮次 ID
    runningRef.current = true;
    setRunning(true);
    setPaused(false);
    shouldPauseRef.current = false;

    // 用 async IIFE 避免 useCallback 返回 Promise
    (async () => {
      try {
        for (const item of files) {
          // 检查是否暂停
          if (shouldPauseRef.current) {
            if (runIdRef.current === myRunId) {
              setRunning(false);
              runningRef.current = false;
            }
            return;
          }
          // 检查本轮次是否已失效（被 pause 或 resume 使失效）
          if (runIdRef.current !== myRunId) return;

          if (item.status === "completed" || item.status === "failed") continue;

          setFiles((prev) => {
            if (runIdRef.current !== myRunId) return prev;
            return prev.map((f) =>
              f.id === item.id ? { ...f, status: "analyzing", error: undefined } : f
            );
          });

          try {
            const formData = new FormData();
            formData.append("file", item.file);
            formData.append("language", lang);

            const data = await safeJsonFetch(`${API_BASE}/api/analyze`, {
              method: "POST",
              body: formData,
            });

            if (!data.success) throw new Error(data.error || t("analysisFailed") || "Analysis failed");

            // 检查本轮次是否已失效（fetch 期间被 pause/resume）
            if (runIdRef.current !== myRunId) {
              // 旧轮次，放弃结果
              return;
            }

            // 检查是否已在暂停状态（pauseAnalysis 在 fetch 期间被调用）
            if (shouldPauseRef.current) {
              setFiles((prev) => {
                if (runIdRef.current !== myRunId) return prev;
                return prev.map((f) => f.id === item.id ? { ...f, status: "pending" } : f);
              });
              if (runIdRef.current === myRunId) {
                setRunning(false);
                runningRef.current = false;
              }
              return;
            }

            // ── 使用分析结果中的波形预览（优先，支持所有格式）──
            let eegData: any = null;
            const waveformPreview = (data.analysis as any)?.waveform_preview;
            if (waveformPreview && waveformPreview.times && waveformPreview.channels) {
              // 分析结果已含波形预览（EDF/BDF/GDF 均支持，避免二次请求失败）
              const chNames = Object.keys(waveformPreview.channels || {});
              eegData = {
                success: true,
                file_name: item.name,
                channel_names: chNames,
                sampling_rate: waveformPreview.sampling_rate,
                duration_seconds: waveformPreview.duration_seconds,
                times: waveformPreview.times,
                channels: waveformPreview.channels,
                total_channels: chNames.length,
                total_samples: waveformPreview.times?.length || 0,
              };
            } else {
              // 回退：单独请求 /api/eeg/viewer
              try {
                const viewerFormData = new FormData();
                viewerFormData.append("file", item.file);
                viewerFormData.append("duration", "10");
                const viewerResult = await safeJsonFetch(`${API_BASE}/api/eeg/viewer`, {
                  method: "POST",
                  body: viewerFormData,
                });
                if (viewerResult.success) eegData = viewerResult;
              } catch (viewerErr: any) {
                console.warn(`[EEG Viewer] Fallback failed for ${item.name}:`, viewerErr?.message || String(viewerErr));
              }
            }

            // 再次检查本轮次是否已失效
            if (runIdRef.current !== myRunId) return;

            setFiles((prev) => {
              if (runIdRef.current !== myRunId) return prev;
              return prev.map((f) =>
                f.id === item.id ? { ...f, status: "completed", result: data.analysis, eegData } : f
              );
            });

            // 保存到 localStorage（Reports 页面读取）
            const report: StoredReport = {
              id: item.id,
              fileName: item.name,
              date: new Date().toLocaleString("zh-CN", { hour12: false }),
              mode: "Beginner",
              quality: (data.analysis as any)?.signal_quality_score ?? 0,
              language: lang,
              analysis: data.analysis,
              eegData,
            };
            addReport(report);
          } catch (err: any) {
            if (runIdRef.current !== myRunId) return; // 旧轮次，放弃
            console.error("Analyze failed:", item.name, err);
            setFiles((prev) => {
              if (runIdRef.current !== myRunId) return prev;
              return prev.map((f) =>
                f.id === item.id
                  ? { ...f, status: "failed", error: err?.message || String(err) }
                  : f
              );
            });
          }
        }
      } catch (unexpectedErr) {
        console.error("Unexpected error in analyzeAll:", unexpectedErr);
      } finally {
        if (runIdRef.current === myRunId) {
          runningRef.current = false;
          setRunning(false);
        }
      }
    })();
  }, [files, lang]);

  // 保持 startAnalysisRef 最新
  useEffect(() => {
    startAnalysisRef.current = startAnalysis;
  }, [startAnalysis]);

  return (
    <AnalysisContext.Provider
      value={{ files, running, paused, expandId, setExpandId, handleFileSelect, removeFile, clearAll, startAnalysis, pauseAnalysis, resumeAnalysis }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}
