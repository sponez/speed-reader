import { describe, expect, it } from "vitest";

import { tokenizeReadingText } from "./readingTokenizer";

describe("tokenizeReadingText", () => {
  it("returns an empty reading text for an empty input", () => {
    expect(tokenizeReadingText("")).toEqual({
      rawText: "",
      tokens: [],
      wordSentences: [],
      wordCount: 0,
    });
  });

  it("keeps words and spaces in their original order", () => {
    const readingText = tokenizeReadingText("Hello world");

    expect(readingText.wordCount).toBe(2);
    expect(readingText.tokens).toEqual([
      { id: "token-0", text: "Hello", kind: "word", wordIndex: 0 },
      { id: "token-1", text: " ", kind: "separator" },
      { id: "token-2", text: "world", kind: "word", wordIndex: 1 },
    ]);
  });

  it("groups adjacent whitespace and preserves line breaks", () => {
    const readingText = tokenizeReadingText("First  \n\tSecond");

    expect(readingText.tokens).toEqual([
      { id: "token-0", text: "First", kind: "word", wordIndex: 0 },
      { id: "token-1", text: "  \n\t", kind: "separator" },
      { id: "token-2", text: "Second", kind: "word", wordIndex: 1 },
    ]);
  });

  it("keeps punctuation as separator tokens around words", () => {
    const readingText = tokenizeReadingText("Hello, world!");

    expect(readingText.wordCount).toBe(2);
    expect(readingText.tokens).toEqual([
      { id: "token-0", text: "Hello", kind: "word", wordIndex: 0 },
      { id: "token-1", text: ", ", kind: "separator" },
      { id: "token-2", text: "world", kind: "word", wordIndex: 1 },
      { id: "token-3", text: "!", kind: "separator" },
    ]);
  });

  it("treats Cyrillic, Latin letters, and digits as word characters", () => {
    const readingText = tokenizeReadingText("Привет reader 2026");

    expect(readingText.wordCount).toBe(3);
    expect(readingText.tokens).toEqual([
      { id: "token-0", text: "Привет", kind: "word", wordIndex: 0 },
      { id: "token-1", text: " ", kind: "separator" },
      { id: "token-2", text: "reader", kind: "word", wordIndex: 1 },
      { id: "token-3", text: " ", kind: "separator" },
      { id: "token-4", text: "2026", kind: "word", wordIndex: 2 },
    ]);
  });

  it("keeps hyphenated words as one word token", () => {
    const readingText = tokenizeReadingText("кто-то asked follow-up");

    expect(readingText.wordCount).toBe(3);
    expect(readingText.tokens).toEqual([
      { id: "token-0", text: "кто-то", kind: "word", wordIndex: 0 },
      { id: "token-1", text: " ", kind: "separator" },
      { id: "token-2", text: "asked", kind: "word", wordIndex: 1 },
      { id: "token-3", text: " ", kind: "separator" },
      { id: "token-4", text: "follow-up", kind: "word", wordIndex: 2 },
    ]);
  });

  it("assigns word indexes only to word tokens", () => {
    const readingText = tokenizeReadingText("One... two?");
    const wordIndexes = readingText.tokens.map((token) => token.wordIndex);

    expect(wordIndexes).toEqual([0, undefined, 1, undefined]);
  });

  it("preserves the original text without trimming or normalization", () => {
    const rawText = "  Hello\nworld  ";

    expect(tokenizeReadingText(rawText).rawText).toBe(rawText);
  });

  it("builds sentence word ranges from basic sentence punctuation", () => {
    expect(tokenizeReadingText("One two. Three four? Five!").wordSentences).toEqual([
      { firstWordIndex: 0, lastWordIndex: 1 },
      { firstWordIndex: 2, lastWordIndex: 3 },
      { firstWordIndex: 4, lastWordIndex: 4 },
    ]);
  });

  it("keeps repeated sentence punctuation inside one sentence boundary", () => {
    expect(tokenizeReadingText("One two?! Three... Four").wordSentences).toEqual([
      { firstWordIndex: 0, lastWordIndex: 1 },
      { firstWordIndex: 2, lastWordIndex: 2 },
      { firstWordIndex: 3, lastWordIndex: 3 },
    ]);
  });

  it("creates the final sentence without trailing punctuation", () => {
    expect(tokenizeReadingText("One two. Three four").wordSentences).toEqual([
      { firstWordIndex: 0, lastWordIndex: 1 },
      { firstWordIndex: 2, lastWordIndex: 3 },
    ]);
  });
});
