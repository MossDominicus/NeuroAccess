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
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/neuroaccess-logo-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/neuroaccess-logo-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
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
