import { Store } from "@tauri-apps/plugin-store";

export type PreparationDraftSnapshot = Partial<{
  blurIntensity: number;
  flashChunkSize: number;
  focusHighlightIntensity: number;
  focusWindowSize: number;
  guidedWindowPresentation: string;
  readingMode: string;
  text: string;
  wpm: number;
}>;

const storePath = "reader-settings.json";
const preparationDraftKey = "preparationDraft";

const loadReaderStore = () =>
  Store.load(storePath, { defaults: {}, autoSave: false });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const readNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

export async function loadPreparationDraftSnapshot(): Promise<PreparationDraftSnapshot | null> {
  try {
    const store = await loadReaderStore();
    const storedValue = await store.get<unknown>(preparationDraftKey);

    if (!isRecord(storedValue)) {
      return null;
    }

    return {
      blurIntensity: readNumber(storedValue.blurIntensity),
      flashChunkSize: readNumber(storedValue.flashChunkSize),
      focusHighlightIntensity: readNumber(storedValue.focusHighlightIntensity),
      focusWindowSize: readNumber(storedValue.focusWindowSize),
      guidedWindowPresentation: readString(storedValue.guidedWindowPresentation),
      readingMode: readString(storedValue.readingMode),
      text: readString(storedValue.text),
      wpm: readNumber(storedValue.wpm),
    };
  } catch {
    return null;
  }
}

export async function savePreparationDraftSnapshot(
  snapshot: Required<PreparationDraftSnapshot>,
) {
  try {
    const store = await loadReaderStore();

    await store.set(preparationDraftKey, snapshot);
    await store.save();
  } catch {
    // Persistence must not block the reading flow.
  }
}
