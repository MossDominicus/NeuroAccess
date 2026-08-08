"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLang } from "@/lib/language-context";
import { MessageSquare, Send, CheckCircle } from "lucide-react";

export interface FeedbackEntry {
  id: string;
  reportId: string;
  message: string; // free text
  timestamp: string;
}

const FEEDBACK_KEY = "neuroaccess-feedback";

function loadFeedback(): FeedbackEntry[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveFeedback(entries: FeedbackEntry[]) {
  try { localStorage.setItem(FEEDBACK_KEY, JSON.stringify(entries)); } catch {}
}

interface FeedbackPanelProps {
  reportId?: string;
}

export default function FeedbackPanel({ reportId }: FeedbackPanelProps) {
  const { t } = useLang();
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);

  // 挂载时自动把上次因网络失败缓存在本地的反馈补传到服务器（防丢失）
  useEffect(() => {
    const pending = loadFeedback();
    if (!pending.length) return;
    (async () => {
      const remaining: FeedbackEntry[] = [];
      let retried = 0;
      for (const entry of pending) {
        try {
          const resp = await fetch("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "", email: "", type: entry.reportId ? "report" : "general", message: entry.message, rating: "" }),
          });
          if (resp.ok) retried++;
          else remaining.push(entry);
        } catch {
          remaining.push(entry);
        }
      }
      saveFeedback(remaining); // 成功的移除，失败的保留待下次
      if (retried > 0) console.log(`[Feedback] 已补传 ${retried} 条离线反馈`);
    })();
  }, []);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    const payload = {
      name: "",
      email: "",
      type: reportId ? "report" : "general",
      message: text.trim(),
      rating: "",
    };
    try {
      const resp = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error("API failed");
    } catch {
      // fallback: save to localStorage if API fails
      setSavedLocally(true);
      const entry: FeedbackEntry = {
        id: `${reportId || "general"}_${Date.now()}`,
        reportId: reportId || "general",
        message: text.trim(),
        timestamp: new Date().toISOString(),
      };
      const entries = loadFeedback();
      entries.unshift(entry);
      saveFeedback(entries);
    }
    setSubmitted(true);
  };

  const canSubmit = text.trim().length > 0;

  if (submitted) {
    return (
      <motion.div
        className="rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10 dark:border-emerald-900/30 p-8 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-500 dark:text-emerald-400" />
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">{t("feedbackThankYou")}</p>
        {savedLocally && (
          <p className="mt-2 text-xs text-emerald-600/70 dark:text-emerald-500/70">
            {t("feedbackSavedLocally") || "已保存到本地（服务器暂不可用）"}
          </p>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="mb-5 flex items-center gap-3">
        <MessageSquare className="h-5 w-5 text-[var(--color-text-secondary)]" />
        <div>
          <h3 className="text-sm font-bold text-[var(--color-text)]">{t("feedbackTitle")}</h3>
          <p className="text-xs text-[var(--color-text-secondary)]">{t("feedbackSubtitle")}</p>
        </div>
      </div>

      <div className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder={t("feedbackPlaceholder")}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-primary)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 resize-none"
        />

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] dark:bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-[var(--color-bg)] dark:text-[var(--color-bg)] transition-opacity disabled:opacity-40 hover:opacity-90"
        >
          <Send className="h-4 w-4" />
          {t("feedbackSubmit")}
        </button>
      </div>
    </motion.div>
  );
}
