import { useEffect, useState } from "react";
import {
  calculateFocusWindow,
  calculateReadingProgress,
  type FocusWindow,
  type ReadingProgress,
  type ReadingSession,
} from "../../../domain/reading";

type ReadingRunnerState = {
  progress: ReadingProgress;
  focusWindow: FocusWindow;
};

const createRunnerState = (
  session: ReadingSession,
  nowMs: number,
): ReadingRunnerState => {
  const progress = calculateReadingProgress(session, nowMs);

  return {
    progress,
    focusWindow: calculateFocusWindow(
      progress,
      session.settings,
      session.text.wordCount,
    ),
  };
};

export function useReadingRunner(session: ReadingSession): ReadingRunnerState {
  const [runnerState, setRunnerState] = useState<ReadingRunnerState>(() =>
    createRunnerState(session, performance.now()),
  );

  useEffect(() => {
    let animationFrameId: number | null = null;
    let isMounted = true;

    const updateRunnerState = (nowMs: number) => {
      const nextRunnerState = createRunnerState(session, nowMs);

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
  }, [session]);

  return runnerState;
}
