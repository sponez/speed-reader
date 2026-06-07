import type { GuidedWindowPresentation } from "../../../adapters/rendering";
import type { ReaderSettings, ReadingMode } from "../../../domain/reading";
import type { ThemeSettings } from "../../theme";

export type PreparationDraft = ReaderSettings &
  ThemeSettings & {
  flashChunkSize: number;
  guidedWindowPresentation: GuidedWindowPresentation;
  readingMode: ReadingMode;
  text: string;
};
