import {
  buildSentenceBoundedWindows,
  calculateWordIntervalMs,
} from "./readingProgress";
import type {
  FlashChunk,
  FlashChunksProgress,
  FlashChunksSession,
  FlashChunksSettings,
  ReadingText,
  Token,
} from "./types";

export function validateFlashWindowSize(focusWindowSize: number): void {
  if (focusWindowSize <= 0) {
    throw new Error("Flash window size must be greater than 0.");
  }
}

export function buildFlashChunks(
  text: ReadingText,
  settings: FlashChunksSettings,
): FlashChunk[] {
  validateFlashWindowSize(settings.focusWindowSize);
  const wordIntervalMs = calculateWordIntervalMs(settings.wpm);

  if (text.wordCount === 0) {
    return [];
  }

  const totalDurationMs = text.wordCount * wordIntervalMs;
  if (!doWordSentencesCoverText(text.wordSentences, text.wordCount)) {
    const fallbackWindows = buildSentenceBoundedWindows(
      [
        {
          firstWordIndex: 0,
          lastWordIndex: text.wordCount - 1,
        },
      ],
      settings.focusWindowSize,
      0,
      text.wordCount - 1,
    );
    const fallbackChunks = buildWordRangeFlashChunks(
      text,
      settings,
      fallbackWindows,
    );

    return applyEqualChunkDuration(fallbackChunks, totalDurationMs);
  }

  const windows = buildSentenceBoundedWindows(
    text.wordSentences,
    settings.focusWindowSize,
    0,
    text.wordCount - 1,
  );
  const chunks = buildWordRangeFlashChunks(
    text,
    settings,
    windows.length > 0
      ? windows
      : [
          {
            firstWordIndex: 0,
            lastWordIndex: text.wordCount - 1,
            wordCount: text.wordCount,
          },
        ],
  );

  return applyEqualChunkDuration(chunks, totalDurationMs);
}

const doWordSentencesCoverText = (
  wordSentences: ReadingText["wordSentences"],
  wordCount: number,
) => {
  if (wordSentences.length === 0) {
    return wordCount === 0;
  }

  let expectedFirstWordIndex = 0;

  for (const sentence of wordSentences) {
    if (sentence.firstWordIndex !== expectedFirstWordIndex) {
      return false;
    }

    expectedFirstWordIndex = sentence.lastWordIndex + 1;
  }

  return expectedFirstWordIndex === wordCount;
};

const buildWordRangeFlashChunks = (
  text: ReadingText,
  settings: FlashChunksSettings,
  windows: Array<{
    firstWordIndex: number;
    lastWordIndex: number;
    wordCount: number;
  }>,
): FlashChunk[] => {
  validateFlashWindowSize(settings.focusWindowSize);

  return windows.map(({ firstWordIndex, lastWordIndex, wordCount }) => ({
    firstWordIndex,
    lastWordIndex,
    text: buildFlashChunkText(text.tokens, firstWordIndex, lastWordIndex),
    wordCount,
    durationMs: 0,
    }));
};

const applyEqualChunkDuration = (
  chunks: FlashChunk[],
  totalDurationMs: number,
): FlashChunk[] => {
  if (chunks.length === 0) {
    return chunks;
  }

  const durationMs = totalDurationMs / chunks.length;

  return chunks.map((chunk) => ({ ...chunk, durationMs }));
};

const containsWhitespace = (text: string) => /\s/u.test(text);

const takeBeforeFirstWhitespace = (text: string) => {
  const whitespaceIndex = text.search(/\s/u);

  return whitespaceIndex === -1 ? text : text.slice(0, whitespaceIndex);
};

function buildFlashChunkText(
  tokens: Token[],
  firstWordIndex: number,
  lastWordIndex: number,
) {
  const firstTokenIndex = tokens.findIndex(
    (token) => token.kind === "word" && token.wordIndex === firstWordIndex,
  );
  const lastTokenIndex = tokens.findIndex(
    (token) => token.kind === "word" && token.wordIndex === lastWordIndex,
  );

  if (firstTokenIndex === -1 || lastTokenIndex === -1) {
    return "";
  }

  const leadingToken = tokens[firstTokenIndex - 1];
  const leadingText =
    leadingToken?.kind === "separator" && !containsWhitespace(leadingToken.text)
      ? leadingToken.text
      : "";
  const chunkText = tokens
    .slice(firstTokenIndex, lastTokenIndex + 1)
    .map((token) => token.text)
    .join("");
  const trailingToken = tokens[lastTokenIndex + 1];
  const trailingText =
    trailingToken?.kind === "separator"
      ? takeBeforeFirstWhitespace(trailingToken.text)
      : "";

  return `${leadingText}${chunkText}${trailingText}`;
}

export function calculateFlashChunkDurationMs(
  chunk: FlashChunk,
  _wpm?: number,
): number {
  return chunk.durationMs;
}

export function createFlashChunksSession(
  text: ReadingText,
  settings: FlashChunksSettings,
  startedAtMs: number,
): FlashChunksSession {
  calculateWordIntervalMs(settings.wpm);
  validateFlashWindowSize(settings.focusWindowSize);

  const chunks = buildFlashChunks(text, settings);

  return {
    text,
    settings,
    chunks,
    startedAtMs,
    status: text.wordCount === 0 ? "finished" : "running",
  };
}

export function calculateFlashChunksProgress(
  session: FlashChunksSession,
  nowMs: number,
): FlashChunksProgress {
  const elapsedMs = Math.max(0, nowMs - session.startedAtMs);

  if (session.status === "finished" || session.chunks.length === 0) {
    return {
      currentChunkIndex: 0,
      elapsedMs,
      isFinished: true,
    };
  }

  let elapsedBeforeChunkMs = 0;

  for (const [chunkIndex, chunk] of session.chunks.entries()) {
    const chunkDurationMs = calculateFlashChunkDurationMs(chunk);
    const isInsideChunk = elapsedMs < elapsedBeforeChunkMs + chunkDurationMs;

    if (isInsideChunk) {
      return {
        currentChunkIndex: chunkIndex,
        elapsedMs,
        isFinished: false,
      };
    }

    elapsedBeforeChunkMs += chunkDurationMs;
  }

  return {
    currentChunkIndex: session.chunks.length - 1,
    elapsedMs,
    isFinished: true,
  };
}
