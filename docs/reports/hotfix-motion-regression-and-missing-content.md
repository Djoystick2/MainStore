# Hotfix: Motion Regression and Missing Content

## Исходная проблема
- После волны motion/back-navigation в реальном Telegram Mini App основной storefront content перестал отображаться или появлялся с заметной задержкой.
- При этом header, bottom nav и subtitle страницы оставались видимыми, что указывало не на проблему данных, а на shared UI layer и видимость контентного контейнера.
- Наиболее заметно это било по каталогу, где subtitle обновлялся, а основные плитки и листинги так и не становились видимыми.

## Точный источник регрессии
- Регрессия была в shared motion-слое контентного контейнера: `StoreScreenContainer` + CSS-класс `containerMotion`.
- В `src/components/store/store.module.css` для `.containerMotion > *` использовались `opacity: 0`, `animation: ... both` и `animation-delay`.
- Это делало анимацию не progressive enhancement, а обязательным gate на видимость. Если анимация в Telegram WebView стартовала поздно или ненадёжно, основной контент оставался скрыт.
- Именно поэтому были видны header и нижняя навигация, но не основные секции страницы.

## Внесённые изменения
- Убран проблемный shared motion-hook из `StoreScreenContainer`, чтобы основной page content больше не зависел от stagger-анимации для своей видимости.
- Из storefront CSS удалён блок `.containerMotion > *` с `opacity: 0` и `animation-delay`, который и скрывал все основные секции.
- Остальной безопасный motion сохранён: transitions на карточки, CTA, чипы, overlay и back-navigation improvements не откатывались.

## Затронутые файлы
- `src/components/store/StoreScreenContainer.tsx`
- `src/components/store/store.module.css`

## Что пришлось упростить или откатить
- Полностью убран shared stagger reveal для всех direct children основного контентного контейнера.
- Сохранены только non-blocking motion-эффекты, которые не участвуют в базовой видимости контента.

## Результаты проверок
- `pnpm run lint` — пройдено успешно.
- `pnpm run build` — пройдено успешно.
- В обоих прогонах остались только информационные предупреждения `baseline-browser-mapping`.

## Остаточные follow-ups
- Если позже снова возвращать page-enter motion, он должен быть строго non-blocking: без `opacity: 0` на shared контейнере и без зависимости видимости контента от `animation-delay`.
- Telegram Back Button/history-aware navigation hotfix не затрагивал: источник регрессии был не в back logic, а именно в shared content motion layer.
