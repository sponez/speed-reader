import { useEffect, useState } from "react";
import {
  calculateFocusWindow,
  calculateLineTimedFocusWindow,
  calculateReadingProgress,
  type FocusWindow,
  type ReadingProgress,
  type ReadingSession,
  type WordLine,
} from "../../../domain/reading";

type ReadingRunnerState = {
  progress: ReadingProgress;
  focusWindow: FocusWindow;
};

const createRunnerState = (
  session: ReadingSession,
  nowMs: number,
  wordLines: WordLine[],
): ReadingRunnerState => {
  const progress = calculateReadingProgress(session, nowMs);

  return {
    progress,
    focusWindow:
      wordLines.length > 0
        ? calculateLineTimedFocusWindow(
            progress.elapsedMs,
            session.settings,
            session.text.wordCount,
            wordLines,
          )
        : calculateFocusWindow(
            progress,
            session.settings,
            session.text.wordCount,
          ),
  };
};

export function useReadingRunner(
  session: ReadingSession,
  wordLines: WordLine[] = [],
): ReadingRunnerState {
  const [runnerState, setRunnerState] = useState<ReadingRunnerState>(() =>
    createRunnerState(session, performance.now(), wordLines),
  );

  useEffect(() => {
    let animationFrameId: number | null = null;
    let isMounted = true;

    const updateRunnerState = (nowMs: number) => {
      const nextRunnerState = createRunnerState(session, nowMs, wordLines);

      if (!isMounted) {
        return;
      }

      setRunnerState(nextRunnerState);

      if (!nextRunnerState.progress.isFinished) {
        animationFrameId = requestAnimationFrame(updateRunnerState);
      }
    };

    updateRunnerState(performance.now());

    return () => {
      isMounted = false;

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [session, wordLines]);

  return runnerState;
}
