# Changelog

## 3.0.0

Speed Reader now uses a new visual-line reading model for guided and flash training.

- line-budget guided timing: WPM still sets the total reading duration, but the internal rhythm is distributed across visual lines and windows;
- short lines, paragraph endings, and short paragraphs stay readable instead of flashing by according to raw word count;
- sentence-bounded windows remain the semantic boundary, with visual lines as the secondary boundary;
- flash chunks reuse the same sentence-bounded window splitter and equal frame timing through a virtual line;
- release version bumped across npm, Tauri, and Cargo manifests.

Release checks:

- `npm run test`
- `npm run test:e2e`
- `npm run build`
- `npm run tauri build`
- release executable launch smoke

## 2.0.0

Speed Reader now has the full local desktop reading trainer shape:

- guided window reading with a compact continuous default viewport;
- guided presentation variants for feed, single page, and book spread;
- flash chunks mode for phrase recognition training;
- sentence-bounded flash chunks that do not cross sentence boundaries;
- shared window size for guided and flash reading modes;
- equal window timing inside each guided line and inside the flash virtual line;
- free WPM input with validation from `100` to `5000`;
- configurable focus window size, blur, and highlight intensity;
- line-bounded guided focus windows that preserve the selected WPM budget;
- sentence-bounded guided focus windows with visual lines as secondary boundaries;
- punctuation-preserving tokenization with hyphenated words counted as one word;
- light and dark themes with a shared warmth slider;
- local persistence through Tauri Store;
- Windows release artifacts through Tauri build.

Release checks passed:

- `npm run test`
- `npm run test:e2e`
- `npm run build`
- `npm run tauri build`
- release executable launch smoke

The release is not code-signed.
