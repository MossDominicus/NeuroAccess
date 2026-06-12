import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 公开路径：无需登录即可访问
const publicPaths = [
  "/", "/login", "/register",
  "/guide", "/cases", "/privacy", "/terms", "/disclaimer",
  "/eeg-simulator", "/eeg-viewer",
  "/reports",
  "/api/",
  "/_next/",
  "/favicon.ico", "/favicon.png", "/icon.svg",
  "/apple-touch-icon.png", "/manifest.json",
  "/neuroaccess-logo.png", "/neuroaccess-logo-512.png",
  "/neuroaccess-logo-small.png", "/neuroaccess-logo.jpg",
  "/neuroaccess-logo-fixed.png",
  "/opengraph-image.png", "/twitter-image.png",
  "/robots.txt", "/sitemap.xml",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路径直接放行（静态页面可被浏览器/CDN 缓存）
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 受保护路径：检查登录 token
  const token = request.cookies.get("neuroaccess-token")?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 已登录：允许缓存静态资源
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
