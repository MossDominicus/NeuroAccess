"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLang } from "@/lib/language-context";

export interface KnowledgeCardData {
  id: string;
  category: "brainwaves" | "technical" | "artifacts";
  icon: string; // 希腊字母或字符
  iconColor: string;
  title: string;
  frequency?: string;
  description: string;
  details: {
    what: string;
    why: string;
    ranges?: string;
    pattern?: string;
    cannotTell: string;
  };
}

export default function KnowledgeCard({ card }: { card: KnowledgeCardData }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLang();

  return (
    <div className={`rounded-2xl border transition-all duration-300 ${
      expanded
        ? "border-[var(--color-primary)]/30 bg-[var(--color-surface)] shadow-lg"
        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/20 hover:shadow-md"
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-lg font-bold"
          style={{ backgroundColor: `${card.iconColor}15`, color: card.iconColor }}
        >
          {card.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[var(--color-text)]">{card.title}</h3>
          <div className="mt-0.5 flex items-center gap-2">
            {card.frequency && (
              <span className="text-[11px] font-mono text-[var(--color-text)]/60">{card.frequency}</span>
            )}
            <span className="rounded-full bg-[var(--color-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text)]/70">
              {t("guideCat" + card.category.charAt(0).toUpperCase() + card.category.slice(1))}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-[var(--color-text)]/60" />
          ) : (
            <ChevronDown className="h-5 w-5 text-[var(--color-text)]/60" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="space-y-4 border-t border-[var(--color-border)] px-5 pb-5 pt-4">
          <p className="text-sm leading-relaxed text-[var(--color-text)]/80">{card.description}</p>

          <div className="space-y-3">
            <DetailBlock label={t("whatItIs")} text={card.details.what} />
            <DetailBlock label={t("whyItMatters")} text={card.details.why} />
            {card.details.ranges && (
              <DetailBlock label={t("commonRanges")} text={card.details.ranges} />
            )}
            {card.details.pattern && (
              <DetailBlock label={t("typicalEegPattern")} text={card.details.pattern} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text)]/70">{label}</div>
      <p className="text-sm leading-relaxed text-[var(--color-text)]">{text}</p>
    </div>
  );
}
