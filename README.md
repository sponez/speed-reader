# Speed Reader

Speed Reader is a personal Windows desktop app for practicing faster reading.

It is built around two training modes:

- guided window reading, where a focused phrase moves through the text at the selected WPM;
- flash chunks, where fixed-size word groups appear one frame at a time to train phrase recognition.

The default guided presentation is a compact non-scrollable reading viewport. The text moves automatically, the current visual line stays near the center, and the focus window moves through the line without crossing visual line boundaries. A manual feed, a single-page layout, and a book-spread layout are also available.

The app is local-first: no backend, no account, no sync. Settings and the last pasted text are saved through Tauri Store.

## Features

- Guided window mode with phrase-sized focus windows.
- Flash chunks mode with configurable chunk size.
- Target speed input from `100` to `5000` WPM.
- Adjustable focus window size from `1` to `20` words.
- Blur can be reduced to `0` and fully disabled.
- Focus highlight can be reduced to `0` and fully disabled.
- Guided presentations: continuous, feed, single page, and book spread.
- Light and dark themes.
- Warmth slider for both themes.
- `Esc` ends the reading session and returns to setup.
- Local persistence for text and settings.

## Tech Stack

- Tauri 2 for the Windows desktop shell.
- Vite 7 for frontend development and production builds.
- React 19 for the UI.
- TypeScript 5 for app and domain code.
- Vitest for domain/unit tests.
- Playwright for browser-level smoke tests.
- npm as the package manager.

The Rust side is intentionally thin and only provides the Tauri desktop shell and plugins. Reading logic lives in the TypeScript domain layer.

## Development

Install dependencies:

```powershell
npm install
```

Run the frontend dev server:

```powershell
npm run dev
```

Run the Tauri desktop app in development mode:

```powershell
npm run tauri dev
```

Build the frontend:

```powershell
npm run build
```

Run unit tests:

```powershell
npm run test
```

Run UI smoke tests:

```powershell
npm run test:e2e
```

Build the Windows desktop app and installers:

```powershell
npm run tauri build
```

## Release Artifacts

After `npm run tauri build`, the Windows artifacts are created under:

- `src-tauri/target/release/speed-reader.exe`
- `src-tauri/target/release/bundle/msi/`
- `src-tauri/target/release/bundle/nsis/`

The release is not code-signed.

## Project Shape

- `src/app` - React application, screens, state orchestration, and app-level theme model.
- `src/domain` - framework-independent reading domain logic.
- `src/adapters/rendering` - DOM/React rendering adapters for reading modes.
- `src/adapters/persistence` - local persistence adapter over Tauri Store.
- `src/shared` - shared UI and utility entry points.
- `src-tauri` - Tauri/Rust desktop shell.
- `tests/e2e` - Playwright smoke tests.

## Architecture Notes

The project uses a lightweight layered / ports-and-adapters shape:

- the reading domain does not import React, DOM APIs, Tauri APIs, CSS, or theme code;
- React coordinates setup, session creation, reading lifecycle, and `Esc` handling;
- rendering adapters may measure DOM layout, but WPM, progress, focus windows, and flash chunks stay in pure domain logic;
- persistence is isolated behind a small adapter and does not contain reading calculations;
- themes are presentation settings applied through `data-app-theme` and CSS custom properties.

This keeps the app small while leaving room for more reading modes and presentation variants.

## Release Checks

The release candidate should pass:

```powershell
npm run test
npm run test:e2e
npm run build
npm run tauri build
```

The domain boundary check should not find React, DOM, Tauri, CSS, browser lifecycle, or theme imports inside `src/domain`.
