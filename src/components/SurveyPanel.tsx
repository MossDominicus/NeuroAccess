"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLang } from "@/lib/language-context";
import { Send, CheckCircle, X } from "lucide-react";

const SURVEY_KEY = "neuroaccess-survey";

interface SurveyData {
  q1: string;      // 人群
  q2: "yes" | "no"; // 有帮助？
  q3: string;      // 感兴趣的部分
  q4: string;      // 来源
  q5: string;      // 改进建议
  q6: "yes" | "no"; // 继续使用？
  submittedAt: string;
}

function loadSurvey(): SurveyData | null {
  try {
    const raw = localStorage.getItem(SURVEY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSurvey(data: SurveyData) {
  try {
    const existing = loadSurvey();
    if (existing) return; // 每人只填一次
    localStorage.setItem(SURVEY_KEY, JSON.stringify(data));
  } catch {}
}

export default function SurveyPanel() {
  const { t } = useLang();

  const [q1, setQ1] = useState("");
  const [q1Other, setQ1Other] = useState("");
  const [q2, setQ2] = useState<"yes" | "no" | "">("");
  const [q3, setQ3] = useState("");
  const [q3Other, setQ3Other] = useState("");
  const [q4, setQ4] = useState("");
  const [q4Other, setQ4Other] = useState("");
  const [q5, setQ5] = useState("");
  const [q6, setQ6] = useState<"yes" | "no" | "">("");
  const [q6Reason, setQ6Reason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Check if already submitted (local + server)
  useEffect(() => {
    if (loadSurvey()) { setSubmitted(true); return; }
    const token = typeof window !== "undefined" ? localStorage.getItem("neuroaccess-token") : null;
    if (!token) return;
    fetch("/api/survey/status", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d?.completed) setSubmitted(true); })
      .catch(() => {});
  }, []);

  const q1Options = [
    { value: "medical", label: t("surveyQ1Medical") },
    { value: "student", label: t("surveyQ1Student") },
    { value: "public", label: t("surveyQ1Public") },
    { value: "other", label: t("surveyOther") },
  ];
  const q3Options = [
    { value: "report", label: t("surveyQ3Report") },
    { value: "waveform", label: t("surveyQ3Waveform") },
    { value: "knowledge", label: t("surveyQ3Knowledge") },
    { value: "cases", label: t("surveyQ3Cases") },
    { value: "simulator", label: t("surveyQ3Simulator") },
    { value: "other", label: t("surveyOther") },
  ];
  const q4Options = [
    { value: "social", label: t("surveyQ4Social") },
    { value: "referral", label: t("surveyQ4Referral") },
    { value: "other", label: t("surveyOther") },
  ];

  const getEffectiveQ1 = () => q1 === "other" ? q1Other : q1;
  const getEffectiveQ3 = () => q3 === "other" ? q3Other : q3;
  const getEffectiveQ4 = () => q4 === "other" ? q4Other : q4;

  const allAnswered = q1 && q2 && q3 && q4 && q6;

  const handleSubmit = () => {
    if (!allAnswered) return;
    const data = {
      q1: getEffectiveQ1(),
      q2: q2 as "yes" | "no",
      q3: getEffectiveQ3(),
      q4: getEffectiveQ4(),
      q5: q5.trim(),
      q6: q6 as "yes" | "no",
      q6_reason: q6Reason.trim(),
      submittedAt: new Date().toISOString(),
    };
    saveSurvey(data);
    const token = typeof window !== "undefined" ? localStorage.getItem("neuroaccess-token") : null;
    fetch("/api/survey/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    })
      .then(r => r.json())
      .then(d => {
        if (!d?.success) console.warn("[Survey] submit:", d?.error);
        else console.log("[Survey] saved");
      })
      .catch((e) => console.warn("[Survey] submit failed:", e));
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        className="rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10 dark:border-emerald-900/30 p-8 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-500 dark:text-emerald-400" />
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">{t("surveyThankYou")}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h3 className="mb-1 text-sm font-bold text-[var(--color-text)]">{t("surveyTitle")}</h3>
      <p className="mb-5 text-xs text-[var(--color-text-secondary)]">{t("surveySubtitle")}</p>

      <div className="space-y-5">
        {/* Q1 */}
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--color-text)]">1. {t("surveyQ1")}</p>
          <div className="flex flex-wrap gap-2">
            {q1Options.map((o) => (
              <button key={o.value} onClick={() => { setQ1(o.value); if (o.value !== "other") setQ1Other(""); }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  q1 === o.value
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-bg)]"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                }`}
              >{o.label}</button>
            ))}
          </div>
          {q1 === "other" && (
            <input type="text" value={q1Other} onChange={(e) => setQ1Other(e.target.value)}
              placeholder={t("surveyOtherPlaceholder")}
              className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-primary)]/30 focus:outline-none"
            />
          )}
        </div>

        {/* Q2 — 有(改进建议)/没有 */}
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--color-text)]">2. {t("surveyQ2")}</p>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setQ2("yes")}
              className={`rounded-lg border px-4 py-2 text-xs font-medium transition-all ${
                q2 === "yes"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-bg)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
              }`}
            >{t("surveyQ2Yes")}</button>
            <button onClick={() => setQ2("no")}
              className={`rounded-lg border px-4 py-2 text-xs font-medium transition-all ${
                q2 === "no"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-bg)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
              }`}
            >{t("surveyQ2No")}</button>
          </div>
          {q2 === "no" && (
            <textarea
              value={q5}
              onChange={(e) => setQ5(e.target.value)}
              rows={3}
              placeholder={t("surveyQ5Placeholder")}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-primary)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 resize-none"
            />
          )}
        </div>

        {/* Q3 */}
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--color-text)]">3. {t("surveyQ3")}</p>
          <div className="flex flex-wrap gap-2">
            {q3Options.map((o) => (
              <button key={o.value} onClick={() => { setQ3(o.value); if (o.value !== "other") setQ3Other(""); }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  q3 === o.value
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-bg)]"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                }`}
              >{o.label}</button>
            ))}
          </div>
          {q3 === "other" && (
            <input type="text" value={q3Other} onChange={(e) => setQ3Other(e.target.value)}
              placeholder={t("surveyOtherPlaceholder")}
              className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-primary)]/30 focus:outline-none"
            />
          )}
        </div>

        {/* Q4 */}
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--color-text)]">4. {t("surveyQ4")}</p>
          <div className="flex flex-wrap gap-2">
            {q4Options.map((o) => (
              <button key={o.value} onClick={() => { setQ4(o.value); if (o.value !== "other") setQ4Other(""); }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  q4 === o.value
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-bg)]"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
                }`}
              >{o.label}</button>
            ))}
          </div>
          {q4 === "other" && (
            <input type="text" value={q4Other} onChange={(e) => setQ4Other(e.target.value)}
              placeholder={t("surveyOtherPlaceholder")}
              className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-primary)]/30 focus:outline-none"
            />
          )}
        </div>

        {/* Q5 (renumbered from Q6) */}
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--color-text)]">5. {t("surveyQ6")}</p>
          <div className="flex gap-2">
            <button onClick={() => setQ6("yes")}
              className={`rounded-lg border px-4 py-2 text-xs font-medium transition-all ${
                q6 === "yes"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-bg)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
              }`}
            >{t("surveyQ6Yes")}</button>
            <button onClick={() => setQ6("no")}
              className={`rounded-lg border px-4 py-2 text-xs font-medium transition-all ${
                q6 === "no"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-bg)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
              }`}
            >{t("surveyQ6No")}</button>
          </div>
          {q6 === "no" && (
            <textarea
              value={q6Reason}
              onChange={(e) => setQ6Reason(e.target.value)}
              rows={3}
              placeholder={t("surveyQ5Placeholder")}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-primary)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 resize-none"
            />
          )}
        </div>

        <button onClick={handleSubmit} disabled={!allAnswered}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-[var(--color-bg)] transition-opacity disabled:opacity-40 hover:opacity-90"
        >
          <Send className="h-4 w-4" />
          {t("surveySubmit")}
        </button>
      </div>
    </motion.div>
  );
}
