"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, FileX, FileText, Waves, AlertTriangle, Download } from "lucide-react";
import { StoredReport, getReportById, fetchServerReport, addReport } from "@/lib/reports-storage";
import { useLang } from "@/lib/language-context";
import ReportDetail from "@/components/ReportDetail";
import { downloadCSV } from "@/lib/csv-export";

import ReportEEGChart from "@/components/ReportEEGChart";

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

    // 始终从服务端拉最新完整数据（服务端 analysis.waveform_preview 永远有全通道）
    // localStorage 可能存的旧版带不完整通道数，禁用本地缓存
    if (found && token) {
      fetchServerReport(id)
        .then((serverReport) => {
          if (serverReport?.analysis) {
            setReport(serverReport as StoredReport);
            try {
              addReport(serverReport as StoredReport);
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, [id, router]);

  // 打开报告时按 analysis_id 重新拉取 AI 解释缓存：
  // /analyze 只把模板写入报告快照，AI 在后台线程生成后存缓存；
  // 若用户在 AI 完成前保存报告，重开时需从缓存补上真实 AI 解释。
  useEffect(() => {
    if (!report?.analysis?.analysis_id) return;
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("neuroaccess-token") || ""
        : "";
    if (!token) return;
    let cancelled = false;
    const aid = report.analysis.analysis_id;
    (async () => {
      try {
        const resp = await fetch(`/api/analysis/explanations/${aid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();
        if (cancelled || !data.success || !data.explanations) return;
        setReport((prev) =>
          prev ? { ...prev, analysis: { ...prev.analysis, explanations: data.explanations } } : prev
        );
        try {
          addReport({
            ...report,
            analysis: { ...report.analysis, explanations: data.explanations },
          } as StoredReport);
        } catch {}
      } catch {
        // 缓存不可用时保持现状
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.analysis?.analysis_id]);


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
      <div className="px-6 pt-6 flex items-center justify-between">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("reports")}
        </Link>
        <button
          onClick={() => downloadCSV(report.id, report.fileName || "report")}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-colors"
          title="Download CSV data"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </button>
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
              <ReportEEGChart key={report.id + "eeg"} reportFileName={report.fileName} analysis={report.analysis} id={report.id} />
            </ReportErrorBoundary>
          </div>
        )}
      </div>
    </motion.div>
  );
}
