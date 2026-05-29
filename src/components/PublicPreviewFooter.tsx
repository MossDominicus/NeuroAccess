"use client";

import { useLang } from "@/lib/language-context";

export default function PublicPreviewFooter() {
  const { lang, t } = useLang();

  return (
    <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)]/50 px-6 py-3 text-center text-xs text-[var(--color-text-secondary)]">
      <p>
        {lang === "zh" ? (
          <>
            <strong>Public Preview</strong> — 本平台为 EEG 科普教育展示版，不构成医疗建议、诊断或治疗推荐。上传文件仅用于演示，不保存于服务器。
            <a href="#disclaimer" className="ml-2 underline hover:text-[var(--color-primary)]">{t("disclaimerTitle") || "免责声明"}</a>
            <span className="mx-1">·</span>
            <a href="/privacy" className="underline hover:text-[var(--color-primary)]">{t("privacyPolicy") || "隐私政策"}</a>
            <span className="mx-1">·</span>
            <a href="/terms" className="underline hover:text-[var(--color-primary)]">{t("termsOfService") || "服务条款"}</a>
          </>
        ) : (
          <>
            <strong>Public Preview</strong> — This platform is for EEG education demonstration only. Not medical advice, diagnosis, or treatment. Uploaded files are processed locally and not stored on server.
            <a href="#disclaimer" className="ml-2 underline hover:text-[var(--color-primary)]">{t("disclaimerTitle") || "Disclaimer"}</a>
            <span className="mx-1">·</span>
            <a href="/privacy" className="underline hover:text-[var(--color-primary)]">{t("privacyPolicy") || "Privacy Policy"}</a>
            <span className="mx-1">·</span>
            <a href="/terms" className="underline hover:text-[var(--color-primary)]">{t("termsOfService") || "Terms of Service"}</a>
          </>
        )}
      </p>
    </footer>
  );
}
