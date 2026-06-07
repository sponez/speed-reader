import { describe, expect, it } from "vitest";

import {
  calculateFocusWindow,
  calculateReadingProgress,
  calculateWordIntervalMs,
  createReadingSession,
} from "./readingProgress";
import type {
  ReaderSettings,
  ReadingProgress,
  ReadingSession,
  ReadingText,
} from "./types";

const settings: ReaderSettings = {
  wpm: 300,
  visibleWordsBefore: 2,
  visibleWordsAfter: 3,
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
  activeWordIndex,
  elapsedMs: 0,
  isFinished: false,
  ...overrides,
});

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
});

describe("calculateReadingProgress", () => {
  it("does not return a negative elapsed time", () => {
    expect(calculateReadingProgress(createSession(), 900)).toEqual({
      activeWordIndex: 0,
      elapsedMs: 0,
      isFinished: false,
    });
  });

  it("keeps the first word active at the session start", () => {
    expect(calculateReadingProgress(createSession(), 1_000)).toEqual({
      activeWordIndex: 0,
      elapsedMs: 0,
      isFinished: false,
    });
  });

  it("moves to the next word after one word interval", () => {
    expect(calculateReadingProgress(createSession(), 1_200)).toEqual({
      activeWordIndex: 1,
      elapsedMs: 200,
      isFinished: false,
    });
  });

  it("clamps the active word index to the last word", () => {
    expect(calculateReadingProgress(createSession(3), 2_000)).toEqual({
      activeWordIndex: 2,
      elapsedMs: 1_000,
      isFinished: true,
    });
  });

  it("marks progress finished when the session is already finished", () => {
    expect(
      calculateReadingProgress(createSession(3, { status: "finished" }), 1_000),
    ).toEqual({
      activeWordIndex: 0,
      elapsedMs: 0,
      isFinished: true,
    });
  });

  it("marks an empty text as finished", () => {
    expect(calculateReadingProgress(createSession(0), 1_500)).toEqual({
      activeWordIndex: 0,
      elapsedMs: 500,
      isFinished: true,
    });
  });
});

describe("calculateFocusWindow", () => {
  it("calculates visible word indexes around the active word", () => {
    expect(calculateFocusWindow(createProgress(5), settings, 10)).toEqual({
      activeWordIndex: 5,
      firstVisibleWordIndex: 3,
      lastVisibleWordIndex: 8,
    });
  });

  it("does not go below the first word", () => {
    expect(calculateFocusWindow(createProgress(1), settings, 10)).toEqual({
      activeWordIndex: 1,
      firstVisibleWordIndex: 0,
      lastVisibleWordIndex: 4,
    });
  });

  it("does not go beyond the last word", () => {
    expect(calculateFocusWindow(createProgress(8), settings, 10)).toEqual({
      activeWordIndex: 8,
      firstVisibleWordIndex: 6,
      lastVisibleWordIndex: 9,
    });
  });

  it("clamps an out-of-range active word index", () => {
    expect(calculateFocusWindow(createProgress(12), settings, 10)).toEqual({
      activeWordIndex: 9,
      firstVisibleWordIndex: 7,
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
});
