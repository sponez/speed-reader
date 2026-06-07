import type {
  FocusWindow,
  ReaderSettings,
  ReadingProgress,
  ReadingSession,
  ReadingText,
  WordLine,
} from "./types";

const millisecondsPerMinute = 60_000;
const lineEntryTimeRatio = 0.05;

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

const createProgressSnapshot = (
  cursorWordIndex: number,
  elapsedMs: number,
): ReadingProgress => ({
  cursorWordIndex,
  activeWordIndex: cursorWordIndex,
  elapsedMs,
  isFinished: false,
});

const calculateElapsedCursorWordIndex = (
  elapsedMs: number,
  settings: ReaderSettings,
  wordCount: number,
) => {
  if (wordCount === 0) {
    return 0;
  }

  const wordIntervalMs = calculateWordIntervalMs(settings.wpm);

  return clamp(
    Math.floor(Math.max(0, elapsedMs) / wordIntervalMs),
    0,
    wordCount - 1,
  );
};

const normalizeWordLines = (
  wordLines: WordLine[],
  wordCount: number,
): WordLine[] =>
  wordLines
    .map((line) => {
      const firstWordIndex = clamp(line.firstWordIndex, 0, wordCount - 1);
      const lastWordIndex = clamp(
        line.lastWordIndex,
        firstWordIndex,
        wordCount - 1,
      );

      return { firstWordIndex, lastWordIndex };
    })
    .sort(
      (firstLine, secondLine) =>
        firstLine.firstWordIndex - secondLine.firstWordIndex,
    );

const doWordLinesCoverText = (wordLines: WordLine[], wordCount: number) => {
  if (wordLines.length === 0) {
    return false;
  }

  let expectedFirstWordIndex = 0;

  for (const line of wordLines) {
    if (line.firstWordIndex !== expectedFirstWordIndex) {
      return false;
    }

    expectedFirstWordIndex = line.lastWordIndex + 1;
  }

  return expectedFirstWordIndex === wordCount;
};

export function calculateLineTimedFocusWindow(
  elapsedMs: number,
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
  const safeElapsedMs = Math.max(0, elapsedMs);
  const wordIntervalMs = calculateWordIntervalMs(settings.wpm);
  const normalizedWordLines = normalizeWordLines(wordLines, wordCount);

  if (!doWordLinesCoverText(normalizedWordLines, wordCount)) {
    const cursorWordIndex = calculateElapsedCursorWordIndex(
      safeElapsedMs,
      settings,
      wordCount,
    );

    return calculateFocusWindow(
      createProgressSnapshot(cursorWordIndex, safeElapsedMs),
      settings,
      wordCount,
    );
  }

  let elapsedBeforeLineMs = 0;
  const totalDurationMs = wordCount * wordIntervalMs;
  const lineEntryBudgetMs = totalDurationMs * lineEntryTimeRatio;
  const lineEntryDelayMs = lineEntryBudgetMs / normalizedWordLines.length;
  const effectiveWordIntervalMs =
    (totalDurationMs - lineEntryBudgetMs) / wordCount;

  for (const [lineIndex, line] of normalizedWordLines.entries()) {
    const lineWordCount = line.lastWordIndex - line.firstWordIndex + 1;
    const windowCount = Math.ceil(lineWordCount / settings.focusWindowSize);
    const baseLineDurationMs = lineWordCount * effectiveWordIntervalMs;
    const baseWindowDurationMs = baseLineDurationMs / windowCount;
    const lineDurationMs = baseLineDurationMs + lineEntryDelayMs;
    const isLastLine = lineIndex === normalizedWordLines.length - 1;
    const isElapsedInsideLine =
      safeElapsedMs < elapsedBeforeLineMs + lineDurationMs;

    if (!isElapsedInsideLine && !isLastLine) {
      elapsedBeforeLineMs += lineDurationMs;
      continue;
    }

    const elapsedInsideLineMs = clamp(
      safeElapsedMs - elapsedBeforeLineMs,
      0,
      lineDurationMs,
    );

    let elapsedBeforeWindowMs = 0;
    let selectedWindowIndex = windowCount - 1;

    for (let windowIndex = 0; windowIndex < windowCount; windowIndex += 1) {
      const windowDurationMs =
        baseWindowDurationMs + (windowIndex === 0 ? lineEntryDelayMs : 0);
      const isLastWindow = windowIndex === windowCount - 1;
      const isElapsedInsideWindow =
        elapsedInsideLineMs < elapsedBeforeWindowMs + windowDurationMs;

      if (isElapsedInsideWindow || isLastWindow) {
        selectedWindowIndex = windowIndex;
        break;
      }

      elapsedBeforeWindowMs += windowDurationMs;
    }

    const firstVisibleWordIndex =
      line.firstWordIndex + selectedWindowIndex * settings.focusWindowSize;
    const lastVisibleWordIndex = Math.min(
      firstVisibleWordIndex + settings.focusWindowSize - 1,
      line.lastWordIndex,
    );

    return {
      activeWordIndex: lastVisibleWordIndex,
      firstVisibleWordIndex,
      lastVisibleWordIndex,
    };
  }

  const cursorWordIndex = calculateElapsedCursorWordIndex(
    safeElapsedMs,
    settings,
    wordCount,
  );

  return calculateFocusWindow(
    createProgressSnapshot(cursorWordIndex, safeElapsedMs),
    settings,
    wordCount,
  );
}
