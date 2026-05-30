"use client";

import { useLang } from "@/lib/language-context";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TermsOfService() {
  const { t, lang } = useLang();

  const sections = {
    zh: [
      { title: "服务描述", content: "NeuroAccess 是一个 EEG（脑电图）数据教育分析平台。我们提供工具帮助您理解和分析 EEG 数据，但我们的服务不构成医疗建议、诊断或治疗。" },
      { title: "用户责任", content: "您负责您上传到我们平台的数据。请确保您有权分享这些数据，并且数据不包含敏感或受保护的健康信息（PHI）。我们不对您上传的数据的合法性负责。" },
      { title: "禁止用途", content: "您不得使用我们的服务进行任何非法活动，包括但不限于：上传恶意软件、侵犯他人隐私、进行未经授权的医疗诊断，或违反任何适用的法律法规。" },
      { title: "知识产权", content: "NeuroAccess 平台的所有内容、设计和代码均受版权和知识产权保护。未经明确书面许可，您不得复制、修改、分发或创建衍生作品。" },
      { title: "免责声明", content: "本服务按原样提供，不提供任何明示或暗示的保证。我们不保证服务的准确性、可靠性或适用性。EEG 分析结果仅供教育目的，不应作为医疗决策的依据。" },
      { title: "责任限制", content: "在任何情况下，NeuroAccess 及其开发者均不对因使用或无法使用本服务而导致的任何间接、附带、特殊、后果性或惩罚性损害承担责任。" },
      { title: "服务变更", content: "我们保留随时修改、暂停或终止本服务的权利，无需事先通知。我们也可能更新这些条款，变更将在本页面发布时生效。" },
      { title: "联系我们", content: "如果您对本服务条款有任何疑问，请通过网站反馈功能联系我们。" },
    ],
    en: [
      { title: "Service Description", content: "NeuroAccess is an EEG (electroencephalogram) data educational analysis platform. We provide tools to help you understand and analyze EEG data, but our service does not constitute medical advice, diagnosis, or treatment." },
      { title: "User Responsibilities", content: "You are responsible for the data you upload to our platform. Please ensure you have the right to share this data and that it does not contain sensitive or protected health information (PHI). We are not responsible for the legality of the data you upload." },
      { title: "Prohibited Uses", content: "You may not use our service for any illegal activities, including but not limited to: uploading malware, violating others' privacy, conducting unauthorized medical diagnoses, or violating any applicable laws and regulations." },
      { title: "Intellectual Property", content: "All content, design, and code of the NeuroAccess platform are protected by copyright and intellectual property laws. Without express written permission, you may not copy, modify, distribute, or create derivative works." },
      { title: "Disclaimer", content: "This service is provided &quot;as is&quot; without any express or implied warranty. We do not guarantee the accuracy, reliability, or suitability of the service. EEG analysis results are for educational purposes only and should not be used as a basis for medical decisions." },
      { title: "Limitation of Liability", content: "In no event shall NeuroAccess and its developers be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to the use or inability to use this service." },
      { title: "Service Changes", content: "We reserve the right to modify, suspend, or terminate this service at any time without prior notice. We may also update these terms, and changes will take effect when posted on this page." },
      { title: "Contact Us", content: "If you have any questions about these terms of service, please contact us through the website feedback feature." },
    ],
  };

  const content = (sections as any)[lang] || sections.en;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {t("backToHome") || "Back to Home"}
      </Link>

      <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">
        {t("termsOfService") || "Terms of Service"}
      </h1>
      <p className="mb-8 text-sm text-[var(--color-text-secondary)]">
        {t("lastUpdatedDate") || "Last updated: May 29, 2026"}
      </p>

      <div className="space-y-8">
        {content.map((section: {title: string, content: string}, i: number) => (
          <div key={i}>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">
              {i + 1}. {section.title}
            </h2>
            <p className="leading-7 text-[var(--color-text-secondary)]">
              {section.content}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 border-t border-[var(--color-border)] pt-8 text-center text-sm text-[var(--color-text-secondary)]">
        <p>NeuroAccess &copy; 2026. {(t("allRightsReserved") || "All rights reserved.")}</p>
      </div>
    </div>
  );
}
