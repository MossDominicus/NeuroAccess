"use client";

import { useLang } from "@/lib/language-context";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { disclaimerSections } from "@/lib/legal-content";

export default function DisclaimerPage() {
  const { t, lang } = useLang();
  const content = (disclaimerSections as any)[lang] || disclaimerSections.en;

  return (
    <motion.div
      className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backToHome")}
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">
              {t("disclaimerTitle")}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t("disclaimerModalSubtitle")}
            </p>
          </div>
        </div>

        {/* Important notice */}
        <div className="mb-8 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
          <p className="font-medium text-red-500 text-sm">
            {t("disclaimerImportant")}
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {content.map((section: any, i: number) => (
            <div key={i}>
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2">
                {i + 1}. {section.title}
              </h2>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-10 pt-6 border-t border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] text-center">
          {t("disclaimerAgreement")}
        </div>
      </div>
    </motion.div>
  );
}
