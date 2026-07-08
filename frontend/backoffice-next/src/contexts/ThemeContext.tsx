"use client";

import { THEME_MODE_CYCLE, type ThemeMode } from "@/lib/preferences/theme";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

interface ThemeContextType {
  theme: "light" | "dark";
  themeMode: ThemeMode;
  toggleTheme: () => void;
  cycleTheme: () => void;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const useTheme = (): ThemeContextType => {
  const themeMode = usePreferencesStore((state) => state.values.theme_mode);
  const resolvedThemeMode = usePreferencesStore((state) => state.resolvedThemeMode);
  const setPreference = usePreferencesStore((state) => state.setPreference);

  const cycleTheme = () => {
    const index = THEME_MODE_CYCLE.indexOf(themeMode);
    const next = THEME_MODE_CYCLE[(index + 1) % THEME_MODE_CYCLE.length];
    setPreference("theme_mode", next);
  };

  return {
    theme: resolvedThemeMode,
    themeMode,
    toggleTheme: cycleTheme,
    cycleTheme,
  };
};
