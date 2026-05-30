"use client";

import { useState, useEffect } from "react";
import { Cpu, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useLang } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";

interface OllamaStatus {
  ollama_running: boolean;
  target_model_available: boolean;
  gpu_available: boolean;
  openrouter: boolean;
  model_name: string;
  error: string | null;
}

export default function TopNav() {
  const { t } = useLang();
  const { user } = useAuth();
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/health");
        const data = await res.json();
        setStatus({
          ollama_running: data.ollama === true,
          target_model_available: data.ollama === true,
          gpu_available: false,
          openrouter: data.openrouter === true,
          model_name: data.openrouter ? "qwen-2.5-7b" : (data.model || "qwen2.5:7b"),
          error: null,
        });
      } catch (err) {
        setStatus({
          ollama_running: false,
          target_model_available: false,
          gpu_available: false,
          openrouter: false,
          model_name: "qwen2.5:7b",
          error: "Cannot connect to backend",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Refresh every 30s
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-[var(--color-surface)/80] backdrop-blur-xl border-b border-[var(--color-border)] flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Left: page title */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-[var(--color-text)]">NeuroAccess</span>
        <span className="text-xs text-[var(--color-text-secondary)]">v1.0</span>
      </div>

      {/* Right: AI status + language toggle */}
      <div className="flex items-center gap-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t("checkingAIStatus")}
          </div>
        ) : status ? (
          <>
            {/* Ollama status */}
            <div className="flex items-center gap-1.5 text-xs">
              {user && (status.ollama_running || status.openrouter) ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              )}
              <span className={user && (status.ollama_running || status.openrouter) ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                {user && (status.ollama_running || status.openrouter) ? t("aiOnline") : t("aiOffline")}
              </span>
            </div>

            {/* Model status */}
            {user && (status.ollama_running || status.openrouter) && (
              <div className="flex items-center gap-1.5 text-xs">
                {status.target_model_available || status.openrouter ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                )}
                <span className="text-[var(--color-text-secondary)]">
                  {status.target_model_available || status.openrouter ? status.model_name : t("modelNotLoaded")}
                </span>
              </div>
            )}

            {/* GPU/CPU/API status */}
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
              <Cpu className="w-3.5 h-3.5" />
              <span>{status.openrouter ? t("apiMode") : (status.gpu_available ? t("gpuAvailable") : t("cpuMode"))}</span>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
