import { describe, expect, it } from "vitest";
import { getInitialTheme, getNextTheme } from "./theme";

describe("theme rules", () => {
  it("switches between light and dark themes", () => {
    expect(getNextTheme("light")).toBe("dark");
    expect(getNextTheme("dark")).toBe("light");
  });

  it("uses saved theme when it is valid", () => {
    expect(getInitialTheme("dark", false)).toBe("dark");
    expect(getInitialTheme("light", true)).toBe("light");
  });

  it("falls back to system preference when saved theme is invalid", () => {
    expect(getInitialTheme(null, true)).toBe("dark");
    expect(getInitialTheme("invalid", false)).toBe("light");
  });
});
