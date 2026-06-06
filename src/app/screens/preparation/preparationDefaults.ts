import type { PreparationDraft } from "./preparationTypes";

export const preparationDefaults: PreparationDraft = {
  text: "",
  wpm: 250,
  visibleWordsBefore: 2,
  visibleWordsAfter: 4,
  blurIntensity: 4,
};

export const preparationRanges = {
  wpm: { min: 50, max: 1000, step: 10 },
  visibleWordsBefore: { min: 0, max: 20, step: 1 },
  visibleWordsAfter: { min: 0, max: 20, step: 1 },
  blurIntensity: { min: 0, max: 12, step: 1 },
} as const;
