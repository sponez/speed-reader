import type {
  FocusWindow,
  ReaderSettings,
  ReadingProgress,
  ReadingSession,
  ReadingText,
  ReadingWindow,
  WordLine,
  WordSentence,
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

const normalizeWordSentences = (
  wordSentences: WordSentence[],
  wordCount: number,
): WordSentence[] =>
  wordSentences
    .map((sentence) => {
      const firstWordIndex = clamp(sentence.firstWordIndex, 0, wordCount - 1);
      const lastWordIndex = clamp(
        sentence.lastWordIndex,
        firstWordIndex,
        wordCount - 1,
      );

      return { firstWordIndex, lastWordIndex };
    })
    .sort(
      (firstSentence, secondSentence) =>
        firstSentence.firstWordIndex - secondSentence.firstWordIndex,
    );

const doWordRangesCoverText = (
  wordRanges: Array<{ firstWordIndex: number; lastWordIndex: number }>,
  wordCount: number,
) => {
  if (wordRanges.length === 0) {
    return wordCount === 0;
  }

  let expectedFirstWordIndex = 0;

  for (const range of wordRanges) {
    if (range.firstWordIndex !== expectedFirstWordIndex) {
      return false;
    }

    expectedFirstWordIndex = range.lastWordIndex + 1;
  }

  return expectedFirstWordIndex === wordCount;
};

type FocusSegment = {
  firstWordIndex: number;
  lastWordIndex: number;
  lineIndex: number;
};

const createLineSegments = (wordLines: WordLine[]): FocusSegment[] =>
  wordLines.map((line, lineIndex) => ({
    firstWordIndex: line.firstWordIndex,
    lastWordIndex: line.lastWordIndex,
    lineIndex,
  }));

export function buildSentenceBoundedWindows(
  wordSentences: WordSentence[],
  focusWindowSize: number,
  firstRangeWordIndex: number,
  lastRangeWordIndex: number,
): ReadingWindow[] {
  validateFocusWindowSize(focusWindowSize);

  if (firstRangeWordIndex > lastRangeWordIndex) {
    return [];
  }

  const windows: ReadingWindow[] = [];

  for (const sentence of wordSentences) {
    const firstWindowWordIndex = Math.max(
      sentence.firstWordIndex,
      firstRangeWordIndex,
    );
    const lastWindowWordIndex = Math.min(
      sentence.lastWordIndex,
      lastRangeWordIndex,
    );

    if (firstWindowWordIndex > lastWindowWordIndex) {
      continue;
    }

    let firstWordIndex = firstWindowWordIndex;

    while (firstWordIndex <= lastWindowWordIndex) {
      const lastWordIndex = Math.min(
        firstWordIndex + focusWindowSize - 1,
        lastWindowWordIndex,
      );

      windows.push({
        firstWordIndex,
        lastWordIndex,
        wordCount: lastWordIndex - firstWordIndex + 1,
      });

      firstWordIndex = lastWordIndex + 1;
    }
  }

  return windows;
}

const createFallbackWindows = (
  focusWindowSize: number,
  firstRangeWordIndex: number,
  lastRangeWordIndex: number,
): ReadingWindow[] =>
  buildSentenceBoundedWindows(
    [
      {
        firstWordIndex: firstRangeWordIndex,
        lastWordIndex: lastRangeWordIndex,
      },
    ],
    focusWindowSize,
    firstRangeWordIndex,
    lastRangeWordIndex,
  );

const getSentenceBoundedWindowsForRange = (
  wordSentences: WordSentence[],
  focusWindowSize: number,
  firstRangeWordIndex: number,
  lastRangeWordIndex: number,
): ReadingWindow[] => {
  const windows = buildSentenceBoundedWindows(
    wordSentences,
    focusWindowSize,
    firstRangeWordIndex,
    lastRangeWordIndex,
  );

  return windows.length > 0
    ? windows
    : createFallbackWindows(
        focusWindowSize,
        firstRangeWordIndex,
        lastRangeWordIndex,
      );
};

const calculateSegmentTimedFocusWindow = (
  elapsedMs: number,
  settings: ReaderSettings,
  wordCount: number,
  segments: FocusSegment[],
  wordSentences: WordSentence[],
): FocusWindow => {
  const wordIntervalMs = calculateWordIntervalMs(settings.wpm);
  const totalDurationMs = wordCount * wordIntervalMs;
  const lineCount = new Set(
    segments.map((segment) => segment.lineIndex),
  ).size;
  const lineEntryBudgetMs =
    lineCount > 1 ? totalDurationMs * lineEntryTimeRatio : 0;
  const lineEntryDelayMs =
    lineCount > 1 ? lineEntryBudgetMs / (lineCount - 1) : 0;
  const lineReadingBudgetMs = totalDurationMs - lineEntryBudgetMs;
  const lineBudgetMs = lineReadingBudgetMs / lineCount;
  let elapsedBeforeSegmentMs = 0;

  for (const [segmentIndex, segment] of segments.entries()) {
    const windows = getSentenceBoundedWindowsForRange(
      wordSentences,
      settings.focusWindowSize,
      segment.firstWordIndex,
      segment.lastWordIndex,
    );
    const baseWindowDurationMs = lineBudgetMs / windows.length;
    const previousSegment = segments[segmentIndex - 1];
    const hasLineEntryDelay =
      previousSegment !== undefined &&
      previousSegment.lineIndex !== segment.lineIndex;
    const segmentDurationMs =
      lineBudgetMs + (hasLineEntryDelay ? lineEntryDelayMs : 0);
    const isLastSegment = segmentIndex === segments.length - 1;
    const isElapsedInsideSegment =
      elapsedMs < elapsedBeforeSegmentMs + segmentDurationMs;

    if (!isElapsedInsideSegment && !isLastSegment) {
      elapsedBeforeSegmentMs += segmentDurationMs;
      continue;
    }

    const elapsedInsideSegmentMs = clamp(
      elapsedMs -
        elapsedBeforeSegmentMs -
        (hasLineEntryDelay ? lineEntryDelayMs : 0),
      0,
      lineBudgetMs,
    );
    const selectedWindowIndex = clamp(
      Math.floor(elapsedInsideSegmentMs / baseWindowDurationMs),
      0,
      windows.length - 1,
    );
    const selectedWindow = windows[selectedWindowIndex];

    return {
      activeWordIndex: selectedWindow.lastWordIndex,
      firstVisibleWordIndex: selectedWindow.firstWordIndex,
      lastVisibleWordIndex: selectedWindow.lastWordIndex,
    };
  }

  const cursorWordIndex = calculateElapsedCursorWordIndex(
    elapsedMs,
    settings,
    wordCount,
  );

  return calculateFocusWindow(
    createProgressSnapshot(cursorWordIndex, elapsedMs),
    settings,
    wordCount,
  );
};

export function calculateLineTimedFocusWindow(
  elapsedMs: number,
  settings: ReaderSettings,
  wordCount: number,
  wordLines: WordLine[],
  wordSentences: WordSentence[] = [],
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
  const normalizedWordSentences = normalizeWordSentences(
    wordSentences,
    wordCount,
  );

  if (!doWordRangesCoverText(normalizedWordSentences, wordCount)) {
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

  const normalizedWordLines = normalizeWordLines(wordLines, wordCount);

  if (!doWordRangesCoverText(normalizedWordLines, wordCount)) {
    const sentenceSegments = createLineSegments([
      { firstWordIndex: 0, lastWordIndex: wordCount - 1 },
    ]);

    if (!doWordRangesCoverText(sentenceSegments, wordCount)) {
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

    return calculateSegmentTimedFocusWindow(
      safeElapsedMs,
      settings,
      wordCount,
      sentenceSegments,
      normalizedWordSentences,
    );
  }

  const lineSegments = createLineSegments(normalizedWordLines);

  if (!doWordRangesCoverText(lineSegments, wordCount)) {
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

  return calculateSegmentTimedFocusWindow(
    safeElapsedMs,
    settings,
    wordCount,
    lineSegments,
    normalizedWordSentences,
  );
}
