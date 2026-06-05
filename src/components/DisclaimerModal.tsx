"use client";

import { useState, useEffect, useRef } from "react";
import { useLang } from "@/lib/language-context";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function DisclaimerModal() {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);
  const hasOpenedRef = useRef(false);

  useEffect(() => {
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

    // 支持两种方式打开：事件 (__openDisclaimer) 或回调 (__openDisclaimerModal)
    function onOpenEvent() {
      setVisible(true);
    }
    window.addEventListener("__openDisclaimer", onOpenEvent);
    (window as any).__openDisclaimerModal = () => setVisible(true);

    return () => {
      window.removeEventListener("__openDisclaimer", onOpenEvent);
      delete (window as any).__openDisclaimerModal;
    };
  }, []);

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
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">
              {t("disclaimerModalTitle") || "免责声明"}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t("disclaimerModalSubtitle") || "使用 NeuroAccess 前，请仔细阅读"}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-3 text-sm text-[var(--color-text)] leading-relaxed max-h-[50vh] overflow-y-auto">
          <p className="font-medium text-red-500">
            {t("disclaimerImportant") || "重要提示："}
          </p>
          <ul className="space-y-2 pl-4 list-disc text-[var(--color-text-secondary)]">
            <li>
              {t("disclaimerPoint1") ||
                "NeuroAccess 是一个 EEG 科普教育平台，旨在帮助用户理解脑电图数据，不构成医疗诊断、医疗建议或治疗建议。"}
            </li>
            <li>
              {t("disclaimerPoint2") ||
                "EEG 数据的专业解释需要由合格的医疗专业人员结合完整的临床背景进行判断。"}
            </li>
            <li>
              {t("disclaimerPoint3") ||
                "本平台不会、也不能判断任何疾病、心理状态、智力水平、人格特征或健康风险。"}
            </li>
            <li>
              {t("disclaimerPoint4") ||
                "所有分析结果和 AI 解释仅供科普学习使用，不应作为任何医疗决策的依据。"}
            </li>
            <li>
              {t("disclaimerPoint5") ||
                "如有任何健康问题或疑虑，请务必咨询专业的医疗人员。"}
            </li>
            <li>
              {t("disclaimerPoint6") ||
                "上传的 EEG 文件仅用于实时分析，不会被长期存储或用于其他目的。"}
            </li>
          </ul>
          <div className="pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
            {t("disclaimerAgreement") ||
              '点击"我已了解并同意"即表示您理解并同意上述条款。'}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex flex-col gap-3">
          <button
            onClick={handleAccept}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-surface)] font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <CheckCircle className="w-4 h-4" />
            {t("close") || "关闭"}
          </button>
        </div>
      </div>
    </div>
  );
}
