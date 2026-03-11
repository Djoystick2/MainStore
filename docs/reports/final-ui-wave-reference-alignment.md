# Final UI Wave Reference Alignment

## Исходные визуальные проблемы

- Storefront и admin уже были функционально выровнены, но визуально оставались ближе к светлой пастельной теме, чем к целевому мягкому графитовому направлению.
- Между экранами не хватало одной общей material/system базы: разные поверхности, разная глубина, разный характер CTA.
- Каталог выглядел слишком однообразно: верхний уровень и внутренний уровень навигации воспринимались слишком похоже.
- Product listing не выглядел достаточно торговым: карточкам не хватало более выраженной иерархии цены, CTA и встроенного паттерна избранного.
- Admin UI был уже чище по UX, но по материалам, контрасту и кнопкам ещё отставал от storefront и не ощущался частью одной системы.

## Выбранное theme direction

- Единая основная тема без жёсткого разделения на белую/чёрную.
- База: мягкий тёмный графит.
- Акцент: спокойный лавандово-фиолетовый.
- Поверхности: многослойные, не чисто чёрные, с мягкими свечениями и умеренной глубиной.
- Контраст: высокий по тексту, но без резких “ядовитых” состояний.
- Общий принцип: современный Telegram-friendly shopping UI с хорошей мобильной читаемостью.

## Внесённые изменения

### Theme / design system

- Обновлены глобальные theme tokens в `src/app/_assets/globals.css`:
  - фоновые слои;
  - surface palette;
  - text / hint palette;
  - accent / accent-soft / accent-strong;
  - border treatment;
  - shadows.
- Основная тема переведена на единый тёмный визуальный язык вместо светлой базы с отдельным dark fallback.

### Storefront

- Переведены ключевые storefront surfaces на новую систему:
  - экран, sticky header, section cards, panels, quick links, banners, mini shelves;
  - bottom nav и sticky CTA bar;
  - empty / loading / notice states;
  - cart / order / profile / checkout summary materials.
- Кнопки, инпуты, chips, badges и secondary actions выровнены по новой палитре и глубине.
- Product card обновлён:
  - сильнее выражена иерархия цены;
  - добавлен встроенный визуальный CTA `Открыть`;
  - карточка стала глубже, мягче и ближе к shopping-референсам.

### Каталог

- Верхний уровень категорий сохранён плиточным, но сделан заметно более витринным:
  - крупнее плитки;
  - мягкие графитово-лавандовые материалы;
  - более выраженная типографика.
- Для состояний с активными фильтрами / углублением в каталог добавлен более простой вертикальный список категорий:
  - компактный left-icon pattern;
  - чище текстовая иерархия;
  - меньше визуального шума.
- На catalog cards добавлен overlay `FavoriteToggleButton` с серверным начальным состоянием избранного через `getFavoriteProductIdsForProfile(...)`.

### Product listing / cards

- Листинг остался двухколоночным на витринном уровне и одноколоночным на внутренних/filtered состояниях.
- Карточки получили:
  - более крупную медиазону;
  - лучшую иерархию имени, метаданных и цены;
  - более заметный CTA;
  - overlay-паттерн избранного прямо на карточке в каталоге.
- Обновлены визуальные состояния discount / stock / order / payment badges в единой палитре.

### Admin visual consistency

- В `src/components/admin/admin.module.css` добавлен visual alignment pass:
  - admin nav;
  - admin cards;
  - lead blocks;
  - summary cards;
  - meta cells;
  - callouts;
  - формы и инпуты;
  - primary / secondary / danger actions.
- Admin не переписывался по структуре и flow, но стал ближе к storefront по материалам, контрасту и кнопкам.

## Затронутые файлы

- `src/app/_assets/globals.css`
- `src/app/catalog/page.tsx`
- `src/components/store/ProductCard.tsx`
- `src/components/store/store.module.css`
- `src/components/admin/admin.module.css`

## Что сознательно не менялось

- Не менялись Telegram bootstrap/session/runtime behavior.
- Не менялась storefront/admin/import/payment бизнес-логика.
- Не менялись admin guards.
- Не менялся Excel import pipeline и support matrix `XLSX/XLS/XLSM/XLTX`.
- Не внедрялась реальная оплата и не трогалась provider-specific payment integration.
- Не делался risky architectural refactor.

## Результаты проверок

- `pnpm run lint` — успешно.
- `pnpm run build` — успешно.
- В обоих прогонах были только информационные предупреждения `baseline-browser-mapping`.

## Остаточные follow-ups

- Пройти визуальную QA-проверку на реальном Telegram-устройстве и подтвердить, что новая тема одинаково читается на типичных Android/iOS экранах.
- При необходимости отдельно отполировать ещё несколько редких admin screens под ту же систему, если после ручного QA найдутся локальные светлые/старые паттерны.
- Если потребуется ещё ближе подойти к референсам, следующим безопасным шагом может быть отдельный media-pass для категорий с реальными category images, если такие данные появятся в модели.
