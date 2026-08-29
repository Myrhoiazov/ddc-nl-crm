# AGENTS.md

Этот файл даёт инструкции Codex (Codex.ai/code) для работы с кодом в этом репозитории.

## Что это за проект

CRM/админ-платформа для школы танцев («DDC»/«Talent Center»): клиенты (ученики), танцевальные группы,
расписание/календарь, хореографы, филиалы, инвойсинг и платежи/подписки через Mollie. Это монорепозиторий
из двух пакетов, без общего корневого `node_modules` — `client` и `server` устанавливаются и запускаются
независимо друг от друга.

- `client/` — SPA-админка на React 19 + Redux Toolkit (кастомный webpack, не CRA)
- `server/` — API на Express 5 + Prisma (MySQL)
- Корневой `package.json` только оркестрирует запуск dev-окружения и деплой — зависимости ставятся отдельно
  внутри `client/` и `server/`.

## Команды

### Запуск всего проекта (dev)
```bash
npm start                      # корень: запускает вместе server (nodemon) + client (webpack-dev-server :3000)
```

### Client (`cd client`)
```bash
npm start                      # webpack-dev-server :3000
npm run build:prod             # production-сборка -> client/build
npm run lint:ts                # eslint; lint:ts:fix — автофикс
npm run lint:scss              # stylelint по *.scss; lint:scss:fix — автофикс
npm test                       # jest (jsdom), конфиг в config/jest/jest.config.ts
npx jest path/to/File.test.tsx # запустить один тестовый файл
npm run storybook              # storybook dev-сервер на :6006
```

### Server (`cd server`)
```bash
npm start                                   # nodemon, MODE=development
npm run build                               # prebuild выполняет `prisma generate`, затем tsc
npm run prisma:generate                     # перегенерировать Prisma client после изменения схемы
npm run pmd:dev                             # prisma migrate dev (локальные изменения схемы)
npm run migrate:prod                        # prisma migrate deploy (production)
npm run user:reset-password -- <email>      # интерактивный сброс пароля на Argon2id (ts-node)
```
Единого тест-раннера на весь проект на сервере нет. Тесты — это отдельные файлы по доменам, запускаемые
напрямую встроенным test runner'ом Node через `ts-node/register`, например:
```bash
npm run test:auth              # service.Password/Token/Csrf/AuthSecurityAudit/RateLimit/TwoFactorAuth
npm run test:mollie
npm run test:search
npm run test:email
npm run test:payment-reminders
# чтобы запустить один файл напрямую:
node --test -r ts-node/register src/services/service.Password.test.ts
```

### Деплой
См. `README.md` и `docs/spec/DOCKER_PRODUCTION_DEPLOYMENT.md`. Прод работает на одном Docker Compose стеке (`docker-compose.yml` +
`docker-compose.prod.yml`) в `/var/www/project/ddc_nl_docker_prod`.
`npm run deploy` и `npm run deploy:docker` запускают один и тот же production Docker deploy.
Других production deploy path в репозитории нет. Не дублируй детали здесь.

## Архитектура клиента (Feature-Sliced Design)

`client/src` разложен по слоям сверху вниз: `app` → `pages` → `widgets` → `features` → `entities` →
`shared`. Слайс может импортировать только из публичного API своего слоя или слоя *ниже* (никогда не
вбок и не вверх). Это проверяется правилом `path-checker` из `eslint-plugin-denys-fix-fsd-path-plugin`
(ошибка при нарушении) — всегда импортируй слайс через его `index.ts` (например, `@/entities/Client`), а
не прямым путём внутрь его внутренностей, кроме как изнутри этого же слайса. Алиас пути `@/` → `client/src/`.

Каждая страница/фича обычно устроена по папкам `ui/`, `model/` (slice, selectors, services, types), `lib/`.
Redux-стейт разделён на всегда примонтированные редьюсеры (`user`, `ui`) и редьюсеры отдельных
страниц/фич, которые подключаются лениво через `DynamicModuleLoader` при монтировании страницы (полный
список опциональных ключей слайсов — в `StateSchema.ts`); большинство страниц оборачивают контент в
`<DynamicModuleLoader reducers={...}>`.

Запросы к API идут через `@/shared/api/api.ts`: `$api` (без авторизации) vs `$apiPrivate` (сессия по
cookie + автоматически получаемый CSRF-токен, который подставляется в небезопасные методы, кроме
`/auth/login|csrf|refresh|logout`). Базовый URL — `__API__` (глобальная переменная webpack DefinePlugin,
вместе с `__IS_DEV__`/`__PROJECT__` — см. `config/build/buildPlugins.ts`; они же захардкожены в
`config/jest/jest.config.ts` для тестов). Само значение `apiUrl` в `client/webpack.config.ts` читается
из `process.env.CLIENT_API_URL` с откатом на хардкод по `mode` — так Docker-сборка (`docker/client/
Dockerfile.prod`, ARG `CLIENT_API_URL`) может подставить свой адрес без правки кода.

### Стили
Везде используются SCSS Modules (`*.module.scss`), а не глобальный CSS, за исключением общих файлов
в `app/styles`. Полные правила по дизайн-токенам, тёмной теме, бейджам/пилюлям и SCSS-конвенциям —
в `.Codex/rules/code-style.md` (подхватывается автоматически, отдельно импортировать не нужно).

## Архитектура сервера

Слоистое Express-приложение: `routes/router.X.ts` → `controllers/controller.X.ts` →
`services/service.X.ts`, с Zod-схемами (`schemas/`), которые валидируются через `middleware.ValidateSchema`.
Авторизация — по cookie-сессии с CSRF double-submit (`middleware.Auth`, `middleware.Csrf`), хеширование
паролей на Argon2id и rate-limiting по отдельным эндпоинтам (`middleware.LoginRateLimit`,
`middleware.TwoFactorRateLimit`, `middleware.SearchRateLimit`), который использует Redis при заданном
`REDIS_URL` и откатывается на in-memory лимитер иначе (в этом режиме лимиты не общие между процессами
Node). См. `docs/roadmap/AUTH_SECURITY_ROADMAP.md`, если работаешь с авторизацией, сессиями или 2FA —
там описан статус текущего плана усиления безопасности.

Схема Prisma разбита на несколько файлов в `server/prisma/schema/*.prisma` (client, company, email,
invoice, mollie, payment-reminder, schedule, user + `schema.prisma` для datasource/generator и общих
моделей `Comment`/`Transaction`) — MySQL через `DATABASE_URL`. После правки любого файла схемы выполняй
`npm run prisma:generate`; `npm run build` тоже делает это автоматически через `prebuild`.
`docs/roadmap/INVOICES_MODULE_ROADMAP.md` и `docs/roadmap/ORGANIZATIONS_AND_BRANDS_ROADMAP.md` описывают
дизайн-намерения для этих двух модулей, если их дорабатываешь.

Интеграция с Mollie (`@mollie/api-client`) находится в соответствующих routes/controllers/services и
обслуживает платёжные профили клиентов, подписки и сверку транзакций. У почты (IMAP/SMTP через
`imapflow`/`nodemailer`/`mailparser`) своя модель аккаунтов/сообщений в `email.prisma`. 2FA-код при
логине тоже уходит через nodemailer (`service.TwoFactorAuth.ts`), но не через `service.EmailSmtp.ts` —
он напрямую использует SMTP-креды `EmailAccount`, чей `username` совпадает с env-переменной
`TWO_FACTOR_SENDER_EMAIL`, и не пишет письмо в модуль «Письма». Публичный `GET /api/v1/health`
(`controller.Health.ts`, без авторизации, без обращения к БД) существует ради Docker
`depends_on: condition: service_healthy` и деплой-скриптов — не путай его отсутствие с падением сервиса
в более старых окружениях.

## Инфраструктура

Production — один Docker Compose стек на VPS. Полная текущая топология — в
`docs/spec/DOCKER_PRODUCTION_DEPLOYMENT.md`. `docker-compose.yml` (MySQL+Redis, общий) плюс
`docker-compose.dev.yml`/`docker-compose.prod.yml`, Dockerfile'ы — в `docker/{client,server}/`.
У каждого сервиса в compose `container_name` управляется через env (`DB_CONTAINER_NAME` и т.д.);
не возвращай их обратно на хардкод. Инструкции по деплою — в `README.md`.

## Git

Коммитим без строки `Co-Authored-By: Claude ...` в сообщении — не добавляй её при создании коммитов
в этом репозитории.
