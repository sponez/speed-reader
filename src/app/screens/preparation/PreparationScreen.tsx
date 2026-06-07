import { useState, type CSSProperties } from "react";
import { guidedWindowPresentationOptions } from "../../../adapters/rendering";
import type { ReadingMode } from "../../../domain/reading";
import { themeRanges, type AppTheme } from "../../theme";
import { preparationRanges } from "./preparationDefaults";
import type { PreparationDraft } from "./preparationTypes";
import "./PreparationScreen.css";

type PreparationScreenProps = {
  initialDraft: PreparationDraft;
  onStart: (draft: PreparationDraft) => void;
};

type NumericDraftKey = Exclude<
  keyof PreparationDraft,
  "guidedWindowPresentation" | "readingMode" | "text" | "theme" | "wpm"
>;

const previewWords = [
  "Train",
  "your",
  "eyes",
  "to",
  "notice",
  "whole",
  "phrases",
  "while",
  "the",
  "guided",
  "window",
  "moves",
  "across",
  "a",
  "longer",
  "preview",
  "line",
  "with",
  "enough",
  "words",
  "to",
  "show",
  "the",
  "largest",
  "focus",
  "span",
  "without",
  "cutting",
  "the",
  "visible",
  "phrase",
  "short",
];
const previewWindowStartIndex = 6;
const readingModeOptions: ReadonlyArray<{
  label: string;
  value: ReadingMode;
}> = [
  { label: "Guided window", value: "guidedWindow" },
  { label: "Flash chunks", value: "flashChunks" },
];
const themeOptions: ReadonlyArray<{
  label: string;
  value: AppTheme;
}> = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const parseValidWpm = (value: string) => {
  if (value.trim().length === 0) {
    return null;
  }

  const parsedValue = Number(value);
  const { min, max } = preparationRanges.wpm;

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < min ||
    parsedValue > max
  ) {
    return null;
  }

  return parsedValue;
};

function PreparationScreen({ initialDraft, onStart }: PreparationScreenProps) {
  const [draft, setDraft] = useState<PreparationDraft>(initialDraft);
  const [wpmInput, setWpmInput] = useState(() => String(initialDraft.wpm));
  const validWpm = parseValidWpm(wpmInput);
  const isWpmInvalid = wpmInput.trim().length > 0 && validWpm === null;
  const canStart = draft.text.trim().length > 0 && validWpm !== null;
  const previewFirstVisibleWordIndex = previewWindowStartIndex;
  const previewLastVisibleWordIndex = clamp(
    previewFirstVisibleWordIndex + draft.focusWindowSize - 1,
    0,
    previewWords.length - 1,
  );
  const previewHighlightAlpha = (draft.focusHighlightIntensity / 100) * 0.72;
  const isGuidedMode = draft.readingMode === "guidedWindow";
  const flashPreviewWords = previewWords.slice(0, draft.flashChunkSize);

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

  const updatePresentation = (
    guidedWindowPresentation: PreparationDraft["guidedWindowPresentation"],
  ) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      guidedWindowPresentation,
    }));
  };

  const updateReadingMode = (readingMode: ReadingMode) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      readingMode,
    }));
  };

  const updateTheme = (theme: AppTheme) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      theme,
    }));
  };

  const handleStart = () => {
    if (!canStart || validWpm === null) {
      return;
    }

    onStart({
      ...draft,
      wpm: validWpm,
    });
  };

  return (
    <main
      className="preparation-screen"
      data-app-theme={draft.theme}
      style={
        {
          "--app-warmth-intensity": `${draft.warmthIntensity}%`,
        } as CSSProperties
      }
    >
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
            <fieldset className="segmented-control">
              <legend>Reading mode</legend>
              <div className="segmented-options">
                {readingModeOptions.map((option) => (
                  <label
                    className="segmented-option"
                    data-selected={
                      draft.readingMode === option.value ? "true" : "false"
                    }
                    key={option.value}
                  >
                    <input
                      type="radio"
                      name="reading-mode"
                      value={option.value}
                      checked={draft.readingMode === option.value}
                      onChange={() => updateReadingMode(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="field-control" htmlFor="wpm">
              <span>Target speed</span>
              <span className="input-with-unit">
                <input
                  id="wpm"
                  type="number"
                  min={preparationRanges.wpm.min}
                  max={preparationRanges.wpm.max}
                  step={preparationRanges.wpm.step}
                  value={wpmInput}
                  aria-describedby="wpm-hint"
                  aria-invalid={isWpmInvalid}
                  onChange={(event) => setWpmInput(event.target.value)}
                />
                <small>WPM</small>
              </span>
              <small className="field-hint" id="wpm-hint">
                Use 100-5000 WPM
              </small>
            </label>

            <fieldset className="segmented-control">
              <legend>Theme</legend>
              <div className="segmented-options">
                {themeOptions.map((option) => (
                  <label
                    className="segmented-option"
                    data-selected={draft.theme === option.value ? "true" : "false"}
                    key={option.value}
                  >
                    <input
                      type="radio"
                      name="app-theme"
                      value={option.value}
                      checked={draft.theme === option.value}
                      onChange={() => updateTheme(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label
              className="field-control range-control"
              htmlFor="warmth-intensity"
            >
              <span>Warmth</span>
              <span className="input-with-unit">
                <input
                  id="warmth-intensity"
                  type="range"
                  min={themeRanges.warmthIntensity.min}
                  max={themeRanges.warmthIntensity.max}
                  step={themeRanges.warmthIntensity.step}
                  value={draft.warmthIntensity}
                  onChange={(event) =>
                    updateNumber("warmthIntensity", event.target.value)
                  }
                />
                <small>{draft.warmthIntensity}%</small>
              </span>
            </label>

            {isGuidedMode && (
              <>
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

                <fieldset className="segmented-control">
                  <legend>Presentation</legend>
                  <div className="segmented-options">
                    {guidedWindowPresentationOptions.map((option) => (
                      <label
                        className="segmented-option"
                        data-selected={
                          draft.guidedWindowPresentation === option.value
                            ? "true"
                            : "false"
                        }
                        key={option.value}
                      >
                        <input
                          type="radio"
                          name="guided-window-presentation"
                          value={option.value}
                          checked={
                            draft.guidedWindowPresentation === option.value
                          }
                          onChange={() => updatePresentation(option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            {!isGuidedMode && (
              <label className="field-control" htmlFor="flash-chunk-size">
                <span>Chunk size</span>
                <span className="input-with-unit">
                  <input
                    id="flash-chunk-size"
                    type="number"
                    min={preparationRanges.flashChunkSize.min}
                    max={preparationRanges.flashChunkSize.max}
                    step={preparationRanges.flashChunkSize.step}
                    value={draft.flashChunkSize}
                    onChange={(event) =>
                      updateNumber("flashChunkSize", event.target.value)
                    }
                  />
                  <small>words</small>
                </span>
              </label>
            )}
          </div>

          <section className="settings-preview" aria-labelledby="preview-title">
            <div className="section-heading preview-heading">
              <h2 id="preview-title">Preview</h2>
            </div>

            {isGuidedMode && (
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
            )}

            {!isGuidedMode && (
              <p className="flash-preview" aria-label="Flash chunks preview">
                {flashPreviewWords.join(" ")}
              </p>
            )}
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
