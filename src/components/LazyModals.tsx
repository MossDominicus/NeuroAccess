"use client";
import dynamic from "next/dynamic";

// ssr:false 确保服务端与客户端的初始渲染一致（均渲染 loading:null），
// 避免动态组件在服务端渲染真实内容、客户端首屏未加载时渲染 null 导致的 hydration 不匹配（React #418）。
export const DisclaimerModal = dynamic(
  () => import("./DisclaimerModal"),
  { ssr: false, loading: () => null }
);

export const PostLoginModals = dynamic(
  () => import("./PostLoginModals"),
  { ssr: false, loading: () => null }
);
