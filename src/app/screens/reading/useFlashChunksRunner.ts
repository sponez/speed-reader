import { useEffect, useState } from "react";
import {
  calculateFlashChunksProgress,
  type FlashChunksProgress,
  type FlashChunksSession,
} from "../../../domain/reading";

type FlashChunksRunnerState = {
  progress: FlashChunksProgress;
};

const createRunnerState = (
  session: FlashChunksSession,
  nowMs: number,
): FlashChunksRunnerState => ({
  progress: calculateFlashChunksProgress(session, nowMs),
});

export function useFlashChunksRunner(
  session: FlashChunksSession,
): FlashChunksRunnerState {
  const [runnerState, setRunnerState] = useState<FlashChunksRunnerState>(() =>
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
