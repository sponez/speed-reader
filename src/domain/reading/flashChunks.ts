import { calculateWordIntervalMs } from "./readingProgress";
import type {
  FlashChunk,
  FlashChunksProgress,
  FlashChunksSession,
  FlashChunksSettings,
  ReadingText,
  Token,
} from "./types";

export function validateFlashChunkSize(chunkSize: number): void {
  if (chunkSize <= 0) {
    throw new Error("Flash chunk size must be greater than 0.");
  }
}

export function buildFlashChunks(
  text: ReadingText,
  chunkSize: number,
): FlashChunk[] {
  validateFlashChunkSize(chunkSize);

  const words = text.tokens.filter((token) => token.kind === "word");
  const chunks: FlashChunk[] = [];

  for (let firstWordIndex = 0; firstWordIndex < words.length; ) {
    const chunkWords = words.slice(firstWordIndex, firstWordIndex + chunkSize);
    const lastWordIndex = firstWordIndex + chunkWords.length - 1;

    chunks.push({
      firstWordIndex,
      lastWordIndex,
      text: buildFlashChunkText(text.tokens, firstWordIndex, lastWordIndex),
      wordCount: chunkWords.length,
    });

    firstWordIndex = lastWordIndex + 1;
  }

  return chunks;
}

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
  wpm: number,
): number {
  return chunk.wordCount * calculateWordIntervalMs(wpm);
}

export function createFlashChunksSession(
  text: ReadingText,
  settings: FlashChunksSettings,
  startedAtMs: number,
): FlashChunksSession {
  calculateWordIntervalMs(settings.wpm);
  validateFlashChunkSize(settings.chunkSize);

  const chunks = buildFlashChunks(text, settings.chunkSize);

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
    const chunkDurationMs = calculateFlashChunkDurationMs(
      chunk,
      session.settings.wpm,
    );
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
