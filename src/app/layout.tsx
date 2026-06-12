import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";
import PublicPreviewFooter from "@/components/PublicPreviewFooter";
import { DisclaimerModal, PostLoginModals } from "@/components/LazyModals";
import type { Lang } from "@/lib/translations";
import { LanguageProvider } from "@/lib/language-context";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { AnalysisProvider } from "@/lib/analysis-context";

// Metadata 使用默认中文，语言切换由客户端 LanguageProvider 处理
// 保持 layout 可静态化以启用页面级 SSG（静态页面加载速度更快）
export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = "https://neuroaccess.cloud";

  return {
    title: "NeuroAccess",
    description: "EEG 科普教育平台，将脑电图数据翻译成人话",
    applicationName: "NeuroAccess",
    openGraph: {
      title: "NeuroAccess",
      description: "EEG 科普教育平台，将脑电图数据翻译成人话",
      url: baseUrl,
      siteName: "NeuroAccess",
      images: [
        {
          url: `${baseUrl}/neuroaccess-logo-512.png`,
          width: 512,
          height: 512,
          alt: "NeuroAccess",
        },
      ],
      locale: "zh_CN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "NeuroAccess",
      description: "EEG 科普教育平台，将脑电图数据翻译成人话",
      images: [`${baseUrl}/neuroaccess-logo-512.png`],
    },
    icons: {
      icon: [
        { url: "/favicon.png?v=4", sizes: "32x32", type: "image/png" },
      ],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`
        }} />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=4" />
        <link rel="apple-touch-icon" sizes="512x512" href="/neuroaccess-logo-512.png?v=4" />
      </head>
      <body className="bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider initialLang={"zh" as Lang}>
              <AnalysisProvider>
                <DisclaimerModal />
                <PostLoginModals />
                <div className="flex h-screen overflow-hidden">
                  <Sidebar />
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <TopNav />
                    <main className="flex-1 overflow-y-auto">
                      {children}
                    </main>
                    <PublicPreviewFooter />
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
