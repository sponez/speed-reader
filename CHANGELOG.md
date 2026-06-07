# Changelog

## 2.0.0

Speed Reader now has the full local desktop reading trainer shape:

- guided window reading with a compact continuous default viewport;
- guided presentation variants for feed, single page, and book spread;
- flash chunks mode for phrase recognition training;
- free WPM input with validation from `100` to `5000`;
- configurable focus window size, blur, and highlight intensity;
- line-bounded guided focus windows that preserve the selected WPM budget;
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
