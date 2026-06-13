import { defaultGuidedWindowPresentation } from "../../../adapters/rendering";
import { themeDefaults, themeRanges } from "../../theme";
import type { PreparationDraft } from "./preparationTypes";

export const preparationDefaults: PreparationDraft = {
  text: "",
  ...themeDefaults,
  readingMode: "guidedWindow",
  guidedWindowPresentation: defaultGuidedWindowPresentation,
  wpm: 250,
  focusWindowSize: 5,
  blurIntensity: 4,
  focusHighlightIntensity: 65,
};

export const preparationRanges = {
  wpm: { min: 100, max: 5000, step: "any" },
  focusWindowSize: { min: 1, max: 20, step: 1 },
  blurIntensity: { min: 0, max: 12, step: 1 },
  warmthIntensity: themeRanges.warmthIntensity,
  focusHighlightIntensity: { min: 0, max: 100, step: 5 },
} as const;
