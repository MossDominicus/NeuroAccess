import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 免认证路径：登录、注册、API、静态资源
  const publicPaths = ["/login", "/register", "/reports", "/api/", "/_next/", "/favicon.ico", "/favicon.png", "/icon.svg", "/apple-touch-icon.png", "/manifest.json", "/neuroaccess-logo.png", "/neuroaccess-logo-512.png", "/neuroaccess-logo-small.png", "/neuroaccess-logo.jpg", "/neuroaccess-logo-fixed.png", "/opengraph-image.png", "/twitter-image.png"];
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p));
  if (isPublic) {
    return NextResponse.next();
  }

  // 检查 cookie 中的 token
  const token = request.cookies.get("neuroaccess-token")?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const res = NextResponse.redirect(url);
    // 禁止缓存重定向响应，防止登录后浏览器复用旧重定向
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.headers.set("Pragma", "no-cache");
    return res;
  }

  const res = NextResponse.next();
  // 禁止缓存需要认证的页面
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.headers.set("Pragma", "no-cache");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
