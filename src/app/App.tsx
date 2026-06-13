import { useEffect, useState } from "react";
import {
  loadPreparationDraftSnapshot,
  savePreparationDraftSnapshot,
  type PreparationDraftSnapshot,
} from "../adapters/persistence";
import { isGuidedWindowPresentation } from "../adapters/rendering";
import {
  createFlashChunksSession,
  createReadingSession,
  tokenizeReadingText,
  type FlashChunksSession,
  type FlashChunksSettings,
  type ReaderSettings,
  type ReadingSession,
} from "../domain/reading";
import PreparationScreen from "./screens/preparation/PreparationScreen";
import {
  preparationDefaults,
  preparationRanges,
} from "./screens/preparation/preparationDefaults";
import type { PreparationDraft } from "./screens/preparation/preparationTypes";
import ReadingScreen from "./screens/reading/ReadingScreen";
import { normalizeAppTheme, normalizeWarmthIntensity } from "./theme";
import "./App.css";

type AppState =
  | { mode: "loading" }
  | { mode: "preparing"; draft: PreparationDraft }
  | { mode: "reading"; draft: PreparationDraft; session: ActiveReadingSession };

type ActiveReadingSession =
  | { mode: "guidedWindow"; session: ReadingSession }
  | { mode: "flashChunks"; session: FlashChunksSession };

type NumericDraftKey = Exclude<
  keyof PreparationDraft,
  "guidedWindowPresentation" | "readingMode" | "text" | "theme"
>;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const normalizeNumberSetting = (
  key: NumericDraftKey,
  value: number | undefined,
) => {
  const range = preparationRanges[key];

  if (value === undefined) {
    return preparationDefaults[key];
  }

  const normalizedValue = key === "wpm" ? value : Math.round(value);

  return clamp(normalizedValue, range.min, range.max);
};

const normalizePreparationDraft = (
  snapshot: PreparationDraftSnapshot | null,
): PreparationDraft => ({
  text: snapshot?.text ?? preparationDefaults.text,
  theme: normalizeAppTheme(snapshot?.theme),
  warmthIntensity: normalizeWarmthIntensity(snapshot?.warmthIntensity),
  readingMode:
    snapshot?.readingMode === "flashChunks" ||
    snapshot?.readingMode === "guidedWindow"
      ? snapshot.readingMode
      : preparationDefaults.readingMode,
  guidedWindowPresentation: isGuidedWindowPresentation(
    snapshot?.guidedWindowPresentation,
  )
    ? snapshot.guidedWindowPresentation
    : preparationDefaults.guidedWindowPresentation,
  wpm: normalizeNumberSetting("wpm", snapshot?.wpm),
  focusWindowSize: normalizeNumberSetting(
    "focusWindowSize",
    snapshot?.focusWindowSize,
  ),
  blurIntensity: normalizeNumberSetting(
    "blurIntensity",
    snapshot?.blurIntensity,
  ),
  focusHighlightIntensity: normalizeNumberSetting(
    "focusHighlightIntensity",
    snapshot?.focusHighlightIntensity,
  ),
});

function App() {
  const [appState, setAppState] = useState<AppState>({ mode: "loading" });

  useEffect(() => {
    let isMounted = true;

    const loadDraft = async () => {
      const snapshot = await loadPreparationDraftSnapshot();

      if (!isMounted) {
        return;
      }

      setAppState({
        mode: "preparing",
        draft: normalizePreparationDraft(snapshot),
      });
    };

    void loadDraft();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleStart = async (draft: PreparationDraft) => {
    const { text, wpm } = draft;
    const settings: ReaderSettings = {
      wpm,
      focusWindowSize: draft.focusWindowSize,
      blurIntensity: draft.blurIntensity,
      focusHighlightIntensity: draft.focusHighlightIntensity,
    };
    const readingText = tokenizeReadingText(text);
    const session: ActiveReadingSession =
      draft.readingMode === "flashChunks"
        ? {
            mode: "flashChunks",
            session: createFlashChunksSession(
              readingText,
              {
                wpm,
                focusWindowSize: draft.focusWindowSize,
              } satisfies FlashChunksSettings,
              performance.now(),
            ),
          }
        : {
            mode: "guidedWindow",
            session: createReadingSession(
              readingText,
              settings,
              performance.now(),
            ),
          };

    await savePreparationDraftSnapshot(draft);

    setAppState({
      mode: "reading",
      draft,
      session,
    });
  };

  const handleFinish = () => {
    setAppState((currentState) => {
      if (currentState.mode !== "reading") {
        return currentState;
      }

      return {
        mode: "preparing",
        draft: currentState.draft,
      };
    });
  };

  return (
    <>
      {appState.mode === "loading" && (
        <main className="app-loading" aria-busy="true">
          Loading...
        </main>
      )}
      {appState.mode === "preparing" && (
        <PreparationScreen initialDraft={appState.draft} onStart={handleStart} />
      )}
      {appState.mode === "reading" && (
        <ReadingScreen
          activeSession={appState.session}
          presentation={appState.draft.guidedWindowPresentation}
          themeSettings={{
            theme: appState.draft.theme,
            warmthIntensity: appState.draft.warmthIntensity,
          }}
          onFinish={handleFinish}
        />
      )}
    </>
  );
}

export default App;
