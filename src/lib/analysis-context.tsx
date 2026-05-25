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
  error?: string;
}

// ── safeJsonFetch ───────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const FETCH_TIMEOUT = 360_000; // 6分钟，覆盖 MNE(120s) + Ollama 并行(120s)

async function safeJsonFetch(url: string, options: RequestInit = {}): Promise<any> {
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
  expandId: string | null;
  setExpandId: (id: string | null) => void;
  handleFileSelect: (selected: FileList | null) => void;
  removeFile: (id: string) => void;
  clearAll: () => void;
  startAnalysis: () => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysis must be used within AnalysisProvider");
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────
export function AnalysisProvider({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  const [files, setFiles] = useState<FileJob[]>([]);
  const [running, setRunning] = useState(false);
  const [expandId, setExpandId] = useState<string | null>(null);
  const runningRef = useRef(false);

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
      return ["edf", "bdf", "gdf", "csv"].includes(ext || "");
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
  }, []);

  // ── 开始分析（核心逻辑）────────────────────────────────────
  const startAnalysis = useCallback(() => {
    if (files.length === 0 || runningRef.current) return;
    runningRef.current = true;
    setRunning(true);

    // 用 async IIFE 避免 useCallback 返回 Promise
    (async () => {
      try {
        for (const item of files) {
          if (item.status === "completed" || item.status === "failed") continue;

          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id ? { ...f, status: "analyzing", error: undefined } : f
            )
          );

          try {
            const formData = new FormData();
            formData.append("file", item.file);
            formData.append("language", lang);

            const data = await safeJsonFetch(`${API_BASE}/api/analyze`, {
              method: "POST",
              body: formData,
            });

            if (!data.success) throw new Error(data.error || "Analysis failed");

            setFiles((prev) =>
              prev.map((f) =>
                f.id === item.id ? { ...f, status: "completed", result: data.analysis } : f
              ),
            );

            // 保存到 localStorage（Reports 页面读取）
            const report: StoredReport = {
              id: item.id,
              fileName: item.name,
              date: new Date().toLocaleString("zh-CN", { hour12: false }),
              mode: "Beginner",
              quality: (data.analysis as any)?.signal_quality_score ?? 0,
              language: lang,
              analysis: data.analysis,
            };
            addReport(report);
          } catch (err: any) {
            console.error("Analyze failed:", item.name, err);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === item.id
                  ? { ...f, status: "failed", error: err?.message || String(err) }
                  : f
              )
            );
          }
        }
      } catch (unexpectedErr) {
        console.error("Unexpected error in analyzeAll:", unexpectedErr);
      } finally {
        runningRef.current = false;
        setRunning(false);
      }
    })();
  }, [files, lang]);

  return (
    <AnalysisContext.Provider
      value={{ files, running, expandId, setExpandId, handleFileSelect, removeFile, clearAll, startAnalysis }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}
