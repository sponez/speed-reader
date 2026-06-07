export type ReaderSettings = {
  wpm: number;
  focusWindowSize: number;
  blurIntensity: number;
  focusHighlightIntensity: number;
};

export type ReadingMode = "guidedWindow" | "flashChunks";

export type ReadingText = {
  rawText: string;
  tokens: Token[];
  wordCount: number;
};

export type Token = {
  id: string;
  text: string;
  kind: "word" | "separator";
  wordIndex?: number;
};

export type ReadingSession = {
  text: ReadingText;
  settings: ReaderSettings;
  startedAtMs: number;
  status: "running" | "finished";
};

export type ReadingProgress = {
  cursorWordIndex: number;
  activeWordIndex: number;
  elapsedMs: number;
  isFinished: boolean;
};

export type FocusWindow = {
  activeWordIndex: number;
  firstVisibleWordIndex: number;
  lastVisibleWordIndex: number;
};

export type WordLine = {
  firstWordIndex: number;
  lastWordIndex: number;
};

export type FlashChunksSettings = {
  wpm: number;
  chunkSize: number;
};

export type FlashChunk = {
  firstWordIndex: number;
  lastWordIndex: number;
  text: string;
  wordCount: number;
};

export type FlashChunksSession = {
  text: ReadingText;
  settings: FlashChunksSettings;
  chunks: FlashChunk[];
  startedAtMs: number;
  status: "running" | "finished";
};

export type FlashChunksProgress = {
  currentChunkIndex: number;
  elapsedMs: number;
  isFinished: boolean;
};
