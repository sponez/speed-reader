# Задание 002: базовая структура и архитектурные границы

Статус: план.

## Цель

Разложить scaffold по целевой архитектуре из `docs/ARCHITECTURE.md`, чтобы следующие задачи можно было делать в правильных границах: UI отдельно, доменная логика чтения отдельно, адаптеры отдельно.

После выполнения задания проект должен оставаться запускаемым, но демо-код Tauri/Vite/React должен быть убран или изолирован.

## Контекст

Сейчас проект уже инициализирован как Tauri 2 + Vite + React + TypeScript. В `src` находится стандартный template-код: `App.tsx`, `App.css`, логотип React и пример вызова Rust-команды `greet`.

Вторая задача не реализует сценарий чтения. Она только готовит структуру, нейминг и границы зависимостей.

## Целевая структура `src`

```text
src/
  app/
    App.tsx
    App.css
  domain/
    reading/
      index.ts
      types.ts
  adapters/
    persistence/
      index.ts
    rendering/
      index.ts
  shared/
    ui/
      index.ts
    utils/
      index.ts
  main.tsx
  vite-env.d.ts
```

## Правила границ

- `domain/reading` не импортирует React, DOM API, Tauri API и CSS.
- `app` может импортировать `domain`, `adapters` и `shared`.
- `adapters/persistence` будет единственным местом для будущего Tauri Store API.
- `adapters/rendering` будет местом для DOM/rendering-специфики режима чтения.
- `shared` не должен зависеть от feature/domain кода приложения.
- `src-tauri` остаётся тонкой desktop-оболочкой.

## План выполнения

1. Создать целевые папки внутри `src`.
2. Перенести `App.tsx` и `App.css` в `src/app`.
3. Обновить импорт `App` в `src/main.tsx`.
4. Убрать demo UI из `App.tsx`: логотипы, форму greeting и вызов `invoke("greet")`.
5. Заменить стартовый экран на минимальную заглушку `Speed Reader`, чтобы build оставался зелёным.
6. Удалить неиспользуемый `src/assets/react.svg`, если он больше не импортируется.
7. Убрать demo-команду `greet` из Rust-кода, если после очистки frontend она больше не используется.
8. Создать placeholder/index-файлы для будущих слоёв без бизнес-логики.
9. Проверить, что нет нарушений границ: доменный слой не импортирует React/Tauri/DOM.
10. Запустить сборочные проверки.

## Минимальное содержимое слоёв

- `domain/reading/types.ts` - только базовые type exports или пустой файл с комментарием о будущем домене.
- `domain/reading/index.ts` - публичный barrel export для reading domain.
- `adapters/persistence/index.ts` - заготовка места для будущего Tauri Store adapter.
- `adapters/rendering/index.ts` - заготовка места для будущего rendering adapter.
- `shared/ui/index.ts` и `shared/utils/index.ts` - пустые публичные точки расширения.

Если TypeScript ругается на пустые модули, добавить безопасный export:

```ts
export {};
```

## Критерии готовности

- `src/main.tsx` импортирует `App` из `src/app/App`.
- Template-экран Tauri/Vite/React заменён на минимальный экран Speed Reader.
- В `src` есть папки `app`, `domain`, `adapters`, `shared`.
- Demo asset `react.svg` не используется.
- Неиспользуемый Tauri `greet` удалён или оставлен только если он всё ещё нужен технически.
- Проект успешно проходит frontend build.
- Tauri dev/build команды остаются доступными.

## Проверки

```powershell
npm run build
npm run tauri build
```

Для быстрой проверки во время разработки можно дополнительно запускать:

```powershell
npm run tauri dev
```

## Не входит в задание

- Экран подготовки с textarea и настройками.
- Токенизация текста.
- Расчёт WPM.
- Режим чтения.
- Подключение Tauri Store.
- UI-дизайн финального приложения.
- Unit-тесты доменной логики.
