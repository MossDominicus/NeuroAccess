import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // rewrites 已在 v1.0 移除：前端通过 NEXT_PUBLIC_API_URL 直接调用后端
  // 开发环境在 .env.local 中设置 NEXT_PUBLIC_API_URL=http://localhost:8000
};

export default nextConfig;
