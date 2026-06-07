import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
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
  bottom: number;
  wordIndex: number;
  top: number;
};

type MeasuredWordLine = WordLine & {
  bottom: number;
  centerY: number;
  top: number;
};

const lineTopTolerancePx = 2;

const areMeasuredWordLinesEqual = (
  first: MeasuredWordLine[],
  second: MeasuredWordLine[],
) => {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((line, index) => {
    const secondLine = second[index];

    return (
      secondLine !== undefined &&
      line.firstWordIndex === secondLine.firstWordIndex &&
      line.lastWordIndex === secondLine.lastWordIndex &&
      Math.abs(line.top - secondLine.top) < 0.5 &&
      Math.abs(line.bottom - secondLine.bottom) < 0.5
    );
  });
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

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

const getActiveLine = (
  lineLayouts: MeasuredWordLine[],
  activeWordIndex: number,
) =>
  lineLayouts.find(
    (line) =>
      activeWordIndex >= line.firstWordIndex &&
      activeWordIndex <= line.lastWordIndex,
  );

const calculateSurfaceOffset = (
  lineLayouts: MeasuredWordLine[],
  activeWordIndex: number,
  viewportHeight: number,
  surfaceHeight: number,
) => {
  const activeLine = getActiveLine(lineLayouts, activeWordIndex);

  if (
    activeLine === undefined ||
    viewportHeight <= 0 ||
    surfaceHeight <= viewportHeight
  ) {
    return 0;
  }

  const targetCenterY = viewportHeight / 2;
  const desiredOffset = targetCenterY - activeLine.centerY;
  const minOffset = Math.min(0, viewportHeight - surfaceHeight);

  return clamp(desiredOffset, minOffset, 0);
};

function GuidedWindowTextRenderer({
  text,
  focusWindow,
  blurIntensity,
  focusHighlightIntensity,
  onWordLinesChange,
}: GuidedWindowTextRendererProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLElement | null>(null);
  const [lineLayouts, setLineLayouts] = useState<MeasuredWordLine[]>([]);
  const [surfaceHeight, setSurfaceHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const hasFocusWindow =
    text.wordCount > 0 &&
    focusWindow.lastVisibleWordIndex >= focusWindow.firstVisibleWordIndex;
  const shouldBlur = blurIntensity > 0;
  const shouldHighlight = focusHighlightIntensity > 0;
  const focusHighlightAlpha = (focusHighlightIntensity / 100) * 0.72;
  const surfaceOffsetY = calculateSurfaceOffset(
    lineLayouts,
    focusWindow.activeWordIndex,
    viewportHeight,
    surfaceHeight,
  );
  const measureWordLines = useCallback(() => {
    const viewport = viewportRef.current;
    const surface = surfaceRef.current;

    if (viewport === null || surface === null) {
      return;
    }

    const surfaceRect = surface.getBoundingClientRect();

    setViewportHeight(viewport.clientHeight);
    setSurfaceHeight(surface.scrollHeight);

    const measuredWords = Array.from(
      surface.querySelectorAll<HTMLElement>("[data-word-index]"),
    )
      .map<MeasuredWord | null>((element) => {
        const wordIndex = Number(element.dataset.wordIndex);
        const firstRect = element.getClientRects()[0];

        if (!Number.isInteger(wordIndex) || firstRect === undefined) {
          return null;
        }

        return {
          bottom: firstRect.bottom - surfaceRect.top,
          wordIndex,
          top: firstRect.top - surfaceRect.top,
        };
      })
      .filter((word): word is MeasuredWord => word !== null)
      .sort((firstWord, secondWord) =>
        firstWord.top === secondWord.top
          ? firstWord.wordIndex - secondWord.wordIndex
          : firstWord.top - secondWord.top,
      );

    const nextLineLayouts: MeasuredWordLine[] = [];
    const lineTops: number[] = [];

    for (const measuredWord of measuredWords) {
      const currentLine = nextLineLayouts[nextLineLayouts.length - 1];
      const currentLineTop = lineTops[lineTops.length - 1];

      if (
        currentLine === undefined ||
        currentLineTop === undefined ||
        Math.abs(measuredWord.top - currentLineTop) > lineTopTolerancePx
      ) {
        nextLineLayouts.push({
          bottom: measuredWord.bottom,
          centerY: (measuredWord.top + measuredWord.bottom) / 2,
          firstWordIndex: measuredWord.wordIndex,
          lastWordIndex: measuredWord.wordIndex,
          top: measuredWord.top,
        });
        lineTops.push(measuredWord.top);
        continue;
      }

      currentLine.bottom = Math.max(currentLine.bottom, measuredWord.bottom);
      currentLine.centerY = (currentLine.top + currentLine.bottom) / 2;
      currentLine.lastWordIndex = measuredWord.wordIndex;
    }

    setLineLayouts((currentLineLayouts) =>
      areMeasuredWordLinesEqual(currentLineLayouts, nextLineLayouts)
        ? currentLineLayouts
        : nextLineLayouts,
    );

    if (onWordLinesChange !== undefined) {
      onWordLinesChange(
        nextLineLayouts.map(({ firstWordIndex, lastWordIndex }) => ({
          firstWordIndex,
          lastWordIndex,
        })),
      );
    }
  }, [onWordLinesChange]);

  useLayoutEffect(() => {
    measureWordLines();

    const viewport = viewportRef.current;
    const surface = surfaceRef.current;

    if (viewport === null || surface === null) {
      return;
    }

    const observer = new ResizeObserver(measureWordLines);
    observer.observe(viewport);
    observer.observe(surface);

    return () => observer.disconnect();
  }, [measureWordLines, text.tokens]);

  return (
    <div
      ref={viewportRef}
      className="guided-window-continuous-viewport"
      data-guided-presentation="continuous"
    >
      <article
        ref={surfaceRef}
        className="guided-window-text"
        style={
          {
            "--guided-window-blur": `${blurIntensity}px`,
            "--guided-window-edge-space": `${viewportHeight / 2}px`,
            "--guided-window-highlight-alpha": focusHighlightAlpha,
            transform: `translateY(${surfaceOffsetY}px)`,
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
          const tokenState = [
            isInFocus ? "focus" : "",
            isInFocus && shouldHighlight ? "highlighted" : "",
            isActive ? "active-anchor" : "",
            isBlurred ? "blurred" : "",
          ]
            .filter(Boolean)
            .join(" ");
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
              data-token-kind={token.kind}
              data-token-state={tokenState}
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
    </div>
  );
}

export default GuidedWindowTextRenderer;
