import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
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
import IntroProvider from "@/components/IntroProvider";

// Metadata 使用默认中文，语言切换由客户端 LanguageProvider 处理
export const dynamic = "force-dynamic";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 从 cookie 读取用户语言偏好（SSR）
  let initialLang: Lang | undefined;
  try {
    const cookieStore = await cookies();
    const langCookie = cookieStore.get("lang");
    const LANGUAGES: Lang[] = ["zh", "en", "es", "fr", "de", "ja", "ko"];
    if (langCookie && LANGUAGES.includes(langCookie.value as Lang)) {
      initialLang = langCookie.value as Lang;
    }
  } catch {}
  // 默认英文
  initialLang = initialLang || "en";

  return (
    <html lang={initialLang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`
        }} />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=4" />
        <link rel="apple-touch-icon" sizes="512x512" href="/neuroaccess-logo-512.png?v=4" />
      </head>
      <body className="bg-[var(--color-bg)] text-[var(--color-text)] antialiased" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider initialLang={initialLang}>
              <IntroProvider>
              <AnalysisProvider>
              <DisclaimerModal />
              <PostLoginModals />
              <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <TopNav />
                  <main className="flex-1 overflow-y-auto overflow-x-auto scroll-smooth transition-all duration-200">
                    {children}
                  </main>
                  <PublicPreviewFooter />
                </div>
              </div>
              </AnalysisProvider>
              </IntroProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
