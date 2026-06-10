"use client";
import dynamic from "next/dynamic";

export const DisclaimerModal = dynamic(
  () => import("./DisclaimerModal"),
  { loading: () => null }
);

export const PostLoginModals = dynamic(
  () => import("./PostLoginModals"),
  { loading: () => null }
);
