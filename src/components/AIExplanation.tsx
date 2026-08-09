"use client";

import { useLang } from "@/lib/language-context";
import { User, GraduationCap, Microscope, Shield, AlertTriangle } from "lucide-react";

type ExplanationData = {
  explanations?: {
    zh?: { beginner?: string; student?: string; research?: string };
    en?: { beginner?: string; student?: string; research?: string };
  } | {
    beginner?: string;
    student?: string;
    research?: string;
  };
  confidence?: {
    level?: string;
    reason?: string;
  };
  limitations?: string[];
  disclaimer?: {
    zh?: string;
    en?: string;
  } | string;
};

export default function AIExplanation({ data }: { data: ExplanationData | null | undefined }) {
  const { lang, t } = useLang();

  // 兼容两种 explanations 格式：{zh:{...}, en:{...}} 和 扁平 {...}
  const rawExplanations = data?.explanations || {};
  const explanations: Record<string, string> = {};
  if (typeof (rawExplanations as any).beginner === "string") {
    // 扁平格式（旧数据兼容）
    Object.assign(explanations, rawExplanations);
  } else {
    // 嵌套格式：{zh: {...}, en: {...}}
    const langLayer = ((rawExplanations as any)[lang]) || {};
    Object.assign(explanations, langLayer);
    // 当前语言缺失时，用 en 层回退（避免显示"该报告解释生成失败"）
    const enLayer = ((rawExplanations as any)["en"]) || {};
    for (const k of ["beginner", "student", "research"]) {
      if (!explanations[k] && enLayer[k]) explanations[k] = enLayer[k];
    }
  }

  // disclaimer 兼容字符串和对象
  const disclaimerText: string = data?.disclaimer
    ? (typeof data.disclaimer === "string" ? data.disclaimer : (((data.disclaimer as Record<string, string | undefined>)[lang]) || data.disclaimer.en || ""))
    : "";

  const modes = [
    {
      key: "beginner" as const,
      label: t("beginnerMode"),
      icon: User,
      card: "border-green-200 bg-[var(--color-surface)] dark:border-green-900/50",
      iconBox: "bg-green-50 dark:bg-green-950/30",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      key: "student" as const,
      label: t("studentMode"),
      icon: GraduationCap,
      card: "border-blue-200 bg-[var(--color-surface)] dark:border-blue-900/50",
      iconBox: "bg-blue-50 dark:bg-blue-950/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      key: "research" as const,
      label: t("researchMode"),
      icon: Microscope,
      card: "border-purple-200 bg-[var(--color-surface)] dark:border-purple-900/50",
      iconBox: "bg-purple-50 dark:bg-purple-950/30",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
  ];

  const levelClass: Record<string, string> = {
    High: "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-800",
    Moderate: "text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/30 dark:border-yellow-800",
    Low: "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-3">
        {modes.map((mode) => {
          const text = explanations[mode.key] || t("explanationFailed");
          const Icon = mode.icon;
          const paragraphs = String(text).split("\n").map((p) => p.trim()).filter(Boolean);

          return (
            <section key={mode.key} className={`rounded-2xl border p-6 shadow-sm ${mode.card}`}>
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${mode.iconBox}`}>
                  <Icon className={`h-5 w-5 ${mode.iconColor}`} />
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">{t("aiExplanation")}</div>
                  <h3 className="font-bold text-[var(--color-text)]">{mode.label}</h3>
                </div>
              </div>

              <div className="space-y-3">
                {paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
