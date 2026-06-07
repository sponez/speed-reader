import { describe, expect, it } from "vitest";

import {
  buildFlashChunks,
  calculateFlashChunkDurationMs,
  calculateFlashChunksProgress,
  createFlashChunksSession,
  validateFlashChunkSize,
} from "./flashChunks";
import { tokenizeReadingText } from "./readingTokenizer";
import type { FlashChunksSettings } from "./types";

const settings: FlashChunksSettings = {
  wpm: 300,
  chunkSize: 3,
};

describe("buildFlashChunks", () => {
  it("builds chunks by the requested chunk size", () => {
    const text = tokenizeReadingText("One two three four five six seven");

    expect(buildFlashChunks(text, 3)).toEqual([
      {
        firstWordIndex: 0,
        lastWordIndex: 2,
        text: "One two three",
        wordCount: 3,
      },
      {
        firstWordIndex: 3,
        lastWordIndex: 5,
        text: "four five six",
        wordCount: 3,
      },
      {
        firstWordIndex: 6,
        lastWordIndex: 6,
        text: "seven",
        wordCount: 1,
      },
    ]);
  });

  it("returns no chunks for empty text", () => {
    expect(buildFlashChunks(tokenizeReadingText(""), 3)).toEqual([]);
  });

  it("attaches adjacent punctuation to chunk text", () => {
    const text = tokenizeReadingText('"Hello, world!" Кто-то ответил.');

    expect(buildFlashChunks(text, 1)).toEqual([
      {
        firstWordIndex: 0,
        lastWordIndex: 0,
        text: '"Hello,',
        wordCount: 1,
      },
      {
        firstWordIndex: 1,
        lastWordIndex: 1,
        text: 'world!"',
        wordCount: 1,
      },
      {
        firstWordIndex: 2,
        lastWordIndex: 2,
        text: "Кто-то",
        wordCount: 1,
      },
      {
        firstWordIndex: 3,
        lastWordIndex: 3,
        text: "ответил.",
        wordCount: 1,
      },
    ]);
  });

  it("rejects a non-positive chunk size", () => {
    expect(() => validateFlashChunkSize(0)).toThrow(
      "Flash chunk size must be greater than 0.",
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
  it("calculates frame duration from WPM and the actual chunk word count", () => {
    const text = tokenizeReadingText("One two three four");
    const session = createFlashChunksSession(text, settings, 1_000);

    expect(calculateFlashChunkDurationMs(session.chunks[0], 300)).toBe(600);
    expect(calculateFlashChunkDurationMs(session.chunks[1], 300)).toBe(200);
  });

  it("keeps the sum of chunk durations equal to the WPM duration", () => {
    const text = tokenizeReadingText("One two three four five six seven");
    const session = createFlashChunksSession(text, settings, 1_000);
    const totalChunkDurationMs = session.chunks.reduce(
      (totalDurationMs, chunk) =>
        totalDurationMs + calculateFlashChunkDurationMs(chunk, settings.wpm),
      0,
    );

    expect(totalChunkDurationMs).toBe(1_400);
  });

  it("selects the current chunk by elapsed time", () => {
    const text = tokenizeReadingText("One two three four five six seven");
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
