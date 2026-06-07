import { useState, type CSSProperties } from "react";
import { preparationRanges } from "./preparationDefaults";
import type { PreparationDraft } from "./preparationTypes";
import "./PreparationScreen.css";

type PreparationScreenProps = {
  initialDraft: PreparationDraft;
  onStart: (draft: PreparationDraft) => void;
};

type NumericDraftKey = Exclude<keyof PreparationDraft, "text">;

const previewWords = [
  "Train",
  "your",
  "eyes",
  "to",
  "follow",
  "a",
  "steady",
  "reading",
  "focus",
  "without",
  "drifting",
  "back",
];
const previewWindowStartIndex = 5;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function PreparationScreen({ initialDraft, onStart }: PreparationScreenProps) {
  const [draft, setDraft] = useState<PreparationDraft>(initialDraft);
  const canStart = draft.text.trim().length > 0;
  const previewFirstVisibleWordIndex = previewWindowStartIndex;
  const previewLastVisibleWordIndex = clamp(
    previewFirstVisibleWordIndex + draft.focusWindowSize - 1,
    0,
    previewWords.length - 1,
  );
  const previewHighlightAlpha = (draft.focusHighlightIntensity / 100) * 0.72;

  const updateNumber = (key: NumericDraftKey, value: string) => {
    const range = preparationRanges[key];
    const parsedValue = Number.parseInt(value, 10);
    const nextValue = Number.isNaN(parsedValue)
      ? range.min
      : clamp(parsedValue, range.min, range.max);

    setDraft((currentDraft) => ({
      ...currentDraft,
      [key]: nextValue,
    }));
  };

  const updateText = (text: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      text,
    }));
  };

  const handleStart = () => {
    if (!canStart) {
      return;
    }

    onStart({
      ...draft,
    });
  };

  return (
    <main className="preparation-screen">
      <section className="preparation-header" aria-labelledby="screen-title">
        <p className="preparation-kicker">Reading setup</p>
        <h1 id="screen-title">Speed Reader</h1>
      </section>

      <form
        className="preparation-layout"
        onSubmit={(event) => {
          event.preventDefault();
          handleStart();
        }}
      >
        <section className="text-panel" aria-labelledby="text-panel-title">
          <div className="section-heading">
            <h2 id="text-panel-title">Text</h2>
            <span>{draft.text.trim().length} chars</span>
          </div>

          <label className="field-label" htmlFor="reading-text">
            Reading material
          </label>
          <textarea
            id="reading-text"
            className="reading-textarea"
            value={draft.text}
            onChange={(event) => updateText(event.currentTarget.value)}
            placeholder="Paste the text you want to read..."
            spellCheck={false}
          />
        </section>

        <aside className="settings-panel" aria-labelledby="settings-title">
          <div className="section-heading">
            <h2 id="settings-title">Settings</h2>
          </div>

          <div className="settings-grid">
            <label className="field-control" htmlFor="wpm">
              <span>Target speed</span>
              <span className="input-with-unit">
                <input
                  id="wpm"
                  type="number"
                  min={preparationRanges.wpm.min}
                  max={preparationRanges.wpm.max}
                  step={preparationRanges.wpm.step}
                  value={draft.wpm}
                  onChange={(event) => updateNumber("wpm", event.target.value)}
                />
                <small>WPM</small>
              </span>
            </label>

            <label className="field-control" htmlFor="focus-window-size">
              <span>Window size</span>
              <span className="input-with-unit">
                <input
                  id="focus-window-size"
                  type="number"
                  min={preparationRanges.focusWindowSize.min}
                  max={preparationRanges.focusWindowSize.max}
                  step={preparationRanges.focusWindowSize.step}
                  value={draft.focusWindowSize}
                  onChange={(event) =>
                    updateNumber("focusWindowSize", event.target.value)
                  }
                />
                <small>words</small>
              </span>
            </label>

            <label className="field-control range-control" htmlFor="blur">
              <span>Blur intensity</span>
              <span className="input-with-unit">
                <input
                  id="blur"
                  type="range"
                  min={preparationRanges.blurIntensity.min}
                  max={preparationRanges.blurIntensity.max}
                  step={preparationRanges.blurIntensity.step}
                  value={draft.blurIntensity}
                  onChange={(event) =>
                    updateNumber("blurIntensity", event.target.value)
                  }
                />
                <small>{draft.blurIntensity}px</small>
              </span>
            </label>

            <label
              className="field-control range-control"
              htmlFor="focus-highlight"
            >
              <span>Focus highlight</span>
              <span className="input-with-unit">
                <input
                  id="focus-highlight"
                  type="range"
                  min={preparationRanges.focusHighlightIntensity.min}
                  max={preparationRanges.focusHighlightIntensity.max}
                  step={preparationRanges.focusHighlightIntensity.step}
                  value={draft.focusHighlightIntensity}
                  onChange={(event) =>
                    updateNumber(
                      "focusHighlightIntensity",
                      event.target.value,
                    )
                  }
                />
                <small>{draft.focusHighlightIntensity}%</small>
              </span>
            </label>
          </div>

          <section className="settings-preview" aria-labelledby="preview-title">
            <div className="section-heading preview-heading">
              <h2 id="preview-title">Preview</h2>
            </div>

            <p
              className="preview-text"
              style={
                {
                  "--preview-blur": `${draft.blurIntensity}px`,
                  "--preview-highlight-alpha": previewHighlightAlpha,
                } as CSSProperties
              }
            >
              {previewWords.map((word, wordIndex) => {
                const isVisible =
                  wordIndex >= previewFirstVisibleWordIndex &&
                  wordIndex <= previewLastVisibleWordIndex;
                const className = [
                  "preview-word",
                  isVisible ? "preview-word-focus" : "",
                  !isVisible && draft.blurIntensity > 0
                    ? "preview-word-blurred"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <span className={className} key={`${word}-${wordIndex}`}>
                    {word}
                  </span>
                );
              })}
            </p>
          </section>

          <button className="start-button" type="submit" disabled={!canStart}>
            Start
          </button>
        </aside>
      </form>
    </main>
  );
}

export default PreparationScreen;
