"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, FileX, FileText, Waves } from "lucide-react";
import { StoredReport, getReportById } from "@/lib/reports-storage";
import { useLang } from "@/lib/language-context";
import ReportDetail from "@/components/ReportDetail";
import ReportEEGChart from "@/components/ReportEEGChart";

type Tab = "analysis" | "eeg";

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLang();
  const [report, setReport] = useState<StoredReport | null | undefined>(
    undefined
  ); // undefined=loading, null=not found
  const [activeTab, setActiveTab] = useState<Tab>("analysis");

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("neuroaccess-token") || ""
        : "";
    if (!token) {
      router.push("/login");
      return;
    }
    const found = getReportById(id);
    setReport(found);
  }, [id, router]);

  // Loading state
  if (report === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
      </div>
    );
  }

  // Not found
  if (report === null) {
    return (
      <motion.div
        className="mx-auto max-w-lg px-6 py-20 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <FileX className="mx-auto mb-4 h-12 w-12 text-[var(--color-text-secondary)]" />
        <h2 className="text-lg font-bold text-[var(--color-text)]">
          {t("noReports")}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {t("noReportsDesc")}
        </p>
        <Link
          href="/reports"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("reports")}
        </Link>
      </motion.div>
    );
  }

  // Found
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header with back button */}
      <div className="px-6 pt-6">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("reports")}
        </Link>
      </div>

      {/* Tab bar */}
      <div className="px-6 pt-4">
        <div className="flex gap-1 border-b border-[var(--color-border)]">
          <button
            onClick={() => setActiveTab("analysis")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "analysis"
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            }`}
          >
            <FileText className="h-4 w-4" />
            {t("reportAnalysisTab")}
          </button>
          <button
            onClick={() => setActiveTab("eeg")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "eeg"
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            }`}
          >
            <Waves className="h-4 w-4" />
            {t("eegChartTab")}
          </button>
        </div>
      </div>

      {/* Tab content — both mounted, one hidden to preserve state */}
      <div className="p-6">
        <div className={activeTab === "analysis" ? "block" : "hidden"}>
          <ReportDetail report={report} />
        </div>
        <div className={activeTab === "eeg" ? "block" : "hidden"}>
          <ReportEEGChart reportFileName={report.fileName} eegData={report.eegData} />
        </div>
      </div>
    </motion.div>
  );
}
