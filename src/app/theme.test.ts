import { describe, expect, it } from "vitest";
import { getInitialTheme, resolveTheme } from "./theme";

describe("theme rules", () => {
  it("resolves system mode from the OS preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("resolves explicit light/dark regardless of OS preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("uses saved theme when it is valid", () => {
    expect(getInitialTheme("dark")).toBe("dark");
    expect(getInitialTheme("light")).toBe("light");
    expect(getInitialTheme("system")).toBe("system");
  });

  it("falls back to system mode when saved theme is invalid or absent", () => {
    expect(getInitialTheme(null)).toBe("system");
    expect(getInitialTheme("invalid")).toBe("system");
  });
});
