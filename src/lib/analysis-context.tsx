"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { useLang } from "@/lib/language-context";
import { addReport, type StoredReport } from "@/lib/reports-storage";

// ── Types ───────────────────────────────────────────────────────────
export type Status = "pending" | "reading" | "computing" | "analysisReady" | "explaining" | "completed" | "failed";

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
const API_BASE = "";
const ANALYZE_TIMEOUT = 60_000;   // 60s for /analyze (fast basic analysis)
const EXPLAIN_TIMEOUT = 180_000;  // 180s for /explain (AI may be slow)

async function safeJsonFetch(url: string, timeoutMs: number, options: RequestInit = {}): Promise<any> {
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
  const timer = setTimeout(() => controller.abort(), timeoutMs);

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
      throw new Error("Request timed out. Please try again.");
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

// ── sessionStorage persist (layout persists, but dashboard remounts) ──
const FILES_CACHE_KEY = "neuroaccess-files-v2";

function serializeFiles(files: FileJob[]): string {
  const meta = {
    savedAt: Date.now(),
    items: files.map(f => ({
      id: f.id, name: f.name, size: f.size, status: f.status,
      result: f.result || null, eegData: f.eegData || null,
      error: f.error || null,
    })),
  };
  try { return JSON.stringify(meta); } catch { return '{"savedAt":0,"items":[]}'; }
}

function deserializeFiles(json: string): FileJob[] {
  try {
    const meta = JSON.parse(json);
    if (!meta?.items || !Array.isArray(meta.items)) return [];
    // Only restore if saved within last 30 min (prevent stale data)
    if (Date.now() - (meta.savedAt || 0) > 30 * 60 * 1000) return [];
    return meta.items.map((m: any) => ({
      id: m.id, name: m.name, size: m.size || 0, status: m.status || "pending",
      file: new File([], m.name || "unknown.edf"),
      result: m.result || null, eegData: m.eegData || null,
      error: m.error || null,
    }));
  } catch { return []; }
}

// ── Provider ────────────────────────────────────────────────────────
export function AnalysisProvider({ children }: { children: ReactNode }) {
  const { lang, t } = useLang();
  const [files, setFiles] = useState<FileJob[]>(() => {
    // Try to load from sessionStorage on initial mount (SSR-safe with lazy init)
    if (typeof window === "undefined") return [];
    try {
      const raw = sessionStorage.getItem(FILES_CACHE_KEY);
      if (raw) return deserializeFiles(raw);
    } catch {}
    return [];
  });
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [expandId, setExpandId] = useState<string | null>(null);
  const runningRef = useRef(false);
  const shouldPauseRef = useRef(false);
  const startAnalysisRef = useRef<(() => void) | null>(null);
  const runIdRef = useRef(0);

  // Persist files to sessionStorage whenever they change
  useEffect(() => {
    try { sessionStorage.setItem(FILES_CACHE_KEY, serializeFiles(files)); } catch {}
  }, [files]);

  useEffect(() => {
    setFiles((prev) =>
      prev.map((item) => {
        if (item.status === "reading" || item.status === "computing" || item.status === "explaining" || item.status === "pending") return item;
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
      // 只接受 .edf
      return ext === "edf";
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

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
    setExpandId(null);
    setRunning(false);
    setPaused(false);
    runningRef.current = false;
    shouldPauseRef.current = false;
    runIdRef.current = 0;
    try { sessionStorage.removeItem(FILES_CACHE_KEY); } catch {}
  }, []);

  const pauseAnalysis = useCallback(() => {
    shouldPauseRef.current = true;
    setPaused(true);
    runIdRef.current++;
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "reading" || f.status === "computing" || f.status === "explaining"
          ? { ...f, status: "pending" }
          : f
      )
    );
  }, []);

  const resumeAnalysis = useCallback(() => {
    shouldPauseRef.current = false;
    setPaused(false);
    runIdRef.current++;
    runningRef.current = false;
    if (startAnalysisRef.current) startAnalysisRef.current();
  }, []);

  // ── 开始分析（v2.0 两阶段流程）─────────────────────────────
  const startAnalysis = useCallback(() => {
    if (files.length === 0 || runningRef.current) return;
    const myRunId = ++runIdRef.current;
    runningRef.current = true;
    setRunning(true);
    setPaused(false);
    shouldPauseRef.current = false;

    (async () => {
      try {
        for (const item of files) {
          if (shouldPauseRef.current) {
            if (runIdRef.current === myRunId) {
              setRunning(false);
              runningRef.current = false;
            }
            return;
          }
          if (runIdRef.current !== myRunId) return;
          if (item.status === "completed" || item.status === "failed") continue;

          // ── 阶段1：标记为 "reading" ─────────────────────────
          setFiles((prev) => {
            if (runIdRef.current !== myRunId) return prev;
            return prev.map((f) =>
              f.id === item.id ? { ...f, status: "reading", error: undefined } : f
            );
          });

          try {
            // ── 阶段2：调用 /analyze（快速基础分析）─────────────
            setFiles((prev) => {
              if (runIdRef.current !== myRunId) return prev;
              return prev.map((f) =>
                f.id === item.id ? { ...f, status: "computing", error: undefined } : f
              );
            });

            const formData = new FormData();
            formData.append("file", item.file);
            formData.append("language", lang);

            const data = await safeJsonFetch(`${API_BASE}/api/analyze`, ANALYZE_TIMEOUT, {
              method: "POST",
              body: formData,
            });

            if (!data.success) throw new Error(data.error || t("analysisFailed") || "Analysis failed");

            if (runIdRef.current !== myRunId) return;
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

            // ── 基础分析完成，立即显示结果（status = "analysisReady"）────
            let eegData: any = null;
            const waveformPreview = (data.analysis as any)?.waveform_preview;
            if (waveformPreview && waveformPreview.times && waveformPreview.channels) {
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
            }

            if (runIdRef.current !== myRunId) return;

            // 先以 "analysisReady" 状态保存（基础分析完成，AI 解释还在生成）
            setFiles((prev) => {
              if (runIdRef.current !== myRunId) return prev;
              return prev.map((f) =>
                f.id === item.id ? { ...f, status: "analysisReady", result: data.analysis, eegData } : f
              );
            });

            // 保存到 localStorage（Reports 页面立即可用）
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

            // ── 阶段3：调用 /explain（后台生成 AI 解释）────────
            setFiles((prev) => {
              if (runIdRef.current !== myRunId) return prev;
              return prev.map((f) =>
                f.id === item.id ? { ...f, status: "explaining" } : f
              );
            });

            const analysisForExplain = data.analysis;
            const analysisId = analysisForExplain?.analysis_id;

            // 先尝试 polling（后端后台线程已在 /analyze 中启动）
            if (analysisId) {
              let aiReady = false;
              for (let attempt = 0; attempt < 40; attempt++) {
                if (runIdRef.current !== myRunId) return;
                await new Promise((r) => setTimeout(r, 3000));
                if (runIdRef.current !== myRunId) return;
                try {
                  const token = localStorage.getItem("neuroaccess-token") || "";
                  const pollResp = await fetch(`/api/analysis/explanations/${analysisId}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  });
                  const pollData = await pollResp.json();
                  if (pollData.success && pollData.explanations) {
                    // AI 解释就绪
                    setFiles((prev) => {
                      if (runIdRef.current !== myRunId) return prev;
                      return prev.map((f) =>
                        f.id === item.id && f.result
                          ? { ...f, status: "completed", result: { ...f.result, explanations: pollData.explanations } }
                          : f
                      );
                    });
                    // 同步 localStorage
                    try {
                      const stored = localStorage.getItem("neuroaccess-reports");
                      if (stored) {
                        const reports = JSON.parse(stored);
                        const idx = reports.findIndex((r: any) => r.id === item.id);
                        if (idx >= 0 && reports[idx].analysis) {
                          reports[idx].analysis.explanations = pollData.explanations;
                          localStorage.setItem("neuroaccess-reports", JSON.stringify(reports));
                        }
                      }
                    } catch {}
                    aiReady = true;
                    break;
                  }
                  if (!pollData.success) break; // unknown id
                } catch {
                  // network error, keep trying
                }
              }

              // Polling 超时或失败 → 尝试直接调用 /explain
              if (!aiReady && runIdRef.current === myRunId) {
                try {
                  const explainResp = await safeJsonFetch(`${API_BASE}/api/explain`, EXPLAIN_TIMEOUT, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ analysis: analysisForExplain, language: lang }),
                  });
                  if (explainResp.success && explainResp.explanations && runIdRef.current === myRunId) {
                    setFiles((prev) => {
                      if (runIdRef.current !== myRunId) return prev;
                      return prev.map((f) =>
                        f.id === item.id && f.result
                          ? { ...f, status: "completed", result: { ...f.result, explanations: explainResp.explanations } }
                          : f
                      );
                    });
                  }
                } catch (explainErr: any) {
                  console.warn(`[Explain] AI explanation call failed for ${item.name}:`, explainErr?.message);
                  // 基础分析仍然可用，标记为 completed（模板解释已在 result 中）
                }
              }
            }

            // ── 最终标记为 completed ───────────────────────────
            if (runIdRef.current === myRunId) {
              setFiles((prev) => {
                if (runIdRef.current !== myRunId) return prev;
                return prev.map((f) =>
                  f.id === item.id && (f.status === "analysisReady" || f.status === "explaining")
                    ? { ...f, status: "completed" }
                    : f
                );
              });
            }

          } catch (err: any) {
            if (runIdRef.current !== myRunId) return;
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
