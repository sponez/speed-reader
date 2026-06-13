import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  FlashChunksRenderer,
  GuidedWindowTextRenderer,
  type GuidedWindowPresentation,
} from "../../../adapters/rendering";
import type {
  FlashChunksSession,
  ReadingSession,
  WordLine,
} from "../../../domain/reading";
import type { ThemeSettings } from "../../theme";
import { useFlashChunksRunner } from "./useFlashChunksRunner";
import { useReadingRunner } from "./useReadingRunner";
import "./ReadingScreen.css";

type ActiveReadingSession =
  | { mode: "guidedWindow"; session: ReadingSession }
  | { mode: "flashChunks"; session: FlashChunksSession };

type ReadingScreenProps = {
  activeSession: ActiveReadingSession;
  onFinish: () => void;
  presentation: GuidedWindowPresentation;
  themeSettings: ThemeSettings;
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

function GuidedReadingScreen({
  onFinish,
  presentation,
  session,
  themeSettings,
}: Omit<ReadingScreenProps, "activeSession"> & {
  session: Extract<ActiveReadingSession, { mode: "guidedWindow" }>["session"];
}) {
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
    <main
      className="reading-screen"
      data-app-theme={themeSettings.theme}
      style={
        {
          "--app-warmth-intensity": `${themeSettings.warmthIntensity}%`,
        } as CSSProperties
      }
    >
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
          data-reading-mode="guidedWindow"
          data-reading-presentation={presentation}
        >
          <GuidedWindowTextRenderer
            text={text}
            focusWindow={focusWindow}
            blurIntensity={settings.blurIntensity}
            focusHighlightIntensity={settings.focusHighlightIntensity}
            onWordLinesChange={handleWordLinesChange}
            presentation={presentation}
          />
        </section>
      </section>
    </main>
  );
}

function FlashChunksReadingScreen({
  onFinish,
  session,
  themeSettings,
}: {
  onFinish: () => void;
  session: Extract<ActiveReadingSession, { mode: "flashChunks" }>["session"];
  themeSettings: ThemeSettings;
}) {
  const { progress } = useFlashChunksRunner(session);
  const currentChunk = session.chunks[progress.currentChunkIndex];
  const elapsedSeconds = (progress.elapsedMs / 1_000).toFixed(1);

  useEffect(() => {
    if (progress.isFinished) {
      onFinish();
    }
  }, [onFinish, progress.isFinished]);

  return (
    <main
      className="reading-screen"
      data-app-theme={themeSettings.theme}
      style={
        {
          "--app-warmth-intensity": `${themeSettings.warmthIntensity}%`,
        } as CSSProperties
      }
    >
      <section className="reading-status" aria-labelledby="reading-title">
        <p className="reading-kicker">Reading session</p>
        <h1 id="reading-title">Speed Reader</h1>

        <dl className="session-metrics" aria-label="Session metrics">
          <div>
            <dt>Status</dt>
            <dd>{progress.isFinished ? "finished" : "running"}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>Flash chunks</dd>
          </div>
          <div>
            <dt>Words</dt>
            <dd>{session.text.wordCount}</dd>
          </div>
          <div>
            <dt>Target speed</dt>
            <dd>{session.settings.wpm} WPM</dd>
          </div>
          <div>
            <dt>Window size</dt>
            <dd>{session.settings.focusWindowSize} words</dd>
          </div>
          <div>
            <dt>Chunk</dt>
            <dd>
              {session.chunks.length === 0
                ? "0 / 0"
                : `${progress.currentChunkIndex + 1} / ${session.chunks.length}`}
            </dd>
          </div>
          <div>
            <dt>Elapsed</dt>
            <dd>{elapsedSeconds}s</dd>
          </div>
        </dl>

        <section
          className="reading-surface"
          aria-label="Reading surface"
          data-reading-mode="flashChunks"
          data-reading-presentation="flashChunks"
        >
          <FlashChunksRenderer chunk={currentChunk} />
        </section>
      </section>
    </main>
  );
}

function ReadingScreen({
  activeSession,
  onFinish,
  presentation,
  themeSettings,
}: ReadingScreenProps) {
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

  if (activeSession.mode === "flashChunks") {
    return (
      <FlashChunksReadingScreen
        session={activeSession.session}
        themeSettings={themeSettings}
        onFinish={onFinish}
      />
    );
  }

  return (
    <GuidedReadingScreen
      session={activeSession.session}
      presentation={presentation}
      themeSettings={themeSettings}
      onFinish={onFinish}
    />
  );
}

export default ReadingScreen;
