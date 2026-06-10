import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";
import PublicPreviewFooter from "@/components/PublicPreviewFooter";
import { DisclaimerModal, PostLoginModals } from "@/components/LazyModals";
import type { Lang } from "@/lib/translations";
import { LanguageProvider } from "@/lib/language-context";
import { ThemeProvider } from "@/lib/theme-context";
import { AnalysisProvider } from "@/lib/analysis-context";
import { AuthProvider } from "@/lib/auth-context";

// Metadata 需要在服务端根据语言动态生成
// 由于 layout 是服务端组件，无法直接使用 useLang()，需从 cookie/header 读取语言
export async function generateMetadata(): Promise<Metadata> {
  // 从 next/headers 读取 lang cookie（客户端设置的语言偏好）
  const h = await headers();
  const cookie = h.get("cookie") || "";
  const match = cookie.match(/lang=(\w+)/);
  const lang = match ? match[1] : "zh";

  const titles: Record<string, string> = {
    zh: "NeuroAccess - EEG 科普教育平台",
    en: "NeuroAccess - EEG Literacy Platform",
    es: "NeuroAccess - Plataforma Educativa de EEG",
    fr: "NeuroAccess - Plateforme Éducative d'EEG",
    de: "NeuroAccess - EEG-Bildungsplattform",
    ja: "NeuroAccess - EEG 教育プラットフォーム",
    ko: "NeuroAccess - EEG 교육 플랫폼",
  };

  const descriptions: Record<string, string> = {
    zh: "EEG 科普教育平台，将脑电图数据翻译成人话",
    en: "EEG literacy education platform that translates brainwave data into plain language",
    es: "Plataforma educativa de EEG que traduce datos de ondas cerebrales a lenguaje sencillo",
    fr: "Plateforme éducative d'EEG qui traduit les données de signaux cérébraux en langage clair",
    de: "EEG-Bildungsplattform, die Hirnwellendaten in einfache Sprache übersetzt",
    ja: "脳波データを平易な言葉に翻訳するEEG教育プラットフォーム",
    ko: "뇌파 데이터를 이해하기 쉬운 언어로 번역하는 EEG 교육 플랫폼",
  };

  const baseUrl = "https://neuroaccess.cloud";

  const ogLocales: Record<string, string> = {
    zh: "zh_CN",
    en: "en_US",
    es: "es_ES",
    fr: "fr_FR",
    de: "de_DE",
    ja: "ja_JP",
    ko: "ko_KR",
  };

  return {
    title: titles[lang] || titles.zh,
    description: descriptions[lang] || descriptions.zh,
    applicationName: "NeuroAccess",
    openGraph: {
      title: titles[lang] || titles.zh,
      description: descriptions[lang] || descriptions.zh,
      url: baseUrl,
      siteName: "NeuroAccess",
      images: [
        {
          url: `${baseUrl}/neuroaccess-logo-512.png`,
          width: 512,
          height: 512,
          alt: titles[lang] || titles.zh,
        },
      ],
      locale: ogLocales[lang] || ogLocales.zh,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: titles[lang] || titles.zh,
      description: descriptions[lang] || descriptions.zh,
      images: [`${baseUrl}/neuroaccess-logo-512.png`],
    },
    icons: {
      icon: [
        { url: "/favicon.ico?v=4", sizes: "16x16 32x32 48x48 64x64", type: "image/x-icon" },
        { url: "/icon.svg?v=4", type: "image/svg+xml" },
        { url: "/favicon.png?v=4", sizes: "32x32", type: "image/png" },
        { url: "/neuroaccess-logo-512.png?v=4", sizes: "512x512", type: "image/png" },
      ],
      shortcut: "/favicon.ico?v=4",
      apple: [
        { url: "/apple-touch-icon.png?v=4", sizes: "180x180", type: "image/png" },
        { url: "/neuroaccess-logo-512.png?v=4", sizes: "512x512", type: "image/png" },
      ],
    },
    manifest: "/manifest.json?v=4",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "NeuroAccess",
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 服务端读取 lang cookie，动态设置 <html lang>
  const h = await headers();
  const cookie = h.get("cookie") || "";
  const match = cookie.match(/lang=(\w+)/);
  const lang = match ? match[1] : "zh";

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22><defs><linearGradient id=%22g%22 x1=%220%25%22 y1=%220%25%22 x2=%22100%25%22 y2=%22100%25%22><stop offset=%220%25%22 stop-color=%22%233b82f6%22/><stop offset=%22100%25%22 stop-color=%22%2306b6d4%22/></linearGradient></defs><rect x=%222%22 y=%222%22 width=%2260%22 height=%2260%22 rx=%2214%22 fill=%22url(%23g)%22/><path d=%22M8 32 Q16 18 24 32 T40 32 T56 32%22 fill=%22none%22 stroke=%22%23fff%22 stroke-width=%223.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/><circle cx=%2232%22 cy=%2232%22 r=%223%22 fill=%22%23fff%22/></svg>" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=4" />
        <link rel="apple-touch-icon" sizes="512x512" href="/neuroaccess-logo-512.png?v=4" />
        {process.env.NODE_ENV === "development" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.onerror = function(msg, url, line, col, error) {
                  var div = document.createElement('div');
                  div.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:20px;z-index:99999;font-size:14px;font-family:monospace;white-space:pre-wrap;';
                  div.innerHTML = 'DEV ERROR:\\n' + msg + '\\n\\n' + (error && error.stack ? error.stack : '');
                  document.body.appendChild(div);
                };
              `,
            }}
          />
        )}
      </head>
      <body className="bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider initialLang={lang as Lang}>
              <AnalysisProvider>
                <DisclaimerModal />
                <PostLoginModals />
                <div className="flex h-screen overflow-hidden">
                  <Sidebar />
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <TopNav lang={lang} />
                    <main className="flex-1 overflow-y-auto">
                      {children}
                    </main>
                    <PublicPreviewFooter lang={lang} />
                  </div>
                </div>
              </AnalysisProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
