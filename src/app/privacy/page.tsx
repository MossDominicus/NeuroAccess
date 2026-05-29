"use client";

import { useLang } from "@/lib/language-context";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicy() {
  const { t, lang } = useLang();

  const sections = {
    zh: [
      { title: "信息收集", content: "NeuroAccess 是一个纯前端应用，我们不会收集或存储您的个人身份信息。所有 EEG 数据分析均在您的浏览器本地完成，数据不会上传到我们的服务器。用户注册信息（邮箱、用户名）仅用于账户验证，存储在服务器端数据库中。" },
      { title: "数据存储", content: "您的 EEG 数据文件（.edf 等）仅在分析过程中临时使用，不会被永久存储。分析报告保存在您的浏览器本地存储（localStorage）中，您可以随时清除。" },
      { title: "Cookie 使用", content: "我们使用 sessionStorage 来存储动画播放状态，使用 localStorage 来存储您的语言偏好和分析报告。我们不使用跟踪 Cookie 或第三方分析工具。" },
      { title: "第三方服务", content: "我们使用 OpenRouter API 进行 AI 分析。上传的 EEG 数据会发送到 OpenRouter 的服务器进行处理，但不会与您的身份信息关联。我们不使用 Google Analytics 或其他跟踪服务。" },
      { title: "数据安全", content: "我们采取合理的安全措施来保护您的信息。但由于互联网传输的本质，我们无法保证 100% 的安全性。请在上传敏感数据前自行评估风险。" },
      { title: "儿童隐私", content: "NeuroAccess 是一个教育平台，适合所有年龄段的用户。我们不会故意收集 13 岁以下儿童的个人信息。" },
      { title: "政策更新", content: "我们可能会不时更新本隐私政策。任何更改将在本页面上发布，并在必要时通过电子邮件通知注册用户。" },
      { title: "联系我们", content: "如果您对本隐私政策有任何疑问，请通过网站反馈功能联系我们。" },
    ],
    en: [
      { title: "Information Collection", content: "NeuroAccess is a client-side application. We do not collect or store your personally identifiable information. All EEG data analysis is performed locally in your browser, and data is not uploaded to our servers. User registration information (email, username) is only used for account verification and stored in our server database." },
      { title: "Data Storage", content: "Your EEG data files (.edf, etc.) are only used temporarily during analysis and are not permanently stored. Analysis reports are saved in your browser&apos;s local storage (localStorage) and can be cleared at any time." },
      { title: "Cookie Usage", content: "We use sessionStorage to store animation playback status and localStorage to store your language preferences and analysis reports. We do not use tracking cookies or third-party analytics tools." },
      { title: "Third-Party Services", content: "We use OpenRouter API for AI analysis. Uploaded EEG data is sent to OpenRouter&apos;s servers for processing but is not linked to your identity. We do not use Google Analytics or other tracking services." },
      { title: "Data Security", content: "We take reasonable security measures to protect your information. However, due to the nature of internet transmission, we cannot guarantee 100% security. Please assess risks before uploading sensitive data." },
      { title: "Children&apos;s Privacy", content: "NeuroAccess is an educational platform suitable for users of all ages. We do not knowingly collect personal information from children under 13." },
      { title: "Policy Updates", content: "We may update this privacy policy from time to time. Any changes will be posted on this page and, where necessary, notified to registered users via email." },
      { title: "Contact Us", content: "If you have any questions about this privacy policy, please contact us through the website feedback feature." },
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
        {t("privacyPolicy") || "Privacy Policy"}
      </h1>
      <p className="mb-8 text-sm text-[var(--color-text-secondary)]">
        Last updated: May 29, 2026
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
        <p>NeuroAccess &copy; 2026. All rights reserved.</p>
      </div>
    </div>
  );
}
