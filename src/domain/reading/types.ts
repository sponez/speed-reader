export type ReaderSettings = {
  wpm: number;
  visibleWordsBefore: number;
  visibleWordsAfter: number;
  blurIntensity: number;
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
