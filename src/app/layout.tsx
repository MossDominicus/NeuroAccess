import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";
import PublicPreviewFooter from "@/components/PublicPreviewFooter";
import { DisclaimerModal, PostLoginModals } from "@/components/LazyModals";
import { LanguageProvider } from "@/lib/language-context";
import { ThemeProvider } from "@/lib/theme-context";
import { AnalysisProvider } from "@/lib/analysis-context";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "NeuroAccess - EEG Literacy Platform",
  description: "EEG 科普教育平台，将脑电图数据翻译成人话",
  applicationName: "NeuroAccess",
  icons: {
    icon: [
      { url: "/favicon.ico?v=3", sizes: "16x16 32x32 48x48 64x64", type: "image/x-icon" },
      { url: "/icon.svg?v=3", type: "image/svg+xml" },
      { url: "/favicon.png?v=3", sizes: "32x32", type: "image/png" },
      { url: "/neuroaccess-logo-512.png?v=3", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=3",
    apple: [
      { url: "/apple-touch-icon.png?v=3", sizes: "180x180", type: "image/png" },
      { url: "/neuroaccess-logo-512.png?v=3", sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: "/manifest.json?v=3",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NeuroAccess",
  },
};

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22><defs><linearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22><stop offset=%220%25%22 stop-color=%22%233b82f6%22/><stop offset=%22100%25%22 stop-color=%22%2306b6d4%22/></linearGradient></defs><rect x=%222%22 y=%222%22 width=%2260%22 height=%2260%22 rx=%2214%22 fill=%22url(%23g)%22/><path d=%22M8 32 Q16 18 24 32 T40 32 T56 32%22 fill=%22none%22 stroke=%22%23fff%22 stroke-width=%223.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/><circle cx=%2232%22 cy=%2232%22 r=%223%22 fill=%22%23fff%22/></svg>" />
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
            <LanguageProvider>
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
