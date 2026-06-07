import type { ThemeSettings } from "./themeTypes";

export const themeDefaults: ThemeSettings = {
  theme: "light",
  warmthIntensity: 0,
};

export const themeRanges = {
  warmthIntensity: { min: 0, max: 100, step: 5 },
} as const;
