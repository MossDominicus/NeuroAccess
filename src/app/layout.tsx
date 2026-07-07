import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";
import { DisclaimerModal, PostLoginModals } from "@/components/LazyModals";
import RoutePrefetcher from "@/components/RoutePrefetcher";
import ErrorBoundary from "@/components/ErrorBoundary";
import PublicPreviewFooter from "@/components/PublicPreviewFooter";
import type { Lang } from "@/lib/translations";
import { LanguageProvider } from "@/lib/language-context";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { AnalysisProvider } from "@/lib/analysis-context";
import IntroProvider from "@/components/IntroProvider";
import { AppEventProvider } from "@/lib/app-events";

// Metadata in English (SEO default); client-side language handled by LanguageProvider
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = "https://neuroaccess.cloud";

  return {
    title: "NeuroAccess — EEG Education Platform",
    description: "Upload your EEG data and get AI-powered analysis reports. A free, non-profit educational platform for brainwave science.",
    applicationName: "NeuroAccess",
    alternates: { canonical: baseUrl },
    openGraph: {
      title: "NeuroAccess — EEG Education Platform",
      description: "Upload your EEG data and get AI-powered analysis reports. A free, non-profit educational platform for brainwave science.",
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
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "NeuroAccess — EEG Education Platform",
      description: "Upload your EEG data and get AI-powered analysis reports. A free, non-profit educational platform for brainwave science.",
      images: [`${baseUrl}/neuroaccess-logo-512.png`],
    },
    icons: {
      icon: [
        { url: "/favicon.ico?v=4", sizes: "any" },
        { url: "/favicon.png?v=4", sizes: "32x32", type: "image/png" },
        { url: "/neuroaccess-logo-small.png?v=4", sizes: "128x128", type: "image/png" },
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
    other: {
      "application/ld+json": JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "NeuroAccess",
        url: baseUrl,
        description: "Upload your EEG data and get AI-powered analysis reports. A free, non-profit educational platform for brainwave science.",
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
      }),
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
  // 从 cookie 读取用户语言偏好（SSR），无 cookie 则检测 Accept-Language
  let initialLang: Lang | undefined;
  try {
    const cookieStore = await cookies();
    const langCookie = cookieStore.get("lang");
    const LANGUAGES: Lang[] = ["zh", "en", "es", "fr", "de", "ja", "ko"];
    if (langCookie && LANGUAGES.includes(langCookie.value as Lang)) {
      initialLang = langCookie.value as Lang;
    }
  } catch {}
  if (!initialLang) {
    try {
      const headersList = await headers();
      const acceptLang = headersList.get("accept-language") || "";
      // Parse Accept-Language: "zh-CN,zh;q=0.9,en;q=0.8" → try to find best match
      const browserLangs = acceptLang.split(",").map(s => s.split(";")[0].trim().toLowerCase().split("-")[0].split("_")[0]);
      const LANGUAGES: Lang[] = ["zh", "en", "es", "fr", "de", "ja", "ko"];
      for (const bl of browserLangs) {
        if (LANGUAGES.includes(bl as Lang)) {
          initialLang = bl as Lang;
          break;
        }
      }
    } catch {}
  }
  // 默认英文
  initialLang = initialLang || "en";

  return (
    <html lang={initialLang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`
        }} />
        <link rel="shortcut icon" href="/favicon.ico?v=4" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=4" />
        <link rel="apple-touch-icon" sizes="512x512" href="/neuroaccess-logo-512.png?v=4" />
      </head>
      <body className="bg-[var(--color-bg)] text-[var(--color-text)] antialiased" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider initialLang={initialLang}>
              <AppEventProvider>
              <IntroProvider>
              <AnalysisProvider>
              <DisclaimerModal />
              <PostLoginModals />
              <RoutePrefetcher />
              <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <TopNav />
                  <main className="flex-1 overflow-y-auto overflow-x-auto scroll-smooth transition-all duration-200">
                    <ErrorBoundary>
                      {children}
                    </ErrorBoundary>
                  </main>
                  <PublicPreviewFooter />
                </div>
              </div>
              </AnalysisProvider>
              </IntroProvider>
              </AppEventProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
