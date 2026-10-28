---
version: alpha
name: DDC-CRM-design-system
description: Спокойная рабочая админка танцевальной школы на светлом холсте с одним фиолетовым акцентом Sero (`--primary-redesigned`, #6c5ce7 / #8b7ff5 в тёмной теме). Им отмечены активный пункт сайдбара, основная кнопка, фокус поля и выбранные состояния. Всё остальное держится на нейтральных поверхностях, тонких рамках `--card-border-redesigned` и двух уровнях текста. Шрифт один — Montserrat — на шкале 12/16/24/32 px с весами 500–700. Формы мягкие: инпуты и кнопки по 8px, карточки 12px, модалки 14px, бейджи-пилюли. Тёмная тема полноценная: каждый цвет — CSS custom property, которая переключается классом `app_dark_theme`. Захардкоженных цветов в компонентах нет.

colors:
  primary: "var(--primary-redesigned)"
  primary-hover: "var(--primary-hover-redesigned)"
  primary-soft: "var(--primary-soft-bg-redesigned)"
  on-primary: "var(--primary-contrast-redesigned)"
  canvas: "var(--bg-redesigned)"
  surface: "var(--sidebar-bg-redesigned)"
  surface-hover: "var(--sidebar-hover-bg-redesigned)"
  ink: "var(--sidebar-text-hover-redesigned)"
  muted: "var(--sidebar-text-redesigned)"
  label: "var(--sidebar-group-label-redesigned)"
  hairline: "var(--card-border-redesigned)"
  sidebar-border: "var(--sidebar-border-redesigned)"
  success-bg: "var(--success-bg-redesigned)"
  success-text: "var(--success-text-redesigned)"
  danger-bg: "var(--danger-bg-redesigned)"
  danger-text: "var(--danger-text-redesigned)"
  style-1-bg: "var(--style-1-bg-redesigned)"
  style-1-text: "var(--style-1-text-redesigned)"
  style-2-bg: "var(--style-2-bg-redesigned)"
  style-2-text: "var(--style-2-text-redesigned)"
  style-3-bg: "var(--style-3-bg-redesigned)"
  style-3-text: "var(--style-3-text-redesigned)"
  style-4-bg: "var(--style-4-bg-redesigned)"
  style-4-text: "var(--style-4-text-redesigned)"
  style-5-bg: "var(--style-5-bg-redesigned)"
  style-5-text: "var(--style-5-text-redesigned)"
  style-6-bg: "var(--style-6-bg-redesigned)"
  style-6-text: "var(--style-6-text-redesigned)"
  style-7-bg: "var(--style-7-bg-redesigned)"
  style-7-text: "var(--style-7-text-redesigned)"
  style-8-bg: "var(--style-8-bg-redesigned)"
  style-8-text: "var(--style-8-text-redesigned)"
  scrim: "var(--overlay-color)"

typography:
  display-xl:
    fontFamily: "var(--font-family-main)"
    fontSize: "var(--font-size-xl)"
    fontWeight: 700
    lineHeight: "var(--font-line-xl)"
    shorthand: "var(--font-xl-redesigned)"
  display-lg:
    fontFamily: "var(--font-family-main)"
    fontSize: "var(--font-size-l)"
    fontWeight: 700
    lineHeight: "var(--font-line-l)"
    shorthand: "var(--font-l-redesigned)"
  title-md:
    fontFamily: "var(--font-family-main)"
    fontSize: "var(--font-size-m)"
    fontWeight: 600
    lineHeight: "var(--font-line-m)"
    shorthand: "var(--font-m-redesigned)"
  body-md:
    fontFamily: "var(--font-family-main)"
    fontSize: "var(--font-size-m)"
    fontWeight: 400
    lineHeight: "var(--font-line-m)"
    shorthand: "var(--font-m-redesigned)"
  nav-link:
    fontFamily: "var(--font-family-main)"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
  body-sm:
    fontFamily: "var(--font-family-main)"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
  caption:
    fontFamily: "var(--font-family-main)"
    fontSize: "var(--font-size-s)"
    fontWeight: 500
    lineHeight: "var(--font-line-s)"
    shorthand: "var(--font-s-redesigned)"
  badge:
    fontFamily: "var(--font-family-main)"
    fontSize: "var(--font-size-s)"
    fontWeight: 600
    lineHeight: "var(--font-line-s)"

rounded:
  sm: "var(--radius-sm-redesigned)"
  md: "var(--radius-md-redesigned)"
  lg: "var(--radius-lg-redesigned)"
  pill: "var(--radius-pill-redesigned)"

spacing:
  xs: 4px
  sm: 8px
  md: 12px
  base: 16px
  lg: 24px
  xl: 32px
  xxl: 48px

layout:
  navbar-height: "var(--navbar-height)"
  sidebar-width: "var(--sidebar-width)"
  sidebar-width-collapsed: "var(--sidebar-width-collapsed)"
  overlay-z-index: "var(--overlay-z-index)"
  modal-z-index: "var(--modal-z-index)"
  transition: "var(--transition-base)"

elevation:
  light: "var(--shadow-light)"
  accent: "var(--shadow-accent)"

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: 8px 16px
  button-outline:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.sm}"
    padding: 8px 16px
  button-outline-danger:
    backgroundColor: transparent
    textColor: "{colors.danger-text}"
    border: "1px solid {colors.danger-text}"
    rounded: "{rounded.sm}"
  button-soft:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  button-clear:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    padding: 0
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.md}"
    padding: 24px
  text-input:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    border: "1px solid {colors.hairline}"
    borderFocus: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 8px 16px
    height: 46px
  select:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    labelColor: "{colors.muted}"
    border: "1px solid {colors.hairline}"
    borderFocus: "{colors.primary}"
    rounded: "{rounded.sm}"
    height: 46px
  modal:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    scrim: "{colors.scrim}"
    rounded: "{rounded.lg}"
    padding: 24px
  sidebar:
    backgroundColor: "{colors.surface}"
    border: "1px solid {colors.sidebar-border}"
    width: "{layout.sidebar-width}"
  sidebar-item:
    backgroundColor: transparent
    textColor: "{colors.muted}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.sm}"
    padding: 10px 12px
    height: 40px
  sidebar-item-hover:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.ink}"
  sidebar-item-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  sidebar-group-label:
    textColor: "{colors.label}"
    typography: "{typography.caption}"
  badge-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success-text}"
    border: "1px solid {colors.success-text}"
    rounded: "{rounded.pill}"
    typography: "{typography.badge}"
  badge-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger-text}"
    border: "1px solid {colors.danger-text}"
    rounded: "{rounded.pill}"
    typography: "{typography.badge}"
  badge-category:
    backgroundColor: "{colors.style-N-bg}"
    textColor: "{colors.style-N-text}"
    border: "1px solid {colors.style-N-text}"
    rounded: "{rounded.pill}"
    typography: "{typography.badge}"
  selected-state:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
---

## Overview

DDC CRM — внутренний инструмент для сотрудников танцевальной школы: клиенты, студенты, группы,
расписание, инвойсы, платежи Mollie и почта. Интерфейс рабочий, не маркетинговый. Пользователь
проводит в нём весь день, поэтому система избегает визуального шума: нейтральный холст, белые (в
тёмной теме — графитовые) поверхности и **один акцентный цвет** — фиолетовый Sero
(`{colors.primary}`, `var(--primary-redesigned)`).

Дизайн-система называется «redesigned» (на базе Sero): все её токены имеют суффикс `-redesigned`
и определены в `client/src/app/styles/themes/default.scss` (светлая тема) и `dark.scss` (тёмная,
класс `app_dark_theme`). Параллельно живёт старый набор токенов до-Sero-эпохи (`--primary-color`,
`--card-bg`, `--white`…). Он считается legacy, в новом коде не используется и при правках
файла мигрирует на `-redesigned`.

**Ключевые характеристики:**
- Один акцент: `{colors.primary}` — активный пункт меню, основная кнопка, фокус поля, ссылки
  действия. Для выбранного, но не главного состояния есть мягкая подложка `{colors.primary-soft}`.
- Цвет никогда не хардкодится. Любой hex, `rgb()` или `rgba()` для текста, фона, рамок и статусов
  задаётся CSS custom property, иначе тёмная тема ломается.
- Два уровня текста плюс приглушённые лейблы: `{colors.ink}` — основной, `{colors.muted}` —
  вторичный, `{colors.label}` — групповые лейблы и подписи.
- Глубина создаётся рамками `{colors.hairline}`, а не тенями. Тени — редкое исключение
  (плавающие элементы, модалки).
- Скругления только из шкалы токенов: 8 / 12 / 14 / пилюля. Сырые `px` в `border-radius` не
  используются.
- Бейджи — заливка семантическим фоном плюс цветная обводка того же оттенка, что и текст.
- Восемь категориальных цветов `--style-1…8-*` назначаются детерминированно, хешем от имени
  сущности.

## Colors

Значения ниже — для справки. В коде всегда используется переменная. Источник истины —
`themes/default.scss` и `themes/dark.scss`.

### Brand & Accent

| Токен | Переменная | Светлая | Тёмная | Использование |
|---|---|---|---|---|
| `{colors.primary}` | `--primary-redesigned` | #6c5ce7 | #8b7ff5 | Основная кнопка, активный пункт сайдбара, фокус поля, акцентные ссылки |
| `{colors.primary-hover}` | `--primary-hover-redesigned` | #5b4bd6 | #9d93f7 | Hover/press основной кнопки (в тёмной теме светлее, а не темнее) |
| `{colors.primary-soft}` | `--primary-soft-bg-redesigned` | rgb(108 92 231 / 12%) | rgb(139 127 245 / 18%) | Мягкая подложка выбранного/активного элемента: выбранная строка, активный фильтр |
| `{colors.on-primary}` | `--primary-contrast-redesigned` | #fff | #fff | Текст и иконки поверх `{colors.primary}` |

### Surface

| Токен | Переменная | Светлая | Тёмная | Использование |
|---|---|---|---|---|
| `{colors.canvas}` | `--bg-redesigned` | #eff5f6 | #0c1214 | Фон страницы (`.app_redesigned`, `.content-page`) |
| `{colors.surface}` | `--sidebar-bg-redesigned` | #fff | #111318 | Поверхность карточек, модалок, сайдбара, панелей |
| `{colors.surface-hover}` | `--sidebar-hover-bg-redesigned` | rgb(17 19 24 / 5%) | rgb(255 255 255 / 7%) | Hover строки и пункта меню, фон «мягкой» кнопки |

### Text

| Токен | Переменная | Светлая | Тёмная | Использование |
|---|---|---|---|---|
| `{colors.ink}` | `--sidebar-text-hover-redesigned` | #15171c | #fff | Основной текст, заголовки, значения. Самый используемый токен системы |
| `{colors.muted}` | `--sidebar-text-redesigned` | #6b7280 | rgb(255 255 255 / 65%) | Вторичный текст, мета-строки, лейблы полей, неактивные пункты меню |
| `{colors.label}` | `--sidebar-group-label-redesigned` | #9aa0a6 | rgb(255 255 255 / 45%) | Групповые лейблы сайдбара, подписи, плейсхолдеры, приглушённые подсказки |

### Hairlines & Borders

| Токен | Переменная | Светлая | Тёмная | Использование |
|---|---|---|---|---|
| `{colors.hairline}` | `--card-border-redesigned` | #ecedf0 | rgb(255 255 255 / 8%) | Рамка карточек, инпутов, outline-кнопок, разделители таблиц |
| `{colors.sidebar-border}` | `--sidebar-border-redesigned` | #ecedf0 | rgb(255 255 255 / 8%) | Правая граница сайдбара и его кнопки сворачивания |

### Semantic

| Токен | Переменная | Светлая | Тёмная | Использование |
|---|---|---|---|---|
| `{colors.success-bg}` / `{colors.success-text}` | `--success-bg/text-redesigned` | #e7f7ec / #1a7f37 | rgb(98 222 133 / 16%) / #7be396 | Оплачено, активно, успешная операция, уровень Start |
| `{colors.danger-bg}` / `{colors.danger-text}` | `--danger-bg/text-redesigned` | #fdeaea / #d92d20 | rgb(217 45 32 / 18%) / #ff8577 | Ошибки, просрочка, удаление, уровень Pro |

Отдельных токенов `warning` и `info` нет. Для «предупреждения» используется слот `style-4`
(золотой), для нейтральной информации — `style-1` (синий).

### Categorical palette

Восемь слотов `--style-N-bg-redesigned` / `--style-N-text-redesigned` для произвольной
цветовой маркировки: стили танцев, направления, типы инцидентов. Порядок оттенков фиксирован и
провалидирован на WCAG-контраст и различимость при дальтонизме в обеих темах. Не переставлять,
девятый цвет не придумывать.

| Слот | Оттенок | Светлая bg / text | Тёмная text |
|---|---|---|---|
| `style-1` | синий | #e5effa / #2771ca | #3987e5 |
| `style-2` | оранжевый | #fdede7 / #ce4914 | #d95926 |
| `style-3` | бирюзовый | #e4f5ef / #15875e | #199e70 |
| `style-4` | золотой | #fdf4e0 / #916300 | #c98500 |
| `style-5` | розовый | #fceff4 / #da2d6e | #d55181 |
| `style-6` | зелёный | #e0f0e0 / #008300 | #009200 |
| `style-7` | фиолетовый | #e9e7f4 / #4a3aa7 | #9085e9 |
| `style-8` | красный | #fce9e9 / #df2f2d | #e66767 |

Слот назначается детерминированно — через `getStyleColorSlot(name)` из
`client/src/shared/lib/styleColor/styleColor.ts` (хеш от имени), поэтому одна и та же сущность
всегда получает один и тот же цвет. Случайное назначение запрещено.

Доменные понятия, которые укладываются в готовую семантику, переиспользуют слоты. Трёхуровневая
категория **Start / Fan / Pro** — это всегда `success` / `style-4` / `danger`, как в `GroupCard`,
`ChoreographerCard` и `ChoreographerModal`.

### Scrim

- `{colors.scrim}` — `--overlay-color`, rgba(0 0 0 / 60%) — фон под модалками и оверлеями.

## Typography

### Font Family

Единственное семейство — **Montserrat** (`--font-family-main`, подключается из Google Fonts в
`variables/global.scss`) на всё: заголовки, текст, навигацию и подписи. Отдельного дисплейного
шрифта нет. Фолбэк в переменной — `'Times New Roman', serif`; см. Known Gaps.

### Scale

Шкала из четырёх ступеней, каждая — размер + межстрочный интервал + готовый shorthand для свойства
`font`:

| Токен | Размер / line-height | Shorthand | Вес | Использование |
|---|---|---|---|---|
| `{typography.display-xl}` | `--font-size-xl` 32px / `--font-line-xl` 40px | `--font-xl-redesigned` | 700 | Крупные KPI-цифры, редкие заголовки экрана |
| `{typography.display-lg}` | `--font-size-l` 24px / `--font-line-l` 32px | `--font-l-redesigned` | 700 | Заголовок страницы и модалки |
| `{typography.title-md}` | `--font-size-m` 16px / `--font-line-m` 24px | `--font-m-redesigned` | 600 | Заголовки карточек и секций |
| `{typography.body-md}` | 16px / 24px | `--font-m-redesigned` | 400 | Основной текст, значения полей (базовый шрифт `.app_redesigned`) |
| `{typography.nav-link}` | 14px | — | 500 | Пункты сайдбара, плотные списки, текст таблиц |
| `{typography.body-sm}` | 13px | — | 400 | Мета-строки карточек, вложенные пункты меню |
| `{typography.caption}` | `--font-size-s` 12px / `--font-line-s` 20px | `--font-s-redesigned` | 500 | Лейблы полей, групповые лейблы, подписи |
| `{typography.badge}` | 12px / 20px | — | 600 | Текст бейджей и пилюль |

### Principles

- Иерархию создают вес и цвет, а не размер: в одной карточке обычно соседствуют 16/600
  `{colors.ink}` и 13/400 `{colors.muted}`.
- Рабочие веса — 500, 600 и 700. Вес 800 встречается точечно, для KPI-цифр. 200–300 в
  интерфейсе не используются, хотя и подгружаются.
- Для свойства `font` лучше брать готовый shorthand-токен (`font: var(--font-m-redesigned)`), а
  не собирать размер и line-height вручную.
- Весь текст UI идёт через i18next (`t()`), голые строки в компонентах запрещены линтером.

## Layout

### Spacing System

Отдельных токенов отступов в проекте нет: используются сырые значения на сетке 4px. Фактически
применяемая шкала:

- `{spacing.xs}` 4px — лейбл → поле, иконка → текст в бейдже.
- `{spacing.sm}` 8px — gap в стеках кнопок, табов, тегов; вертикальный padding кнопки и инпута.
- `{spacing.md}` 12px — padding пункта сайдбара, отступ иконки до лейбла.
- `{spacing.base}` 16px — горизонтальный padding кнопки и инпута, gap между карточками, гаттер
  от края экрана на мобильном.
- `{spacing.lg}` 24px — внутренний padding карточки и модалки, вертикальный padding сайдбара.
- `{spacing.xl}` 32px, `{spacing.xxl}` 48px — крупные секции и модификаторы `Card` (`gap_32`,
  `gap_48`).

### Shell

- **Navbar:** высота `--navbar-height` (90px) сверху.
- **Sidebar:** слева, ширина `--sidebar-width` (288px), в свёрнутом виде
  `--sidebar-width-collapsed` (76px), фон `{colors.surface}`, правая граница
  `{colors.sidebar-border}`.
- **Контент:** `.content-page` — flex-строка `min-height: calc(100vh - var(--navbar-height))` на
  фоне `{colors.canvas}`. Страница собирается из карточек `{component.card}` на холсте.
- **Z-индексы:** `--overlay-z-index` (100) для оверлеев, `--modal-z-index` (1000) для модалок.

### Whitespace Philosophy

Плотность выше, чем на маркетинговых сайтах: это CRM, и сотруднику нужно видеть много строк и
карточек без прокрутки. Воздух живёт внутри карточек (24px padding), а между ними хватает 16px
гаттера.

## Elevation

Система почти плоская: отделение поверхностей держится на контрасте `{colors.canvas}` /
`{colors.surface}` и рамке `{colors.hairline}`.

- **Flat (по умолчанию):** карточки, таблицы, сайдбар, формы — без тени, с рамкой 1px.
- **Light:** `--shadow-light` (rgb(0 0 0 / 4%) 0 3px 5px) — `Card` с `shadowLight`, лёгкий подъём.
- **Accent:** `--shadow-accent` (rgb(99 99 99 / 20%) 0 2px 8px) — `Card` с `shadowAccent`,
  выпадающие меню.
- **Modal:** `0 24px 80px rgb(0 0 0 / 22%)` в `shared/ui/Modal` поверх `{colors.scrim}`.
- **Движение:** `--transition-base` (0.3s ease) для смены цвета и рамок. Пункты меню
  используют более короткие 0.16s.

## Components

Базовые компоненты лежат в `client/src/shared/ui/*` (Feature-Sliced Design, импорт только через
`index.ts` слайса). Каждый — функциональный компонент в `memo()` со своим `*.module.scss`.

### Buttons (`shared/ui/Button`)

- **`button-primary`** (`theme=backgroundInverted`) — заливка `{colors.primary}`, текст
  `{colors.on-primary}`, `{rounded.sm}`. Одно главное действие на экран или в модалке:
  «Сохранить», «Создать», «Отправить».
- **`button-outline`** (`theme=outline`) — прозрачный фон, рамка `{colors.hairline}`, текст
  `{colors.ink}`. Вторичные действия: «Отмена», «Фильтры».
- **`button-outline-danger`** (`theme=outline_red`) — рамка и текст `{colors.danger-text}`.
  Деструктивные действия: «Удалить».
- **`button-soft`** (`theme=background`) — фон `{colors.surface-hover}`. Третичные действия в
  тулбарах.
- **`button-clear`** (`theme=clear`) — без фона и рамки. Иконки-действия и ссылки-кнопки.
- **Размеры:** `size_m` — 8px 16px, `size_l` — 10px 20px, `size_xl` — 12px 24px. Квадратные
  иконки-кнопки (`square`) равны line-height соответствующей ступени шрифта.
- **Состояния:** hover — `opacity: 0.8`; disabled — `opacity: 0.5` и `cursor: not-allowed`.

### Cards (`shared/ui/Card`)

- **`card`** — поверхность `{colors.surface}`, рамка `{colors.hairline}`, `{rounded.md}`, padding
  24px (модификаторы `gap_0…gap_48`). Основной контейнер любой секции страницы.
- Выделенная карточка (`variant=light`) — заливка `{colors.primary}`. Используется редко, для
  промо- или итоговых блоков.

### Forms

- **`text-input`** (`shared/ui/Input`) — прозрачный фон, рамка `{colors.hairline}`,
  `{rounded.sm}`, padding 8px 16px, высота 42 / 46 / 50px (`s` / `m` / `l`). На фокусе рамка
  становится `{colors.primary}` — без glow и ring. Read-only — `opacity: 0.7`.
- **`select`** (`shared/ui/Select`) — те же размеры и поведение фокуса. Лейбл над полем —
  `{typography.caption}` в `{colors.muted}`, отступ 4px.
- Ошибка поля — текст `{colors.danger-text}` под полем. Подложка `{colors.danger-bg}` — для
  общего сообщения формы.

### Modal (`shared/ui/Modal`)

- **`modal`** — фон `{colors.surface}`, текст `{colors.ink}`, `{rounded.lg}`, padding 24px, тень
  уровня Modal поверх `{colors.scrim}`. Открывается масштабированием 0.5 → 1.
- **Важно:** `.content` общего `Modal` по умолчанию берёт legacy-токен `--white`, который не
  переключается в тёмной теме. Поэтому корень каждой конкретной модалки обязан явно задать
  `background: var(--sidebar-bg-redesigned); color: var(--sidebar-text-hover-redesigned);`.

### Navigation (`widgets/Sidebar`)

- **`sidebar`** — фон `{colors.surface}`, граница `{colors.sidebar-border}`, padding 24px 12px
  24px 18px, ширина анимируется при сворачивании. Кнопка сворачивания — круг 30px на правой
  границе.
- **`sidebar-item`** — 40px, padding 10px 12px, `{rounded.sm}`, текст `{colors.muted}` в
  `{typography.nav-link}`. Hover — фон `{colors.surface-hover}`, текст `{colors.ink}`.
- **`sidebar-item-active`** — заливка `{colors.primary}`, текст `{colors.on-primary}`. Иконки
  наследуют `currentColor` и всегда совпадают с цветом лейбла.
- **`sidebar-group-label`** — `{colors.label}`. Вложенные пункты — 13px, отступ слева 38px.
- **Свёрнутый вид** — квадрат 44×44, `{rounded.md}`, только иконка.

### Badges & Pills

Эталон — категория Start/Fan/Pro в `ChoreographerCard` / `ChoreographerModal` / `GroupCard`:

```scss
background: var(--success-bg-redesigned);
color: var(--success-text-redesigned);
border: 1px solid var(--success-text-redesigned);
border-radius: var(--radius-pill-redesigned);
```

- **`badge-success`**, **`badge-danger`** — статусы: оплачено/просрочено, активен/архив.
- **`badge-category`** — категориальная маркировка слотом `style-N` (стиль танца, направление).
- Лёгкий вариант (`GroupCard .level_*`): цвет текста + обводка того же цвета без заливки.
- Запрещённый паттерн — «текст + тонкая рамка через `color-mix(in srgb, …, transparent)`». Он
  проваливался в тёмной теме на страницах Mollie.

### Selection

- **`selected-state`** — `{colors.primary-soft}` с текстом `{colors.primary}`: выбранная строка
  таблицы, активный фильтр или таб, выбранный день. Полная заливка `{colors.primary}` — только для
  активного пункта навигации и основной кнопки.

## Responsive Behavior

| Имя | Ширина | Ключевые изменения |
|---|---|---|
| Mobile | ≤ 768px | Сайдбар становится фиксированным оверлеем с кнопкой закрытия, контент занимает всю ширину (`.content-page { display: block }`), кнопка сворачивания скрыта, гаттер 16px |
| Small mobile | ≤ 480px | Точечные правки отдельных страниц: стек вместо строки, полноширинные кнопки |
| Tablet | 769–1100px | Многоколоночные сетки карточек сокращаются (локальные брейкпоинты 900 / 1100px) |
| Desktop | > 1100px | Полный сайдбар 288px + контент |

Основной и единственный общий брейкпоинт — **768px**. Остальные (480 / 520 / 640 / 700 / 720 /
900 / 1100) локальны для конкретных страниц. Новые брейкпоинты без необходимости не
добавляются.

### Touch Targets

- Пункт сайдбара — 40px, свёрнутый — 44×44px.
- Инпуты и селекты — от 42px, по умолчанию 46px.
- Кнопка закрытия мобильного сайдбара — 32×32px.

## Theming

- Светлая тема — `:root` в `themes/default.scss`. Тёмная — класс `.app_dark_theme` в
  `themes/dark.scss`, переключается через `ThemeProvider` / `useTheme`.
- `themes/orange.scss` существует, но переключателя для неё нет — под неё не проектировать.
- Любое визуальное изменение проверяется вручную в обеих темах: токены, которые «должны»
  переключаться, уже подводили (`--white`, семейство `--dark-bg-redesigned`).
- `color-mix()` допустим только для интенсивности — например, сила заливки ячейки в тепловой карте
  `MolliePaymentsMatrix`. Подменять им отсутствующий токен нельзя.

## Known Gaps

- **Legacy-токены ещё в ходу:** `--primary-color` (≈58 использований), `--card-bg`, `--white`,
  `--bg-color`, `--accent-redesigned`, `--icon-redesigned`, `--hint-redesigned`. Базовый `Text`
  красит заголовок и текст в `--primary-color`, `Card` (`normal`) берёт фон из
  `--dark-bg-redesigned`, `outlined` — рамку `--accent-redesigned`. При правке такого файла их
  стоит мигрировать.
- **Сырые значения в shared/ui:** `Card` — `border-radius: 12px` вместо `--radius-md-redesigned`,
  `Modal` — `18px` и `--white`, плейсхолдер `Input` — `#b3b3b3`, `Select` `.option` —
  инвертированные legacy-цвета.
- **Нет токенов отступов** — шкала из раздела Layout пока соглашение, а не переменные.
- **Нет токенов warning/info** — используются слоты `style-4` / `style-1`.
- **Фолбэк шрифта** `--font-family-main` — serif (`'Times New Roman'`): пока Montserrat не
  загрузился, текст на мгновение отображается засечками.
- **Hover-состояния** описаны только для кнопок и сайдбара. Для строк таблиц и карточек единого
  правила нет, используется `{colors.surface-hover}` по месту.
