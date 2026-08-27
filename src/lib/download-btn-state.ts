"use client";

import { useEffect, useState } from "react";

const KEY = "eegDownloadBtnHidden";
const EVT = "eeg-download-btn-changed";

export function getDownloadBtnHidden(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

export function setDownloadBtnHidden(v: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, v ? "true" : "false");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVT));
}

export function useDownloadBtnHidden(): boolean {
  // 惰性初始化，避免已隐藏用户刷新时按钮先闪现再消失
  const [hidden, setHidden] = useState<boolean>(() => getDownloadBtnHidden());
  useEffect(() => {
    const sync = () => setHidden(getDownloadBtnHidden());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return hidden;
}
