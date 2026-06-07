import type {
  FocusWindow,
  ReaderSettings,
  ReadingProgress,
  ReadingSession,
  ReadingText,
  WordLine,
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

export function validateFocusWindowSize(focusWindowSize: number): void {
  if (focusWindowSize <= 0) {
    throw new Error("Focus window size must be greater than 0.");
  }
}

export function createReadingSession(
  text: ReadingText,
  settings: ReaderSettings,
  startedAtMs: number,
): ReadingSession {
  calculateWordIntervalMs(settings.wpm);
  validateFocusWindowSize(settings.focusWindowSize);

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
      cursorWordIndex: 0,
      activeWordIndex: 0,
      elapsedMs,
      isFinished: true,
    };
  }

  const wordIntervalMs = calculateWordIntervalMs(session.settings.wpm);
  const calculatedWordIndex = Math.floor(elapsedMs / wordIntervalMs);
  const cursorWordIndex = clamp(
    calculatedWordIndex,
    0,
    session.text.wordCount - 1,
  );
  const windowSize = session.settings.focusWindowSize;
  const currentWindowStart =
    Math.floor(calculatedWordIndex / windowSize) * windowSize;
  const activeWordIndex = clamp(
    currentWindowStart + windowSize - 1,
    0,
    session.text.wordCount - 1,
  );

  return {
    cursorWordIndex,
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

  const cursorWordIndex = clamp(progress.cursorWordIndex, 0, wordCount - 1);
  validateFocusWindowSize(settings.focusWindowSize);
  const windowSize = settings.focusWindowSize;
  const firstVisibleWordIndex =
    Math.floor(cursorWordIndex / windowSize) * windowSize;
  const lastVisibleWordIndex = clamp(
    firstVisibleWordIndex + windowSize - 1,
    0,
    wordCount - 1,
  );

  return {
    activeWordIndex: lastVisibleWordIndex,
    firstVisibleWordIndex,
    lastVisibleWordIndex,
  };
}

const findLineContainingWord = (
  cursorWordIndex: number,
  wordCount: number,
  wordLines: WordLine[],
): WordLine | null => {
  for (const line of wordLines) {
    const firstWordIndex = clamp(line.firstWordIndex, 0, wordCount - 1);
    const lastWordIndex = clamp(
      line.lastWordIndex,
      firstWordIndex,
      wordCount - 1,
    );

    if (
      cursorWordIndex >= firstWordIndex &&
      cursorWordIndex <= lastWordIndex
    ) {
      return { firstWordIndex, lastWordIndex };
    }
  }

  return null;
};

export function calculateLineBoundedFocusWindow(
  cursorWordIndex: number,
  settings: ReaderSettings,
  wordCount: number,
  wordLines: WordLine[],
): FocusWindow {
  if (wordCount === 0) {
    return {
      activeWordIndex: 0,
      firstVisibleWordIndex: 0,
      lastVisibleWordIndex: -1,
    };
  }

  validateFocusWindowSize(settings.focusWindowSize);

  if (wordLines.length === 0) {
    return calculateFocusWindow(
      {
        cursorWordIndex,
        activeWordIndex: cursorWordIndex,
        elapsedMs: 0,
        isFinished: false,
      },
      settings,
      wordCount,
    );
  }

  const clampedCursorWordIndex = clamp(cursorWordIndex, 0, wordCount - 1);
  const line = findLineContainingWord(
    clampedCursorWordIndex,
    wordCount,
    wordLines,
  );

  if (line === null) {
    return calculateFocusWindow(
      {
        cursorWordIndex: clampedCursorWordIndex,
        activeWordIndex: clampedCursorWordIndex,
        elapsedMs: 0,
        isFinished: false,
      },
      settings,
      wordCount,
    );
  }

  const windowSize = settings.focusWindowSize;
  const cursorOffsetInLine = clampedCursorWordIndex - line.firstWordIndex;
  const firstVisibleWordIndex =
    line.firstWordIndex +
    Math.floor(cursorOffsetInLine / windowSize) * windowSize;
  const lastVisibleWordIndex = Math.min(
    firstVisibleWordIndex + windowSize - 1,
    line.lastWordIndex,
  );

  return {
    activeWordIndex: lastVisibleWordIndex,
    firstVisibleWordIndex,
    lastVisibleWordIndex,
  };
}
