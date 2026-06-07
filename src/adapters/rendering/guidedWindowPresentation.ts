export type GuidedWindowPresentation =
  | "continuous"
  | "feed"
  | "singlePage"
  | "bookSpread";

export const defaultGuidedWindowPresentation: GuidedWindowPresentation =
  "continuous";

export const guidedWindowPresentationOptions: ReadonlyArray<{
  label: string;
  value: GuidedWindowPresentation;
}> = [
  { label: "Continuous", value: "continuous" },
  { label: "Feed", value: "feed" },
  { label: "Single page", value: "singlePage" },
  { label: "Book spread", value: "bookSpread" },
];

export const isGuidedWindowPresentation = (
  value: unknown,
): value is GuidedWindowPresentation =>
  guidedWindowPresentationOptions.some((option) => option.value === value);
