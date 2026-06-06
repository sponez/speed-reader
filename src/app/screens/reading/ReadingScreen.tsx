import type { ReadingSession } from "../../../domain/reading";
import { useReadingRunner } from "./useReadingRunner";
import "./ReadingScreen.css";

type ReadingScreenProps = {
  session: ReadingSession;
};

function ReadingScreen({ session }: ReadingScreenProps) {
  const { settings, text } = session;
  const { focusWindow, progress } = useReadingRunner(session);
  const visibleWordCount =
    settings.visibleWordsBefore + 1 + settings.visibleWordsAfter;
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
            <dt>Focus span</dt>
            <dd>{visibleWordCount} words</dd>
          </div>
          <div>
            <dt>Blur</dt>
            <dd>{settings.blurIntensity}px</dd>
          </div>
          <div>
            <dt>Active index</dt>
            <dd>{progress.activeWordIndex}</dd>
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
      </section>
    </main>
  );
}

export default ReadingScreen;
