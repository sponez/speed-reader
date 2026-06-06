# Задание 001: инициализация проекта

Статус: выполнено.

## Цель

Создать базовый scaffold приложения Speed Reader на стеке Tauri 2 + Vite + React + TypeScript + npm.

После выполнения задания в репозитории должен появиться запускаемый desktop-проект, готовый для дальнейшей реализации экранов и доменной логики чтения.

## Контекст

Проект делается как личное Windows desktop-приложение. Основная логика MVP будет во фронтенде на TypeScript, а Rust/Tauri-слой останется тонкой desktop-оболочкой.

Документы-источники:

- `docs/PROJECT.md`
- `docs/ARCHITECTURE.md`

## План выполнения

1. Проверить локальные зависимости:
   - Node.js;
   - npm;
   - Rust;
   - Cargo;
   - Windows prerequisites для Tauri.
2. Инициализировать проект Tauri 2 с frontend-шаблоном React + TypeScript.
3. Использовать `npm` как package manager.
4. Проверить и зафиксировать базовую структуру проекта:
   - frontend-код;
   - `src-tauri`;
   - конфигурация Vite;
   - конфигурация TypeScript;
   - npm scripts.
5. Настроить имя приложения как `Speed Reader`.
6. Проверить dev-запуск приложения.
7. Проверить production build или как минимум убедиться, что команда сборки доступна.
8. Обновить документацию только если фактический scaffold отличается от ожидаемого.

## Фактический результат

Scaffold создан на базе Tauri 2 + Vite + React + TypeScript + npm.

Создана базовая структура:

- `src` - React frontend;
- `src-tauri` - Tauri/Rust shell;
- `public` - публичные frontend-ресурсы;
- `package.json` и `package-lock.json` - npm-проект;
- `vite.config.ts` - Vite-конфигурация;
- `tsconfig.json` и `tsconfig.node.json` - TypeScript-конфигурация.

Настройки приложения:

- package name: `speed-reader`;
- product name: `Speed Reader`;
- Tauri identifier: `com.local.speedreader`;
- window title: `Speed Reader`;
- dev URL: `http://localhost:1420`.

## Ожидаемые команды

Точные команды можно скорректировать по актуальному CLI Tauri, но направление такое:

```powershell
npm create tauri-app@latest .
npm install
npm run tauri dev
npm run tauri build
```

Фактически scaffold был создан через неинтерактивный Tauri CLI с выбором `react-ts`, `npm` и Tauri 2. Так как в корне уже были `docs` и `tasks`, шаблон сначала был создан в подпапке, затем его содержимое было перенесено в корень без перезаписи существующих документов.

Если scaffold предлагает выбор шаблона, выбрать:

- frontend language: TypeScript;
- package manager: npm;
- UI template/framework: React;
- bundler: Vite.

## Критерии готовности

- Проект открывается в dev-режиме через npm script.
- В репозитории есть `src-tauri`.
- В репозитории есть React + TypeScript frontend.
- npm scripts содержат команды для dev-запуска и сборки Tauri.
- Базовое окно приложения запускается на Windows.
- Нет необходимости устанавливать `pnpm`.

## Проверки

- `npm install` - успешно, 0 найденных npm vulnerabilities.
- `npm run build` - успешно.
- `npm run tauri build` - успешно.
- `npm run tauri dev -- --no-watch` - debug build завершился, окно приложения запускалось.

Созданные production artifacts:

- `src-tauri/target/release/bundle/nsis/Speed Reader_0.1.0_x64-setup.exe`;
- `src-tauri/target/release/bundle/msi/Speed Reader_0.1.0_x64_en-US.msi`.

## Не входит в задание

- Экран подготовки.
- Режим чтения.
- Токенизация текста.
- Tauri Store.
- Архитектурная раскладка доменного слоя.
- UI-дизайн приложения.
