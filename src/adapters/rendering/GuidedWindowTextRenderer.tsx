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
import {
  defaultGuidedWindowPresentation,
  type GuidedWindowPresentation,
} from "./guidedWindowPresentation";
import "./GuidedWindowTextRenderer.css";

type GuidedWindowTextRendererProps = {
  text: ReadingText;
  focusWindow: FocusWindow;
  blurIntensity: number;
  focusHighlightIntensity: number;
  onWordLinesChange?: (wordLines: WordLine[]) => void;
  presentation?: GuidedWindowPresentation;
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

type GuidedPage = WordLine & {
  bottom: number;
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

const buildPages = (
  lineLayouts: MeasuredWordLine[],
  pageContentHeight: number,
): GuidedPage[] => {
  if (lineLayouts.length === 0 || pageContentHeight <= 0) {
    return [];
  }

  const pageHeight = Math.max(1, pageContentHeight);
  const pages: GuidedPage[] = [];
  let pageFirstLine = lineLayouts[0];
  let pageLastLine = lineLayouts[0];

  for (const line of lineLayouts) {
    if (
      line !== pageFirstLine &&
      line.bottom - pageFirstLine.top > pageHeight
    ) {
      pages.push({
        bottom: pageLastLine.bottom,
        firstWordIndex: pageFirstLine.firstWordIndex,
        lastWordIndex: pageLastLine.lastWordIndex,
        top: pageFirstLine.top,
      });
      pageFirstLine = line;
    }

    pageLastLine = line;
  }

  pages.push({
    bottom: pageLastLine.bottom,
    firstWordIndex: pageFirstLine.firstWordIndex,
    lastWordIndex: pageLastLine.lastWordIndex,
    top: pageFirstLine.top,
  });

  return pages;
};

const getTokenState = (
  token: Token,
  tokens: Token[],
  tokenIndex: number,
  focusWindow: FocusWindow,
  hasFocusWindow: boolean,
  shouldBlur: boolean,
  shouldHighlight: boolean,
) => {
  const tokenWordIndex = getTokenWordIndex(token, tokens, tokenIndex);
  const isInFocus =
    hasFocusWindow &&
    tokenWordIndex !== null &&
    tokenWordIndex >= focusWindow.firstVisibleWordIndex &&
    tokenWordIndex <= focusWindow.lastVisibleWordIndex;
  const isActive =
    token.kind === "word" && token.wordIndex === focusWindow.activeWordIndex;
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
    isInFocus && shouldHighlight ? "guided-window-token-highlighted" : "",
    isActive ? "guided-window-token-active-anchor" : "",
    isBlurred ? "guided-window-token-blurred" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    className,
    tokenState,
  };
};

function GuidedWindowTextRenderer({
  text,
  focusWindow,
  blurIntensity,
  focusHighlightIntensity,
  onWordLinesChange,
  presentation = defaultGuidedWindowPresentation,
}: GuidedWindowTextRendererProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pageContentRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLElement | null>(null);
  const [lineLayouts, setLineLayouts] = useState<MeasuredWordLine[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageContentHeight, setPageContentHeight] = useState(0);
  const [surfaceHeight, setSurfaceHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const measuredPageContentHeight =
    pageContentHeight > 0 ? pageContentHeight : viewportHeight;
  const pages = buildPages(lineLayouts, measuredPageContentHeight);
  const pageCount = Math.max(1, pages.length);
  const clampedPageIndex = clamp(pageIndex, 0, pageCount - 1);
  const spreadIndex = clampedPageIndex - (clampedPageIndex % 2);
  const fallbackPage: GuidedPage = {
    bottom: 0,
    firstWordIndex: 0,
    lastWordIndex: Math.max(0, text.wordCount - 1),
    top: 0,
  };
  const currentPage = pages[clampedPageIndex];
  const currentSpreadPages = [
    pages[spreadIndex],
    pages[spreadIndex + 1],
  ].filter((page): page is GuidedPage => page !== undefined);
  const displayedPages: Array<GuidedPage | null> =
    presentation === "bookSpread"
      ? currentSpreadPages.length > 0
        ? [currentSpreadPages[0], currentSpreadPages[1] ?? null]
        : [fallbackPage, null]
      : [currentPage ?? fallbackPage];
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
  const isPagePresentation =
    presentation === "bookSpread" || presentation === "singlePage";
  const currentPageLabel =
    presentation === "bookSpread"
      ? `${Math.floor(spreadIndex / 2) + 1} / ${Math.max(
          1,
          Math.ceil(pageCount / 2),
        )}`
      : `${clampedPageIndex + 1} / ${pageCount}`;
  const measureWordLines = useCallback(() => {
    const viewport = viewportRef.current;
    const pageContent = pageContentRef.current;
    const surface = surfaceRef.current;

    if (viewport === null || surface === null) {
      return;
    }

    const surfaceRect = surface.getBoundingClientRect();

    setViewportHeight(viewport.clientHeight);
    setPageContentHeight(pageContent?.clientHeight ?? 0);
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
    const pageContent = pageContentRef.current;
    const surface = surfaceRef.current;

    if (viewport === null || surface === null) {
      return;
    }

    const observer = new ResizeObserver(measureWordLines);
    observer.observe(viewport);
    observer.observe(surface);

    if (pageContent !== null) {
      observer.observe(pageContent);
    }

    return () => observer.disconnect();
  }, [measureWordLines, text.tokens]);

  useLayoutEffect(() => {
    setPageIndex((currentPageIndex) => clamp(currentPageIndex, 0, pageCount - 1));
  }, [pageCount]);

  const renderTokens = () =>
    text.tokens.map((token, tokenIndex) => {
      const { className, tokenState } = getTokenState(
        token,
        text.tokens,
        tokenIndex,
        focusWindow,
        hasFocusWindow,
        shouldBlur,
        shouldHighlight,
      );

      return (
        <span
          className={className}
          data-token-kind={token.kind}
          data-token-state={tokenState}
          data-word-index={token.kind === "word" ? token.wordIndex : undefined}
          key={token.id}
        >
          {token.text}
        </span>
      );
    });

  const surfaceStyle = (offsetY: number, edgeSpace = 0) =>
    ({
      "--guided-window-blur": `${blurIntensity}px`,
      "--guided-window-edge-space": `${edgeSpace}px`,
      "--guided-window-highlight-alpha": focusHighlightAlpha,
      transform: `translateY(${offsetY}px)`,
    }) as CSSProperties;

  if (presentation === "feed") {
    return (
      <div
        ref={viewportRef}
        className="guided-window-feed-viewport"
        data-guided-presentation="feed"
      >
        <article
          ref={surfaceRef}
          className="guided-window-text"
          style={surfaceStyle(0)}
          aria-label="Reading text"
        >
          {renderTokens()}
        </article>
      </div>
    );
  }

  if (isPagePresentation) {
    return (
      <div
        ref={viewportRef}
        className={[
          "guided-window-page-viewport",
          presentation === "bookSpread"
            ? "guided-window-book-spread-viewport"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        data-guided-presentation={presentation}
      >
        <div
          className="guided-window-page-stage"
          data-page-count={pageCount}
          data-page-index={clampedPageIndex}
        >
          {displayedPages.map((page, index) => (
            <div
              className={[
                "guided-window-page",
                page === null ? "guided-window-page-empty" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-page-first-word-index={page?.firstWordIndex}
              data-page-last-word-index={page?.lastWordIndex}
              data-page-side={index === 0 ? "left" : "right"}
              key={`${page?.firstWordIndex ?? "empty"}-${index}`}
            >
              <div
                ref={index === 0 ? pageContentRef : undefined}
                className="guided-window-page-content"
              >
                {page === null ? null : (
                  <article
                    ref={index === 0 ? surfaceRef : undefined}
                    className="guided-window-text guided-window-page-text"
                    style={surfaceStyle(-page.top)}
                    aria-label={index === 0 ? "Reading text" : undefined}
                    aria-hidden={index === 0 ? undefined : true}
                  >
                    {renderTokens()}
                  </article>
                )}
              </div>
            </div>
          ))}
        </div>

        <nav className="guided-window-page-controls" aria-label="Pages">
          <button
            type="button"
            disabled={clampedPageIndex <= 0}
            onClick={() =>
              setPageIndex((currentPageIndex) =>
                presentation === "bookSpread"
                  ? clamp(currentPageIndex - 2, 0, pageCount - 1)
                  : clamp(currentPageIndex - 1, 0, pageCount - 1),
              )
            }
          >
            Previous
          </button>
          <span>
            {presentation === "bookSpread" ? "Spread" : "Page"}{" "}
            {currentPageLabel}
          </span>
          <button
            type="button"
            disabled={
              presentation === "bookSpread"
                ? spreadIndex + 2 >= pageCount
                : clampedPageIndex >= pageCount - 1
            }
            onClick={() =>
              setPageIndex((currentPageIndex) =>
                presentation === "bookSpread"
                  ? clamp(currentPageIndex + 2, 0, pageCount - 1)
                  : clamp(currentPageIndex + 1, 0, pageCount - 1),
              )
            }
          >
            Next
          </button>
        </nav>
      </div>
    );
  }

  return (
    <div
      ref={viewportRef}
      className="guided-window-continuous-viewport"
      data-guided-presentation={defaultGuidedWindowPresentation}
    >
      <article
        ref={surfaceRef}
        className="guided-window-text"
        style={surfaceStyle(surfaceOffsetY, viewportHeight / 2)}
        aria-label="Reading text"
      >
        {renderTokens()}
      </article>
    </div>
  );
}

export default GuidedWindowTextRenderer;
