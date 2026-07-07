import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = [
  "/",  // 首页（游客也可上传分析）
  "/login", "/register",
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
  const token = request.cookies.get("neuroaccess-token")?.value;

  // 已登录用户访问登录/注册页：重定向到首页
  if (token && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // 公开路径直接放行（静态页面可被浏览器/CDN 缓存）
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }
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
