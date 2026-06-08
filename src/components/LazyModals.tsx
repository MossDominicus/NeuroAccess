"use client";
import dynamic from "next/dynamic";

export const DisclaimerModal = dynamic(
  () => import("./DisclaimerModal"),
  { ssr: false, loading: () => null }
);

export const PostLoginModals = dynamic(
  () => import("./PostLoginModals"),
  { ssr: false, loading: () => null }
);
