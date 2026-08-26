const THEME_STORAGE_KEY = "linker-post-theme";
export const THEME_CHANGE_EVENT = "linker-post-theme-change";

export type ThemePreference = "system" | "light" | "dark";

function canUseDom(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function readThemePreference(): ThemePreference {
  if (!canUseDom()) return "system";
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  return "system";
}

export function systemPrefersDark(): boolean {
  if (!canUseDom()) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveIsDark(preference: ThemePreference = readThemePreference()): boolean {
  if (preference === "dark") return true;
  if (preference === "light") return false;
  return systemPrefersDark();
}

export function applyThemeClass(isDark: boolean): void {
  if (!canUseDom()) return;
  document.documentElement.classList.toggle("dark", isDark);
}

export function setThemePreference(preference: ThemePreference): void {
  if (!canUseDom()) return;
  localStorage.setItem(THEME_STORAGE_KEY, preference);
  applyThemeClass(resolveIsDark(preference));
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/** Toggle between explicit light/dark based on the currently resolved appearance. */
export function toggleResolvedTheme(): ThemePreference {
  const next: ThemePreference = resolveIsDark() ? "light" : "dark";
  setThemePreference(next);
  return next;
}

export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var p=localStorage.getItem(k)||"system";var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
