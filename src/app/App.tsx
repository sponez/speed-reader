import { useEffect, useState } from "react";
import {
  loadPreparationDraftSnapshot,
  savePreparationDraftSnapshot,
  type PreparationDraftSnapshot,
} from "../adapters/persistence";
import {
  createReadingSession,
  tokenizeReadingText,
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
import "./App.css";

type AppState =
  | { mode: "loading" }
  | { mode: "preparing"; draft: PreparationDraft }
  | { mode: "reading"; draft: PreparationDraft; session: ReadingSession };

type NumericDraftKey = Exclude<keyof PreparationDraft, "text">;

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
    const {
      text,
      wpm,
      focusWindowSize,
      blurIntensity,
      focusHighlightIntensity,
    } = draft;
    const settings: ReaderSettings = {
      wpm,
      focusWindowSize,
      blurIntensity,
      focusHighlightIntensity,
    };
    const readingText = tokenizeReadingText(text);
    const session = createReadingSession(
      readingText,
      settings,
      performance.now(),
    );

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
        <ReadingScreen session={appState.session} onFinish={handleFinish} />
      )}
    </>
  );
}

export default App;
