export type ThemeMode = "light" | "dark" | "system";

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function getInitialTheme(savedTheme: string | null): ThemeMode {
  if (isThemeMode(savedTheme)) {
    return savedTheme;
  }

  return "system";
}

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): "light" | "dark" {
  if (mode === "system") {
    return prefersDark ? "dark" : "light";
  }
  return mode;
}
