# Speed Reader

Speed Reader is a personal Windows desktop app for practicing reading speed.

The app currently supports two reading modes:

- guided window reading, where a focused phrase moves through the text at the target WPM;
- flash chunks, where fixed-size word chunks appear one frame at a time to train phrase recognition.

The default guided presentation is a compact unscrollable viewport where the text moves automatically and the current line stays centered. Additional guided presentations are available for feed, single-page, and book-spread layouts. The architecture is being kept open for UI themes and future training modes.

The app is built with Tauri 2, Vite, React, TypeScript, and npm. The Rust side stays intentionally thin and acts as the desktop shell, while the reading logic and UI live in the TypeScript frontend.

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

## Project Shape

- `src/app` - React app entry component and app-level styles.
- `src/domain` - framework-independent reading domain logic.
- `src/adapters` - integration points for rendering and persistence.
- `src/shared` - shared UI and utility entry points.
- `src-tauri` - Tauri/Rust desktop shell.
