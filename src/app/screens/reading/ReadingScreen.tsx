import type { ReadingSession } from "../../../domain/reading";
import "./ReadingScreen.css";

type ReadingScreenProps = {
  session: ReadingSession;
};

function ReadingScreen({ session }: ReadingScreenProps) {
  const { settings, text } = session;
  const visibleWordCount =
    settings.visibleWordsBefore + 1 + settings.visibleWordsAfter;

  return (
    <main className="reading-screen">
      <section className="reading-status" aria-labelledby="reading-title">
        <p className="reading-kicker">Reading session</p>
        <h1 id="reading-title">Speed Reader</h1>

        <dl className="session-metrics" aria-label="Session metrics">
          <div>
            <dt>Status</dt>
            <dd>{session.status}</dd>
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
        </dl>
      </section>
    </main>
  );
}

export default ReadingScreen;
