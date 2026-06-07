import { useCallback, useEffect, useState } from "react";
import { GuidedWindowTextRenderer } from "../../../adapters/rendering";
import type { ReadingSession, WordLine } from "../../../domain/reading";
import { useReadingRunner } from "./useReadingRunner";
import "./ReadingScreen.css";

type ReadingScreenProps = {
  onFinish: () => void;
  session: ReadingSession;
};

const areWordLinesEqual = (first: WordLine[], second: WordLine[]) => {
  if (first.length !== second.length) {
    return false;
  }

  return first.every(
    (line, index) =>
      line.firstWordIndex === second[index]?.firstWordIndex &&
      line.lastWordIndex === second[index]?.lastWordIndex,
  );
};

function ReadingScreen({ onFinish, session }: ReadingScreenProps) {
  const { settings, text } = session;
  const [wordLines, setWordLines] = useState<WordLine[]>([]);
  const { focusWindow, progress } = useReadingRunner(session, wordLines);

  const handleWordLinesChange = useCallback((nextWordLines: WordLine[]) => {
    setWordLines((currentWordLines) =>
      areWordLinesEqual(currentWordLines, nextWordLines)
        ? currentWordLines
        : nextWordLines,
    );
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onFinish();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onFinish]);

  useEffect(() => {
    if (progress.isFinished) {
      onFinish();
    }
  }, [onFinish, progress.isFinished]);

  const focusRange =
    focusWindow.lastVisibleWordIndex < focusWindow.firstVisibleWordIndex
      ? "None"
      : `${focusWindow.firstVisibleWordIndex} - ${focusWindow.lastVisibleWordIndex}`;
  const elapsedSeconds = (progress.elapsedMs / 1_000).toFixed(1);

  return (
    <main className="reading-screen">
      <section className="reading-status" aria-labelledby="reading-title">
        <p className="reading-kicker">Reading session</p>
        <h1 id="reading-title">Speed Reader</h1>

        <dl className="session-metrics" aria-label="Session metrics">
          <div>
            <dt>Status</dt>
            <dd>{progress.isFinished ? "finished" : "running"}</dd>
          </div>
          <div>
            <dt>Words</dt>
            <dd>{text.wordCount}</dd>
          </div>
          <div>
            <dt>Target speed</dt>
            <dd>{settings.wpm} WPM</dd>
          </div>
          <div>
            <dt>Window size</dt>
            <dd>{settings.focusWindowSize} words</dd>
          </div>
          <div>
            <dt>Blur</dt>
            <dd>{settings.blurIntensity}px</dd>
          </div>
          <div>
            <dt>Highlight</dt>
            <dd>{settings.focusHighlightIntensity}%</dd>
          </div>
          <div>
            <dt>Cursor index</dt>
            <dd>{progress.cursorWordIndex}</dd>
          </div>
          <div>
            <dt>Anchor index</dt>
            <dd>{focusWindow.activeWordIndex}</dd>
          </div>
          <div>
            <dt>Focus range</dt>
            <dd>{focusRange}</dd>
          </div>
          <div>
            <dt>Elapsed</dt>
            <dd>{elapsedSeconds}s</dd>
          </div>
        </dl>

        <section
          className="reading-surface"
          aria-label="Reading surface"
          data-reading-presentation="continuous"
        >
          <GuidedWindowTextRenderer
            text={text}
            focusWindow={focusWindow}
            blurIntensity={settings.blurIntensity}
            focusHighlightIntensity={settings.focusHighlightIntensity}
            onWordLinesChange={handleWordLinesChange}
          />
        </section>
      </section>
    </main>
  );
}

export default ReadingScreen;
