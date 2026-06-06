import { useState } from "react";
import {
  createReadingSession,
  tokenizeReadingText,
  type ReaderSettings,
  type ReadingSession,
} from "../domain/reading";
import PreparationScreen from "./screens/preparation/PreparationScreen";
import type { PreparationDraft } from "./screens/preparation/preparationTypes";
import ReadingScreen from "./screens/reading/ReadingScreen";
import "./App.css";

type AppState =
  | { mode: "preparing" }
  | { mode: "reading"; session: ReadingSession };

function App() {
  const [appState, setAppState] = useState<AppState>({ mode: "preparing" });

  const handleStart = (draft: PreparationDraft) => {
    const {
      text,
      wpm,
      visibleWordsBefore,
      visibleWordsAfter,
      blurIntensity,
    } = draft;
    const settings: ReaderSettings = {
      wpm,
      visibleWordsBefore,
      visibleWordsAfter,
      blurIntensity,
    };
    const readingText = tokenizeReadingText(text);
    const session = createReadingSession(
      readingText,
      settings,
      performance.now(),
    );

    setAppState({
      mode: "reading",
      session,
    });
  };

  return (
    <>
      {appState.mode === "preparing" && (
        <PreparationScreen onStart={handleStart} />
      )}
      {appState.mode === "reading" && (
        <ReadingScreen session={appState.session} />
      )}
    </>
  );
}

export default App;
