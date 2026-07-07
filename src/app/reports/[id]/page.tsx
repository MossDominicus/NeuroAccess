"use client";

import { useEffect, useState } from "react";
import nextDynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, FileX, FileText, Waves, AlertTriangle } from "lucide-react";
import { StoredReport, getReportById } from "@/lib/reports-storage";
import { useLang } from "@/lib/language-context";
import ReportDetail from "@/components/ReportDetail";

const ReportEEGChart = nextDynamic(() => import("@/components/ReportEEGChart"), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-[var(--color-bg)] rounded-xl h-64" />,
});

type Tab = "analysis" | "eeg";

// ── Error Boundary: 组件渲染异常不导致整页白屏 ──────────────────
import { Component, type ReactNode } from "react";
class ReportErrorBoundary extends Component<{ children: ReactNode; fallback: string }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 dark:text-amber-400 mb-3" />
          <p className="text-sm text-[var(--color-text-secondary)]">{this.props.fallback}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

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
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-bg)] transition-opacity hover:opacity-90"
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
      transition={{ duration: 0.05 }}
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

      {/* Tab content */}
      <div className="p-6">
        {activeTab === "analysis" && (
          <div>
            <ReportErrorBoundary fallback={t("reportLoadError")}>
              <ReportDetail report={report} />
            </ReportErrorBoundary>
          </div>
        )}
        {activeTab === "eeg" && (
          <div>
            <ReportErrorBoundary fallback={t("noBandWaveform")}>
              <ReportEEGChart reportFileName={report.fileName} eegData={report.eegData} analysis={report.analysis} />
            </ReportErrorBoundary>
          </div>
        )}
      </div>
    </motion.div>
  );
}
