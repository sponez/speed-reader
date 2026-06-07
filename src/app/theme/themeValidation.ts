import { themeDefaults, themeRanges } from "./themeDefaults";
import type { AppTheme } from "./themeTypes";

const appThemes: ReadonlySet<string> = new Set(["light", "dark"]);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const isAppTheme = (value: unknown): value is AppTheme =>
  typeof value === "string" && appThemes.has(value);

export const normalizeAppTheme = (value: unknown): AppTheme =>
  isAppTheme(value) ? value : themeDefaults.theme;

export const normalizeWarmthIntensity = (value: number | undefined) => {
  if (value === undefined) {
    return themeDefaults.warmthIntensity;
  }

  const { min, max } = themeRanges.warmthIntensity;

  return clamp(Math.round(value), min, max);
};
