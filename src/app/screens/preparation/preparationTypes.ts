import type { GuidedWindowPresentation } from "../../../adapters/rendering";
import type { ReaderSettings, ReadingMode } from "../../../domain/reading";

export type PreparationDraft = ReaderSettings & {
  flashChunkSize: number;
  guidedWindowPresentation: GuidedWindowPresentation;
  readingMode: ReadingMode;
  text: string;
};
