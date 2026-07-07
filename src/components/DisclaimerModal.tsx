"use client";

import { useState, useEffect, useRef } from "react";
import { useLang } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { useAppEvents } from "@/lib/app-events";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function DisclaimerModal() {
  const { t } = useLang();
  const { user } = useAuth();
  const { setOpenDisclaimer } = useAppEvents();
  const [visible, setVisible] = useState(false);
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    // 只有已登录用户才可能看到免责声明
    if (!user) return;

    try {
      const accepted = localStorage.getItem("neuroaccess-disclaimer-accepted");
      if (!accepted) {
        setVisible(true);
        hasOpenedRef.current = true;
      }
    } catch {
      setVisible(true);
      hasOpenedRef.current = true;
    }

    setOpenDisclaimer(() => () => setVisible(true));

    return () => {
      setOpenDisclaimer(() => () => {});
    };
  }, [user, setOpenDisclaimer]);

  const handleAccept = () => {
    try {
      localStorage.setItem("neuroaccess-disclaimer-accepted", "true");
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 dark:bg-yellow-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">
              {t("disclaimerModalTitle")}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t("disclaimerModalSubtitle")}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-3 text-sm text-[var(--color-text)] leading-relaxed max-h-[50vh] overflow-y-auto">
          <p className="font-medium text-red-500 dark:text-red-400">
            {t("disclaimerImportant")}
          </p>
          <ul className="space-y-2 pl-4 list-disc text-[var(--color-text-secondary)]">
            <li>
              {t("disclaimerPoint1")}
            </li>
            <li>
              {t("disclaimerPoint2")}
            </li>
            <li>
              {t("disclaimerPoint3")}
            </li>
            <li>
              {t("disclaimerPoint4")}
            </li>
            <li>
              {t("disclaimerPoint5")}
            </li>
            <li>
              {t("disclaimerPoint6")}
            </li>
          </ul>
          <div className="pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
            {t("disclaimerAgreement")}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex flex-col gap-3">
          <button
            onClick={handleAccept}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-surface)] font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <CheckCircle className="w-4 h-4" />
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
