import { secureStorage } from "./secureStorage";

export type ThemeMode = "dark" | "light";

const THEME_STORAGE_KEY = "app_theme_mode";

export function getThemeMode(): ThemeMode {
  const stored = secureStorage.getItem<string>(THEME_STORAGE_KEY, "dark");
  return stored === "light" ? "light" : "dark";
}

export function applyThemeMode(mode: ThemeMode): void {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", mode);
    document.documentElement.style.colorScheme = mode;
  }
}

export function saveThemeMode(mode: ThemeMode): ThemeMode {
  secureStorage.setItem(THEME_STORAGE_KEY, mode);
  applyThemeMode(mode);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app-theme-changed", { detail: mode }));
  }
  return mode;
}

