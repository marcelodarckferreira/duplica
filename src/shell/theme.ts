export type ThemeMode = "light" | "dark";

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

export function getInitialTheme(savedTheme: string | null, prefersDark: boolean): ThemeMode {
  if (isThemeMode(savedTheme)) {
    return savedTheme;
  }

  return prefersDark ? "dark" : "light";
}

export function getNextTheme(theme: ThemeMode): ThemeMode {
  return theme === "light" ? "dark" : "light";
}
