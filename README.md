# Speed Reader

Speed Reader is a personal Windows desktop app for practicing reading speed.

The current MVP focuses on a guided moving focus window mode. The architecture is being kept open for additional reading modes, presentation variants, and UI themes later.

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
