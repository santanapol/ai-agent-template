"use client";

import type { ResolvedThemeMode, ThemeMode } from "./theme";

export function getResolvedThemeMode(mode: ThemeMode): ResolvedThemeMode {
  if (mode === "system") {
    const prefersDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    return prefersDark ? "dark" : "light";
  }
  return mode === "dark" ? "dark" : "light";
}

function resolveThemeMode(mode: ThemeMode): ResolvedThemeMode {
  return getResolvedThemeMode(mode);
}

export function applyThemeMode(mode: ThemeMode): ResolvedThemeMode {
  const resolved = resolveThemeMode(mode);
  const doc = document.documentElement;
  doc.setAttribute("data-theme-mode", mode);
  doc.classList.toggle("dark", resolved === "dark");
  doc.style.colorScheme = resolved;
  return resolved;
}

export function subscribeToSystemTheme(onChange: (mode: ResolvedThemeMode) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  if (!media) return () => undefined;

  const listener = (event: MediaQueryListEvent) => {
    onChange(event.matches ? "dark" : "light");
  };

  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

export function migrateLegacyTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  const legacy = localStorage.getItem("zp-theme");
  if (legacy === "light" || legacy === "dark") {
    localStorage.removeItem("zp-theme");
    return legacy;
  }
  return null;
}
