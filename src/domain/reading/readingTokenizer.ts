import type { ReadingText, Token, WordSentence } from "./types";

const wordCharacterPattern = /[\p{L}\p{N}]/u;
const internalWordConnectorPattern = /[-\u2010\u2011]/u;

const isWordCharacter = (character: string) =>
  wordCharacterPattern.test(character);

const isInternalWordConnector = (character: string) =>
  internalWordConnectorPattern.test(character);

const createToken = (
  text: string,
  kind: Token["kind"],
  tokenIndex: number,
  wordIndex: number,
): Token => {
  if (kind === "word") {
    return {
      id: `token-${tokenIndex}`,
      text,
      kind,
      wordIndex,
    };
  }

  return {
    id: `token-${tokenIndex}`,
    text,
    kind,
  };
};

const hasSentenceBoundary = (text: string) => /[.!?]/u.test(text);

const createWordSentences = (tokens: Token[]): WordSentence[] => {
  const wordSentences: WordSentence[] = [];
  let firstWordIndex: number | null = null;
  let lastWordIndex: number | null = null;

  for (const token of tokens) {
    if (token.kind === "word") {
      const wordIndex = token.wordIndex ?? null;

      if (wordIndex === null) {
        continue;
      }

      firstWordIndex ??= wordIndex;
      lastWordIndex = wordIndex;
      continue;
    }

    if (
      firstWordIndex !== null &&
      lastWordIndex !== null &&
      hasSentenceBoundary(token.text)
    ) {
      wordSentences.push({ firstWordIndex, lastWordIndex });
      firstWordIndex = null;
      lastWordIndex = null;
    }
  }

  if (firstWordIndex !== null && lastWordIndex !== null) {
    wordSentences.push({ firstWordIndex, lastWordIndex });
  }

  return wordSentences;
};

export function tokenizeReadingText(rawText: string): ReadingText {
  const tokens: Token[] = [];
  let currentText = "";
  let currentKind: Token["kind"] | null = null;
  let wordCount = 0;

  const flushCurrentToken = () => {
    if (currentKind === null || currentText.length === 0) {
      return;
    }

    const token = createToken(
      currentText,
      currentKind,
      tokens.length,
      wordCount,
    );

    tokens.push(token);

    if (currentKind === "word") {
      wordCount += 1;
    }

    currentText = "";
    currentKind = null;
  };

  const characters = Array.from(rawText);

  for (const [characterIndex, character] of characters.entries()) {
    const previousCharacter = characters[characterIndex - 1];
    const nextCharacter = characters[characterIndex + 1];
    const isWordConnector =
      isInternalWordConnector(character) &&
      previousCharacter !== undefined &&
      nextCharacter !== undefined &&
      isWordCharacter(previousCharacter) &&
      isWordCharacter(nextCharacter);
    const characterKind: Token["kind"] =
      isWordCharacter(character) || isWordConnector
      ? "word"
      : "separator";

    if (currentKind !== characterKind) {
      flushCurrentToken();
      currentKind = characterKind;
    }

    currentText += character;
  }

  flushCurrentToken();

  return {
    rawText,
    tokens,
    wordSentences: createWordSentences(tokens),
    wordCount,
  };
}
