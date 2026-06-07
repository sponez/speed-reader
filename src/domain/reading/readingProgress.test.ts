import { describe, expect, it } from "vitest";

import {
  calculateFocusWindow,
  calculateLineTimedFocusWindow,
  calculateReadingProgress,
  calculateWordIntervalMs,
  createReadingSession,
  validateFocusWindowSize,
} from "./readingProgress";
import type {
  ReaderSettings,
  ReadingProgress,
  ReadingSession,
  ReadingText,
  WordLine,
} from "./types";

const settings: ReaderSettings = {
  wpm: 300,
  focusWindowSize: 5,
  blurIntensity: 4,
  focusHighlightIntensity: 65,
};

const createText = (wordCount: number): ReadingText => ({
  rawText: "",
  tokens: [],
  wordCount,
});

const createSession = (
  wordCount = 5,
  overrides: Partial<ReadingSession> = {},
): ReadingSession => ({
  text: createText(wordCount),
  settings,
  startedAtMs: 1_000,
  status: "running",
  ...overrides,
});

const createProgress = (
  activeWordIndex: number,
  overrides: Partial<ReadingProgress> = {},
): ReadingProgress => ({
  cursorWordIndex: activeWordIndex,
  activeWordIndex,
  elapsedMs: 0,
  isFinished: false,
  ...overrides,
});

const createEvenWordLines = (
  lineCount: number,
  wordsPerLine: number,
): WordLine[] =>
  Array.from({ length: lineCount }, (_, lineIndex) => ({
    firstWordIndex: lineIndex * wordsPerLine,
    lastWordIndex: lineIndex * wordsPerLine + wordsPerLine - 1,
  }));

describe("calculateWordIntervalMs", () => {
  it("converts WPM into milliseconds per word", () => {
    expect(calculateWordIntervalMs(300)).toBe(200);
    expect(calculateWordIntervalMs(240)).toBe(250);
  });

  it("rejects non-positive WPM values", () => {
    expect(() => calculateWordIntervalMs(0)).toThrow(
      "WPM must be greater than 0.",
    );
    expect(() => calculateWordIntervalMs(-10)).toThrow(
      "WPM must be greater than 0.",
    );
  });
});

describe("validateFocusWindowSize", () => {
  it("accepts a positive focus window size", () => {
    expect(() => validateFocusWindowSize(1)).not.toThrow();
  });

  it("rejects a non-positive focus window size", () => {
    expect(() => validateFocusWindowSize(0)).toThrow(
      "Focus window size must be greater than 0.",
    );
  });
});

describe("createReadingSession", () => {
  it("creates a running session for a non-empty text", () => {
    const text = createText(3);
    const session = createReadingSession(text, settings, 1_000);

    expect(session).toEqual({
      text,
      settings,
      startedAtMs: 1_000,
      status: "running",
    });
  });

  it("creates a finished session for an empty text", () => {
    const session = createReadingSession(createText(0), settings, 1_000);

    expect(session.status).toBe("finished");
  });

  it("rejects settings with invalid WPM", () => {
    expect(() =>
      createReadingSession(createText(3), { ...settings, wpm: 0 }, 1_000),
    ).toThrow("WPM must be greater than 0.");
  });

  it("rejects settings with invalid focus window size", () => {
    expect(() =>
      createReadingSession(
        createText(3),
        { ...settings, focusWindowSize: 0 },
        1_000,
      ),
    ).toThrow("Focus window size must be greater than 0.");
  });
});

describe("calculateReadingProgress", () => {
  it("does not return a negative elapsed time", () => {
    expect(calculateReadingProgress(createSession(), 900)).toEqual({
      cursorWordIndex: 0,
      activeWordIndex: 4,
      elapsedMs: 0,
      isFinished: false,
    });
  });

  it("uses the last word of the first focus window as active anchor", () => {
    expect(calculateReadingProgress(createSession(10), 1_000)).toEqual({
      cursorWordIndex: 0,
      activeWordIndex: 4,
      elapsedMs: 0,
      isFinished: false,
    });
  });

  it("keeps the same focus window during one block", () => {
    expect(calculateReadingProgress(createSession(10), 1_800)).toEqual({
      cursorWordIndex: 4,
      activeWordIndex: 4,
      elapsedMs: 800,
      isFinished: false,
    });
  });

  it("moves to the next block after one full focus window interval", () => {
    expect(calculateReadingProgress(createSession(10), 2_000)).toEqual({
      cursorWordIndex: 5,
      activeWordIndex: 9,
      elapsedMs: 1_000,
      isFinished: false,
    });
  });

  it("uses the last available word as active anchor for a partial final block", () => {
    expect(calculateReadingProgress(createSession(7), 2_000)).toEqual({
      cursorWordIndex: 5,
      activeWordIndex: 6,
      elapsedMs: 1_000,
      isFinished: false,
    });
  });

  it("keeps the active anchor inside a short first block", () => {
    expect(calculateReadingProgress(createSession(3), 1_000)).toEqual({
      cursorWordIndex: 0,
      activeWordIndex: 2,
      elapsedMs: 0,
      isFinished: false,
    });
  });

  it("clamps the active word index to the last word", () => {
    expect(calculateReadingProgress(createSession(3), 1_600)).toEqual({
      cursorWordIndex: 2,
      activeWordIndex: 2,
      elapsedMs: 600,
      isFinished: true,
    });
  });

  it("marks progress finished when the session is already finished", () => {
    expect(
      calculateReadingProgress(createSession(3, { status: "finished" }), 1_000),
    ).toEqual({
      cursorWordIndex: 0,
      activeWordIndex: 2,
      elapsedMs: 0,
      isFinished: true,
    });
  });

  it("marks an empty text as finished", () => {
    expect(calculateReadingProgress(createSession(0), 1_500)).toEqual({
      cursorWordIndex: 0,
      activeWordIndex: 0,
      elapsedMs: 500,
      isFinished: true,
    });
  });
});

describe("calculateFocusWindow", () => {
  it("calculates visible word indexes for the current block", () => {
    expect(calculateFocusWindow(createProgress(4), settings, 10)).toEqual({
      activeWordIndex: 4,
      firstVisibleWordIndex: 0,
      lastVisibleWordIndex: 4,
    });
  });

  it("normalizes the active word to the last word of its block", () => {
    expect(calculateFocusWindow(createProgress(1), settings, 10)).toEqual({
      activeWordIndex: 4,
      firstVisibleWordIndex: 0,
      lastVisibleWordIndex: 4,
    });
  });

  it("moves the window by a full block", () => {
    expect(calculateFocusWindow(createProgress(8), settings, 10)).toEqual({
      activeWordIndex: 9,
      firstVisibleWordIndex: 5,
      lastVisibleWordIndex: 9,
    });
  });

  it("handles a partial final block", () => {
    expect(calculateFocusWindow(createProgress(11), settings, 12)).toEqual({
      activeWordIndex: 11,
      firstVisibleWordIndex: 10,
      lastVisibleWordIndex: 11,
    });
  });

  it("clamps an out-of-range active word index to the final block", () => {
    expect(calculateFocusWindow(createProgress(12), settings, 10)).toEqual({
      activeWordIndex: 9,
      firstVisibleWordIndex: 5,
      lastVisibleWordIndex: 9,
    });
  });

  it("returns an empty focus range for an empty text", () => {
    expect(calculateFocusWindow(createProgress(0), settings, 0)).toEqual({
      activeWordIndex: 0,
      firstVisibleWordIndex: 0,
      lastVisibleWordIndex: -1,
    });
  });

  it("rejects an invalid focus window size", () => {
    expect(() =>
      calculateFocusWindow(
        createProgress(0),
        { ...settings, focusWindowSize: 0 },
        10,
      ),
    ).toThrow("Focus window size must be greater than 0.");
  });
});

describe("calculateLineTimedFocusWindow", () => {
  const wordLines = [
    { firstWordIndex: 0, lastWordIndex: 7 },
    { firstWordIndex: 8, lastWordIndex: 14 },
  ];

  it("keeps the window inside one visual line when the block fits", () => {
    expect(calculateLineTimedFocusWindow(700, settings, 15, wordLines)).toEqual({
      activeWordIndex: 4,
      firstVisibleWordIndex: 0,
      lastVisibleWordIndex: 4,
    });
  });

  it("trims the window at the end of the visual line", () => {
    expect(calculateLineTimedFocusWindow(900, settings, 15, wordLines)).toEqual({
      activeWordIndex: 7,
      firstVisibleWordIndex: 5,
      lastVisibleWordIndex: 7,
    });
  });

  it("starts the next window at the beginning of the next visual line", () => {
    expect(
      calculateLineTimedFocusWindow(1_600, settings, 15, wordLines),
    ).toEqual({
      activeWordIndex: 12,
      firstVisibleWordIndex: 8,
      lastVisibleWordIndex: 12,
    });
  });

  it("handles an incomplete final window on the last visual line", () => {
    expect(
      calculateLineTimedFocusWindow(2_800, settings, 15, wordLines),
    ).toEqual({
      activeWordIndex: 14,
      firstVisibleWordIndex: 13,
      lastVisibleWordIndex: 14,
    });
  });

  it("keeps the total duration based on WPM while adding line entry time", () => {
    const fastSettings = { ...settings, wpm: 500 };
    const evenWordLines = createEvenWordLines(50, 20);
    const totalDurationMs = 1_000 * calculateWordIntervalMs(fastSettings.wpm);

    expect(
      calculateLineTimedFocusWindow(689, fastSettings, 1_000, evenWordLines),
    ).toEqual({
      activeWordIndex: 4,
      firstVisibleWordIndex: 0,
      lastVisibleWordIndex: 4,
    });
    expect(totalDurationMs).toBe(120_000);
    expect(
      calculateLineTimedFocusWindow(690, fastSettings, 1_000, evenWordLines),
    ).toEqual({
      activeWordIndex: 9,
      firstVisibleWordIndex: 5,
      lastVisibleWordIndex: 9,
    });
  });

  it("keeps non-entry windows on a line at the compressed base duration", () => {
    const fastSettings = { ...settings, wpm: 500 };
    const evenWordLines = createEvenWordLines(50, 20);

    expect(
      calculateLineTimedFocusWindow(1_259, fastSettings, 1_000, evenWordLines),
    ).toEqual({
      activeWordIndex: 9,
      firstVisibleWordIndex: 5,
      lastVisibleWordIndex: 9,
    });
    expect(
      calculateLineTimedFocusWindow(1_260, fastSettings, 1_000, evenWordLines),
    ).toEqual({
      activeWordIndex: 14,
      firstVisibleWordIndex: 10,
      lastVisibleWordIndex: 14,
    });
  });

  it("keeps a single-word line visible through its entry time", () => {
    const linesWithSingleWordStart = [
      { firstWordIndex: 0, lastWordIndex: 0 },
      { firstWordIndex: 1, lastWordIndex: 5 },
    ];

    expect(
      calculateLineTimedFocusWindow(
        219,
        settings,
        6,
        linesWithSingleWordStart,
      ),
    ).toEqual({
      activeWordIndex: 0,
      firstVisibleWordIndex: 0,
      lastVisibleWordIndex: 0,
    });
    expect(
      calculateLineTimedFocusWindow(
        220,
        settings,
        6,
        linesWithSingleWordStart,
      ),
    ).toEqual({
      activeWordIndex: 5,
      firstVisibleWordIndex: 1,
      lastVisibleWordIndex: 5,
    });
  });

  it("uses the full WPM duration across all line windows", () => {
    const fastSettings = { ...settings, wpm: 500 };
    const evenWordLines = createEvenWordLines(50, 20);

    expect(
      calculateLineTimedFocusWindow(
        119_429,
        fastSettings,
        1_000,
        evenWordLines,
      ),
    ).toEqual({
      activeWordIndex: 994,
      firstVisibleWordIndex: 990,
      lastVisibleWordIndex: 994,
    });
    expect(
      calculateLineTimedFocusWindow(
        119_430,
        fastSettings,
        1_000,
        evenWordLines,
      ),
    ).toEqual({
      activeWordIndex: 999,
      firstVisibleWordIndex: 995,
      lastVisibleWordIndex: 999,
    });
    expect(
      calculateLineTimedFocusWindow(
        119_999,
        fastSettings,
        1_000,
        evenWordLines,
      ),
    ).toEqual({
      activeWordIndex: 999,
      firstVisibleWordIndex: 995,
      lastVisibleWordIndex: 999,
    });
  });

  it("falls back to block-based calculation when line data is empty", () => {
    expect(calculateLineTimedFocusWindow(1_200, settings, 15, [])).toEqual({
      activeWordIndex: 9,
      firstVisibleWordIndex: 5,
      lastVisibleWordIndex: 9,
    });
  });

  it("falls back to block-based calculation when measured lines do not cover the full text", () => {
    expect(
      calculateLineTimedFocusWindow(1_200, settings, 15, [
        { firstWordIndex: 0, lastWordIndex: 4 },
        { firstWordIndex: 8, lastWordIndex: 14 },
      ]),
    ).toEqual({
      activeWordIndex: 9,
      firstVisibleWordIndex: 5,
      lastVisibleWordIndex: 9,
    });
  });

  it("clamps elapsed time to the last measured line", () => {
    expect(
      calculateLineTimedFocusWindow(10_000, settings, 15, wordLines),
    ).toEqual({
      activeWordIndex: 14,
      firstVisibleWordIndex: 13,
      lastVisibleWordIndex: 14,
    });
  });

  it("rejects an invalid focus window size", () => {
    expect(() =>
      calculateLineTimedFocusWindow(
        0,
        { ...settings, focusWindowSize: 0 },
        10,
        wordLines,
      ),
    ).toThrow("Focus window size must be greater than 0.");
  });
});
