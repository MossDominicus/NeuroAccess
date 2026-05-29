"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/language-context";
import { MessageSquare, ThumbsUp, ThumbsDown, Minus, Send, CheckCircle } from "lucide-react";

export interface FeedbackEntry {
  id: string;
  reportId: string;
  q1: "yes" | "somewhat" | "no";
  q2: "yes" | "somewhat" | "no";
  q3: "Beginner" | "Student" | "Research" | "";
  q4: string; // free text
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

export function getFeedbackStats(): { total: number; readabilityRate: number; helpRate: number } {
  const entries = loadFeedback();
  const total = entries.length;
  const readable = entries.filter(e => e.q1 === "yes" || e.q1 === "somewhat").length;
  const helpful = entries.filter(e => e.q2 === "yes" || e.q2 === "somewhat").length;
  return {
    total,
    readabilityRate: total > 0 ? Math.round((readable / total) * 100) : 0,
    helpRate: total > 0 ? Math.round((helpful / total) * 100) : 0,
  };
}

interface FeedbackPanelProps {
  reportId?: string;
}

export default function FeedbackPanel({ reportId }: FeedbackPanelProps) {
  const { lang } = useLang();
  const [q1, setQ1] = useState<"yes" | "somewhat" | "no" | null>(null);
  const [q2, setQ2] = useState<"yes" | "somewhat" | "no" | null>(null);
  const [q3, setQ3] = useState<string>("");
  const [q4, setQ4] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const t = (key: string) => {
    const dict: Record<string, Record<string, string>> = {
      title: { zh: "帮助改进 NeuroAccess", en: "Help Improve NeuroAccess" },
      subtitle: { zh: "你的反馈帮助我们优化 EEG 科普平台", en: "Your feedback helps us improve the EEG literacy platform" },
      q1: { zh: "这份报告是否容易理解？", en: "Was this report easy to understand?" },
      q2: { zh: "AI 解释对你有帮助吗？", en: "Did the AI explanation help you?" },
      q3: { zh: "哪种模式对你的帮助最大？", en: "Which mode was most helpful?" },
      q4: { zh: "有什么让你感到困惑的地方？", en: "What confused you?" },
      yes: { zh: "是", en: "Yes" },
      somewhat: { zh: "部分", en: "Somewhat" },
      no: { zh: "否", en: "No" },
      beginner: { zh: "入门", en: "Beginner" },
      student: { zh: "学生", en: "Student" },
      research: { zh: "研究", en: "Research" },
      placeholder: { zh: "在这里写下你的想法...", en: "Share your thoughts here..." },
      submit: { zh: "提交反馈", en: "Submit Feedback" },
      thankYou: { zh: "感谢你的反馈！", en: "Thank you for your feedback!" },
    };
    return dict[key]?.[lang] || key;
  };

  const handleSubmit = async () => {
    const payload = {
      name: "",
      email: "",
      type: reportId ? "report" : "general",
      message: `Q1: ${q1}\nQ2: ${q2}\nQ3: ${q3}\nQ4: ${q4}`,
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
      const entry: FeedbackEntry = {
        id: `${reportId || "general"}_${Date.now()}`,
        reportId: reportId || "general",
        q1: q1 || "no",
        q2: q2 || "no",
        q3: q3 as FeedbackEntry["q3"],
        q4,
        timestamp: new Date().toISOString(),
      };
      const entries = loadFeedback();
      entries.unshift(entry);
      saveFeedback(entries);
    }
    setSubmitted(true);
  };

  const canSubmit = q1 && q2;

  if (submitted) {
    return (
      <motion.div
        className="rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10 dark:border-emerald-900/30 p-8 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">{t("thankYou")}</p>
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
          <h3 className="text-sm font-bold text-[var(--color-text)]">{t("title")}</h3>
          <p className="text-xs text-[var(--color-text-secondary)]">{t("subtitle")}</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Q1 */}
        <div>
          <p className="mb-2 text-sm text-[var(--color-text)]">{t("q1")}</p>
          <div className="flex gap-2">
            {(["yes", "somewhat", "no"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setQ1(v)}
                className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-medium transition-all ${
                  q1 === v
                    ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                }`}
              >
                {v === "yes" && <ThumbsUp className="h-3.5 w-3.5" />}
                {v === "somewhat" && <Minus className="h-3.5 w-3.5" />}
                {v === "no" && <ThumbsDown className="h-3.5 w-3.5" />}
                {t(v)}
              </button>
            ))}
          </div>
        </div>

        {/* Q2 */}
        <div>
          <p className="mb-2 text-sm text-[var(--color-text)]">{t("q2")}</p>
          <div className="flex gap-2">
            {(["yes", "somewhat", "no"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setQ2(v)}
                className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-medium transition-all ${
                  q2 === v
                    ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                }`}
              >
                {v === "yes" && <ThumbsUp className="h-3.5 w-3.5" />}
                {v === "somewhat" && <Minus className="h-3.5 w-3.5" />}
                {v === "no" && <ThumbsDown className="h-3.5 w-3.5" />}
                {t(v)}
              </button>
            ))}
          </div>
        </div>

        {/* Q3 */}
        <div>
          <p className="mb-2 text-sm text-[var(--color-text)]">{t("q3")}</p>
          <div className="flex gap-2">
            {(["Beginner", "Student", "Research"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setQ3(q3 === v ? "" : v)}
                className={`rounded-lg border px-4 py-2 text-xs font-medium transition-all ${
                  q3 === v
                    ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                }`}
              >
                {t(v.toLowerCase())}
              </button>
            ))}
          </div>
        </div>

        {/* Q4 */}
        <div>
          <p className="mb-2 text-sm text-[var(--color-text)]">{t("q4")}</p>
          <textarea
            value={q4}
            onChange={(e) => setQ4(e.target.value)}
            rows={3}
            placeholder={t("placeholder")}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-primary)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 dark:bg-white px-6 py-2.5 text-sm font-medium text-white dark:text-gray-900 transition-opacity disabled:opacity-40 hover:opacity-90"
        >
          <Send className="h-4 w-4" />
          {t("submit")}
        </button>
      </div>
    </motion.div>
  );
}
