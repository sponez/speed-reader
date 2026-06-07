import { useState } from "react";
import {
  createReadingSession,
  tokenizeReadingText,
  type ReaderSettings,
  type ReadingSession,
} from "../domain/reading";
import PreparationScreen from "./screens/preparation/PreparationScreen";
import { preparationDefaults } from "./screens/preparation/preparationDefaults";
import type { PreparationDraft } from "./screens/preparation/preparationTypes";
import ReadingScreen from "./screens/reading/ReadingScreen";
import "./App.css";

type AppState =
  | { mode: "preparing"; draft: PreparationDraft }
  | { mode: "reading"; draft: PreparationDraft; session: ReadingSession };

function App() {
  const [appState, setAppState] = useState<AppState>({
    mode: "preparing",
    draft: preparationDefaults,
  });

  const handleStart = (draft: PreparationDraft) => {
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
