"use client";

import { useLang } from "@/lib/language-context";
import { useMemo } from "react";
import { Activity, Brain, TrendingUp, ShieldCheck } from "lucide-react";

interface DashboardCardsProps {
  analysisResult: any;
}

export default function DashboardCards({ analysisResult }: DashboardCardsProps) {
  const { t } = useLang();
  // 兼容新旧数据格式：优先使用嵌套结构，fallback 到扁平字段
  const quality = analysisResult?.signal_quality || analysisResult;
  const literacy = analysisResult?.eeg_literacy_scores || analysisResult?.literacy_scores;
  const confidence = analysisResult?.confidence || analysisResult?.interpretation_confidence;

  const cards = useMemo(() => [
    {
      title: t("signalQualityCard"),
      value: quality ? `${quality.signal_quality_score}/100` : "-",
      icon: Activity,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      description: quality ? `${t("noisyChannelsDesc")}: ${quality.noisy_channels?.length || 0}` : "-",
    },
    {
      title: t("readabilityScoreCard"),
      value: literacy ? `${literacy.learning_readability_score}/100` : "-",
      icon: Brain,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      description: literacy ? `${t("beginnerFriendlinessDesc")}: ${literacy.beginner_friendliness_score}/100` : "-",
    },
    {
      title: t("confidenceCard"),
      value: confidence ? t(`confidence${confidence.level}`) : "-",
      icon: TrendingUp,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      description: confidence ? (confidence.reason || confidence.confidence_reason || "").slice(0, 50) + "..." : "-",
    },
    {
      title: t("dataLimitsCard"),
      value: analysisResult?.what_this_data_cannot_tell?.length || 0,
      icon: ShieldCheck,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      description: t("eegCannotTellDesc"),
    },
  ], [t, quality, literacy, confidence, analysisResult]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 hover:shadow-lg hover:shadow-gray-900/5 transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl ${card.bgColor} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <span className="text-sm text-[var(--color-text-secondary)]">{card.title}</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text)]">{card.value}</div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-2">{card.description}</div>
          </div>
        );
      })}
    </div>
  );
}
