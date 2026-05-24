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
  }

  // disclaimer 兼容字符串和对象
  const disclaimerText: string = data?.disclaimer
    ? (typeof data.disclaimer === "string" ? data.disclaimer : (data.disclaimer[lang] || data.disclaimer.en || ""))
    : "";

  const modes = [
    {
      key: "beginner" as const,
      label: t("beginnerMode"),
      icon: User,
      card: "border-green-200 bg-white",
      iconBox: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      key: "student" as const,
      label: t("studentMode"),
      icon: GraduationCap,
      card: "border-blue-200 bg-white",
      iconBox: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      key: "research" as const,
      label: t("researchMode"),
      icon: Microscope,
      card: "border-purple-200 bg-white",
      iconBox: "bg-purple-50",
      iconColor: "text-purple-600",
    },
  ];

  const levelClass: Record<string, string> = {
    High: "text-green-700 bg-green-50 border-green-200",
    Moderate: "text-yellow-700 bg-yellow-50 border-yellow-200",
    Low: "text-red-700 bg-red-50 border-red-200",
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
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-400">{t("aiExplanation")}</div>
                  <h3 className="font-bold text-gray-900">{mode.label}</h3>
                </div>
              </div>

              <div className="space-y-3">
                {paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-sm leading-relaxed text-gray-700">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {data?.confidence && (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h4 className="mb-3 text-sm font-bold text-gray-900">{t("interpretationConfidence")}</h4>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${levelClass[data.confidence.level || "Low"] || levelClass.Low}`}>
            <Shield className="h-3.5 w-3.5" />
            <span>{data.confidence.level ? t(`confidence${data.confidence.level}`) : t("confidenceLow")}</span>
            {data.confidence.reason && <span>— {data.confidence.reason}</span>}
          </div>
        </section>
      )}

      {data?.limitations && data.limitations.length > 0 && (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h4 className="mb-3 text-sm font-bold text-gray-900">{t("whatDataCannotTell")}</h4>
          <ul className="space-y-2">
            {data.limitations.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm leading-relaxed text-gray-600">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-yellow-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {disclaimerText && (
        <section className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <div className="mb-1 text-xs font-bold text-yellow-900">{t("nonMedicalDisclaimer")}</div>
          <p className="text-xs leading-relaxed text-yellow-800">{disclaimerText}</p>
        </section>
      )}
    </div>
  );
}
