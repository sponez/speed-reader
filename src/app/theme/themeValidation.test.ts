import { describe, expect, it } from "vitest";

import {
  normalizeAppTheme,
  normalizeWarmthIntensity,
} from "./themeValidation";

describe("theme validation", () => {
  it("accepts supported themes", () => {
    expect(normalizeAppTheme("light")).toBe("light");
    expect(normalizeAppTheme("dark")).toBe("dark");
  });

  it("falls back to light for unsupported themes", () => {
    expect(normalizeAppTheme("sepia")).toBe("light");
    expect(normalizeAppTheme(null)).toBe("light");
  });

  it("normalizes warmth intensity", () => {
    expect(normalizeWarmthIntensity(undefined)).toBe(0);
    expect(normalizeWarmthIntensity(-10)).toBe(0);
    expect(normalizeWarmthIntensity(54.4)).toBe(54);
    expect(normalizeWarmthIntensity(120)).toBe(100);
  });
});
