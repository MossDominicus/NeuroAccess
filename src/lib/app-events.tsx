"use client";

import { createContext, useContext, useCallback, useState, type ReactNode } from "react";

interface AppEventContextType {
  openSettings: () => void;
  replayIntro: () => void;
  openDisclaimer: () => void;
  setOpenSettings: (fn: () => void) => void;
  setReplayIntro: (fn: () => void) => void;
  setOpenDisclaimer: (fn: () => void) => void;
}

const AppEventContext = createContext<AppEventContextType>({
  openSettings: () => {},
  replayIntro: () => {},
  openDisclaimer: () => {},
  setOpenSettings: () => {},
  setReplayIntro: () => {},
  setOpenDisclaimer: () => {},
});

export function AppEventProvider({ children }: { children: ReactNode }) {
  const [openSettingsFn, setOpenSettingsFn] = useState<() => void>(() => () => {});
  const [replayIntroFn, setReplayIntroFn] = useState<() => void>(() => () => {});
  const [openDisclaimerFn, setOpenDisclaimerFn] = useState<() => void>(() => () => {});

  const openSettings = useCallback(() => openSettingsFn(), [openSettingsFn]);
  const replayIntro = useCallback(() => replayIntroFn(), [replayIntroFn]);
  const openDisclaimer = useCallback(() => openDisclaimerFn(), [openDisclaimerFn]);

  return (
    <AppEventContext.Provider value={{ openSettings, replayIntro, openDisclaimer, setOpenSettings: setOpenSettingsFn, setReplayIntro: setReplayIntroFn, setOpenDisclaimer: setOpenDisclaimerFn }}>
      {children}
    </AppEventContext.Provider>
  );
}

export function useAppEvents() {
  return useContext(AppEventContext);
}
