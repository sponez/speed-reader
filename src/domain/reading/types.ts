export type ReaderSettings = {
  wpm: number;
  focusWindowSize: number;
  blurIntensity: number;
  focusHighlightIntensity: number;
};

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
