import type { ReadingText, Token } from "./types";

const wordCharacterPattern = /[\p{L}\p{N}]/u;

const isWordCharacter = (character: string) =>
  wordCharacterPattern.test(character);

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

  for (const character of rawText) {
    const characterKind: Token["kind"] = isWordCharacter(character)
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
    wordCount,
  };
}
