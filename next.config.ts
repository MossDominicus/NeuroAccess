import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  compress: true,
  devIndicators: false,
  allowedDevOrigins: ["neuroaccess.cloud"],
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        // 静态资源（JS/CSS chunk）：内容哈希命名，长期缓存即可，哈希变了浏览器自然更新
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // 页面 HTML 文档：禁止缓存。
        // Next.js 强制 HTML 为 no-cache；Cloudflare 会把 no-cache 改写为 max-age=60，
        // 导致用户拿到旧 HTML → 旧 JS chunk。用 CDN-Cache-Control: no-store 让 Cloudflare 不缓存。
        source: "/(.*)",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "no-store" },
          { key: "CDN-Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
