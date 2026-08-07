import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 未登录时可访问的路径：仅登录/注册页、法律条款页、静态资源、API
const publicPaths = [
  "/login", "/register",
  // 法律条款页（注册时需要查看，保持公开）
  "/privacy", "/terms", "/disclaimer",
  // 静态资源与 API
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

const SECRET = process.env.JWT_SECRET_KEY || "";

function b64urlToUint8(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlDecode(s: string): any {
  const bin = b64urlToUint8(s);
  return JSON.parse(new TextDecoder().decode(bin));
}

/** 验证 JWT 签名（HS256）与过期时间 */
async function isValidToken(token: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [headerB64, payloadB64, sigB64] = parts;

    // 1) 校验签名（需要 JWT_SECRET_KEY）
    if (SECRET) {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );
      const valid = await crypto.subtle.verify(
        "HMAC",
        key,
        b64urlToUint8(sigB64).buffer as ArrayBuffer,
        new TextEncoder().encode(`${headerB64}.${payloadB64}`)
      );
      if (!valid) return false;
    }

    // 2) 校验过期时间
    const payload = b64urlDecode(payloadB64);
    if (payload && typeof payload.exp === "number") {
      if (payload.exp * 1000 < Date.now()) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("neuroaccess-token")?.value;

  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p));
  const tokenValid = token ? await isValidToken(token) : false;

  // 已登录（token 有效）访问登录/注册页 → 重定向首页
  if (tokenValid && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // 公开路径直接放行
  if (isPublic) {
    return NextResponse.next();
  }

  // token 不存在或无效 → 强制跳登录页
  if (!tokenValid) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // 附上原始目标，登录后可回跳
    if (pathname !== "/" && pathname !== "/login") {
      url.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
