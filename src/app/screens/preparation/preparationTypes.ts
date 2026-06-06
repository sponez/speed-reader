import type { ReaderSettings } from "../../../domain/reading";

export type PreparationDraft = ReaderSettings & {
  text: string;
};
