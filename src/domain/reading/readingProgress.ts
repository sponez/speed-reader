import type {
  FocusWindow,
  ReaderSettings,
  ReadingProgress,
  ReadingSession,
  ReadingText,
} from "./types";

const millisecondsPerMinute = 60_000;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function calculateWordIntervalMs(wpm: number): number {
  if (wpm <= 0) {
    throw new Error("WPM must be greater than 0.");
  }

  return millisecondsPerMinute / wpm;
}

export function createReadingSession(
  text: ReadingText,
  settings: ReaderSettings,
  startedAtMs: number,
): ReadingSession {
  calculateWordIntervalMs(settings.wpm);

  return {
    text,
    settings,
    startedAtMs,
    status: text.wordCount === 0 ? "finished" : "running",
  };
}

export function calculateReadingProgress(
  session: ReadingSession,
  nowMs: number,
): ReadingProgress {
  const elapsedMs = Math.max(0, nowMs - session.startedAtMs);

  if (session.text.wordCount === 0) {
    return {
      activeWordIndex: 0,
      elapsedMs,
      isFinished: true,
    };
  }

  const wordIntervalMs = calculateWordIntervalMs(session.settings.wpm);
  const calculatedWordIndex = Math.floor(elapsedMs / wordIntervalMs);
  const activeWordIndex = clamp(
    calculatedWordIndex,
    0,
    session.text.wordCount - 1,
  );

  return {
    activeWordIndex,
    elapsedMs,
    isFinished:
      session.status === "finished" ||
      calculatedWordIndex >= session.text.wordCount,
  };
}

export function calculateFocusWindow(
  progress: ReadingProgress,
  settings: ReaderSettings,
  wordCount: number,
): FocusWindow {
  if (wordCount === 0) {
    return {
      activeWordIndex: 0,
      firstVisibleWordIndex: 0,
      lastVisibleWordIndex: -1,
    };
  }

  const activeWordIndex = clamp(progress.activeWordIndex, 0, wordCount - 1);

  return {
    activeWordIndex,
    firstVisibleWordIndex: clamp(
      activeWordIndex - settings.visibleWordsBefore,
      0,
      wordCount - 1,
    ),
    lastVisibleWordIndex: clamp(
      activeWordIndex + settings.visibleWordsAfter,
      0,
      wordCount - 1,
    ),
  };
}
