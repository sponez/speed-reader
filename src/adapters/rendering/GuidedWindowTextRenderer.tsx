import {
  useCallback,
  useLayoutEffect,
  useRef,
  type CSSProperties,
} from "react";
import type {
  FocusWindow,
  ReadingText,
  Token,
  WordLine,
} from "../../domain/reading";
import "./GuidedWindowTextRenderer.css";

type GuidedWindowTextRendererProps = {
  text: ReadingText;
  focusWindow: FocusWindow;
  blurIntensity: number;
  focusHighlightIntensity: number;
  onWordLinesChange?: (wordLines: WordLine[]) => void;
};

type MeasuredWord = {
  wordIndex: number;
  top: number;
};

const lineTopTolerancePx = 2;

const getTokenWordIndex = (
  token: Token,
  tokens: Token[],
  tokenIndex: number,
): number | null => {
  if (token.kind === "word") {
    return token.wordIndex ?? null;
  }

  const previousToken = tokens[tokenIndex - 1];

  if (previousToken?.kind === "word") {
    return previousToken.wordIndex ?? null;
  }

  const nextToken = tokens[tokenIndex + 1];

  if (nextToken?.kind === "word") {
    return nextToken.wordIndex ?? null;
  }

  return null;
};

function GuidedWindowTextRenderer({
  text,
  focusWindow,
  blurIntensity,
  focusHighlightIntensity,
  onWordLinesChange,
}: GuidedWindowTextRendererProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const hasFocusWindow =
    text.wordCount > 0 &&
    focusWindow.lastVisibleWordIndex >= focusWindow.firstVisibleWordIndex;
  const shouldBlur = blurIntensity > 0;
  const shouldHighlight = focusHighlightIntensity > 0;
  const focusHighlightAlpha = (focusHighlightIntensity / 100) * 0.72;
  const measureWordLines = useCallback(() => {
    const root = rootRef.current;

    if (root === null || onWordLinesChange === undefined) {
      return;
    }

    const measuredWords = Array.from(
      root.querySelectorAll<HTMLElement>("[data-word-index]"),
    )
      .map<MeasuredWord | null>((element) => {
        const wordIndex = Number(element.dataset.wordIndex);
        const firstRect = element.getClientRects()[0];

        if (!Number.isInteger(wordIndex) || firstRect === undefined) {
          return null;
        }

        return {
          wordIndex,
          top: firstRect.top,
        };
      })
      .filter((word): word is MeasuredWord => word !== null)
      .sort((firstWord, secondWord) =>
        firstWord.top === secondWord.top
          ? firstWord.wordIndex - secondWord.wordIndex
          : firstWord.top - secondWord.top,
      );

    const wordLines: WordLine[] = [];
    const lineTops: number[] = [];

    for (const measuredWord of measuredWords) {
      const currentLine = wordLines[wordLines.length - 1];
      const currentLineTop = lineTops[lineTops.length - 1];

      if (
        currentLine === undefined ||
        currentLineTop === undefined ||
        Math.abs(measuredWord.top - currentLineTop) > lineTopTolerancePx
      ) {
        wordLines.push({
          firstWordIndex: measuredWord.wordIndex,
          lastWordIndex: measuredWord.wordIndex,
        });
        lineTops.push(measuredWord.top);
        continue;
      }

      currentLine.lastWordIndex = measuredWord.wordIndex;
    }

    onWordLinesChange(wordLines);
  }, [onWordLinesChange]);

  useLayoutEffect(() => {
    if (onWordLinesChange === undefined) {
      return;
    }

    measureWordLines();

    const root = rootRef.current;

    if (root === null) {
      return;
    }

    const observer = new ResizeObserver(measureWordLines);
    observer.observe(root);

    return () => observer.disconnect();
  }, [measureWordLines, onWordLinesChange, text.tokens]);

  return (
    <article
      ref={rootRef}
      className="guided-window-text"
      style={
        {
          "--guided-window-blur": `${blurIntensity}px`,
          "--guided-window-highlight-alpha": focusHighlightAlpha,
        } as CSSProperties
      }
      aria-label="Reading text"
    >
      {text.tokens.map((token, tokenIndex) => {
        const tokenWordIndex = getTokenWordIndex(
          token,
          text.tokens,
          tokenIndex,
        );
        const isInFocus =
          hasFocusWindow &&
          tokenWordIndex !== null &&
          tokenWordIndex >= focusWindow.firstVisibleWordIndex &&
          tokenWordIndex <= focusWindow.lastVisibleWordIndex;
        const isActive =
          token.kind === "word" &&
          token.wordIndex === focusWindow.activeWordIndex;
        const isBlurred = shouldBlur && hasFocusWindow && !isInFocus;
        const className = [
          "guided-window-token",
          token.kind === "separator"
            ? "guided-window-token-separator"
            : "guided-window-token-word",
          isInFocus ? "guided-window-token-focus" : "",
          isInFocus && shouldHighlight
            ? "guided-window-token-highlighted"
            : "",
          isActive ? "guided-window-token-active-anchor" : "",
          isBlurred ? "guided-window-token-blurred" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <span
            className={className}
            data-word-index={
              token.kind === "word" ? token.wordIndex : undefined
            }
            key={token.id}
          >
            {token.text}
          </span>
        );
      })}
    </article>
  );
}

export default GuidedWindowTextRenderer;
