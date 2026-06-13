import { describe, expect, it } from "vitest";

import {
  buildFlashChunks,
  calculateFlashChunkDurationMs,
  calculateFlashChunksProgress,
  createFlashChunksSession,
  validateFlashWindowSize,
} from "./flashChunks";
import { tokenizeReadingText } from "./readingTokenizer";
import type { FlashChunksSettings } from "./types";

const settings: FlashChunksSettings = {
  wpm: 300,
  focusWindowSize: 3,
};

describe("buildFlashChunks", () => {
  it("builds chunks by the requested chunk size", () => {
    const text = tokenizeReadingText("One two three four five six");

    expect(buildFlashChunks(text, settings)).toEqual([
      {
        firstWordIndex: 0,
        lastWordIndex: 2,
        text: "One two three",
        wordCount: 3,
        durationMs: 600,
      },
      {
        firstWordIndex: 3,
        lastWordIndex: 5,
        text: "four five six",
        wordCount: 3,
        durationMs: 600,
      },
    ]);
  });

  it("keeps chunks inside sentence boundaries", () => {
    const text = tokenizeReadingText("One two. Three four five six.");

    expect(buildFlashChunks(text, settings)).toEqual([
      {
        firstWordIndex: 0,
        lastWordIndex: 1,
        text: "One two.",
        wordCount: 2,
        durationMs: 400,
      },
      {
        firstWordIndex: 2,
        lastWordIndex: 4,
        text: "Three four five",
        wordCount: 3,
        durationMs: 400,
      },
      {
        firstWordIndex: 5,
        lastWordIndex: 5,
        text: "six.",
        wordCount: 1,
        durationMs: 400,
      },
    ]);
  });

  it("falls back to word-based chunks when sentence ranges are invalid", () => {
    const text = {
      ...tokenizeReadingText("One two. Three four five six."),
      wordSentences: [],
    };

    expect(buildFlashChunks(text, settings)).toEqual([
      {
        firstWordIndex: 0,
        lastWordIndex: 2,
        text: "One two. Three",
        wordCount: 3,
        durationMs: 600,
      },
      {
        firstWordIndex: 3,
        lastWordIndex: 5,
        text: "four five six.",
        wordCount: 3,
        durationMs: 600,
      },
    ]);
  });

  it("returns no chunks for empty text", () => {
    expect(buildFlashChunks(tokenizeReadingText(""), settings)).toEqual([]);
  });

  it("attaches adjacent punctuation to chunk text", () => {
    const text = tokenizeReadingText('"Hello, world!" Кто-то ответил.');

    expect(
      buildFlashChunks(text, { ...settings, focusWindowSize: 1 }),
    ).toEqual([
      {
        firstWordIndex: 0,
        lastWordIndex: 0,
        text: '"Hello,',
        wordCount: 1,
        durationMs: 200,
      },
      {
        firstWordIndex: 1,
        lastWordIndex: 1,
        text: 'world!"',
        wordCount: 1,
        durationMs: 200,
      },
      {
        firstWordIndex: 2,
        lastWordIndex: 2,
        text: "Кто-то",
        wordCount: 1,
        durationMs: 200,
      },
      {
        firstWordIndex: 3,
        lastWordIndex: 3,
        text: "ответил.",
        wordCount: 1,
        durationMs: 200,
      },
    ]);
  });

  it("rejects a non-positive window size", () => {
    expect(() => validateFlashWindowSize(0)).toThrow(
      "Flash window size must be greater than 0.",
    );
  });
});

describe("createFlashChunksSession", () => {
  it("creates a running session for non-empty text", () => {
    const text = tokenizeReadingText("One two three");
    const session = createFlashChunksSession(text, settings, 1_000);

    expect(session.status).toBe("running");
    expect(session.chunks).toHaveLength(1);
  });

  it("creates a finished session for empty text", () => {
    const session = createFlashChunksSession(
      tokenizeReadingText(""),
      settings,
      1_000,
    );

    expect(session.status).toBe("finished");
  });
});

describe("calculateFlashChunksProgress", () => {
  it("calculates equal frame duration from the virtual line budget", () => {
    const text = tokenizeReadingText("One two three four");
    const session = createFlashChunksSession(text, settings, 1_000);

    expect(calculateFlashChunkDurationMs(session.chunks[0], 300)).toBe(400);
    expect(calculateFlashChunkDurationMs(session.chunks[1], 300)).toBe(400);
  });

  it("keeps the sum of chunk durations equal to the WPM duration", () => {
    const text = tokenizeReadingText("One two three four five six");
    const session = createFlashChunksSession(text, settings, 1_000);
    const totalChunkDurationMs = session.chunks.reduce(
      (totalDurationMs, chunk) =>
        totalDurationMs + calculateFlashChunkDurationMs(chunk, settings.wpm),
      0,
    );

    expect(totalChunkDurationMs).toBe(1_200);
  });

  it("selects the current chunk by elapsed time", () => {
    const text = tokenizeReadingText("One two three four five six");
    const session = createFlashChunksSession(text, settings, 1_000);

    expect(calculateFlashChunksProgress(session, 1_000)).toEqual({
      currentChunkIndex: 0,
      elapsedMs: 0,
      isFinished: false,
    });
    expect(calculateFlashChunksProgress(session, 1_599)).toEqual({
      currentChunkIndex: 0,
      elapsedMs: 599,
      isFinished: false,
    });
    expect(calculateFlashChunksProgress(session, 1_600)).toEqual({
      currentChunkIndex: 1,
      elapsedMs: 600,
      isFinished: false,
    });
  });

  it("marks the session finished after the final chunk duration", () => {
    const text = tokenizeReadingText("One two three four");
    const session = createFlashChunksSession(text, settings, 1_000);

    expect(calculateFlashChunksProgress(session, 1_799)).toEqual({
      currentChunkIndex: 1,
      elapsedMs: 799,
      isFinished: false,
    });
    expect(calculateFlashChunksProgress(session, 1_800)).toEqual({
      currentChunkIndex: 1,
      elapsedMs: 800,
      isFinished: true,
    });
  });
});
