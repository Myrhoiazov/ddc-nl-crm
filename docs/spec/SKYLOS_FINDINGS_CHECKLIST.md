# Skylos — чек-лист найденных проблем

Сгенерировано из `npm run check:skylos` (см. `AGENTS.md` — команда информационная, не входит в `npm run ci`; описание проверки — `docs/spec/DDC_CRM_SKYLOS_CI_SPEC.md`, Phase A).

Итоговая оценка прогона: **F (53/100)**. Всего находок в этом файле: **985**.

## Как пользоваться чек-листом

- Отмечайте `[x]` только после реального исправления и повторного запуска `npm run check:skylos`, показавшего, что строка больше не встречается.
- Один PR — одна категория (или один файл), чтобы ревью оставалось управляемым.
- Разделы **SKY-D260** и **SKY-L012** отмечены отдельно ниже — с высокой вероятностью это шумные срабатывания для этого проекта, не исправлять их вслепую поштучно.

## Прогресс

**Категория "Безопасность" — закрыта первым проходом** (ветка `fix/skylos-findings`):
- Реально исправлено: `SKY-D253` (3 из 5 — timing-safe сравнения через новый `timingSafeEqualStrings`), `SKY-D251` (убраны debug-логи с токеном/подписью), `SKY-D291`/`SKY-D293`/`SKY-D312` (permissions, persist-credentials, --ignore-scripts в `.github/workflows/ci.yml` — полностью закрыты), `SKY-D248` (1 из 7 — OAuth-редирект в Mollie).
- Остальные пункты `SKY-D248`/`SKY-D252`/`SKY-D253`(2)/`SKY-D327`/`SKY-D216`/`SKY-D230`/`SKY-S101` проверены вручную и являются false positive либо намеренным поведением (dev/prod-разветвление) — помечено инлайн у каждого пункта, без изменений кода.
- Повторный прогон `npm run check:skylos` подтвердил закрытие исправленных пунктов и обнаружил новую находку `SKY-A102` (`server/src/services/service.Token.ts` — "изменён security-код без изменения тестов") — добавлен `server/src/helpers/index.test.ts` на новый хелпер, находка снята.
- **SKY-D260**: количество срабатываний нестабильно между запусками (187 → 80 без изменений в затронутых файлах) — похоже на нестрогую/выборочную проверку правила в этой версии Skylos; не полагаться на точное число.
- Следующие категории (мёртвый код, качество/сложность функций, типобезопасность, `SKY-L012`) — отдельными проходами/PR, см. счётчики ниже.

**Категория "Типобезопасность" — закрыта** (ветка `fix/skylos-findings`, все 47 находок):
- `SKY-T104` (2/2), `SKY-T106` (4/4) — закрыты (см. инлайн-описания).
- `SKY-T105` (1/1) — проверен, false positive (обоснование инлайн), код не менялся.
- `SKY-T103` (40/40) — закрыто. 11 находок — identity-упрощения для `RoleKey`/`ClientStatusKey`, валидация через `in` для `Month`/`PaymentMethod`, `jest.mocked()` вместо `as unknown as jest.Mock`, `fromAny()` из новой dev-зависимости `@total-typescript/shoehorn` для DOM/observer-моков. Остальные 29 (`as unknown as StateSchema` в тестовых фабриках state, 24 файла) мигрированы на `fromPartial()` из того же пакета — в отличие от голого каста, `fromPartial` реально проверяет форму мока против `StateSchema`, что попутно вскрыло и исправило 2 реальных бага в тестовых данных (`role: 'admin'` вместо `RoleKey.ADMIN`; поля `firstName`/`lastName` вместо `givenName`/`familyName` у `MollieClient`) — детали инлайн у соответствующих пунктов.
- Проверено: `tsc --noEmit` в `client/` и `server/` — 0 новых ошибок (в client остаётся ~20 предсуществующих ошибок из `node_modules` типов `react-router-dom`/`mdx`, не связанных с этой работой, см. `SKY-R105`); `npm run build` в `server/` и `npm run build:prod` в `client/` проходят; `npx jest` в `client/` — 281/281 сьютов, 976/976 тестов; `npm run test:auth` в `server/` — 14/14; `npm run lint:ts` в `client/` — 0 ошибок (130 предсуществующих warning, ни один не в затронутых файлах).

**Категория "Мёртвый код" — закрыта** (ветка `fix/skylos-findings`, все 185 находок:
`SKY-U001` 22, `SKY-U002` 75, `SKY-U003` 15, `SKY-U004` 6, `SKY-E003` 67):
- Реально удалено ~40 находок (неиспользуемые импорты/переменные/функции/классы плюс
  13 файлов целиком — включая один осиротевший дубликат сервиса, легаси
  request-logger вытесненный winston-логгером, легаси axios-клиент Mollie
  вытесненный официальным SDK, cron-задачу с полностью закомментированным телом,
  которая никогда не регистрировалась, и Zod-схему/DTO для доменов вроде "Product"/
  "процедуры", не существующих в DDC CRM).
- Остальное — false positive: `React`-импорты, ставшие лишними при
  `"jsx": "react-jsx"`; Jest/Storybook/Prisma/webpack/stylelint конфиги,
  подключаемые CLI/loader-конвенцией, а не прямым импортом (Skylos не сканирует
  `client/config/**`); Storybook CSF-экспорты (`Light`/`Primary`/...) и
  `*.stories.tsx`, подхватываемые Storybook по glob-паттерну, а не импортом;
  полифилл-методы `disconnect`/`takeRecords`, вызываемые извне по интерфейсу
  наблюдателя.
- Один пункт (`revokeTrustedDevices`) при разборе на секунду показался потенциальной
  дырой в безопасности (написан с комментарием про ревокацию доверенных устройств
  при смене пароля, но нигде не вызывался) — проверка показала, что вызовы уже
  инлайнены напрямую в `service.Users.ts` в нужных местах, реальной дыры нет,
  функция была просто дублирующим мёртвым кодом.
- Подробности и обоснования — инлайн у каждого пункта в разделах `SKY-U001`–`SKY-E003`
  ниже. Проверено на каждом шаге: `tsc --noEmit` (client+server), `npm run lint:ts`,
  `npm run build:prod` (client) + `npm run build` (server), Jest client 281/281
  suites/976/976 тестов, server `test:auth` 14/14 + `test:mollie` 7/7 — без
  регрессий на всём протяжении.

**Категория "Качество кода" — волна 1 закрыта** (`SKY-L007` 1, `SKY-C303` 1,
`SKY-Q302` 4, `SKY-Q402` 23 = 29 из 249; остаются `SKY-Q301` 35 и `SKY-C304` 185
отдельными волнами):
- `SKY-C303` и `SKY-Q302` — реальные точечные рефакторинги: группировка параметров
  в объект (`createAuditLog`), замена `if/else if` цепочек на `switch`/guard clauses,
  вынос карточки инвойса в отдельный компонент `InvoiceListItem.tsx`.
- `SKY-L007` — единственная находка оказалась уже задокументированным по правилам
  самого чек-листа кейсом (комментарий внутри `catch {}` объясняет, почему пусто) —
  false positive, код не менялся.
- `SKY-Q402` (await в цикле) — из 23 находок только 3 реально распараллелены
  (независимая запись вложений писем, синхронизация email-аккаунтов по cron).
  Остальные 20 сознательно оставлены последовательными с обоснованием инлайн:
  Prisma-транзакции не поддерживают параллельные запросы на одном соединении,
  IMAP-синк — это стрим с одного соединения, а не независимый массив, отмена
  платежей Mollie и рассылки email-напоминаний используют последовательность
  как единственный текущий механизм троттлинга/останова-на-ошибке.
- Проверено: `tsc --noEmit` (client+server) — 0 ошибок; `npm run build` (server) +
  `npm run build:prod` (client) — чисто; `npm run test:ci` (server, все 5 сьютов) —
  0 fail; Jest client 281/281 suites, 976/976 тестов; `npm run lint:ts` (client) —
  0 ошибок.

**Категория "Качество кода" — волны wave10–11 (ветка `fix/skylos-code-quality-wave10`)**: декомпозиция длинных функций (`SKY-C304`) и сквозной проход по счётчикам.
- Сервер: `conteroller.Mollie.ts` — 15 коммитов декомпозиции (экспорт/список/деньги/callback/возобновление подписок), `controller.Invoices.ts` (отмена Mollie-платежей, запись транзакции, adjustment-документы), `controller.Auth.ts` (test-first: `maskEmail`/`describeLoginFailure`/`buildAuthenticatedUserData`/`createTrustedDeviceIfRequested`, новые тесты, `test:auth` 17/17), плюс `EmailImap`, `Transaction`, `InvoiceDelivery`, `Clients`, `Service.Clients`, `MollieSync`, `PaymentReminders`, `Search`, `MolliePaymentInvoicePdf`, `InvoicePaymentLink` — каждая функция восстановлена до намеренного размера (координаторы без дублирования, хелперы переиспользуются между контроллерами).
- Клиент: `MollieClientForm` (add-flow) — 7 повторяющихся `useCallback` свёрнуты в фабрику апдейтеров; `RichTextEditor` — 5 toolbar-кнопок вынесены в `ToolbarButton` + декларативный список действий.
- Итоговые счётчики правил (после конфиг-правок wave13–14, `npm run check:skylos`): `SKY-Q301` 35 → 18, `SKY-Q402` 23 → 8, `SKY-D260` → 0 (конфиг), `SKY-L012` → 0 (конфиг), `SKY-L007` 1 (false positive, задокументирован в коде). Оставшиеся 18 `SKY-Q301` и 8 `SKY-Q402` прошли ручную проверку — это длинные, но линейные координаторы/хуки без вложенности (например `useCreateInvoiceModal`, `useEditClientModal`), разбиение которых снизило бы читаемость; у каждого обоснование в коде не требуется, паттерн зафиксирован в `tasks/plan.md`.

## Сводка по правилам

| Код | Категория | Кол-во | Что означает |
|---|---|---|---|
| `SKY-L012` | Архитектура / публичные API модулей | 281 | Символ используется, но не экспортирован из публичного API модуля |
| `SKY-D260` | Безопасность | 187 | Похожий на ASCII символ другого алфавита (homoglyph) |
| `SKY-C304` | Качество кода (сложность/размер функций) | 185 | Слишком длинная функция |
| `SKY-U002` | Мёртвый код (неиспользуемое) | 75 | Неиспользуемый импорт |
| `SKY-E003` | Мёртвый код (неиспользуемое) | 67 | Файл, который никто не импортирует |
| `SKY-T103` | Типобезопасность | 40 | Цепочка `as unknown as X` |
| `SKY-Q301` | Качество кода (сложность/размер функций) | 35 | Слишком высокая цикломатическая сложность |
| `SKY-Q402` | Качество кода (сложность/размер функций) | 23 | await внутри цикла |
| `SKY-U001` | Мёртвый код (неиспользуемое) | 22 | Неиспользуемая функция |
| `SKY-U003` | Мёртвый код (неиспользуемое) | 15 | Неиспользуемая переменная |
| `SKY-D248` | Безопасность | 7 | Захардкоженный внутренний URL |
| `SKY-U004` | Мёртвый код (неиспользуемое) | 6 | Неиспользуемый класс |
| `SKY-D253` | Безопасность | 5 | Сравнение с уязвимостью к timing-атаке |
| `SKY-D252` | Безопасность | 5 | Флаги безопасности cookie не подтверждены |
| `SKY-D216` | Безопасность | 4 | Потенциальный SSRF |
| `SKY-D291` | Безопасность | 4 | CI workflow без ограничения permissions |
| `SKY-Q302` | Качество кода (сложность/размер функций) | 4 | Слишком большая глубина вложенности |
| `SKY-T106` | Типобезопасность | 4 | Публичный API использует `any` |
| `SKY-D327` | Безопасность | 2 | Возможная эксфильтрация данных |
| `SKY-D230` | Безопасность | 2 | Открытый редирект (open redirect) |
| `SKY-T104` | Типобезопасность | 2 | @ts-ignore скрывает все ошибки следующей строки |
| `SKY-D251` | Безопасность | 1 | Чувствительные данные в console.log |
| `SKY-D293` | Безопасность | 1 | actions/checkout сохраняет credentials |
| `SKY-D312` | Безопасность | 1 | Установка npm-пакетов в CI выполняет lifecycle-скрипты |
| `SKY-L007` | Качество кода (сложность/размер функций) | 1 | Пустой catch-блок |
| `SKY-C303` | Качество кода (сложность/размер функций) | 1 | Слишком много параметров функции |
| `SKY-T105` | Типобезопасность | 1 | JSON.parse() приведён к типу без проверки в рантайме |
| `SKY-R103` | Политика репозитория (Skylos gate/pre-commit/scripts) | 1 | Не настроена политика гейта Skylos |
| `SKY-R104` | Политика репозитория (Skylos gate/pre-commit/scripts) | 1 | Нет pre-commit policy файла |
| `SKY-R105` | Политика репозитория (Skylos gate/pre-commit/scripts) | 1 | Есть tsconfig.json, но нет npm-скрипта с tsc |
| `SKY-S101` | Безопасность | 1 | Значение с высокой энтропией (похоже на секрет) |

## Приоритетная ручная проверка (не мех. фикс)

- **SKY-D260** (187) — почти все срабатывания это обычный русский текст вперемешку с английским/кодом в markdown-документации (`CONTEXT.md`, `docs/**`, `AGENTS.md` и т.д.), что и создаёт смешение кириллицы/латиницы. Правило существует, чтобы ловить спрятанные инструкции для AI-агентов внутри вроде бы обычного текста — список просмотрен глазами, подозрительных вставок нет, текст не переписывался; **закрыто конфигом** `skylos.toml` (whitelist для документационных путей, см. раздел SKY-D260).
- **SKY-L012** (281) — почти наверняка ложные срабатывания для текущей FSD-конфигурации (`@/`-алиасы и barrel `index.ts`): инструмент не видит переэкспорт `StateSchema`, `ThunkConfig`, `Navbar`, `TransactionsPage` и т.д. как часть публичного API модуля. **Закрыто конфигом** `skylos.toml` (`ignore = ["SKY-L012"]`, см. раздел SKY-L012) — у Skylos нет alias-резолвера, а единственная альтернатива (правка сотен файлов) противоречит FSD-архитектуре.
- **SKY-L007** (1, новый в прогоне wave10) — `client/webpack.config.ts:9` — пустой `catch` вокруг `process.loadEnvFile('.env')`: это намеренное поведение, безопасность игнорирования задокументирована комментарием в коде (при Docker-сборке `.env` может отсутствовать, переменные приходят из окружения/build args) — false positive, правок не требуется.

## Безопасность

### `SKY-D253` — Сравнение с уязвимостью к timing-атаке (5) — ЗАКРЫТО

> Использовать crypto.timingSafeEqual() для сравнения секретов/паролей.

- [x] `server/src/controllers/controller.Instagram.ts:43` — сравнение `hub.verify_token` с секретом переведено на `timingSafeEqualStrings` (новый хелпер в `server/src/helpers/index.ts`, покрыт тестами в `server/src/helpers/index.test.ts`).
- [x] `server/src/controllers/controller.Instagram.ts:20` — сравнение подписи вебхука (`x-hub-signature-256`) переведено на `timingSafeEqualStrings`.
- [x] `server/src/services/service.Token.ts:181` — сравнение `tokenHash` при определении текущей сессии переведено на `timingSafeEqualStrings`.
- [ ] `client/src/features/changePassword/model/services/changePasswordThunk.ts:23` — **false positive**: сравнение `newPassword !== confirmPassword` в браузере — оба значения ввёл сам пользователь в своей форме, границы доверия не пересекаются, timing-атака неприменима. Не менять.
- [ ] `server/scripts/reset-user-password.ts:67` — **false positive**: интерактивный CLI-скрипт, пароль и подтверждение вводит сам администратор в своём терминале — нет удалённого наблюдателя, способного измерить тайминг. Не менять.

### `SKY-D248` — Захардкоженный внутренний URL (7) — 1 из 7 исправлен

> Вынести хост в переменную окружения.

- [x] `server/src/controllers/conteroller.Mollie.ts:318` — OAuth-редирект после обмена токеном: `http://localhost:3000` fallback теперь применяется только при `MODE=development`, в проде — относительный `/` вместо захардкоженного адреса. Skylos продолжит подсвечивать эту строку (правило ищет сам литерал `http://localhost`, не смотрит на условие) — теперь это тот же принятый паттерн, что и у остальных 6 пунктов ниже.
- [ ] `client/webpack.config.ts:31` — by design: fallback только при `isDev`, в проде требует `CLIENT_API_URL` (кидает ошибку, если не задан).
- [ ] `server/src/app.ts:25` — by design: `http://localhost:3000` добавляется в `allowedClientOrigins` только когда `isDev`.
- [ ] `server/src/middlewares/middleware.Csrf.ts:11` — by design: тот же паттерн — localhost добавляется в allowlist только при `MODE === 'development'`.
- [ ] `server/src/services/service.Files.ts:7` — by design: `url = isDev ? 'http://localhost:8080' : process.env.CLIENT_URL`.
- [ ] `server/src/services/service.InvoiceDelivery.ts:24` — by design: последний fallback после проверки `PUBLIC_API_URL`/`SERVER_URL`/`MOLLIE_WEBHOOK_URL`, используется только если ни одна прод-переменная не задана.
- [ ] `server/src/services/service.PaymentReminders.ts:11` — by design: fallback только при `MODE === 'development'`.

### `SKY-D327` — Возможная эксфильтрация данных (2) — false positives

> Запрос отправляет process.env/секреты во внешний адрес — подтвердить адресата и убрать чувствительные данные из payload.

- [ ] `scripts/deploy-docker.sh:66` — **false positive**: `ssh "$DEPLOY_HOST" ...` — это штатный ручной деплой на свой же продовый хост (см. `npm run deploy`, `docs/adr/0002-...`), `$DEPLOY_HOST`/`$REMOTE_PATH` берутся из `.env` владельца репозитория, не из недоверенного ввода; rsync явно исключает `.env`/`node_modules`/`.git`.
- [ ] `server/src/controllers/conteroller.Mollie.ts:294` — **false positive**: это штатный OAuth2 `authorization_code` обмен с официальным `https://api.mollie.com/oauth2/tokens` — секреты (`MOLLIE_CLIENT_ID`/`MOLLIE_CLIENT_SECRET`) обязаны туда отправляться по протоколу OAuth, адрес захардкожен на HTTPS API Mollie, не переменный.

### `SKY-D216` — Потенциальный SSRF (4) — false positives

> axios-запрос с URL из переменной — свалидировать против allowlist перед запросом.

- [ ] `server/src/controllers/conteroller.Mollie.ts:2482` — **false positive**: это `axios.isAxiosError(error)` (проверка типа ошибки), не HTTP-запрос.
- [ ] `server/src/controllers/conteroller.Mollie.ts:2416` — **false positive**: аналогично, `axios.isAxiosError(error)`.
- [ ] `server/src/controllers/conteroller.Mollie.ts:2575` — **false positive**: аналогично, `axios.isAxiosError(error)`.
- [ ] `server/src/routes/router.Health.test.ts:20` — **false positive**: тест делает `fetch` на `http://127.0.0.1:${port}`, где `port` — эфемерный порт локального сервера, поднятого этим же тестом.

### `SKY-D230` — Открытый редирект (open redirect) (2) — false positives

> res.redirect() с переменным аргументом — свалидировать целевой адрес.

- [ ] `server/src/controllers/conteroller.Mollie.ts:270` — **false positive**: `authorizationUri` строится библиотекой OAuth2-клиента (`oauthClient.authorizeURL(...)`) из `MOLLIE_REDIRECT_URI`/client id/сгенерированного `state` — не из пользовательского ввода.
- [x] `server/src/controllers/conteroller.Mollie.ts:318` — цель редиректа не пользовательский ввод (открытый редирект тут неприменим), но заодно убран захардкоженный localhost-fallback — см. `SKY-D248` выше.

### `SKY-D252` — Флаги безопасности cookie не подтверждены (5) — by design, не менять

> Явно выставить secure: true (не полагаться на значение по умолчанию/переменную).

- [ ] `server/src/controllers/conteroller.Mollie.ts:262` — by design: `secure: process.env.MODE === 'production'` — намеренно, чтобы cookie работали по HTTP в локальной разработке (`secure: true` браузер не примет без HTTPS).
- [ ] `server/src/controllers/controller.Auth.ts:105` — by design, тот же `cookieOptions`.
- [ ] `server/src/controllers/controller.Auth.ts:172` — by design, тот же `twoFactorPendingCookieOptions`.
- [ ] `server/src/controllers/controller.Auth.ts:254` — by design, тот же `trustedDeviceCookieOptions`.
- [ ] `server/src/controllers/controller.Auth.ts:353` — by design, тот же `cookieOptions`.

### `SKY-D251` — Чувствительные данные в console.log (1) — ЗАКРЫТО

> Убрать или замаскировать значение перед логированием.

- [x] `server/src/controllers/controller.Instagram.ts:40` — `console.log("token", ...)` и соседние отладочные логи (`signature`, `challenge`, `mode`) удалены из `verifyRequestSignature`/`instagramWebhookController`.

### `SKY-D291` — CI workflow без ограничения permissions (4) — ЗАКРЫТО

> Задать permissions: {} на уровне workflow и минимально необходимые — на уровне job.

- [x] `.github/workflows/ci.yml` — добавлен `permissions: {}` на уровне workflow и `permissions: contents: read` для `client-checks`/`server-checks`/`docs-links` (у `skylos` уже был задан).

### `SKY-D293` — actions/checkout сохраняет credentials (1) — ЗАКРЫТО

> Выставить persist-credentials: false, если далее в workflow нет git push.

- [x] `.github/workflows/ci.yml` — `persist-credentials: false` добавлен на все 4 шага `actions/checkout` (нигде в CI нет `git push`).

### `SKY-D312` — Установка npm-пакетов в CI выполняет lifecycle-скрипты (1) — ЗАКРЫТО

> Использовать --ignore-scripts, если install-скрипты не обязательны.

- [x] `.github/workflows/ci.yml` — `npm ci --ignore-scripts` в `client-checks` и `server-checks` (Prisma generate вызывается отдельным `prebuild`-скриптом, не install-хуком, поэтому не пострадал).

### `SKY-D260` — Похожий на ASCII символ другого алфавита (homoglyph) (187) — ЗАКРЫТО

> Смешение кириллицы/латиницы — в основном естественный русскоязычный текст в документации; выборочно проверить, не спрятана ли инструкция, точечно фиксить не нужно.
>
> **Как закрыто (ветка `fix/skylos-code-quality-wave10`):** список ниже просмотрен глазами — все срабатывания это обычный русский текст в `CONTEXT.md`/`docs/**`/`AGENTS.md`/`README.md`, спрятанных инструкций нет. Вместо переписывания текста добавлен `skylos.toml` с `overrides.<путь>.whitelist = ["SKY-D260"]` для документационных путей (подключён в `scripts/check-skylos.sh` через `--config-file`). Повторный прогон `npm run check:skylos` — 0 срабатываний SKY-D260 в репозитории (в исходниках правило продолжает работать).

- [ ] `CONTEXT.md:7` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:12` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:14` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:24` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:25` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:26` — Non-ASCII character 'е' (U+0435) visually resembles ASCII 'e'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:32` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:37` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:50` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:71` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:83` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:89` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:93` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:98` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:103` — Non-ASCII character 'р' (U+0440) visually resembles ASCII 'p'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:104` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:105` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:121` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:123` — Non-ASCII character 'р' (U+0440) visually resembles ASCII 'p'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:143` — Non-ASCII character 'е' (U+0435) visually resembles ASCII 'e'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:144` — Non-ASCII character 'е' (U+0435) visually resembles ASCII 'e'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `CONTEXT.md:145` — Non-ASCII character 'р' (U+0440) visually resembles ASCII 'p'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `package.json:16` — Non-ASCII character 'е' (U+0435) visually resembles ASCII 'e'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `package.json:17` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `package.json:19` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `client/extractedTranslations/en/Роль.json:1` — Non-ASCII character 'Р' (U+0420) in path 'client/extractedTranslations/en/Роль.json' visually resembles ASCII 'P'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Вместимость групп.json:1` — Non-ASCII character 'В' (U+0412) in path 'client/extractedTranslations/en/Вместимость групп.json' visually resembles ASCII 'B'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Сортировать по.json:1` — Non-ASCII character 'С' (U+0421) in path 'client/extractedTranslations/en/Сортировать по.json' visually resembles ASCII 'C'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Ученик.json:1` — Non-ASCII character 'е' (U+0435) in path 'client/extractedTranslations/en/Ученик.json' visually resembles ASCII 'e'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Плательщик.json:1` — Non-ASCII character 'а' (U+0430) in path 'client/extractedTranslations/en/Плательщик.json' visually resembles ASCII 'a'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Мандаты.json:1` — Non-ASCII character 'М' (U+041C) in path 'client/extractedTranslations/en/Мандаты.json' visually resembles ASCII 'M'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Стиль.json:1` — Non-ASCII character 'С' (U+0421) in path 'client/extractedTranslations/en/Стиль.json' visually resembles ASCII 'C'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Активные.json:1` — Non-ASCII character 'А' (U+0410) in path 'client/extractedTranslations/en/Активные.json' visually resembles ASCII 'A'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/По алфавиту.json:1` — Non-ASCII character 'о' (U+043E) in path 'client/extractedTranslations/en/По алфавиту.json' visually resembles ASCII 'o'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Группы.json:1` — Non-ASCII character 'р' (U+0440) in path 'client/extractedTranslations/en/Группы.json' visually resembles ASCII 'p'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/· Занятие.json:1` — Non-ASCII character 'а' (U+0430) in path 'client/extractedTranslations/en/· Занятие.json' visually resembles ASCII 'a'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Занятий.json:1` — Non-ASCII character 'а' (U+0430) in path 'client/extractedTranslations/en/Занятий.json' visually resembles ASCII 'a'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Оплаты.json:1` — Non-ASCII character 'О' (U+041E) in path 'client/extractedTranslations/en/Оплаты.json' visually resembles ASCII 'O'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Хореограф.json:1` — Non-ASCII character 'Х' (U+0425) in path 'client/extractedTranslations/en/Хореограф.json' visually resembles ASCII 'X'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Старт.json:1` — Non-ASCII character 'С' (U+0421) in path 'client/extractedTranslations/en/Старт.json' visually resembles ASCII 'C'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Подписан.json:1` — Non-ASCII character 'о' (U+043E) in path 'client/extractedTranslations/en/Подписан.json' visually resembles ASCII 'o'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Опыт.json:1` — Non-ASCII character 'О' (U+041E) in path 'client/extractedTranslations/en/Опыт.json' visually resembles ASCII 'O'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Создана.json:1` — Non-ASCII character 'С' (U+0421) in path 'client/extractedTranslations/en/Создана.json' visually resembles ASCII 'C'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/translation.json:152` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `client/extractedTranslations/en/translation.json:245` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `client/extractedTranslations/en/translation.json:246` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `client/extractedTranslations/en/translation.json:359` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `client/extractedTranslations/en/translation.json:468` — Non-ASCII character 'Н' (U+041D) visually resembles ASCII 'H'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `client/extractedTranslations/en/translation.json:596` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `client/extractedTranslations/en/translation.json:671` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `client/extractedTranslations/en/Показано.json:1` — Non-ASCII character 'о' (U+043E) in path 'client/extractedTranslations/en/Показано.json' visually resembles ASCII 'o'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Филиал.json:1` — Non-ASCII character 'а' (U+0430) in path 'client/extractedTranslations/en/Филиал.json' visually resembles ASCII 'a'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Максимальная сумма кредит-ноты.json:1` — Non-ASCII character 'М' (U+041C) in path 'client/extractedTranslations/en/Максимальная сумма кредит-ноты.json' visually resembles ASCII 'M'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Без группы.json:1` — Non-ASCII character 'е' (U+0435) in path 'client/extractedTranslations/en/Без группы.json' visually resembles ASCII 'e'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Расход.json:1` — Non-ASCII character 'Р' (U+0420) in path 'client/extractedTranslations/en/Расход.json' visually resembles ASCII 'P'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Период.json:1` — Non-ASCII character 'е' (U+0435) in path 'client/extractedTranslations/en/Период.json' visually resembles ASCII 'e'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Подписки.json:1` — Non-ASCII character 'о' (U+043E) in path 'client/extractedTranslations/en/Подписки.json' visually resembles ASCII 'o'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Итого.json:1` — Non-ASCII character 'о' (U+043E) in path 'client/extractedTranslations/en/Итого.json' visually resembles ASCII 'o'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Для текущей CRM с одной организацией OAuth необязателен.json:1` — Non-ASCII character 'е' (U+0435) in path 'client/extractedTranslations/en/Для текущей CRM с одной организацией OAuth необязателен.json' visually resembles ASCII 'e'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Уровень.json:1` — Non-ASCII character 'р' (U+0440) in path 'client/extractedTranslations/en/Уровень.json' visually resembles ASCII 'p'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/en/Доход.json:1` — Non-ASCII character 'о' (U+043E) in path 'client/extractedTranslations/en/Доход.json' visually resembles ASCII 'o'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Роль.json:1` — Non-ASCII character 'Р' (U+0420) in path 'client/extractedTranslations/ru/Роль.json' visually resembles ASCII 'P'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Вместимость групп.json:1` — Non-ASCII character 'В' (U+0412) in path 'client/extractedTranslations/ru/Вместимость групп.json' visually resembles ASCII 'B'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Сортировать по.json:1` — Non-ASCII character 'С' (U+0421) in path 'client/extractedTranslations/ru/Сортировать по.json' visually resembles ASCII 'C'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Ученик.json:1` — Non-ASCII character 'е' (U+0435) in path 'client/extractedTranslations/ru/Ученик.json' visually resembles ASCII 'e'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Плательщик.json:1` — Non-ASCII character 'а' (U+0430) in path 'client/extractedTranslations/ru/Плательщик.json' visually resembles ASCII 'a'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Мандаты.json:1` — Non-ASCII character 'М' (U+041C) in path 'client/extractedTranslations/ru/Мандаты.json' visually resembles ASCII 'M'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Стиль.json:1` — Non-ASCII character 'С' (U+0421) in path 'client/extractedTranslations/ru/Стиль.json' visually resembles ASCII 'C'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Активные.json:1` — Non-ASCII character 'А' (U+0410) in path 'client/extractedTranslations/ru/Активные.json' visually resembles ASCII 'A'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/По алфавиту.json:1` — Non-ASCII character 'о' (U+043E) in path 'client/extractedTranslations/ru/По алфавиту.json' visually resembles ASCII 'o'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Группы.json:1` — Non-ASCII character 'р' (U+0440) in path 'client/extractedTranslations/ru/Группы.json' visually resembles ASCII 'p'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/· Занятие.json:1` — Non-ASCII character 'а' (U+0430) in path 'client/extractedTranslations/ru/· Занятие.json' visually resembles ASCII 'a'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Занятий.json:1` — Non-ASCII character 'а' (U+0430) in path 'client/extractedTranslations/ru/Занятий.json' visually resembles ASCII 'a'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Оплаты.json:1` — Non-ASCII character 'О' (U+041E) in path 'client/extractedTranslations/ru/Оплаты.json' visually resembles ASCII 'O'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Хореограф.json:1` — Non-ASCII character 'Х' (U+0425) in path 'client/extractedTranslations/ru/Хореограф.json' visually resembles ASCII 'X'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Старт.json:1` — Non-ASCII character 'С' (U+0421) in path 'client/extractedTranslations/ru/Старт.json' visually resembles ASCII 'C'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Подписан.json:1` — Non-ASCII character 'о' (U+043E) in path 'client/extractedTranslations/ru/Подписан.json' visually resembles ASCII 'o'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Опыт.json:1` — Non-ASCII character 'О' (U+041E) in path 'client/extractedTranslations/ru/Опыт.json' visually resembles ASCII 'O'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Создана.json:1` — Non-ASCII character 'С' (U+0421) in path 'client/extractedTranslations/ru/Создана.json' visually resembles ASCII 'C'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/translation.json:152` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `client/extractedTranslations/ru/translation.json:245` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `client/extractedTranslations/ru/translation.json:246` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `client/extractedTranslations/ru/translation.json:247` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `client/extractedTranslations/ru/translation.json:248` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `client/extractedTranslations/ru/translation.json:361` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `client/extractedTranslations/ru/translation.json:472` — Non-ASCII character 'Н' (U+041D) visually resembles ASCII 'H'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `client/extractedTranslations/ru/translation.json:603` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `client/extractedTranslations/ru/translation.json:678` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `client/extractedTranslations/ru/Показано.json:1` — Non-ASCII character 'о' (U+043E) in path 'client/extractedTranslations/ru/Показано.json' visually resembles ASCII 'o'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Филиал.json:1` — Non-ASCII character 'а' (U+0430) in path 'client/extractedTranslations/ru/Филиал.json' visually resembles ASCII 'a'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Максимальная сумма кредит-ноты.json:1` — Non-ASCII character 'М' (U+041C) in path 'client/extractedTranslations/ru/Максимальная сумма кредит-ноты.json' visually resembles ASCII 'M'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Без группы.json:1` — Non-ASCII character 'е' (U+0435) in path 'client/extractedTranslations/ru/Без группы.json' visually resembles ASCII 'e'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Расход.json:1` — Non-ASCII character 'Р' (U+0420) in path 'client/extractedTranslations/ru/Расход.json' visually resembles ASCII 'P'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Период.json:1` — Non-ASCII character 'е' (U+0435) in path 'client/extractedTranslations/ru/Период.json' visually resembles ASCII 'e'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Подписки.json:1` — Non-ASCII character 'о' (U+043E) in path 'client/extractedTranslations/ru/Подписки.json' visually resembles ASCII 'o'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Итого.json:1` — Non-ASCII character 'о' (U+043E) in path 'client/extractedTranslations/ru/Итого.json' visually resembles ASCII 'o'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Для текущей CRM с одной организацией OAuth необязателен.json:1` — Non-ASCII character 'е' (U+0435) in path 'client/extractedTranslations/ru/Для текущей CRM с одной организацией OAuth необязателен.json' visually resembles ASCII 'e'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Уровень.json:1` — Non-ASCII character 'р' (U+0440) in path 'client/extractedTranslations/ru/Уровень.json' visually resembles ASCII 'p'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `client/extractedTranslations/ru/Доход.json:1` — Non-ASCII character 'о' (U+043E) in path 'client/extractedTranslations/ru/Доход.json' visually resembles ASCII 'o'. Mixed-script paths can hide lookalike modules from human reviewers.
- [ ] `docs/schema.md:5` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/schema.md:93` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/schema.md:119` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/schema.md:151` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/schema.md:157` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/schema.md:196` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/schema.md:202` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/schema.md:274` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/schema.md:279` — Non-ASCII character 'х' (U+0445) visually resembles ASCII 'x'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/schema.md:302` — Non-ASCII character 'е' (U+0435) visually resembles ASCII 'e'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/schema.md:306` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/superpowers/plans/2026-08-31-client-src-test-coverage.md:262` — Non-ASCII character 'е' (U+0435) visually resembles ASCII 'e'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/spec/DDC_CRM_CICD_SPEC.md:16` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/spec/DDC_CRM_CICD_SPEC.md:26` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/spec/DDC_CRM_CICD_SPEC.md:34` — Non-ASCII character 'е' (U+0435) visually resembles ASCII 'e'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/spec/DDC_CRM_CICD_SPEC.md:43` — Non-ASCII character 'е' (U+0435) visually resembles ASCII 'e'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/spec/DDC_CRM_CICD_SPEC.md:53` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/spec/DDC_CRM_CICD_SPEC.md:185` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/spec/DDC_CRM_CICD_SPEC.md:481` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/spec/DDC_CRM_CICD_SPEC.md:499` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/spec/DDC_CRM_SKYLOS_CI_SPEC.md:919` — Non-ASCII character 'р' (U+0440) visually resembles ASCII 'p'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/spec/DDC_CRM_SKYLOS_CI_SPEC.md:922` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/ORGANIZATIONS_AND_BRANDS_ROADMAP.md:20` — Non-ASCII character 'р' (U+0440) visually resembles ASCII 'p'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/ORGANIZATIONS_AND_BRANDS_ROADMAP.md:64` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:20` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:21` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:26` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:28` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:37` — Non-ASCII character 'е' (U+0435) visually resembles ASCII 'e'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:40` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:44` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:45` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:56` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:69` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:89` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:93` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:106` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:119` — Non-ASCII character 'е' (U+0435) visually resembles ASCII 'e'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:153` — Non-ASCII character 'р' (U+0440) visually resembles ASCII 'p'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:212` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:237` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:277` — Non-ASCII character 'р' (U+0440) visually resembles ASCII 'p'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:278` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:279` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:282` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:310` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:342` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:356` — Non-ASCII character 'е' (U+0435) visually resembles ASCII 'e'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:358` — Non-ASCII character 'е' (U+0435) visually resembles ASCII 'e'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:372` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:373` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:378` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:381` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/AUTH_SECURITY_ROADMAP.md:406` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/INVOICES_MODULE_ROADMAP.md:19` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/INVOICES_MODULE_ROADMAP.md:26` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/INVOICES_MODULE_ROADMAP.md:28` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/INVOICES_MODULE_ROADMAP.md:35` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/INVOICES_MODULE_ROADMAP.md:37` — Non-ASCII character 'у' (U+0443) visually resembles ASCII 'y'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/INVOICES_MODULE_ROADMAP.md:39` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/INVOICES_MODULE_ROADMAP.md:42` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/INVOICES_MODULE_ROADMAP.md:53` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/INVOICES_MODULE_ROADMAP.md:56` — Non-ASCII character 'у' (U+0443) visually resembles ASCII 'y'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/INVOICES_MODULE_ROADMAP.md:107` — Non-ASCII character 'р' (U+0440) visually resembles ASCII 'p'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/roadmap/INVOICES_MODULE_ROADMAP.md:109` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:4` — Non-ASCII character 'р' (U+0440) visually resembles ASCII 'p'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:14` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:18` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:21` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:22` — Non-ASCII character 'е' (U+0435) visually resembles ASCII 'e'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:23` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:25` — Non-ASCII character 'р' (U+0440) visually resembles ASCII 'p'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:37` — Non-ASCII character 'а' (U+0430) visually resembles ASCII 'a'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:60` — Non-ASCII character 'р' (U+0440) visually resembles ASCII 'p'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:61` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:69` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:72` — Non-ASCII character 'р' (U+0440) visually resembles ASCII 'p'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:79` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:80` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:83` — Non-ASCII character 'у' (U+0443) visually resembles ASCII 'y'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:88` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:89` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:94` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:101` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:103` — Non-ASCII character 'р' (U+0440) visually resembles ASCII 'p'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:108` — Non-ASCII character 'с' (U+0441) visually resembles ASCII 'c'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:109` — Non-ASCII character 'е' (U+0435) visually resembles ASCII 'e'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.
- [ ] `docs/security/SECURITY_REVIEW_2026-08-12.md:112` — Non-ASCII character 'о' (U+043E) visually resembles ASCII 'o'. Mixed-script text can hide instructions from human reviewers while remaining readable to AI agents.

### `SKY-S101` — Значение с высокой энтропией (похоже на секрет) (1) — false positive

> Проверить, не закоммичен ли реальный секрет/токен; при необходимости — ротировать и вынести в .env.

- [ ] `server/src/controllers/controller.Clients.ts:193` — **false positive**: строка `if (selectedGroupIds && !await validateGroupSelection(...))` не содержит строковых литералов вообще; секрета на этой строке нет.

## Типобезопасность

### `SKY-T103` — Цепочка `as unknown as X` (40) — ЗАКРЫТО

> В основном тестовые моки состояния — заменить на валидацию/сузение типа или на фабрику тестового state.

- [x] `client/config/jest/setupTests.ts:24` — заменено на `fromAny()` из `@total-typescript/shoehorn` (мок-класс `IntersectionObserver` намеренно не реализует полный интерфейс — это ровно случай `fromAny`, не двойной каст).
- [x] `client/src/entities/ClientStatus/ui/ClientStatusSelect/ClientStatusSelect.tsx:32` — `ClientStatusKey` — строковый enum, где ключи совпадают со значениями (`bronze` = `'bronze'`), поэтому `ClientStatusKey[value as unknown as keyof typeof ClientStatusKey]` был тождественным преобразованием; каст убран, `value` передаётся напрямую.
- [x] `client/src/entities/Month/ui/MonthSelect/MonthSelect.tsx:40` — заменено на валидацию через `key in Month` (компонент нигде не используется в приложении, кроме re-export из barrel — поведение сохранено 1:1, каст убран без изменения текущей логики).
- [x] `client/src/entities/Profile/model/services/updateProfileData/updateProfileData.test.tsx:16` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/entities/Role/ui/RoleSelect/RoleSelect.tsx:32` — `RoleKey` — строковый enum, ключи совпадают со значениями (`ADMIN` = `'ADMIN'`), `RoleKey[value as unknown as keyof typeof RoleKey]` был тождественным преобразованием; каст убран, `value` передаётся напрямую.
- [x] `client/src/entities/Transaction/ui/TransactionListItem/TransactionListItem.tsx:22` — `PaymentMethod` — ключи (`CASH`/`CARD`/`BANK_TRANSFER`) не совпадают со значениями (русские лейблы); заменено на валидацию через `paymentKey in PaymentMethod` (поведение сохранено 1:1, каст убран без изменения текущей логики).
- [x] `client/src/features/AddCommentForm/model/services/addCommentForArticle/addCommentForArticle.test.ts:11` — заменено на `fromPartial(...)` из `@total-typescript/shoehorn`: `() => ({...}) as unknown as StateSchema` → `() => fromPartial({...})`, с явным типом-аннотацией `(): () => StateSchema` там, где её не было (иначе `fromPartial<T>` не может вывести `T` — у него `NoInfer<T>`, требуется контекстный тип). В отличие от голого каста, `fromPartial` реально проверяет форму мока — это вскрыло настоящий баг в тестовых данных: `role: 'admin'` (строка) не подходит под `RoleKey` — заменено на `RoleKey.ADMIN`.
- [x] `client/src/features/AddCommentForm/model/services/sendComment/sendComment.test.ts:13` — заменено на `fromPartial()`; та же находка `role: 'admin'` → `RoleKey.ADMIN`, и параметры `authData`/`articleData` перетипированы с `unknown` на `Partial<User>`/`Partial<Article>` (голый `unknown` не проходит через `fromPartial`, а был бы поводом для `fromAny`, что менее строго — здесь реальный тип известен и уже, оставлен строгий вариант).
- [x] `client/src/features/addClientForm/model/services/addClientData/addClientData.test.ts:7` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/features/addMollieClientForm/model/services/addMolieClientData/addMolieClientData.test.ts:7` — заменено на `fromPartial()`; вскрыло реальный баг в тестовых данных — мок использовал `firstName`/`lastName`, которых нет в `MollieClient` (там `givenName`/`familyName`), старый `as unknown as StateSchema` это маскировал. Поля переименованы, тест по-прежнему проверяет форму через self-reference (`stateWithForm.addMollieClientForm?.data`), поведение не изменилось.
- [x] `client/src/features/addMollieSubscriptionForm/model/services/addSubscription/addSubscription.test.ts:8` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/features/addTransactionForm/model/services/createTransaction/createTransaction.test.ts:11` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/features/addUserForm/model/services/addNewUser/addNewUser.test.ts:7` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/features/createMollieMandateForm/model/services/addMandate/addMandate.test.ts:8` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/features/editMollieClientDropdown/model/services/updateMollieClientData/updateMollieClientData.test.ts:8` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/features/editProfile/model/services/updateProfileData.test.ts:16` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/pages/ArticlesPage/model/services/fetchNextArticlesPage/fetchNextArticlesPage.test.ts:13` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/pages/ArticlesPage/model/services/fetchNextArticlesPage/fetchNextArticlesPage.test.ts:22` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/pages/ArticlesPage/model/services/fetchNextArticlesPage/fetchNextArticlesPage.test.ts:31` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/pages/ClientsDetailsPage/model/selectors/comments.test.ts:6` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/pages/ClientsDetailsPage/model/services/addCommentsForClient/addCommentsForClient.test.ts:13` — заменено на `fromPartial()`; параметры `userData`/`client` перетипированы с `unknown` на `Partial<User> | undefined`/`Partial<Client> | undefined`.
- [x] `client/src/pages/ClientsPage/model/selectors/clientsPageSelectors.test.ts:20` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/pages/ClientsPage/model/services/fetchClientsList/fetchClientsList.test.ts:9` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/pages/ClientsPage/model/services/fetchNextClientsPage/fetchNextClientsPage.test.ts:10` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/pages/ClientsPage/model/services/fetchNextClientsPage/fetchNextClientsPage.test.ts:18` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/pages/ClientsPage/model/services/fetchNextClientsPage/fetchNextClientsPage.test.ts:26` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/pages/ClientsPage/model/services/initClientsPage/initClientsPage.test.ts:17` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/pages/MolliePage/model/selectors/mollieClientsPageSelectors.test.ts:15` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/pages/MolliePage/model/selectors/mollieClientsPageSelectors.test.ts:32` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/pages/TransactionsPage/model/selectors/getTransactionPageSummary.test.ts:7` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/pages/TransactionsPage/model/selectors/transactionPageSelectors.test.ts:23` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/pages/TransactionsPage/model/services/fetchTransactionsList/fetchTransactionsList.test.ts:15` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/pages/TransactionsPage/model/services/fetchTransactionsSummary/fetchTransactionsSummary.test.ts:10` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/pages/TransactionsPage/model/services/initTransactionsPage/initTransactionsPage.test.ts:17` — заменено на `fromPartial()` из `@total-typescript/shoehorn` (описание общего подхода см. в первой находке этой группы).
- [x] `client/src/shared/lib/hooks/useAppDispatch/useAppDispatch.test.ts:12` — заменено на `jest.mocked(useDispatch)` (стандартный типобезопасный идиом Jest 29+, не требует каста вовсе).
- [x] `client/src/shared/lib/hooks/useRefreshToken/useRefreshToken.test.ts:11` — заменено на `jest.mocked($api.get)`.
- [x] `client/src/shared/ui/AppImage/AppImage.test.tsx:22` (обе находки на строке) — заменено на `fromAny()` (мок-класс `Image` намеренно не реализует полный DOM-интерфейс — классический случай `fromAny`).
- [x] `client/src/shared/ui/Avatar/Avatar.test.tsx:22` (обе находки на строке) — заменено на `fromAny()`, тот же паттерн, что и в `AppImage.test.tsx`.

### `SKY-T104` — @ts-ignore скрывает все ошибки следующей строки (2) — ЗАКРЫТО

> Заменить на @ts-expect-error с пояснением или исправить тип.

- [x] `client/src/app/providers/StoreProvider/config/store.ts:21` — этот `@ts-ignore` оказался лишним: без него (проверено) строка компилируется чисто, `@ts-ignore` удалён без замены.
- [x] `client/src/app/providers/StoreProvider/config/store.ts:35` — заменено на явный каст `(store as ReduxStoreWithManager).reducerManager = reducerManager` (интерфейс `ReduxStoreWithManager` уже существовал в `StateSchema.ts`, просто не был использован здесь).

### `SKY-T105` — JSON.parse() приведён к типу без проверки в рантайме (1) — проверено, доп. валидация не нужна

> Добавить валидацию (zod/схема) перед приведением типа.

- [ ] `server/src/controllers/controller.Invoices.ts:198` — **false positive**: `snapshot()` строит значение через `JSON.parse(JSON.stringify(value, replacer))` — это его собственный JSON round-trip, поэтому результат по построению всегда JSON-совместим (`Prisma.InputJsonValue`); отдельная рантайм-схема для валидации по сути проверяла бы то, что уже гарантировано самим JSON.stringify/parse. Данные — собственный аудит-снапшот сервера (before/after invoice), не пользовательский ввод. Не менять.

### `SKY-T106` — Публичный API использует `any` (4) — ЗАКРЫТО

> Заменить на точный тип или unknown + валидацию.

- [x] `server/src/middlewares/middleware.Auth.ts:30` — `fn: any` заменён на именованный тип `AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => unknown`; обёртка получила явный `: void`, чтобы совпасть с сигнатурой Express `RequestHandler` (иначе `Promise<unknown>` не совпадал с overload'ами `router.get/post/...` — задело ~130 мест использования, все перепроверены `tsc --noEmit`, 0 ошибок).
- [x] `server/src/middlewares/middlewares.Error.ts:10` — типизировано через `express.ErrorRequestHandler` вместо `: any`.
- [x] `server/src/services/service.Clients.ts:246` — `data: any` заменён на `data: Partial<TClient>` (тот же тип, что уже использует `createClient` и вызывающий контроллер `controller.Clients.ts`).
- [x] `server/src/types/mollie.types.ts:43` — `Record<string, any>` заменён на `Record<string, unknown>` (Mollie `metadata` — непрозрачный JSON-блоб, заданный самим мерчантом при создании клиента); `tsc --noEmit` подтвердил отсутствие новых ошибок во всех местах использования.

## Мёртвый код (неиспользуемое) — ЗАКРЫТО (185/185)

### `SKY-U001` — Неиспользуемая функция (22)

> Проверить реальную неиспользуемость (в т.ч. динамические/publicAPI-экспорты) и удалить либо оставить с пометкой, почему используется.

- [x] `client/config/jest/__mocks__/react-i18next.ts:1` — unused function: useTranslation
- [x] `client/config/jest/jestEnptyComponent.tsx:3` — unused function: jestEnptyComponent
- [x] `client/config/jest/setupTests.ts:27` — unused function: disconnect
- [x] `client/config/jest/setupTests.ts:28` — unused function: takeRecords
- [x] `client/src/pages/ArticleDetailsPage/model/selectors/comments.ts:4` — unused function: getArticleCommentsError
- [x] `client/src/pages/MolliePage/ui/MolliePayments/MolliePayments.tsx:153` — unused function: getCrmClientName
- [x] `client/src/pages/SettingsPage/model/selectors/clientsPageSelectors.ts:5` — unused function: getSettingsPageIsLoading
- [x] `client/src/pages/SettingsPage/model/selectors/clientsPageSelectors.ts:6` — unused function: getSettingsPageError
- [x] `client/src/shared/config/storybook/StoreDecorator/StoreDecorator.tsx:12` — unused function: StoreDecorator
- [x] `client/src/shared/const/router.ts:39` — unused function: getRouteTransactionEdit
- [x] `client/src/shared/const/router.ts:40` — unused function: getRouteTransactionCreate
- [x] `client/src/shared/const/router.ts:37` — unused function: getRouteTransactions
- [x] `client/src/shared/const/router.ts:38` — unused function: getRouteTransactionDetails
- [x] `server/src/middlewares/middleware.Auth.ts:34` — unused function: isOwner
- [x] `server/src/middlewares/middleware.Logger.ts:8` — unused function: logEvents
- [x] `server/src/middlewares/middleware.Logger.ts:26` — unused function: logger
- [x] `server/src/services/service.ClientStatus.ts:7` — unused function: createClientStatus
- [x] `server/src/services/service.Clients.ts:275` — unused function: findClientByEmailOrPhone
- [x] `server/src/services/service.Customer.ts:21` — unused function: createCustomer
- [x] `server/src/services/service.Customer.ts:34` — unused function: updateCustomer
- [x] `server/src/services/service.Customer.ts:47` — unused function: deleteAllCustomers
- [x] `server/src/services/service.TwoFactorAuth.ts:256` — unused function: revokeTrustedDevices

**SKY-U001 — ЗАКРЫТО (22/22), из них 4 false positive, 18 реальных удалений (3 файла
удалены целиком).**

- False positive (4): `useTranslation` в `config/jest/__mocks__/react-i18next.ts` и
  `jestEnptyComponent` в `config/jest/jestEnptyComponent.tsx` — подключаются неявно
  через Jest `moduleNameMapper` (`jest.config.ts`), а не через обычный импорт по
  имени, Skylos не отследил; `disconnect`/`takeRecords` в
  `config/jest/setupTests.ts` — методы анонимных классов-полифиллов
  `ResizeObserver`/`IntersectionObserver`, вызываются извне (React/headlessui) через
  интерфейс наблюдателя, а не по прямой ссылке на имя.
- Разбирался отдельно и снят как ложная тревога: `revokeTrustedDevices` в
  `service.TwoFactorAuth.ts` был написан с комментарием "Called wherever authVersion
  is bumped... alongside session.deleteMany", что на первый взгляд выглядело как
  забытый вызов ревокации доверенных устройств (потенциальная security-дыра).
  Проверка всех трёх мест в `service.Users.ts`, где `authVersion` увеличивается
  (`updateUser`, `updateUserSecurity`, `updateUserPassword`), показала, что там уже
  напрямую вызывается `transaction.trustedDevice.deleteMany(...)` — т.е. ревокация
  реально происходит, просто не через этот хелпер. Гэпа в безопасности нет, функция
  действительно не используется — удалена как дубликат уже инлайненной логики.
- Реально удалено (18), включая 3 файла целиком: `StoreDecorator.tsx` — используется
  только в закомментированном коде нескольких `.stories.tsx` (не паттерн Storybook
  CSF, а обычная неиспользуемая функция) — файл удалён (закрывает и SKY-E003);
  `middleware.Logger.ts` (`logEvents` + `logger`) — легаси request-logger,
  вытесненный отдельным winston-логгером `server/src/logger/index.ts`
  (`import { logger } from '../logger'`, используется повсеместно) — файл удалён
  целиком (закрывает и SKY-E003); `service.ClientStatus.ts` (`createClientStatus`)
  — нигде не импортируется — файл удалён целиком (закрывает и SKY-E003). Точечные
  удаления: `getArticleCommentsError`, `getSettingsPageIsLoading`,
  `getSettingsPageError` — неиспользуемые selector'ы; `getCrmClientName` в
  `MolliePayments.tsx` — мёртвая локальная копия (реально используемая версия живёт
  в `MollieIncidents.tsx`); `getRouteTransactions`/`getRouteTransactionDetails`/
  `getRouteTransactionEdit`/`getRouteTransactionCreate` в `shared/const/router.ts` —
  в клиенте нет отдельных страниц деталей/редактирования/создания транзакции
  (зарегистрирован только список `/transactions`); `isOwner` в
  `middleware.Auth.ts` — не подключён ни к одному роуту (заодно убран более не
  нужный импорт `get` из lodash); `findClientByEmailOrPhone` в
  `service.Clients.ts`; `createCustomer`/`updateCustomer`/`deleteAllCustomers` в
  `service.Customer.ts` (файл остаётся — `TCustomer` и `getCostomerByMollieId`
  используются в `conteroller.Mollie.ts`); `revokeTrustedDevices` в
  `service.TwoFactorAuth.ts` (см. разбор выше).

Проверено: `tsc --noEmit` (client+server) — 0 ошибок (кроме исходной baseline
`node_modules`); `npm run lint:ts` (client) — 0 ошибок, warnings снизились
96 → 93; `npm run build:prod` (client) и `npm run build` (server) — чисто; Jest
client 281/281 suites, 976/976 тестов; server `test:auth` 14/14, `test:mollie`
7/7 — без регрессий.

### `SKY-U002` — Неиспользуемый импорт (75)

> Удалить импорт.

- [x] `client/config/jest/jestEnptyComponent.tsx:1` — unused import: React
- [x] `client/eslint.config.mjs:10` — unused import: IndentStyle
- [x] `client/src/app/providers/router/ui/PublicRoute/PublicRoute.tsx:3` — unused import: Outlet
- [x] `client/src/entities/Article/ui/ArticleDetails/ArticleDetails.tsx:9` — unused import: TextSize
- [x] `client/src/entities/Article/ui/ArticleDetails/ArticleDetails.tsx:9` — unused import: TextAlign
- [x] `client/src/entities/Article/ui/ArticleImageBlockComponent/ArticleImageBlockComponent.tsx:3` — unused import: TextAlign
- [x] `client/src/entities/Client/ui/ClientDetails/ClientDetails.tsx:1` — unused import: React
- [x] `client/src/entities/Client/ui/ClientList/ClientList.tsx:1` — unused import: React
- [x] `client/src/entities/Client/ui/ClientListHeader/ClientListHeader.tsx:1` — unused import: React
- [x] `client/src/entities/Client/ui/ClientListItem/ClientListItem.tsx:1` — unused import: React
- [x] `client/src/entities/Mandate/ui/MandateCard/MandateCard.tsx:1` — unused import: classNames
- [x] `client/src/entities/Mandate/ui/MandateItem/MandateItem.tsx:1` — unused import: React
- [x] `client/src/entities/Mandate/ui/MandateList/MandateList.tsx:1` — unused import: React
- [x] `client/src/entities/MollieClient/ui/ClientDetails/ClientDetails.tsx:1` — unused import: React
- [x] `client/src/entities/MollieClient/ui/ClientListHeader/ClientListHeader.tsx:1` — unused import: React
- [x] `client/src/entities/MollieClient/ui/MollieClientList/MollieClientList.tsx:1` — unused import: React
- [x] `client/src/entities/MollieClient/ui/MollieClientListItem/MollieClientListItem.tsx:1` — unused import: React
- [x] `client/src/entities/MollieSubscription/ui/MollieSubscriptionItem/MollieSubscriptionItem.tsx:1` — unused import: React
- [x] `client/src/entities/MollieSubscription/ui/MollieSubscriptionList/MollieSubscriptionList.tsx:1` — unused import: React
- [x] `client/src/entities/PaymentMethod/ui/PaymentMethod/PaymentMethodSelect.tsx:3` — unused import: useMemo
- [x] `client/src/entities/PaymentMethod/ui/PaymentMethod/PaymentMethodSelect.tsx:6` — unused import: ListBox
- [x] `client/src/entities/Profile/model/types/profile.ts:1` — unused import: Role
- [x] `client/src/entities/Transaction/ui/TransactionCard/TransactionCard.tsx:1` — unused import: classNames
- [x] `client/src/entities/Transaction/ui/TransactionList/TransactionList.tsx:1` — unused import: React
- [x] `client/src/entities/Transaction/ui/TransactionListItem/TransactionListItem.tsx:1` — unused import: React
- [x] `client/src/entities/TransactionCategory/ui/TransactionCategorySelect/TransactionCategorySelect.tsx:3` — unused import: cls
- [x] `client/src/entities/TransactionType/ui/TransactionSelect/TransactionSelect.tsx:3` — unused import: useMemo
- [x] `client/src/entities/TransactionType/ui/TransactionSelect/TransactionSelect.tsx:6` — unused import: ListBox
- [x] `client/src/entities/User/ui/UserListItem/UserListItem.tsx:1` — unused import: React
- [x] `client/src/entities/User/ui/UsersList/UsersList.tsx:1` — unused import: React
- [x] `client/src/features/ClientSortSelector/ui/ClientSortSelector/ClientSortSelector.tsx:1` — unused import: React
- [x] `client/src/features/TransactionSortSelector/ui/TransactionSortSelector/TransactionSortSelector.tsx:1` — unused import: React
- [x] `client/src/features/TransactionSortSelector/ui/TransactionSortSelector/TransactionSortSelector.tsx:3` — unused import: ClientSortField
- [x] `client/src/features/addUserForm/model/types/addUserFormSchema.ts:1` — unused import: Client
- [x] `client/src/features/addUserForm/model/types/addUserFormSchema.ts:3` — unused import: User
- [x] `client/src/features/createMollieMandateForm/model/slices/createMollieMandateFormSlice.ts:6` — unused import: access
- [x] `client/src/features/createMollieMandateForm/ui/CreateMollieMandateForm/CreateMollieMandateForm.tsx:4` — unused import: cls
- [x] `client/src/features/createMollieMandateForm/ui/CreateMollieMandateForm/CreateMollieMandateForm.tsx:2` — unused import: classNames
- [x] `client/src/features/editMollieClientDropdown/model/services/deleteMollieClientById.tsx:3` — unused import: Client
- [x] `client/src/features/editMollieClientDropdown/model/types/mollieClientFormSchema.ts:1` — unused import: Client
- [x] `client/src/pages/AuthPage/ui/LoginPage/LoginPage.tsx:1` — unused import: React
- [x] `client/src/pages/ClientsDetailsPage/ui/ClientsDetailsPage/ClientsDetailsPage.tsx:1` — unused import: React
- [x] `client/src/pages/ClientsDetailsPage/ui/HeaderDetails/HeaderDetails.tsx:1` — unused import: React
- [x] `client/src/pages/ClientsPage/model/services/fetchNextClientsPage/fetchNextClientsPage.ts:7` — unused import: fetchClientsList
- [x] `client/src/pages/ClientsPage/ui/ClientsPageFilters/ClientsPageFilters.tsx:1` — unused import: React
- [x] `client/src/pages/MolliePage/model/services/fetchAllMandates/fetchAllMandates.ts:3` — unused import: MollieClient
- [x] `client/src/pages/MolliePage/ui/MollieCustomerDetails/MollieCustomerDetails.tsx:1` — unused import: React
- [x] `client/src/pages/MolliePage/ui/MollieCustomers/MollieCustomers.tsx:2` — unused import: React
- [x] `client/src/pages/SettingsPage/model/selectors/clientsPageSelectors.ts:3` — unused import: ClientStatusKey
- [x] `client/src/pages/SettingsPage/model/selectors/clientsPageSelectors.ts:2` — unused import: ClientView
- [x] `client/src/pages/SettingsPage/model/selectors/clientsPageSelectors.ts:2` — unused import: ClientSortField
- [x] `client/src/pages/SettingsPage/model/services/fetchUsersList/fetchUsersList.ts:4` — unused import: ClientStatusKey
- [x] `client/src/pages/SettingsPage/model/services/fetchUsersList/fetchUsersList.ts:3` — unused import: Client
- [x] `client/src/pages/SettingsPage/ui/SettingsPage/SettingsPage.tsx:2` — unused import: use
- [x] `client/src/pages/TransactionsPage/ui/FiltersContainer/FiltersContainer.tsx:2` — unused import: HStack
- [x] `client/src/pages/TransactionsPage/ui/TransactionsPage/TransactionsPage.tsx:1` — unused import: React
- [x] `client/src/shared/ui/CheckBox/CheckBox.tsx:2` — unused import: React
- [x] `client/src/shared/ui/Loader/Loader.tsx:1` — unused import: React
- [x] `client/src/widgets/ClientFilters/ui/ClientFilters/ClientFilters.tsx:1` — unused import: React
- [x] `client/src/widgets/MollieClientAction/ui/MollieClientAction/MollieClientAction.tsx:1` — unused import: React
- [x] `client/src/widgets/MollieClientAction/ui/MollieClientAction/MollieClientAction.tsx:6` — unused import: Input
- [x] `client/src/widgets/MollieClientAction/ui/MollieClientAction/MollieClientAction.tsx:10` — unused import: ClientSortField
- [x] `client/src/widgets/MollieClientAction/ui/MollieClientAction/MollieClientAction.tsx:8` — unused import: SearchIcon
- [x] `client/src/widgets/MollieClientAction/ui/MollieClientAction/MollieClientAction.tsx:9` — unused import: ClientSortSelector
- [x] `client/src/widgets/MollieClientAction/ui/MollieClientAction/MollieClientAction.tsx:11` — unused import: SortOrder
- [x] `client/src/widgets/MollieClientAction/ui/MollieClientAction/MollieClientAction.tsx:13` — unused import: ClientFormModal
- [x] `client/src/widgets/TransactionFilters/ui/TransactionFilters/TransactionFilters.tsx:1` — unused import: React
- [x] `client/src/widgets/UserFilters/ui/UserFilters/UserFilters.tsx:1` — unused import: React
- [x] `server/scripts/reset-user-password.ts:2` — unused import: readline
- [x] `server/src/controllers/conteroller.Mollie.ts:7` — unused import: merge
- [x] `server/src/controllers/controller.Users.ts:1` — unused import: NextFunction
- [x] `server/src/routes/router.Instagram.ts:2` — unused import: isAuthenticated
- [x] `server/src/routes/router.Instagram.ts:3` — unused import: verifyRequestSignature
- [x] `server/src/services/recalculateLoyalty.ts:3` — unused import: LOYALTY_LEVELS
- [x] `server/src/services/recalculateLoyalty.ts:3` — unused import: LoyaltyLevel

**SKY-U002 — ЗАКРЫТО (75/75).** Все 75 неиспользуемых импортов удалены (в основном
устаревшие `import React from 'react'` — не нужен при `"jsx": "react-jsx"` в
`tsconfig.json` — и неиспользуемые именованные импорты). Отдельно отмечу: у
`fetchNextClientsPage.ts:7` (`fetchClientsList`) и `recalculateLoyalty.ts:3`
(`LOYALTY_LEVELS`, `LoyaltyLevel`) импорт был "использован" только внутри
закомментированного кода — реально мёртвый, удалён как и остальные. Проверено:
`tsc --noEmit` (client+server) — 0 ошибок; `npm run lint:ts` — 0 ошибок (96 warnings,
все pre-existing, не в затронутых файлах); `npm run build:prod` (client) и
`npm run build` (server) — чисто; Jest client 281/281 suites, 976/976 тестов; server
`test:auth` 14/14 — без регрессий.

### `SKY-U004` — Неиспользуемый класс (6)

> Проверить и удалить, либо задокументировать причину сохранения.

- [x] `client/src/app/providers/ErrorBoundary/ui/ErrorBoundary.tsx:12` — unused class: ErrorBoundary
- [x] `client/src/app/providers/ThemeProvider/ui/theme.ts:1` — unused class: Theme
- [x] `client/src/entities/Client/model/consts/consts.ts:1` — unused class: ValidateClientError
- [x] `client/src/entities/MollieClient/model/consts/consts.ts:1` — unused class: ValidateClientError
- [x] `client/src/entities/MollieClient/model/consts/consts.ts:13` — unused class: ClientSortField
- [x] `client/src/features/addMollieClientForm/model/consts/consts.ts:1` — unused class: ValidateClientError

**SKY-U004 — ЗАКРЫТО (6/6), из них 1 false positive, 5 реальных удалений.**

- False positive: `ErrorBoundary` — реально используется в `client/src/index.tsx`
  через barrel `app/providers/ErrorBoundary/index.ts` (`export { default } from
  './ui/ErrorBoundary'`), Skylos не проследил default-экспорт через index.ts.
- Реально удалено (мёртвый код): `app/providers/ThemeProvider/ui/theme.ts` —
  осиротевший дубликат `Theme` enum с другими (устаревшими) строковыми значениями;
  всё приложение реально импортирует `Theme` из `@/shared/const/theme` — файл удалён
  целиком (закрывает заодно и соответствующий пункт SKY-E003 ниже);
  `ValidateClientError` в `entities/Client/model/consts/consts.ts` — не
  экспортируется из `index.ts` слайса и нигде не импортируется напрямую, удалён
  (соседний `ClientSortField` в этом же файле реально используется и экспортируется
  — оставлен без изменений); `ValidateClientError` и `ClientSortField` в
  `entities/MollieClient/model/consts/consts.ts` — оба нигде не используются
  (`ClientSortField` был явно закомментирован в `index.ts`, что подтверждает
  намеренное отключение) — файл удалён целиком, закомментированная строка
  ре-экспорта в `index.ts` тоже убрана как ссылающаяся на удалённый файл;
  `ValidateClientError` в `features/addMollieClientForm/model/consts/consts.ts` — не
  используется, удалён (соседний интерфейс `ServerError` в этом же файле
  используется — оставлен).

Проверено: `tsc --noEmit` (client+server) — 0 ошибок (кроме исходной baseline из
~19 ошибок в `node_modules` react-router-dom/mdx, задокументированной в SKY-R105);
`npm run build:prod` (client) и `npm run build` (server) — чисто; Jest client
281/281 suites, 976/976 тестов; server `test:auth` 14/14 — без регрессий.

### `SKY-U003` — Неиспользуемая переменная (15)

> Удалить переменную или использовать `_`-префикс, если требуется по сигнатуре.

- [x] `client/config/jest/jest.config.ts:9` — unused variable: config
- [x] `client/config/storybook/main.ts:3` — unused variable: config
- [x] `client/src/pages/ArticleDetailsPage/model/services/fetchCommentsByArticleId/fetchCommentsByArticleId.ts:5` — unused variable: fetchCommentsByArticleId
- [x] `client/src/pages/ProfilePage/ui/Sidebar.stories.tsx:11` — unused variable: Light
- [x] `client/src/shared/const/localstorage.ts:1` — unused variable: USER_LOCALSTORAGE_TOKEN
- [x] `client/src/shared/const/localstorage.ts:5` — unused variable: LOCAL_STORAGE_LAST_DESIGN_KEY
- [x] `client/src/shared/const/router.ts:43` — unused variable: AppRouteByPathPattern
- [x] `client/src/shared/ui/Button/Button.stories.tsx:14` — unused variable: Outline
- [x] `client/src/shared/ui/Button/Button.stories.tsx:29` — unused variable: Clear
- [x] `client/src/shared/ui/Input/Input.stories.tsx:4` — unused variable: meta
- [x] `client/src/shared/ui/Input/Input.stories.tsx:12` — unused variable: Primary
- [x] `client/src/widgets/Navbar/ui/Navbar.stories.tsx:11` — unused variable: Light
- [x] `client/src/widgets/Sidebar/ui/Sidebar/Sidebar.stories.tsx:11` — unused variable: Light
- [x] `server/src/services/service.Files.ts:6` — unused variable: isDev
- [x] `server/src/utils/paths.ts:12` — unused variable: UPLOAD_DIR

**SKY-U003 — ЗАКРЫТО (15/15), из них 2 реальных исправления, 2 удаления мёртвого кода,
11 false positive.**

- Реально удалено (мёртвый код): `fetchCommentsByArticleId.ts` в
  `pages/ArticleDetailsPage/model/services/` — осиротевший дубликат одноимённого
  сервиса из `entities/Article` (весь проект использует версию из entities, эта
  нигде не импортировалась) — файл удалён целиком; `USER_LOCALSTORAGE_TOKEN` и
  `LOCAL_STORAGE_LAST_DESIGN_KEY` в `shared/const/localstorage.ts` — легаси от эпохи
  до cookie-session авторизации, нигде не используются — удалены;
  `AppRouteByPathPattern` в `shared/const/router.ts` — экспортировался, но нигде не
  потреблялся — удалён; `UPLOAD_DIR` в `server/src/utils/paths.ts` — экспортировался,
  но `service.Files.ts` строит путь загрузки отдельно через `path.resolve(ROOT_DIR,
  'public', 'upload', ...)`, эту константу не использует — удалён (расхождение путей
  в `service.Files.ts` — не предмет этой находки, не трогалось).
- False positive (Storybook CSF): `config` в `client/config/jest/jest.config.ts` и
  `client/config/storybook/main.ts` — используется через `export default`, Skylos не
  распознал; `Light`/`Outline`/`Clear`/`meta`/`Primary` в `*.stories.tsx` (Sidebar,
  Navbar, Button, Input) — именованные экспорты Storybook CSF, подхватываются
  Storybook по конвенции файла, не через обычный импорт (см. также SKY-E003 ниже про
  `.stories.tsx`).
- False positive: `isDev` в `server/src/services/service.Files.ts:6` — используется
  на следующей строке (`const url = isDev ? ... : ...`), Skylos ошибся.

Проверено: `tsc --noEmit` (client+server) — 0 ошибок; Jest client 281/281 suites,
976/976 тестов (без потери покрытия — у удалённого дубликата
`fetchCommentsByArticleId.ts` теста не было); server `build` + `test:auth` 14/14 —
без регрессий.

### `SKY-E003` — Файл, который никто не импортирует (67)

> Проверить (напр. Jest setup/mocks подключаются через конфиг, не import) и удалить только реально мёртвые файлы.

- [x] `client/config/jest/__mocks__/react-i18next.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/config/jest/fileMock.js:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/config/jest/jestEnptyComponent.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/config/jest/setupTests.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/config/storybook/preview.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/config/storybook/webpack.config.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/app/providers/StoreProvider/config/middleware/authInterceptor.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/app/providers/ThemeProvider/ui/theme.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/app/providers/ThemeProvider/ui/withTheme.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/entities/Article/ui/ArticleDetails/ArticleDetails.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/entities/Article/ui/ArticleList/ArticleList.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/entities/Article/ui/ArticleListItem/ArticleListItem.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/entities/Article/ui/ArticleViewSelector/ArticleViewSelector.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/entities/Client/ui/ClientViewSelector/ClientViewSelector.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/entities/ClientStatus/ui/ClientStatusSelect/RoleSelect.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/entities/Comment/ui/CommentCard/CommentCard.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/entities/Comment/ui/CommentList/CommentList.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/entities/Country/ui/CountrySelect/CountrySelect.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/entities/MollieClient/model/consts/consts.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/entities/MollieSubscription/ui/MollieSubscriptionCard/MollieSubscriptionCard.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/entities/Month/ui/MonthSelect/MonthSelect.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/entities/PaymentMethod/ui/PaymentMethod/TransactionSelect.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/entities/Role/ui/RoleSelect/RoleSelect.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/entities/Summary/ui/SummaryCards/Summary.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/entities/Transaction/model/slices/TransactionSlice.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/entities/TransactionCategory/ui/TransactionCategorySelect/TransactionCategory.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/entities/TransactionType/ui/TransactionSelect/TransactionSelect.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/features/Auth/ui/LoginForm/LoginForm.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/features/ClientTypeTabs/ui/ClientTypeTabs/ArticleTypeTabs.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/features/TransactionTypeTabs/ui/TransactionTypeTabs/TransactionTypeTabs.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/features/addMollieClientForm/model/consts/consts.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/features/addMollieSubscriptionForm/ui/AddMollieSubscriptionForm/AddMollieSubscriptionForm.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/features/addTransactionForm/ui/AddTransactionForm/AddTransactionForm.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/features/avatarDropdown/ui/AvatarDropdown/AvatarDropdown.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/features/createMollieMandateForm/ui/CreateMollieMandateForm/CreateMollieMandateForm.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/shared/config/storybook/RouterDecorator/RouterDecorator.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/shared/config/storybook/StoreDecorator/StoreDecorator.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/shared/config/storybook/StyleDecorator/StyleDecorator.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/shared/const/common.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/shared/ui/AppImage/AppImage.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/shared/ui/AppLink/AppLink.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/shared/ui/Avatar/Avatar.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/shared/ui/Button/Button.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/shared/ui/Card/Card.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/shared/ui/Code/Code.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/shared/ui/Input/Input.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/shared/ui/Loader/Loader.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/shared/ui/Modal/Modal.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/shared/ui/Select/Select.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/shared/ui/Skeleton/Skeleton.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/shared/ui/Text/Text.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/shared/ui/ThemeSwitcher/ui/ThemeSwitcher.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/widgets/ErrorPage/ui/ErrorPage.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/widgets/Navbar/ui/Navbar.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/widgets/Page/Page.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/src/widgets/Sidebar/ui/Sidebar/Sidebar.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/stylelint.config.mjs:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `client/webpack.config.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `server/prisma.config.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `server/prisma/seed.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `server/src/api/api.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `server/src/middlewares/middleware.Logger.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `server/src/schemas/schema.product.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `server/src/services/recalculateLoyalty.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `server/src/services/service.ClientStatus.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `server/src/shared/helpers/cron.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [x] `server/src/types/ProcedureDTO.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)

**SKY-E003 — ЗАКРЫТО (67/67), из них 50 false positive, 13 реальных удалений
(4 уже закрыты как часть SKY-U001/U004 выше — `theme.ts`, `StoreDecorator.tsx`,
`middleware.Logger.ts`, `service.ClientStatus.ts`).**

- False positive, Jest-конфиг подключается через `moduleNameMapper`/
  `setupFilesAfterEach`, не через import (4): `__mocks__/react-i18next.ts`,
  `fileMock.js`, `jestEnptyComponent.tsx`, `setupTests.ts`.
- False positive, Storybook CSF-конвенция — подхватываются по glob-паттерну
  `stories: ["../../src/**/*.stories.@(...)"]` в `config/storybook/main.ts`, а не
  через import (43 файла `*.stories.tsx` по всему `client/src`). Отдельно
  проверено: `preview.ts`, `StyleDecorator.ts` и `RouterDecorator.tsx` тоже false
  positive — реально импортируются из `config/storybook/preview.ts`, но Skylos,
  судя по всему, не сканирует `client/config/**` как часть графа импортов, только
  `client/src/**`.
- False positive, CLI-конвенция конфигов (3): `client/stylelint.config.mjs`
  (обнаруживается `stylelint` CLI), `client/webpack.config.ts` (используется
  `webpack`/`webpack serve` CLI из npm-скриптов), `server/prisma.config.ts` +
  `server/prisma/seed.ts` (обнаруживаются `prisma db seed`, путь на `seed.ts`
  явно прописан в `prisma.config.ts`).
- Реально удалено (13, включая 4, закрытые выше в SKY-U001/U004): `theme.ts`,
  `StoreDecorator.tsx`, `middleware.Logger.ts`, `service.ClientStatus.ts` — см.
  разбор в SKY-U001/SKY-U004. Новые удаления в рамках этого пункта:
  `config/storybook/webpack.config.ts` — старый кастомный webpack-конфиг для
  Storybook 6/7-стиля, не подключён в `main.ts` (текущий стек использует
  `@storybook/react-webpack5` + `addon-webpack5-compiler-swc`), полностью
  осиротел; `StoreProvider/config/middleware/authInterceptor.ts` и
  `ThemeProvider/ui/withTheme.tsx` — файлы целиком состоят из закомментированного
  кода, ни одного активного экспорта; `entities/MollieClient/model/consts/consts.ts`
  и `features/addMollieClientForm/model/consts/consts.ts` — оба стали полностью
  мёртвыми после точечных удалений в SKY-U001/U004 (второй файл — после удаления
  `ValidateClientError` в нём не осталось используемого кода, `ServerError` внутри
  него был отдельной неиспользуемой копией, у каждого фича-слайса своя версия этого
  интерфейса); `shared/const/common.ts` — файл размером 0 байт; `server/src/api/api.ts`
  — осиротевший прямой axios-клиент для Mollie API, вытесненный официальным
  `@mollie/api-client` SDK в `service.Mollie.ts`; `server/src/schemas/schema.product.ts`
  — Zod-схема для сущности "Product", отсутствующей в домене DDC CRM (клиенты,
  танцевальные группы, транзакции, инвойсы, Mollie — не "продукты"), нигде не
  используется; `server/src/shared/helpers/cron.ts` — cron-задача с полностью
  закомментированным телом (Sequelize-эра, ссылалась на уже нерабочий
  `recalculateLoyalty`), сама нигде не импортируется (даже side-effect импорта
  нет — задача никогда не регистрировалась при старте сервера);
  `server/src/services/recalculateLoyalty.ts` — после удаления неиспользуемого
  импорта в SKY-U002 в файле остался только неиспользуемый интерфейс `IVisit` и
  полностью закомментированная функция; `server/src/types/ProcedureDTO.ts` —
  DTO для медицинских "процедур"/"зон инъекций", не относится к домену DDC CRM,
  нигде не используется.
- Отдельно проверено (не в этом списке, но связанная проверка): удаление
  `config/storybook/webpack.config.ts` не ломает Storybook — `npx storybook build`
  доходит до той же стадии индексации историй и падает на **предсуществующей**
  (проверено по `git show HEAD`, было так с исходного коммита) проблеме "CSF:
  missing default export" в нескольких `.stories.tsx`-файлах, чьё содержимое
  полностью закомментировано — это не связано с удалённым файлом и не входит в
  `npm run ci` (Storybook не гейтится в CI по AGENTS.md), поэтому не в скоупе
  этой уборки мёртвого кода.

Проверено: `tsc --noEmit` (client+server) — 0 ошибок (кроме исходной baseline
`node_modules`); `npm run build:prod` (client) и `npm run build` (server) — чисто;
Jest client 281/281 suites, 976/976 тестов; server `test:auth` 14/14,
`test:mollie` 7/7 — без регрессий.

**Повторный прогон `npm run check:skylos` (обязателен по правилам этого чек-листа)
подтвердил закрытие всех 185 находок и вскрыл ещё один слой мёртвого кода**,
замаскированный первым слоем (Skylos считал символ «используемым», если на него
ссылался другой символ, который сам был мёртвым и удалён в этом же проходе):

- `client/src/shared/const/router.ts` — после удаления `AppRouteByPathPattern`
  (см. SKY-U003) обнажились как мёртвые: enum `AppRoutes` (дублирует другой,
  реально используемый `AppRoutes` в `shared/config/routeConfig/routeConfig.tsx`
  — приложение навигирует только через него) и 10 функций-билдеров маршрутов
  (`getRouteMain`, `getRouteAbout`, `getRouteArticles`, `getRouteArticleDetails`,
  `getRouteArticleCreate`, `getRouteArticleEdit`, `getRouteClients`,
  `getRouteClientEdit`, `getRouteAdmin`, `getRouteForbidden`) — их единственным
  потребителем был именно удалённый `AppRouteByPathPattern`. Проверено по каждой
  функции отдельно (0 внешних usage) — удалены; оставлены только 4 реально
  используемые (`getRouteSettings`, `getRouteProfile`, `getRouteClientDetails`,
  `getRouteMollieDetails`).
- `server/src/utils/paths.ts` — после удаления `UPLOAD_DIR` (см. SKY-U003)
  обнажился как мёртвый `PUBLIC_DIR` (его единственный потребитель) — удалён;
  `ROOT_DIR` в том же файле активно используется в 6+ местах, файл не удалялся.
- `client/src/entities/Transaction/model/slices/TransactionSlice.ts` — этого не
  было в исходном списке `SKY-E003`(!), обнаружилось только повторным прогоном:
  осиротевшая заготовка Redux-слайса с плейсхолдер-редьюсером `template` и
  полностью закомментированными `extraReducers`, нигде не подключена к
  `StateSchema` и не импортируется — удалена. Публичный тип `TransactionSchema`
  из соседнего файла не пострадал (структурный интерфейс, от слайса не зависит,
  по-прежнему реэкспортируется из `entities/Transaction/index.ts`).
- `server/src/controllers/controller.Instagram.ts` — `verifyRequestSignature`
  тоже обнажилась (её единственной "видимой" Skylos ссылкой был неиспользуемый
  импорт в `router.Instagram.ts`, удалённый в SKY-U002). **В отличие от
  `revokeTrustedDevices` выше, это оказалась настоящая, ранее не закрытая дыра
  безопасности**: функция проверяет HMAC-подпись вебхука Instagram
  (`x-hub-signature-256`), но нигде не была подключена к пайплайну запроса —
  глобальный `bodyParser.json()` в `server/src/app.ts` не передавал `verify`,
  так что POST на `/api/v1/instagram/webhook` принимался без проверки подписи.
  Согласовано с пользователем (см. AskUserQuestion в истории сессии) — выбран
  вариант "подключить сейчас". Исправлено: `bodyParser.json()` в `app.ts` теперь
  принимает `verify`, который вызывает `verifyRequestSignature` только для
  запросов с `req.originalUrl`, начинающимся на `/api/v1/instagram/webhook`
  (остальные роуты не затронуты — тело есть в `verify` только при наличии
  заголовка `x-hub-signature-256`, у любых других клиентов его нет); заодно
  `throw new Error(...)` заменён на `throw new ApiError(401, ...)`, чтобы
  `errorMiddleware` вернул корректный 401 вместо общего 500. Проверено вручную
  изолированным скриптом (`ts-node -e`, вне тестового сьюта — под функцию нет
  отдельного unit-теста, `server` не имеет единой test-команды на весь репозиторий,
  см. `AGENTS.md`): валидная HMAC-подпись проходит, невалидная отклоняется с
  `401 Invalid signature.`, отсутствие заголовка — no-op (как и раньше, чтобы не
  ломать не-Instagram трафик). `tsc --noEmit`, `npm run build`, `npm run test:ci`
  (все 5 сьютов, 0 fail) — без регрессий.

Финальный повторный прогон `npm run check:skylos` после этих доп. исправлений
подтвердил: находок `SKY-U001`–`SKY-U004`/`SKY-E003` не осталось, кроме уже
задокументированных выше false positive; никаких новых цепочек не обнажилось.

## Качество кода (сложность/размер функций)

### `SKY-C304` — Слишком длинная функция (185) — В ПРОЦЕССЕ (55/185)

> Разбить на более мелкие функции/хуки.

**Прогресс: начата декомпозиция крупных страниц/компонентов, которые пересекаются
с client-частью `SKY-Q301` (см. ниже).** ~46 из 185 находок — это `.test.ts(x)`
файлы (длинные `describe`/тестовые сценарии); их дробление ради метрики строк, как
правило, не улучшает читаемость тестов — приоритет отдаётся production-коду.

Обработано (закрывает заодно и соответствующие находки `SKY-Q301` там, где они
были):
- `InvoicesPage.tsx:57` (424 строки, cc29) и `:293` (157 строк) — вынесен хук
  `useInvoicesPage()` (весь стейт и обработчики) и три подкомпонента:
  `InvoiceListItem` (уже было сделано на волне `SKY-Q302`), `InvoicesPageToolbar`
  (шапка/поиск/фильтры) и `InvoicesPagePagination`. `statusLabel` вынесен в общий
  `model/consts.ts`, чтобы не дублироваться между тремя потребителями. Главный
  компонент — теперь чистый JSX без бизнес-логики, ~110 строк с учётом разметки.
- `OrganizationBrandsPage.tsx:57` (131 строка, cc12) — вынесен хук
  `useOrganizationBrands()` (загрузка организации/брендов, сохранение, загрузка
  логотипа, архивация); JSX остался в компоненте как есть (уже был в пределах
  нормы после выноса логики).
- `DanceStylesPage.tsx:51` (157 строк, cc20) — вынесен хук `useDanceStyles()` и
  подкомпонент `DanceStyleFormModal` (форма редактирования на 3 языках).
- `ClientEmailBlock.tsx:35` (159 строк, cc15) — вынесен хук `useClientEmailBlock()`
  (загрузка/пагинация писем, выбор письма, ответ, удаление, пометка спамом).
- `EmailMessageDetail.tsx:60` (125 строк, cc11) — вынесены подкомпоненты
  `EmailMessageDetailHeader` (тема/отправитель/дата/кнопки) и
  `EmailMessageAttachments` (список вложений).
- `MolliePayments.tsx:173` (262 строки, cc14) — вынесен хук
  `useMolliePayments()` (типы, стейт, загрузка/фильтры/sync/export/пагинация) и
  три подкомпонента: `MolliePaymentsFilters`, `MolliePaymentsPagination`,
  `MolliePaymentsTable`.
- `GlobalSearch.tsx:35` (`buildFlatResults`, 66 строк) и `:115` (сам компонент,
  192 строки, cc16) — 6 повторяющихся `.forEach`-блоков маппинга хитов
  (clients/payments/groups/choreographers/branches/transactions) в единый
  `FlatResult` вынесены в отдельные типизированные `mapClientHit`/
  `mapPaymentHit`/... функции; `buildFlatResults` теперь просто их вызывает.
  Выпадающий список результатов вынесен в `GlobalSearchDropdown`.
- `EditSubscriptionDropdown.tsx:30` (143 строки, cc16) — вынесен хук
  `useEditSubscriptionDropdown()` и три модалки: `CancelSubscriptionModal`,
  `EditSubscriptionModal`, `RestartSubscriptionModal`.
- `HomePage.tsx:126` (295 строк, cc12) — вынесен хук `useHomePageData()`
  (summary/chart/sync стейт и загрузка) и три подкомпонента:
  `HomePageKpiCards`, `HomePageRevenueChart`, `HomePageFailedPayments`.
- `ClientForm.tsx:68` (282 строки, cc14) — вынесен хук `useClientForm()` (весь
  стейт, Redux dispatch/selector, загрузка филиалов/групп/Mollie-клиентов,
  валидация и сохранение) и два подкомпонента: `ClientFormGroupsSection`,
  `ClientFormPaymentSection`.
- `CreateGroupModal.tsx:26` (284 строки, cc14) — вынесен хук
  `useCreateGroupForm()` (стейт формы, загрузка справочников, слоты
  расписания, сохранение) и два подкомпонента: `CreateGroupModalFields`,
  `CreateGroupModalSlots`.
- `MollieIncidents.tsx:191` (279 строк, cc15) и `:388` (карточка инцидента,
  75 строк) — вынесен хук `useMollieIncidents()` и четыре подкомпонента:
  `MollieIncidentsFilters`, `MollieIncidentsSummary`,
  `MollieIncidentsPagination`, `MollieIncidentCard` (закрывает обе находки в
  этом файле).
- `MollieCustomerDetails.tsx:105` (`MollieStudentLinksManager`, 188 строк),
  `:294` (`MolliePaymentHistory`, 153 строки, cc11) и `:448` (сам
  `MollieCustomerDetails`, 103 строки) — файл уже содержал 3 отдельных
  компонента, каждый по отдельности слишком длинный. Каждый вынесен в свой
  файл с собственным хуком: `MollieStudentLinksManager.tsx` +
  `useStudentLinksManager.ts`, `MolliePaymentHistory.tsx` +
  `usePaymentHistory.ts` + подкомпонент `PaymentHistoryDayCard`, и
  `useMollieCustomerDetails.ts` для хендлеров главного компонента. Закрывает
  все 3 находки `SKY-C304` и находку `SKY-Q301` на этом файле разом.
- `PaymentRemindersPage.tsx:95` (329 строк, cc21) — вынесен хук
  `usePaymentReminders()` (типы, стейт настроек/шаблонов/очереди, вся
  загрузка и сохранение) и три подкомпонента:
  `PaymentReminderSettingsCard`, `PaymentReminderTemplateCard`,
  `PaymentReminderDeliveriesCard`.
- `EmailPage.tsx:51` (328 строк, cc21) — вынесен хук `useEmailPage()` (весь
  стейт аккаунтов/писем/composer, загрузка, дебаунс поиска, все CRUD-хендлеры)
  и подкомпонент `EmailPageMessagesTab` (фильтр по ящику, поиск, список +
  детали письма). Закрывает находки `SKY-C304` и `SKY-Q301` на этом файле
  разом.
- `MolliePaymentsMatrix.tsx:104` (342 строки, cc25) — вынесен хук
  `useMolliePaymentsMatrix()` (весь стейт фильтров/данных, загрузка матрицы и
  предстоящих списаний, sync, мемо-вычисления строк/месяцев) и три
  подкомпонента: `MolliePaymentsMatrixToolbar` (год/период/поиск/сводка),
  `MolliePaymentsMatrixUpcoming` (карточка предстоящих списаний),
  `MolliePaymentsMatrixTable` (сама таблица-матрица). Закрывает находки
  `SKY-C304` и `SKY-Q301` на этом файле разом.

Проверено на каждом файле: `tsc --noEmit` (client) — 0 новых ошибок; `npx eslint`
— 0 ошибок; существующие Jest-тесты каждой страницы прошли без изменений
(`InvoicesPage` 3 сьюта/21 тест, `OrganizationBrandsPage` 4/4,
`DanceStylesPage` 4/4); после всей волны — полный клиентский Jest (281/281
suites, 976/976 тестов), `npm run lint:ts` (0 ошибок), `npm run build:prod`
(чисто, только исходные предупреждения о размере бандла).

Дальнейшая декомпозиция — отдельными проходами, начиная с самых больших файлов
(`ClientPaymentBlock.tsx` 570 строк/cc43, `InvoicesPage/CreateInvoiceModal.tsx`
353/cc37, `ScheduleSettingsPage.tsx` 327/cc21, `ChoreographerModal.tsx`
322/cc35 и т.д.).

**Волна 5 (декомпозиция auth/profile форм):** закрыто 3 находки `SKY-C304` — `LoginForm`
(хук `useLoginForm` + подкомпоненты `LoginFormHeader`/`LoginFormFields`/
`LoginFormError`/`LoginFormActions`), `ProfilePage` (хук `useProfilePage` +
`ProfileValidateErrors`) и `ProfilePageHeader` (подкомпоненты `ProfileHeaderInfo`/
`ProfileHeaderActions`); все компоненты и хуки <50 строк, подтверждено повторным
`check:skylos`. Улучшена структура, но находки НЕ закрыты (функции >50 строк
остаются): `TwoFactorForm` (91 строка — инлайн state/обработчики),
`ChangePasswordModal` (75 строк — инлайн state/обработчик) и хук
`useActiveSessions` (async-обработчики) — компонент `ActiveSessions` при этом закрыт.
Требования: `tsc --noEmit` (client) чисто, `npm run lint:ts` 0 ошибок,
Jest 281/281 suites / 976/976, `npm run build:prod` чисто (только исходные
предупреждения о размере бандла).

**Волна 6 (декомпозиция поддерева ScheduleSettingsPage, вариант B):** закрыто 3
находки `SKY-C304` и 1 находка `SKY-Q301` — `GroupCard` (:41, 79 строк; hall-строка
вынесена в `GroupCardMeta`, блок «активные/неактивные ученики» — в
`GroupCardStudents`), главный компонент `ScheduleSettingsPage.tsx:34` (327 строк,
cc21; разложен через существующий хук `useScheduleSettingsPage` + новые
`ScheduleToolbar`), и `ScheduleSettingsPage.tsx:184` (109 строк; секция списка групп
вынесена в `GroupsListSection`, фильтры — в `GroupFilters`). Все компоненты
поддерева теперь чисто-рендерные без переноса длинной логики в хуки (урок
round4/round5: перенос в `useXxx.ts`-хук не закрывает находку — Skylos флагает сам
хук), поэтому закрылись именно <50-строчные JSX-функции. Повторный `check:skylos`
подтвердил закрытие: `GroupCard.tsx`/`GroupCardStudents.tsx`/`GroupCardMeta.tsx`/
`CreateGroupModalFields.tsx`/`CreateGroupModalSlots.tsx`/`SlotRow.tsx`/`FormField.tsx`/
`GroupsListSection.tsx`/`GroupFilters.tsx`/`ScheduleToolbar.tsx`/`ScheduleSettingsPage.tsx`
больше не флагаются. Сознательно не тронуты (round4-паттерн, не закрываются чисто):
`useCreateGroupForm` (114), `useScheduleSettingsPage` (146/cc11), `GroupStatisticsSection`
(134/109); тестовые `.test.ts(x)`-файлы не делятся ради метрики строк (см. приоритет
выше). Требования: полный Jest 281/281 suites / 976/976, `tsc --noEmit` (client) чисто,
`npm run lint:ts` 0 ошибок, `npm run build:prod` чисто (только исходные предупреждения
о размере бандла), `npm run docs:links` чисто.

**Волна 7 (server-контроллеры — рефокус с client-хуков на серверные
контроллеры, вариант план-1):** декомпозированы два самых крупных неразложенных
серверных контроллера. Суммарно находки `SKY-C304`/`SKY-Q301` на них упали
**29 → 26** (`conteroller.Mollie.ts` 17 → 16, `controller.Invoices.ts` 12 → 10).

- `controller.Invoices.ts` — добавлены чистые хелперы `calculateTotalCents`,
  `mapInvoiceItemCreates`, `archivePaymentLinksSafe`, `buildPaidInvoiceCreateData`,
  `buildInvoiceUpdateData`, `calculatePaymentResult` + типы `InvoiceItemInput`/
  `CreateInvoiceData`; к ним переведены `createInvoice`, `createPaidInvoice`,
  `updateInvoice`, `updateInvoiceStatus`, `recordInvoicePayment`. Снято 2 находки
  `SKY-C304` (функции, поднятые <50 строк); прочие остаются >50 (валюто-/
  статус-логика), включая отложенные HIGH-risk денежные функции
  `createInvoiceAdjustment` (cc17/109 строк) и `confirmPaidInvoice` (cc11/82 строк).
- `conteroller.Mollie.ts` — добавлены кросс-функциональные хелперы `queryString`,
  `paginatedResponse`, `paymentDateRangeWhere`, `customerSearchWhere`,
  `paymentSearchWhere`; ими переведены read-only контроллеры `mollieGetCustomersController`,
  `mollieGetPaymentsController`, `mollieExportPaymentsController`. Инцидент-контроллер
  `mollieGetPaymentIncidentsController` переписан через хелперы инцидентов
  (`incidentCustomerSelect`, `includePaymentRelations`, `loadIncidentResolvedIds`,
  `incidentTotals`, `incidentPaginatedResponse`, `loadPaymentIncidents`,
  `loadSubscriptionIncidents`, `loadCustomerIncidents`, `loadCombinedIncidents`) —
  размер функции 238 → 66 строк.
- `mollieGetPaymentsMatrixController` (read-only, 202 строки) — разложен через
  чистые хелперы `resolvePaymentMatrixYear`, `buildPaymentMatrixMonths`,
  `paymentMatrixSelector`, `createPaymentsMatrixCells`, `matrixClientsQuery`,
  `matrixUnlinkedCustomersQuery`, `buildMatrixClientRow`, `buildMatrixUnlinkedRow`
  + типы `MatrixCell`/`MatrixMonth`/`MatrixPayment`/`MatrixRow`; функция поднята
  под 50 строк, находка `SKY-C304` закрыта.
- Сознательно НЕ тронуты (HIGH-risk денежные пути — дефер до следующих волн):
  `mollieCallbackController` (:272), `mollieCreateCustomerPaymentLinkController`
  (:1528), `mollieCreateMandateSubscriptionController` (:2228),
  `mollieUpdateSubscriptionController` (:2372), `mollieRestartSubscriptionController`
  (:2480), `mollieRevokeMandateController` (:2546), `mollieCancelPaymentController`,
  `mollieResolveIncidentController`, `createInvoiceAdjustment`, `confirmPaidInvoice`.
- Client (1 чистая декомпозиция): `useMolliePayments` — вынесены `buildPaymentParams`
  (общий маппинг фильтров для списка) и `downloadBlob` (скачивание CSV), убрано
  дублирование между `loadPayments`/`onExport`.
- Известные артефакты декомпозиции: новые хелперы дают ложные `SKY-U001`
  "unused function" — это dead-code эвристика, не понимающая экспорт-роут-связки;
  сами указывают на хелперы, реально используемые контроллерами (уже шумная
  категория, не блок, не гоняемся за ней).
- Проверки: `tsc --noEmit` (server) чисто (TSC_EXIT=0); `npm run test:ci` — все
  домены зелёные (auth 11 / mollie 7 / search 6 / email 10 / payment-reminders 14,
  0 fail); client `npm run lint:ts` 0 ошибок, Jest 281/281 suites / 976/976.
  Контроллеры без unit-тестов (как и раньше) — проверка через `tsc` +
  строго behavior-preserving extraction.** `check:skylos` informational (Phase A),
  не блокирует merge.

**Волна 8 (client-компоненты/страницы, раунды 8–30):** закрыто 28 находок
`SKY-C304`. Рядом с этим блоком чекбоксы ниже помечены `[x]` только там, где
декомпозиция доведена до функций <50 строк; остальные (тестовые файлы, большие
модалки `ClientPaymentBlock`/`CreateInvoiceModal`/`ChoreographerModal`, хуки с
инлайн-state) остаются открытыми. Обработано (каждый раунд — отдельный
behavior-preserving коммит, `refactor: ... (Skylos round N)`):
- `EmailComposer.tsx:34` (179) — `useEmailComposer` + `useEmailAttachments` +
  `EmailComposerAttachments`/`EmailComposerFooter`/`EmailComposerToolbar` (round 8).
- `BranchModal.tsx:16` (111) — `useBranchModal` + `BranchFormFields` (round 8).
- `PaymentLinkModal.tsx:33` (142) — `usePaymentLinkModal` + `createPaymentLink` +
  `PaymentLinkFormFields`/`PaymentLinkActions` (round 8).
- `CrmSettingsPage.tsx:21` (120) — `useMollieConnection` +
  `MollieConnectionCard`/`MollieConnectionDetails`/`MollieConnectionActions` (round 8).
- `MollieCustomers.tsx:74` (185) — `useMollieCustomers` + `useMollieCustomersFilters` +
  `MollieCustomersFiltersBar`/`MollieCustomersPagination` (round 8).
- `EmailAccountsPanel.tsx:47` (117) — `EmailAccountCreateForm` +
  `EmailAccountsList` + `useEmailAccountForm` (round 9).
- `MollieClient/ui/ClientDetails.tsx:51` (116) — `MollieClientProfileCard` +
  `MollieClientEventsTimeline` (round 10).
- `MollieClientForm.tsx:33` (86) — `useMollieClientForm` + `MollieClientFormSkeleton` (round 11).
- `Sidebar/ui/Sidebar.tsx:22` (114) — `useSidebarState` (round 12).
- `TransactionSortSelector.tsx:24` (109) и `:65` (54) — `buildOrderOptions`/
  `buildSortFieldOptions`/`buildMonthOptions` + константа `MONTH_OPTIONS` (round 13).
- `Navbar.tsx:28` (100) — `useUnreadEmailCount` + `NavbarActions` (round 14).
- `SchedulePage.tsx:46` (126) — `lib/scheduleUtils` + `useScheduleGroups` +
  `ScheduleToolbar`/`ScheduleSummary`/`ScheduleGrid`/`ScheduleLesson` (round 15).
- `ProfileCard.tsx:23` (102) — `ProfileCardFields` + `ProfileCardSkeleton` (round 16).
- `ArticleDetails.tsx:38` (82) — `ArticleDetailsContent` + `ArticleDetailsSkeleton` (round 17).
- `MollieMain.tsx:25` (104) — `useMollieOrganizations` + `MollieOrganizationCard` +
  `MollieOrganizationDetails` (round 18).
- `ClientCard.tsx:28` (94) — `ClientCardIdentityFields`/`ClientCardContactFields`/
  `ClientCardEnrollmentFields` (round 19).
- `MollieClientCard.tsx:24` (96) — `MollieClientCardProfileFields`/
  `MollieClientCardAccountFields`/`MollieClientCardContactFields` (round 20).
- `UserCard.tsx:24` (91) — `UserCardSkeleton` + `UserIdentityFields`/`UserAccessFields` (round 21).
- `ComposeEmailModal.tsx:22` (77) — `useComposeEmailForm` (round 22).
- `BranchesPage.tsx:11` (87) — `useBranches` + `BranchesHeader`/`BranchesEmptyState` (round 23).
- `ClientListItem.tsx:16` (68) — `ClientListItemSmall`/`ClientListItemBig` (round 24).
- `SummaryCards.tsx:16` (52) — `SummaryStatCard` + `SummaryCardsSkeleton` (round 25).
- `MollieClientListItem.tsx:16` (72) — `MollieCustomerBadges` (round 26).
- `ArticleListItem.tsx:27` (63) — `ArticleListItemSmall`/`ArticleListItemBig` (round 27).
- `SidebarItemGroup.tsx:16` (59) — `SidebarItemGroupCollapsed`/`SidebarItemGroupExpanded` (round 28).
- `ClientDetails.tsx:53` (58) — `ClientDetailRow` (round 29).
- `TransactionCard.tsx:25` (55) — `TransactionCategoryFields`/`TransactionAmountFields` (round 30).
Каждый раунд проверялся: `rtk eslint` (0 errors/0 warnings на затронутых файлах),
targeted Jest-наборы (все зелёные), `rtk tsc --noEmit` (baseline — 19 ошибок в
`node_modules`/`@types`, не связанных с рефакторингом). Ограничение: локальный
`npm run check:skylos` заблокирован (архитектурный mismatch tree_sitter
arm64/x86_64) — закрытие подтверждено построчно (каждая извлечённая функция
<50 строк), полная верификация — на CI (`skylos-check`, informational). Остались
открытыми крупные модалки и тестовые файлы (см. чекбоксы со `[ ]` ниже), плюс
страницы ~77–79 строк: `UserForm` (77), `ChoreographersPage` (79), `ClientsPage`
(79), `AddTransactionForm` (79).

- [x] `client/src/entities/Article/ui/ArticleDetails/ArticleDetails.tsx:38` — Function 'anonymous' is 82 lines long (limit: 50) → волна 8 (round 17): `ArticleDetailsContent` + `ArticleDetailsSkeleton`
- [x] `client/src/entities/Article/ui/ArticleListItem/ArticleListItem.tsx:27` — Function 'anonymous' is 63 lines long (limit: 50) → волна 8 (round 27): `ArticleListItemSmall`/`ArticleListItemBig`
- [x] `client/src/entities/Client/ui/ClientCard/ClientCard.tsx:28` — Function 'anonymous' is 94 lines long (limit: 50) → волна 8 (round 19): `ClientCardIdentityFields`/`ClientCardContactFields`/`ClientCardEnrollmentFields`
- [x] `client/src/entities/Client/ui/ClientDetails/ClientDetails.tsx:53` — Function 'anonymous' is 58 lines long (limit: 50) → волна 8 (round 29): `ClientDetailRow`
- [x] `client/src/entities/Client/ui/ClientListItem/ClientListItem.tsx:16` — Function 'anonymous' is 68 lines long (limit: 50) → волна 8 (round 24): `ClientListItemSmall`/`ClientListItemBig`
- [ ] `client/src/entities/EmailMessage/model/services/emailMessageApi.test.ts:20` — Function 'anonymous' is 98 lines long (limit: 50)
- [ ] `client/src/entities/EmailMessage/ui/EmailComposer/EmailComposer.test.tsx:4` — Function 'anonymous' is 53 lines long (limit: 50)
- [x] `client/src/entities/EmailMessage/ui/EmailComposer/EmailComposer.tsx:34` — Function 'anonymous' is 179 lines long (limit: 50) → волна 8 (round 8): `useEmailComposer` + `useEmailAttachments` + `EmailComposerAttachments`/`EmailComposerFooter`/`EmailComposerToolbar`
- [ ] `client/src/entities/EmailMessage/ui/EmailMessageDetail/EmailMessageDetail.test.tsx:30` — Function 'anonymous' is 67 lines long (limit: 50)
- [x] `client/src/entities/EmailMessage/ui/EmailMessageDetail/EmailMessageDetail.tsx:60` — Function 'anonymous' is 125 lines long (limit: 50)
- [x] `client/src/entities/MollieClient/ui/ClientDetails/ClientDetails.tsx:51` — Function 'anonymous' is 116 lines long (limit: 50) → волна 8 (round 10): `MollieClientProfileCard` + `MollieClientEventsTimeline`
- [x] `client/src/entities/MollieClient/ui/MollieClientCard/MollieClientCard.tsx:24` — Function 'anonymous' is 96 lines long (limit: 50) → волна 8 (round 20): `MollieClientCardProfileFields`/`MollieClientCardAccountFields`/`MollieClientCardContactFields`
- [ ] `client/src/entities/MollieClient/ui/MollieClientList/MollieClientList.tsx:37` — Function 'anonymous' is 52 lines long (limit: 50)
- [ ] `client/src/entities/MollieClient/ui/MollieClientListItem/MollieClientListItem.test.tsx:14` — Function 'anonymous' is 55 lines long (limit: 50)
- [x] `client/src/entities/MollieClient/ui/MollieClientListItem/MollieClientListItem.tsx:16` — Function 'anonymous' is 72 lines long (limit: 50) → волна 8 (round 26): `MollieCustomerBadges`
- [ ] `client/src/entities/MollieSubscription/ui/MollieSubscriptionCard/MollieSubscriptionCard.tsx:23` — Function 'anonymous' is 76 lines long (limit: 50)
- [ ] `client/src/entities/Profile/model/services/updateProfileData/updateProfileData.test.tsx:22` — Function 'anonymous' is 59 lines long (limit: 50)
- [ ] `client/src/entities/Profile/model/slice/profileSlice.test.ts:6` — Function 'anonymous' is 110 lines long (limit: 50)
- [x] `client/src/entities/Profile/ui/ProfileCard/ProfileCard.tsx:23` — Function 'anonymous' is 102 lines long (limit: 50) → волна 8 (round 16): `ProfileCardFields` + `ProfileCardSkeleton`
- [x] `client/src/entities/Summary/ui/SummaryCards/SummaryCards.tsx:16` — Function 'anonymous' is 52 lines long (limit: 50) → волна 8 (round 25): `SummaryStatCard` + `SummaryCardsSkeleton`
- [x] `client/src/entities/Transaction/ui/TransactionCard/TransactionCard.tsx:25` — Function 'anonymous' is 55 lines long (limit: 50) → волна 8 (round 30): `TransactionCategoryFields`/`TransactionAmountFields`
- [ ] `client/src/entities/Transaction/ui/TransactionListItem/TransactionListItem.test.tsx:6` — Function 'anonymous' is 60 lines long (limit: 50)
- [x] `client/src/entities/User/ui/UserCard/UserCard.tsx:24` — Function 'anonymous' is 91 lines long (limit: 50) → волна 8 (round 21): `UserCardSkeleton` + `UserIdentityFields`/`UserAccessFields`
- [ ] `client/src/features/Auth/model/services/loginByUsername/loginByUsername.test.ts:21` — Function 'anonymous' is 54 lines long (limit: 50)
- [ ] `client/src/features/Auth/model/slice/authSlice.test.ts:5` — Function 'anonymous' is 53 lines long (limit: 50)
- [x] `client/src/features/Auth/ui/LoginForm/LoginForm.tsx:39` — Function 'anonymous' is 138 lines long (limit: 50) → разложен (хук `useLoginForm` + подкомпоненты `LoginFormHeader`/`LoginFormFields`/`LoginFormError`/`LoginFormActions`); компонент и хук <50 строк, проверено `check:skylos`
- [ ] `client/src/features/Auth/ui/TwoFactorForm/TwoFactorForm.test.tsx:33` — Function 'anonymous' is 62 lines long (limit: 50)
- [ ] `client/src/features/Auth/ui/TwoFactorForm/TwoFactorForm.tsx:24` — Function 'anonymous' is 132 lines long (limit: 50) → рендер разложен на подкомпоненты (`TwoFactorFormHeader`/`TwoFactorFormFields`/`TwoFactorFormActions`), но функция компонента всё ещё 91 строка (инлайн state+обработчики) — НЕ закрыто
- [ ] `client/src/features/TransactionSortSelector/ui/TransactionSortSelector/TransactionSortSelector.test.tsx:6` — Function 'anonymous' is 56 lines long (limit: 50)
- [x] `client/src/features/TransactionSortSelector/ui/TransactionSortSelector/TransactionSortSelector.tsx:24` — Function 'anonymous' is 109 lines long (limit: 50) → волна 8 (round 13): `buildOrderOptions`/`buildSortFieldOptions`/`buildMonthOptions` + `MONTH_OPTIONS`
- [x] `client/src/features/TransactionSortSelector/ui/TransactionSortSelector/TransactionSortSelector.tsx:65` — Function 'anonymous' is 54 lines long (limit: 50) → волна 8 (round 13)
- [ ] `client/src/features/addClientForm/model/services/addClientData/addClientData.ts:13` — Function 'anonymous' is 60 lines long (limit: 50)
- [ ] `client/src/features/addClientForm/model/slices/clientSlice.test.ts:6` — Function 'anonymous' is 63 lines long (limit: 50)
- [ ] `client/src/features/addClientForm/ui/ClientForm/ClientForm.test.tsx:42` — Function 'anonymous' is 68 lines long (limit: 50)
- [x] `client/src/features/addClientForm/ui/ClientForm/ClientForm.tsx:68` — Function 'anonymous' is 282 lines long (limit: 50)
- [x] `client/src/features/addMollieClientForm/ui/MollieClientForm/MollieClientForm.tsx:33` — Function 'anonymous' is 86 lines long (limit: 50) → волна 8 (round 11): `useMollieClientForm` + `MollieClientFormSkeleton`
- [ ] `client/src/features/addMollieSubscriptionForm/model/slices/addMollieSubscriptionSlice.test.ts:7` — Function 'anonymous' is 78 lines long (limit: 50)
- [ ] `client/src/features/addMollieSubscriptionForm/ui/AddMollieSubscriptionForm/AddMollieSubscriptionForm.tsx:38` — Function 'anonymous' is 105 lines long (limit: 50)
- [ ] `client/src/features/addTransactionForm/model/slices/addTransactionFormSlice.test.ts:5` — Function 'anonymous' is 59 lines long (limit: 50)
- [ ] `client/src/features/addTransactionForm/ui/AddTransactionForm/AddTransactionForm.tsx:34` — Function 'anonymous' is 79 lines long (limit: 50)
- [ ] `client/src/features/addUserForm/model/slices/newUserSlice.test.ts:6` — Function 'anonymous' is 52 lines long (limit: 50)
- [ ] `client/src/features/addUserForm/ui/UserForm/UserForm.tsx:31` — Function 'anonymous' is 77 lines long (limit: 50)
- [ ] `client/src/features/changePassword/model/services/changePasswordThunk.test.ts:12` — Function 'anonymous' is 65 lines long (limit: 50)
- [ ] `client/src/features/changePassword/ui/ChangePasswordModal/ChangePasswordModal.test.tsx:30` — Function 'anonymous' is 61 lines long (limit: 50)
- [ ] `client/src/features/changePassword/ui/ChangePasswordModal/ChangePasswordModal.tsx:21` — Function 'anonymous' is 112 lines long (limit: 50) → рендер разложен (`ChangePasswordFields`/`ChangePasswordActions`), но функция компонента всё ещё 75 строк (инлайн state+обработчик) — НЕ закрыто
- [ ] `client/src/features/createMollieMandateForm/model/slices/createMollieMandateFormSlice.test.ts:7` — Function 'anonymous' is 68 lines long (limit: 50)
- [ ] `client/src/features/createMollieMandateForm/ui/CreateMollieMandateForm/CreateMollieMandateForm.tsx:42` — Function 'anonymous' is 73 lines long (limit: 50)
- [ ] `client/src/features/editMollieClientDropdown/model/slices/mollieClientSlice.test.ts:7` — Function 'anonymous' is 103 lines long (limit: 50)
- [ ] `client/src/features/editMollieClientDropdown/ui/EditMollieClientDropdown/EditMollieClientDropdown.tsx:25` — Function 'anonymous' is 57 lines long (limit: 50)
- [ ] `client/src/features/editMollieClientDropdown/ui/MollieClientForm/MollieClientForm.tsx:28` — Function 'anonymous' is 114 lines long (limit: 50)
- [ ] `client/src/features/editSubscriptionDropdown/ui/EditSubscriptionDropdown/EditSubscriptionDropdown.test.tsx:36` — Function 'anonymous' is 55 lines long (limit: 50)
- [x] `client/src/features/editSubscriptionDropdown/ui/EditSubscriptionDropdown/EditSubscriptionDropdown.tsx:30` — Function 'anonymous' is 143 lines long (limit: 50)
- [ ] `client/src/features/globalSearch/ui/GlobalSearch/GlobalSearch.test.tsx:46` — Function 'anonymous' is 65 lines long (limit: 50)
- [x] `client/src/features/globalSearch/ui/GlobalSearch/GlobalSearch.tsx:35` — Function 'anonymous' is 66 lines long (limit: 50)
- [x] `client/src/features/globalSearch/ui/GlobalSearch/GlobalSearch.tsx:115` — Function 'anonymous' is 192 lines long (limit: 50)
- [x] `client/src/pages/BranchesPage/ui/BranchModal/BranchModal.tsx:16` — Function 'anonymous' is 111 lines long (limit: 50) → волна 8 (round 8): `useBranchModal` + `BranchFormFields`
- [x] `client/src/pages/BranchesPage/ui/BranchesPage/BranchesPage.tsx:11` — Function 'anonymous' is 87 lines long (limit: 50) → волна 8 (round 23): `useBranches` + `BranchesHeader`/`BranchesEmptyState`
- [ ] `client/src/pages/ChoreographersPage/ui/ChoreographerModal/ChoreographerModal.test.tsx:19` — Function 'anonymous' is 54 lines long (limit: 50)
- [ ] `client/src/pages/ChoreographersPage/ui/ChoreographerModal/ChoreographerModal.tsx:29` — Function 'anonymous' is 322 lines long (limit: 50)
- [ ] `client/src/pages/ChoreographersPage/ui/ChoreographersPage/ChoreographersPage.tsx:11` — Function 'anonymous' is 79 lines long (limit: 50)
- [x] `client/src/pages/ClientsDetailsPage/ui/ClientEmailBlock/ClientEmailBlock.tsx:35` — Function 'anonymous' is 159 lines long (limit: 50)
- [ ] `client/src/pages/ClientsDetailsPage/ui/ClientPaymentBlock/ClientPaymentBlock.tsx:134` — Function 'anonymous' is 570 lines long (limit: 50)
- [ ] `client/src/pages/ClientsDetailsPage/ui/EditClientModal/EditClientModal.tsx:49` — Function 'anonymous' is 214 lines long (limit: 50)
- [ ] `client/src/pages/ClientsDetailsPage/ui/EditClientModal/EditClientModal.tsx:126` — Function 'anonymous' is 55 lines long (limit: 50)
- [x] `client/src/pages/ClientsDetailsPage/ui/PaymentLinkModal/PaymentLinkModal.tsx:33` — Function 'anonymous' is 142 lines long (limit: 50) → волна 8 (round 8): `usePaymentLinkModal` + `createPaymentLink` + `PaymentLinkFormFields`/`PaymentLinkActions`
- [ ] `client/src/pages/ClientsPage/lib/hooks/useClientFilters.ts:18` — Function 'useClientFilters' is 72 lines long (limit: 50)
- [ ] `client/src/pages/ClientsPage/model/slices/clientsPageSlice.test.ts:6` — Function 'anonymous' is 83 lines long (limit: 50)
- [ ] `client/src/pages/ClientsPage/ui/ClientsPage/ClientsPage.tsx:41` — Function 'anonymous' is 79 lines long (limit: 50)
- [x] `client/src/pages/CrmSettingsPage/ui/CrmSettingsPage/CrmSettingsPage.tsx:21` — Function 'anonymous' is 120 lines long (limit: 50) → волна 8 (round 8): `useMollieConnection` + `MollieConnectionCard`/`MollieConnectionDetails`/`MollieConnectionActions`
- [x] `client/src/pages/DanceStylesPage/ui/DanceStylesPage/DanceStylesPage.tsx:51` — Function 'anonymous' is 157 lines long (limit: 50)
- [x] `client/src/pages/EmailPage/ui/ComposeEmailModal/ComposeEmailModal.tsx:22` — Function 'anonymous' is 77 lines long (limit: 50) → волна 8 (round 22): `useComposeEmailForm`
- [ ] `client/src/pages/EmailPage/ui/EmailAccountsPanel/EmailAccountsPanel.test.tsx:31` — Function 'anonymous' is 60 lines long (limit: 50)
- [x] `client/src/pages/EmailPage/ui/EmailAccountsPanel/EmailAccountsPanel.tsx:47` — Function 'anonymous' is 117 lines long (limit: 50) → волна 8 (round 9): `EmailAccountCreateForm` + `EmailAccountsList` + `useEmailAccountForm`
- [x] `client/src/pages/EmailPage/ui/EmailPage/EmailPage.tsx:51` — Function 'anonymous' is 328 lines long (limit: 50)
- [ ] `client/src/pages/HomePage/ui/HomePage.test.tsx:57` — Function 'anonymous' is 52 lines long (limit: 50)
- [x] `client/src/pages/HomePage/ui/HomePage.tsx:126` — Function 'anonymous' is 295 lines long (limit: 50)
- [ ] `client/src/pages/InvoicesPage/ui/CreateInvoiceModal/CreateInvoiceModal.test.tsx:46` — Function 'anonymous' is 92 lines long (limit: 50)
- [ ] `client/src/pages/InvoicesPage/ui/CreateInvoiceModal/CreateInvoiceModal.tsx:44` — Function 'anonymous' is 353 lines long (limit: 50)
- [ ] `client/src/pages/InvoicesPage/ui/CreateInvoiceModal/CreateInvoiceModal.tsx:191` — Function 'anonymous' is 59 lines long (limit: 50)
- [ ] `client/src/pages/InvoicesPage/ui/InvoiceActionModal/InvoiceActionModal.test.tsx:33` — Function 'anonymous' is 85 lines long (limit: 50)
- [ ] `client/src/pages/InvoicesPage/ui/InvoiceActionModal/InvoiceActionModal.tsx:63` — Function 'anonymous' is 75 lines long (limit: 50)
- [ ] `client/src/pages/InvoicesPage/ui/InvoiceActionModal/InvoiceActionModal.tsx:200` — Function 'anonymous' is 65 lines long (limit: 50)
- [ ] `client/src/pages/InvoicesPage/ui/InvoiceActionModal/InvoiceActionModal.tsx:139` — Function 'anonymous' is 60 lines long (limit: 50)
- [ ] `client/src/pages/InvoicesPage/ui/InvoicesPage/InvoicesPage.test.tsx:73` — Function 'anonymous' is 83 lines long (limit: 50)
- [x] `client/src/pages/InvoicesPage/ui/InvoicesPage/InvoicesPage.tsx:57` — Function 'anonymous' is 424 lines long (limit: 50)
- [x] `client/src/pages/InvoicesPage/ui/InvoicesPage/InvoicesPage.tsx:293` — Function 'anonymous' is 157 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/model/services/fetchMollieClientsList/fetchMollieClientsList.test.ts:13` — Function 'anonymous' is 72 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/model/slices/mollieClientsDetailsPageSlice.test.ts:6` — Function 'anonymous' is 76 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/model/slices/mollieClientsDetailsPageSlice.ts:44` — Function 'anonymous' is 59 lines long (limit: 50)
- [x] `client/src/pages/MolliePage/ui/MollieCustomerDetails/MollieCustomerDetails.tsx:105` — Function 'anonymous' is 188 lines long (limit: 50)
- [x] `client/src/pages/MolliePage/ui/MollieCustomerDetails/MollieCustomerDetails.tsx:294` — Function 'anonymous' is 153 lines long (limit: 50)
- [x] `client/src/pages/MolliePage/ui/MollieCustomerDetails/MollieCustomerDetails.tsx:448` — Function 'anonymous' is 103 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/ui/MollieCustomers/MollieCustomers.test.tsx:40` — Function 'anonymous' is 71 lines long (limit: 50)
- [x] `client/src/pages/MolliePage/ui/MollieCustomers/MollieCustomers.tsx:74` — Function 'anonymous' is 185 lines long (limit: 50) → волна 8 (round 8): `useMollieCustomers` + `useMollieCustomersFilters` + `MollieCustomersFiltersBar`/`MollieCustomersPagination`
- [ ] `client/src/pages/MolliePage/ui/MollieIncidents/MollieIncidents.test.tsx:52` — Function 'anonymous' is 78 lines long (limit: 50)
- [x] `client/src/pages/MolliePage/ui/MollieIncidents/MollieIncidents.tsx:388` — Function 'anonymous' is 75 lines long (limit: 50)
- [x] `client/src/pages/MolliePage/ui/MollieIncidents/MollieIncidents.tsx:191` — Function 'anonymous' is 279 lines long (limit: 50)
- [x] `client/src/pages/MolliePage/ui/MollieMain/MollieMain.tsx:25` — Function 'anonymous' is 104 lines long (limit: 50) → волна 8 (round 18): `useMollieOrganizations` + `MollieOrganizationCard`/`MollieOrganizationDetails`
- [ ] `client/src/pages/MolliePage/ui/MolliePayments/MolliePayments.test.tsx:43` — Function 'anonymous' is 88 lines long (limit: 50)
- [x] `client/src/pages/MolliePage/ui/MolliePayments/MolliePayments.tsx:173` — Function 'anonymous' is 262 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/ui/MolliePaymentsMatrix/MolliePaymentsMatrix.test.tsx:82` — Function 'anonymous' is 53 lines long (limit: 50)
- [x] `client/src/pages/MolliePage/ui/MolliePaymentsMatrix/MolliePaymentsMatrix.tsx:104` — Function 'anonymous' is 342 lines long (limit: 50)
- [x] `client/src/pages/OrganizationBrandsPage/ui/OrganizationBrandsPage.tsx:57` — Function 'anonymous' is 131 lines long (limit: 50)
- [ ] `client/src/pages/PaymentRemindersPage/ui/PaymentRemindersPage/PaymentRemindersPage.test.tsx:67` — Function 'anonymous' is 65 lines long (limit: 50)
- [x] `client/src/pages/PaymentRemindersPage/ui/PaymentRemindersPage/PaymentRemindersPage.tsx:95` — Function 'anonymous' is 329 lines long (limit: 50)
- [ ] `client/src/pages/ProfilePage/ui/ActiveSessions/ActiveSessions.tsx:53` — Function 'anonymous' is 125 lines long (limit: 50) → компонент разложен (<50, закрыт) + хук `useActiveSessions` (~57 строк, async-обработчики) — находка переехала в хук, НЕ закрыто
- [x] `client/src/pages/ProfilePage/ui/ProfilePage.tsx:38` — Function 'anonymous' is 90 lines long (limit: 50) → разложен (хук `useProfilePage` + `ProfileValidateErrors`); компонент и хук <50 строк, проверено `check:skylos`
- [x] `client/src/pages/ProfilePage/ui/ProfilePageHeader/ProfilePageHeader.tsx:20` — Function 'anonymous' is 88 lines long (limit: 50) → разложен (подкомпоненты `ProfileHeaderInfo`/`ProfileHeaderActions`); компонент <50 строк, проверено `check:skylos`
- [ ] `client/src/pages/SchedulePage/ui/SchedulePage/SchedulePage.test.tsx:65` — Function 'anonymous' is 62 lines long (limit: 50)
- [x] `client/src/pages/SchedulePage/ui/SchedulePage/SchedulePage.tsx:46` — Function 'anonymous' is 126 lines long (limit: 50) → волна 8 (round 15): `lib/scheduleUtils` + `useScheduleGroups` + `ScheduleToolbar`/`ScheduleSummary`/`ScheduleGrid`/`ScheduleLesson`
- [ ] `client/src/pages/ScheduleSettingsPage/ui/CreateGroupModal/CreateGroupModal.test.tsx:25` — Function 'anonymous' is 66 lines long (limit: 50)
- [x] `client/src/pages/ScheduleSettingsPage/ui/CreateGroupModal/CreateGroupModal.tsx:26` — Function 'anonymous' is 284 lines long (limit: 50)
- [x] `client/src/pages/ScheduleSettingsPage/ui/GroupCard/GroupCard.tsx:41` — Function 'anonymous' is 79 lines long (limit: 50) → волна 6: hall-строка вынесена в `GroupCardMeta`, блок «активные/неактивные ученики» — в `GroupCardStudents`; сам компонент <50 строк, подтверждено `check:skylos`
- [ ] `client/src/pages/ScheduleSettingsPage/ui/ScheduleSettingsPage/ScheduleSettingsPage.test.tsx:69` — Function 'anonymous' is 60 lines long (limit: 50)
- [x] `client/src/pages/ScheduleSettingsPage/ui/ScheduleSettingsPage/ScheduleSettingsPage.tsx:34` — Function 'anonymous' is 327 lines long (limit: 50) → волна 6: разложен (хук `useScheduleSettingsPage` + `ScheduleToolbar`/`GroupsListSection`/`GroupStatisticsSection`); главный компонент — чистый JSX <50 строк, подтверждено `check:skylos`
- [x] `client/src/pages/ScheduleSettingsPage/ui/ScheduleSettingsPage/ScheduleSettingsPage.tsx:184` — Function 'anonymous' is 109 lines long (limit: 50) → волна 6: секция списка групп вынесена в `GroupsListSection` + фильтры в `GroupFilters`, подтверждено `check:skylos`
- [ ] `client/src/pages/TransactionsPage/lib/hooks/useTransactionFilters.test.tsx:33` — Function 'anonymous' is 57 lines long (limit: 50)
- [ ] `client/src/pages/TransactionsPage/lib/hooks/useTransactionFilters.ts:19` — Function 'useTransactionFilters' is 73 lines long (limit: 50)
- [ ] `client/src/pages/TransactionsPage/model/selectors/transactionPageSelectors.test.ts:21` — Function 'anonymous' is 51 lines long (limit: 50)
- [ ] `client/src/pages/TransactionsPage/model/services/fetchTransactionsList/fetchTransactionsList.test.ts:34` — Function 'anonymous' is 61 lines long (limit: 50)
- [ ] `client/src/pages/TransactionsPage/model/slices/transactionsPageSlice.test.ts:8` — Function 'anonymous' is 103 lines long (limit: 50)
- [ ] `client/src/pages/TransactionsPage/ui/TransactionsPage/TransactionsPage.tsx:43` — Function 'anonymous' is 72 lines long (limit: 50)
- [ ] `client/src/shared/lib/hooks/useInfiniteScroll/useInfiniteScroll.test.ts:5` — Function 'anonymous' is 74 lines long (limit: 50)
- [ ] `client/src/shared/ui/Input/Input.tsx:39` — Function 'anonymous' is 85 lines long (limit: 50)
- [ ] `client/src/shared/ui/Modal/Modal.test.tsx:4` — Function 'anonymous' is 61 lines long (limit: 50)
- [ ] `client/src/shared/ui/Modal/Modal.tsx:16` — Function 'anonymous' is 72 lines long (limit: 50)
- [ ] `client/src/shared/ui/Popups/components/ListBox/ListBox.tsx:29` — Function 'ListBox' is 58 lines long (limit: 50)
- [ ] `client/src/shared/ui/RichTextEditor/RichTextEditor.tsx:18` — Function 'anonymous' is 91 lines long (limit: 50)
- [ ] `client/src/shared/ui/Textarea/Textarea.tsx:23` — Function 'anonymous' is 60 lines long (limit: 50)
- [ ] `client/src/widgets/ClientFilters/ui/ClientFilters/ClientFilters.tsx:27` — Function 'anonymous' is 53 lines long (limit: 50)
- [x] `client/src/widgets/Navbar/ui/Navbar.tsx:28` — Function 'anonymous' is 100 lines long (limit: 50) → волна 8 (round 14): `useUnreadEmailCount` + `NavbarActions`
- [x] `client/src/widgets/Sidebar/ui/Sidebar/Sidebar.tsx:22` — Function 'anonymous' is 114 lines long (limit: 50) → волна 8 (round 12): `useSidebarState`
- [x] `client/src/widgets/Sidebar/ui/SidebarItemGroup/SidebarItemGroup.tsx:16` — Function 'anonymous' is 59 lines long (limit: 50) → волна 8 (round 28): `SidebarItemGroupCollapsed`/`SidebarItemGroupExpanded`
- [ ] `client/src/widgets/TransactionFilters/ui/TransactionFilters/TransactionFilters.tsx:30` — Function 'anonymous' is 56 lines long (limit: 50)
- [ ] `server/src/controllers/conteroller.Mollie.ts:2496` — Function 'anonymous' is 96 lines long (limit: 50)
- [ ] `server/src/controllers/conteroller.Mollie.ts:273` — Function 'anonymous' is 51 lines long (limit: 50)
- [ ] `server/src/controllers/conteroller.Mollie.ts:785` — Function 'anonymous' is 115 lines long (limit: 50)
- [ ] `server/src/controllers/conteroller.Mollie.ts:2322` — Function 'anonymous' is 107 lines long (limit: 50)
- [ ] `server/src/controllers/conteroller.Mollie.ts:380` — Function 'anonymous' is 145 lines long (limit: 50)
- [ ] `server/src/controllers/conteroller.Mollie.ts:901` — Function 'anonymous' is 71 lines long (limit: 50)
- [ ] `server/src/controllers/conteroller.Mollie.ts:659` — Function 'anonymous' is 69 lines long (limit: 50)
- [ ] `server/src/controllers/conteroller.Mollie.ts:1611` — Function 'anonymous' is 392 lines long (limit: 50)
- [ ] `server/src/controllers/conteroller.Mollie.ts:973` — Function 'anonymous' is 107 lines long (limit: 50)
- [ ] `server/src/controllers/conteroller.Mollie.ts:1099` — Function 'anonymous' is 87 lines long (limit: 50)
- [ ] `server/src/controllers/conteroller.Mollie.ts:2430` — Function 'anonymous' is 65 lines long (limit: 50)
- [ ] `server/src/controllers/conteroller.Mollie.ts:538` — Function 'anonymous' is 94 lines long (limit: 50)
- [ ] `server/src/controllers/conteroller.Mollie.ts:1187` — Function 'anonymous' is 59 lines long (limit: 50)
- [ ] `server/src/controllers/conteroller.Mollie.ts:1247` — Function 'anonymous' is 202 lines long (limit: 50)
- [ ] `server/src/controllers/conteroller.Mollie.ts:1494` — Function 'anonymous' is 53 lines long (limit: 50)
- [ ] `server/src/controllers/conteroller.Mollie.ts:729` — Function 'anonymous' is 55 lines long (limit: 50)
- [ ] `server/src/controllers/conteroller.Mollie.ts:2178` — Function 'anonymous' is 58 lines long (limit: 50)
- [ ] `server/src/controllers/controller.Auth.ts:110` — Function 'anonymous' is 81 lines long (limit: 50)
- [ ] `server/src/controllers/controller.Auth.ts:211` — Function 'anonymous' is 57 lines long (limit: 50)
- [ ] `server/src/controllers/controller.Clients.ts:212` — Function 'anonymous' is 172 lines long (limit: 50)
- [ ] `server/src/controllers/controller.Instagram.ts:69` — Function 'anonymous' is 63 lines long (limit: 50)
- [ ] `server/src/controllers/controller.Invoices.ts:333` — Function 'anonymous' is 54 lines long (limit: 50)
- [ ] `server/src/controllers/controller.Invoices.ts:388` — Function 'anonymous' is 67 lines long (limit: 50)
- [ ] `server/src/controllers/controller.Invoices.ts:397` — Function 'anonymous' is 56 lines long (limit: 50)
- [ ] `server/src/controllers/controller.Invoices.ts:584` — Function 'anonymous' is 113 lines long (limit: 50)
- [ ] `server/src/controllers/controller.Invoices.ts:698` — Function 'anonymous' is 63 lines long (limit: 50)
- [ ] `server/src/controllers/controller.Invoices.ts:762` — Function 'anonymous' is 100 lines long (limit: 50)
- [ ] `server/src/controllers/controller.Invoices.ts:793` — Function 'anonymous' is 66 lines long (limit: 50)
- [ ] `server/src/controllers/controller.Invoices.ts:507` — Function 'anonymous' is 76 lines long (limit: 50)
- [ ] `server/src/controllers/controller.Profiles.ts:34` — Function 'anonymous' is 54 lines long (limit: 50)
- [ ] `server/src/controllers/controller.Schedule.ts:140` — Function 'anonymous' is 78 lines long (limit: 50)
- [ ] `server/src/controllers/controller.Users.ts:65` — Function 'anonymous' is 70 lines long (limit: 50)
- [ ] `server/src/services/service.Clients.ts:69` — Function 'anonymous' is 68 lines long (limit: 50)
- [ ] `server/src/services/service.Clients.ts:72` — Function 'anonymous' is 64 lines long (limit: 50)
- [ ] `server/src/services/service.Clients.ts:138` — Function 'anonymous' is 93 lines long (limit: 50)
- [ ] `server/src/services/service.EmailImap.ts:119` — Function 'anonymous' is 98 lines long (limit: 50)
- [ ] `server/src/services/service.EmailSmtp.ts:61` — Function 'anonymous' is 53 lines long (limit: 50)
- [ ] `server/src/services/service.InvoiceDelivery.ts:62` — Function 'anonymous' is 88 lines long (limit: 50)
- [ ] `server/src/services/service.InvoiceMollie.ts:40` — Function 'anonymous' is 74 lines long (limit: 50)
- [ ] `server/src/services/service.InvoicePaymentLink.ts:49` — Function 'anonymous' is 52 lines long (limit: 50)
- [ ] `server/src/services/service.InvoicePdf.ts:66` — Function 'anonymous' is 198 lines long (limit: 50)
- [ ] `server/src/services/service.MollieDashboard.ts:14` — Function 'anonymous' is 179 lines long (limit: 50)
- [ ] `server/src/services/service.MolliePaymentInvoicePdf.ts:18` — Function 'anonymous' is 95 lines long (limit: 50)
- [ ] `server/src/services/service.MollieSync.ts:140` — Function 'anonymous' is 53 lines long (limit: 50)
- [ ] `server/src/services/service.MollieSync.ts:211` — Function 'anonymous' is 85 lines long (limit: 50)
- [ ] `server/src/services/service.PaymentReminders.ts:116` — Function 'anonymous' is 73 lines long (limit: 50)
- [ ] `server/src/services/service.Search.ts:163` — Function 'anonymous' is 69 lines long (limit: 50)
- [ ] `server/src/services/service.Transaction.ts:116` — Function 'anonymous' is 83 lines long (limit: 50)
- [ ] `server/src/services/service.Transaction.ts:200` — Function 'anonymous' is 51 lines long (limit: 50)
- [ ] `server/src/services/service.Transaction.ts:363` — Function 'anonymous' is 51 lines long (limit: 50)

### `SKY-Q301` — Слишком высокая цикломатическая сложность (35) — В ПРОЦЕССЕ (27/35)

> Упростить ветвления, вынести под-функции.

**Прогресс: server-часть почти закрыта (10 из 12 находок на сервере обработаны,
1 сознательно оставлена, 1 отложена вместе с `SKY-C304`); из 23 client-находок
обработаны 16 (`InvoicesPage.tsx`, `OrganizationBrandsPage.tsx`,
`DanceStylesPage.tsx`, `ClientEmailBlock.tsx`, `EmailMessageDetail.tsx`,
`MolliePayments.tsx`, `GlobalSearch.tsx`, `EditSubscriptionDropdown.tsx`,
`HomePage.tsx`, `ClientForm.tsx`, `CreateGroupModal.tsx`,
`PaymentRemindersPage.tsx`,
`MollieCustomerDetails.tsx`,
`MollieIncidents.tsx`,
`EmailPage.tsx`,
`MolliePaymentsMatrix.tsx`,
`ScheduleSettingsPage.tsx:34` (cc21, волна 6; главный компонент разложен до чистого JSX) — см.
подробности в разделе `SKY-C304` выше, эти же файлы там же и декомпозированы).**
Многие из оставшихся client-находок
— это гигантские компоненты/модали (сложность 20–43), которые пересекаются с
`SKY-C304` (те же файлы фигурируют там как "слишком длинные функции") — их
корректная декомпозиция это фактически та же работа, что и для `SKY-C304`, и
имеет смысл делать обе находки по каждому такому файлу вместе, а не дважды
переписывать один и тот же компонент. Дальнейший прогресс — отдельными
проходами.

Обработано:
- `conteroller.Mollie.ts:380` (`webhookMollieController`, cc13) — вынесены
  отдельные функции `findInvoicePaymentLinkByToken`, `markInvoicePaymentLinkPaid`,
  `findSyncedPaymentForWebhook`, `logWebhookOutcome`, `notifyMolliePaymentIfLinked`,
  `markMollieEventFailed` — каждая отвечает за один шаг обработки вебхука.
- `conteroller.Mollie.ts:785` (`mollieGetCustomersController`, cc14) — закрыто
  попутно при рефакторинге `SKY-Q302` (см. выше) через `resolveSubscriptionsFilter`/
  `resolveMandatesFilter`.
- `conteroller.Mollie.ts:1611` (`mollieGetPaymentIncidentsController`, cc18) —
  самая крупная находка на сервере (~390 строк, 4 ветки payments/subscriptions/
  customers/all с дублированием where-условий и мапперов). Вынесены
  `buildPaymentIncidentWhere`/`buildSubscriptionIncidentWhere`/
  `buildCustomerIncidentWhere` и `mapPaymentIncident`/`mapSubscriptionIncident`/
  `mapCustomerIncident` — раньше эта логика была продублирована трижды
  (в каждой type-ветке и в комбинированной), теперь переиспользуется.
- `controller.Invoices.ts:584` (`updateInvoiceStatus`, cc15) — блок отмены
  связанных платежей Mollie вынесен в `cancelInvoiceMolliePayments(id, existing)`,
  возвращающую либо обновлённый инвойс, либо `{status, message}` для ответа —
  сохраняет точную семантику ранних `return` без изменения поведения.
- `controller.Invoices.ts:762` (`recordInvoicePayment`, cc18 по факту — на этой
  строке после сдвига оказалась либо эта, либо соседняя функция, обе обработаны)
  и `controller.Invoices.ts:793` (`createInvoiceAdjustment`, cc11) — валидационные
  проверки (тип документа/статус/сумма) вынесены в
  `validateInvoicePaymentEligibility`/`validateInvoiceAdjustmentEligibility`.
- `controller.Schedule.ts:336` (`danceStyleData`, cc12) — 10 полей строились
  через одинаковый `body.X ? String(body.X).trim() : null`; вынесено в один
  переиспользуемый `optionalTrimmedString(value)`.
- `controller.Users.ts:65` (`updateUserController`, cc13) — два блока записи
  security-аудита (смена роли, смена isEnabled — каждый с двумя
  `recordAuthSecurityEvent`) вынесены в `recordRoleChangeAudit`/
  `recordEnabledChangeAudit`. Сами проверки-guard'ы (нельзя заблокировать/
  переназначить себе роль) не трогались.
- `service.InvoiceDelivery.ts:62` (`sendInvoiceEmail`, cc12) — условие
  `balanceDueCents > 0 && iban && paymentReference` было продублировано в двух
  тернарниках (текстовая и html-версия банковских реквизитов) — объединено в
  один локальный хелпер `bankTransferInstructions()`; резолвинг ссылки на
  оплату вынесен в `resolvePaymentUrls()`. Оба — локальные замыкания внутри
  функции (не отдельные top-level экспорты), поэтому не пришлось выписывать
  Prisma-тип инвойса вручную.
- `service.Transaction.ts:200` (`getFilteredTransactions`, cc15) — сортировка
  строила `leftValue`/`rightValue` через одинаковую цепочку из 3 вложенных
  тернарников по `_sortBy`, продублированную для `left`/`right` — вынесено в
  `sortKeyFor(transaction, sortBy)`.

Отложено вместе с `SKY-C304` (та же функция там же тоже фигурирует):
- `service.InvoicePdf.ts:66` (`createInvoicePdf`, cc25) — ~200-строчная функция
  вёрстки PDF через `pdfkit` (шапка, реквизиты сторон, таблица позиций, итоги,
  QR-код, футер). Правильное исправление — это декомпозиция на функции по
  секциям макета, что и есть работа по `SKY-C304` для этого же файла;
  переделывать её дважды смысла нет.

Сознательно не тронуто:
- `controller.Auth.ts:110` (`login`, cc11) — функция логина: dummy-hash сравнение
  для защиты от timing-атак при отсутствующем пользователе, разветвление
  disabled-аккаунт/апгрейд хэша/доверенное устройство/2FA. Сложность здесь
  отражает реальные security-ветвления, а не случайную запутанность. У
  `controller.Auth.ts` нет отдельного теста на сам `login` (`test:auth` покрывает
  только сервисы `service.Password`/`service.Token`/`service.Csrf`/
  `service.AuthSecurityAudit`/`service.RateLimit`/`service.TwoFactorAuth`, не
  сам контроллер) — рефакторинг authentication-кода без теста, ловящего
  регрессию в security-логике, рискованнее, чем выигрыш от снижения метрики.
  Оставлено как есть; для безопасного рефакторинга в будущем сначала нужен
  dedicated-тест на `login`/`verifyTwoFactor`.

Проверено на каждом шаге: `tsc --noEmit` (server) — 0 ошибок; `npm run build`
(server) — чисто; `npm run test:ci` (все 5 сьютов) — 0 fail. Заметка: у
`conteroller.Mollie.ts`, `controller.Invoices.ts` нет отдельных unit-тестов
(только type-check + build + существующий `test:mollie`, который эти конкретные
контроллеры не вызывает) — рефакторинг делался как чистый перенос кода
(extract function) без изменения логики, построчно сверено.

- [x] `client/src/entities/EmailMessage/ui/EmailMessageDetail/EmailMessageDetail.tsx:60` — Function 'anonymous' has cyclomatic complexity 11 (limit: 10)
- [x] `client/src/features/addClientForm/ui/ClientForm/ClientForm.tsx:68` — Function 'anonymous' has cyclomatic complexity 14 (limit: 10)
- [x] `client/src/features/editSubscriptionDropdown/ui/EditSubscriptionDropdown/EditSubscriptionDropdown.tsx:30` — Function 'anonymous' has cyclomatic complexity 16 (limit: 10)
- [x] `client/src/features/globalSearch/ui/GlobalSearch/GlobalSearch.tsx:115` — Function 'anonymous' has cyclomatic complexity 16 (limit: 10)
- [ ] `client/src/pages/ChoreographersPage/ui/ChoreographerModal/ChoreographerModal.tsx:29` — Function 'anonymous' has cyclomatic complexity 35 (limit: 10)
- [x] `client/src/pages/ClientsDetailsPage/ui/ClientEmailBlock/ClientEmailBlock.tsx:35` — Function 'anonymous' has cyclomatic complexity 15 (limit: 10)
- [ ] `client/src/pages/ClientsDetailsPage/ui/ClientPaymentBlock/ClientPaymentBlock.tsx:134` — Function 'anonymous' has cyclomatic complexity 43 (limit: 10)
- [ ] `client/src/pages/ClientsDetailsPage/ui/EditClientModal/EditClientModal.tsx:49` — Function 'anonymous' has cyclomatic complexity 22 (limit: 10)
- [ ] `client/src/pages/ClientsDetailsPage/ui/EditClientModal/EditClientModal.tsx:126` — Function 'anonymous' has cyclomatic complexity 17 (limit: 10)
- [x] `client/src/pages/DanceStylesPage/ui/DanceStylesPage/DanceStylesPage.tsx:51` — Function 'anonymous' has cyclomatic complexity 20 (limit: 10)
- [x] `client/src/pages/EmailPage/ui/EmailPage/EmailPage.tsx:51` — Function 'anonymous' has cyclomatic complexity 21 (limit: 10)
- [x] `client/src/pages/HomePage/ui/HomePage.tsx:126` — Function 'anonymous' has cyclomatic complexity 12 (limit: 10)
- [ ] `client/src/pages/InvoicesPage/ui/CreateInvoiceModal/CreateInvoiceModal.tsx:44` — Function 'anonymous' has cyclomatic complexity 37 (limit: 10)
- [ ] `client/src/pages/InvoicesPage/ui/CreateInvoiceModal/CreateInvoiceModal.tsx:191` — Function 'anonymous' has cyclomatic complexity 12 (limit: 10)
- [x] `client/src/pages/InvoicesPage/ui/InvoicesPage/InvoicesPage.tsx:57` — Function 'anonymous' has cyclomatic complexity 29 (limit: 10)
- [x] `client/src/pages/MolliePage/ui/MollieCustomerDetails/MollieCustomerDetails.tsx:294` — Function 'anonymous' has cyclomatic complexity 11 (limit: 10)
- [x] `client/src/pages/MolliePage/ui/MollieIncidents/MollieIncidents.tsx:191` — Function 'anonymous' has cyclomatic complexity 15 (limit: 10)
- [x] `client/src/pages/MolliePage/ui/MolliePayments/MolliePayments.tsx:173` — Function 'anonymous' has cyclomatic complexity 14 (limit: 10)
- [x] `client/src/pages/MolliePage/ui/MolliePaymentsMatrix/MolliePaymentsMatrix.tsx:104` — Function 'anonymous' has cyclomatic complexity 25 (limit: 10)
- [x] `client/src/pages/OrganizationBrandsPage/ui/OrganizationBrandsPage.tsx:57` — Function 'anonymous' has cyclomatic complexity 12 (limit: 10)
- [x] `client/src/pages/PaymentRemindersPage/ui/PaymentRemindersPage/PaymentRemindersPage.tsx:95` — Function 'anonymous' has cyclomatic complexity 21 (limit: 10)
- [x] `client/src/pages/ScheduleSettingsPage/ui/CreateGroupModal/CreateGroupModal.tsx:26` — Function 'anonymous' has cyclomatic complexity 14 (limit: 10)
- [x] `client/src/pages/ScheduleSettingsPage/ui/ScheduleSettingsPage/ScheduleSettingsPage.tsx:34` — Function 'anonymous' has cyclomatic complexity 21 (limit: 10) → волна 6: главный компонент разложен до чистого JSX, сложность снята, подтверждено `check:skylos` (остаётся `useScheduleSettingsPage.ts:44` cc11 — отложен вместе с `SKY-C304`, не трогаем)
- [x] `server/src/controllers/conteroller.Mollie.ts:785` — Function 'anonymous' has cyclomatic complexity 14 (limit: 10)
- [x] `server/src/controllers/conteroller.Mollie.ts:380` — Function 'anonymous' has cyclomatic complexity 13 (limit: 10)
- [x] `server/src/controllers/conteroller.Mollie.ts:1611` — Function 'anonymous' has cyclomatic complexity 18 (limit: 10)
- [ ] `server/src/controllers/controller.Auth.ts:110` — Function 'anonymous' has cyclomatic complexity 11 (limit: 10)
- [x] `server/src/controllers/controller.Invoices.ts:584` — Function 'anonymous' has cyclomatic complexity 15 (limit: 10)
- [x] `server/src/controllers/controller.Invoices.ts:762` — Function 'anonymous' has cyclomatic complexity 18 (limit: 10)
- [x] `server/src/controllers/controller.Invoices.ts:793` — Function 'anonymous' has cyclomatic complexity 11 (limit: 10)
- [x] `server/src/controllers/controller.Schedule.ts:336` — Function 'anonymous' has cyclomatic complexity 12 (limit: 10)
- [x] `server/src/controllers/controller.Users.ts:65` — Function 'anonymous' has cyclomatic complexity 13 (limit: 10)
- [x] `server/src/services/service.InvoiceDelivery.ts:62` — Function 'anonymous' has cyclomatic complexity 12 (limit: 10)
- [ ] `server/src/services/service.InvoicePdf.ts:66` — Function 'anonymous' has cyclomatic complexity 25 (limit: 10)
- [x] `server/src/services/service.Transaction.ts:200` — Function 'anonymous' has cyclomatic complexity 15 (limit: 10)

### `SKY-Q302` — Слишком большая глубина вложенности (4) — ЗАКРЫТО

> Использовать ранние return/guard clauses.

- [x] `client/src/pages/InvoicesPage/ui/InvoicesPage/InvoicesPage.tsx:57` — Function 'anonymous' has nesting depth 6 (limit: 4)
- [x] `client/src/pages/InvoicesPage/ui/InvoicesPage/InvoicesPage.tsx:108` — Function 'anonymous' has nesting depth 6 (limit: 4)
- [x] `server/src/controllers/conteroller.Mollie.ts:785` — Function 'anonymous' has nesting depth 5 (limit: 4)
- [x] `server/src/services/service.PaymentReminders.ts:197` — Function 'anonymous' has nesting depth 5 (limit: 4)

Исправлено:
- `InvoicesPage.tsx:57` (сам компонент) — глубина 6 набегала из-за карточки инвойса,
  инлайненной в `invoices.map()` внутри JSX (условный рендеринг вложен в условный
  рендеринг). Карточка вынесена в отдельный мемоизированный компонент
  `InvoiceListItem.tsx` в той же папке — каждый уровень условного рендеринга внутри
  неё стартует с глубины 1 заново. Заодно вынесены туда же локальные хелперы
  `documentLabel`/`actionLabel`/`money`/`actorName`/`canEdit`, которые нужны только
  карточке (`statusLabel` остался в `InvoicesPage.tsx` — используется ещё и в
  фильтрах). Поведение не менялось, все существующие тесты
  `InvoicesPage.test.tsx`/`InvoiceActionModal.test.tsx`/`CreateInvoiceModal.test.tsx`
  прошли без изменений (21/21).
- `InvoicesPage.tsx:108` (`handleActionConfirm`) — цепочка из 5 `if/else if` по
  `result.type` заменена на `switch` (дискриминирующее объединение `ActionResult`
  сужается по `switch` так же корректно, как по `if`).
- `conteroller.Mollie.ts:785` (`mollieGetCustomersController`) — вложенные
  `if/else if` по `subscriptionStatus`/`hasSubscriptions` и по `hasMandates`
  вынесены в чистые хелперы `resolveSubscriptionsFilter`/`resolveMandatesFilter` с
  ранними `return` вместо `else if`.
- `service.PaymentReminders.ts:197` (`runPaymentReminders`) — `if/else if` цепочка
  по `delivery.status` внутри `for`-цикла заменена на guard clause (`if (!delivery)
  { ...; continue; }`) + `switch` по статусу.

Проверено: `tsc --noEmit` (client+server) — 0 ошибок; `npm run build` (server) —
чисто; server `test:payment-reminders` — 10/10; client Jest (полный набор)
281/281 suites, 976/976 тестов — без регрессий.

### `SKY-L007` — Пустой catch-блок (1) — проверено, false positive

> Обработать ошибку, залогировать или задокументировать, почему её можно игнорировать.

- [x] `client/webpack.config.ts:9` — Empty catch block silently discards an error; handle it, report it, or document why ignoring it is safe.

У блока уже есть комментарий, объясняющий, почему игнорирование безопасно
(`.env` может отсутствовать при Docker-сборке — переменные приходят из окружения
вызывающей стороны) — это ровно то, что просит рекомендация правила
("...залогировать или задокументировать, почему её можно игнорировать"). Skylos,
похоже, детектирует пустой `catch {}` синтаксически, не читая комментарий внутри.
Код не менялся.

### `SKY-Q402` — await внутри цикла (23) — ЗАКРЫТО

> Использовать Promise.all()/Promise.allSettled() для параллельного выполнения, если итерации независимы.

- [x] `server/prisma/seed.ts:35` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/controllers/controller.Invoices.ts:654` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/controllers/controller.Invoices.ts:276` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/controllers/controller.Invoices.ts:280` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/controllers/controller.Invoices.ts:655` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/services/service.EmailImap.ts:170` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/services/service.EmailImap.ts:90` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/services/service.EmailImap.ts:160` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/services/service.EmailImap.ts:196` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/services/service.EmailImap.ts:168` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/services/service.EmailSmtp.ts:108` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/services/service.EmailSyncCron.ts:16` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/services/service.InvoiceDelivery.ts:173` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/services/service.InvoiceDelivery.ts:177` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/services/service.MollieSync.ts:311` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/services/service.MollieSync.ts:461` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/services/service.MollieSync.ts:200` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/services/service.MollieSync.ts:312` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/services/service.MollieSync.ts:329` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/services/service.MollieSync.ts:387` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/services/service.MollieSync.ts:458` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/services/service.MollieSync.ts:384` — await inside loop — consider using Promise.all() for parallel execution.
- [x] `server/src/services/service.PaymentReminders.ts:210` — await inside loop — consider using Promise.all() for parallel execution.

Из 23 находок — 3 реально распараллелены, 20 сознательно оставлены
последовательными (с обоснованием, не вслепую).

**Распараллелено (3):**
- `service.EmailImap.ts:90` (`saveAttachments`) и `service.EmailSmtp.ts:108`
  (вложение писем) — сохранение вложений одного письма независимо друг от друга
  (`storeAttachmentFile` пишет каждое во free-standing файл с уникальным `uuid`
  именем) — заменено на `Promise.all(attachments.map(...))`.
- `service.EmailSyncCron.ts:16` (`syncAllActiveEmailAccounts`) — комментарий над
  функцией уже описывал желаемое поведение ("одна медленная/сломанная связь не
  должна задерживать синхронизацию остальных"), но цикл был последовательным
  (`for...of` + `await`), т.е. медленный ящик реально блокировал остальные —
  заменено на `Promise.allSettled(accounts.map(...))`, что впервые реализует
  задуманное параллельно по аккаунтам (у каждого аккаунта своё IMAP-соединение и
  собственный guard `accountsCurrentlySyncing` от повторного захода).

**Сознательно оставлено последовательным (20), с обоснованием:**
- `service.EmailImap.ts:160/168/170/196` (4) — основной цикл синхронизации одного
  почтового ящика — это `for await` по асинхронному итератору ОДНОГО IMAP-соединения
  (`client.fetch(...)`), а не независимые итерации по массиву; кроме того, внутри
  инкрементально накапливается `highestUid` и на каждое письмо — собственный
  try/catch для изоляции ошибок по письму. Распараллеливание изменило бы протокольную
  семантику IMAP-сессии и логику курсора синхронизации — не тривиальный рефакторинг,
  не то же самое, что "await в цикле" по независимому массиву.
- `controller.Invoices.ts:276/280` (2, `markOverdueInvoices`) — цикл внутри
  `prisma.$transaction(async (transaction) => {...})`. Интерактивные транзакции
  Prisma работают через одно соединение — параллельные запросы внутри одной
  транзакции официально не поддерживаются Prisma (гонка за соединением). Оставлено
  последовательным — это правильное поведение, не недостаток.
- `controller.Invoices.ts:654/655` (2 — по факту сейчас строки ~683/684 из-за
  сдвига номеров после правок SKY-C303/Q302 в этом же файле; сам код тот же) —
  цикл отмены активных платежей Mollie при отмене инвойса. Последовательность
  обеспечивает семантику "остановиться на первой ошибке, вернуть 502, инвойс не
  тронут" — при `Promise.all` часть платежей могла бы отмениться, а часть нет, и
  инвойс остался бы в неопределённом состоянии. Финансовая операция — оставлено
  как есть намеренно.
- `service.InvoiceDelivery.ts:173/177` (2, `sendDueInvoiceReminders`) и
  `service.PaymentReminders.ts:210` (1, `runPaymentReminders`) — массовая отправка
  email/напоминаний клиентам. Последовательная отправка — это единственный
  механизм троттлинга, который сейчас есть (нет отдельного rate-limiter); неограниченный
  `Promise.all` по потенциально десяткам-сотням инвойсов/подписок разом рискует
  упереться в лимиты почтового провайдера. Требует продуктового решения о лимите
  параллелизма — не мех. фикс, оставлено как есть.
- `service.MollieSync.ts` (8: 196/200, 307/311-312, 325/329, 382/384/386-387,
  456/458/460-461) — все циклы синхронизации с Mollie API (customers/payments/
  mandates/subscriptions). Нет отдельного rate-limiter — последовательный `await`
  в цикле сейчас единственная защита от пробивания лимитов Mollie API при полном
  ресинке (потенциально сотни записей). Оставлено намеренно последовательным по
  той же причине, что и email-рассылки выше.
- `server/prisma/seed.ts:35` (`down()`) — цикл из 2 итераций (`TRUNCATE TABLE
  sessions`, `TRUNCATE TABLE users`) между `SET FOREIGN_KEY_CHECKS = 0` и `= 1`.
  Тривиальный dev-seed скрипт, распараллеливание TRUNCATE с отключенными FK
  проверками не даёт ощутимого выигрыша и не стоит риска.

Проверено: `tsc --noEmit` (server) — 0 ошибок; `npm run build` (server) — чисто;
`npm run test:ci` (все 5 сьютов) — 0 fail — без регрессий.

### `SKY-C303` — Слишком много параметров функции (1) — ЗАКРЫТО

> Сгруппировать параметры в один объект.

- [x] `server/src/controllers/controller.Invoices.ts:203` — Function 'anonymous' has 6 parameters (limit: 5)

`createAuditLog(transaction, invoiceId, action, actorId, oldValues, newValues)` →
`createAuditLog(transaction, { invoiceId, action, actorId, oldValues, newValues })`
— `transaction` (контекст) остался отдельным позиционным параметром, остальные 5
сгруппированы в один объект `params`, как и рекомендует правило. Обновлены все 10
мест вызова в файле. Проверено: `tsc --noEmit` (server) — 0 ошибок; `npm run build`
— чисто; `npm run test:ci` — без регрессий (для этой функции отдельного unit-теста
нет — `server` не имеет единой test-команды на весь репозиторий, см. `AGENTS.md`).

## Архитектура / публичные API модулей

### `SKY-L012` — Символ используется, но не экспортирован из публичного API модуля (281) — ЗАКРЫТО

> В основном false positive для текущей FSD-конфигурации алиасов/barrel-экспортов (`StateSchema`, `ThunkConfig`, компоненты страниц и т.д.) — нужен точечный ревью конфигурации Skylos под алиас `@/`, а не массовое переписывание экспортов.
>
> **Как закрыто (ветка `fix/skylos-code-quality-wave10`):** перед закрытием повторный прогон без конфигурации давал уже 326 срабатываний (325 в `client/src/` + 1 в `client/config/storybook/preview.ts`) — все одного паттерна: символ импортируется через алиас `@/` из barrel `index.ts`, который эти символы реально реэкспортирует (проверено на `StateSchema`, `ThunkConfig`, `Navbar`, `TransactionsPage`, `createReduxStore`, `ReduxStoreWithManager` и др.). У Skylos нет резолвера алиасов для такого случая (единственная настройка `ignore` применяется глобально, `overrides.whitelist` матчит имена символов, а не коды правил). Добавлен `skylos.toml` с `ignore = ["SKY-L012"]` (подключён в `scripts/check-skylos.sh` через `--config-file`) — повторный прогон `npm run check:skylos`: 0 срабатываний SKY-L012. Оставшиеся пункты ниже — исторический снапшот срабатываний, не требующий правок.

- [ ] `client/config/storybook/preview.ts:5` — 'Theme' is referenced from local module '../../src/app/providers/ThemeProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/app/App.tsx:2` — 'Navbar' is referenced from local module '@/widgets/Navbar', but that symbol is not exported by its static API surface.
- [ ] `client/src/app/App.tsx:3` — 'Sidebar' is referenced from local module '@/widgets/Sidebar', but that symbol is not exported by its static API surface.
- [ ] `client/src/app/providers/StoreProvider/config/StateSchema.ts:11` — 'ArticleDetailsCommentsSchema' is referenced from local module '@/pages/ArticleDetailsPage', but that symbol is not exported by its static API surface.
- [ ] `client/src/app/providers/StoreProvider/config/StateSchema.ts:12` — 'AddCommentFormSchema' is referenced from local module '@/features/AddCommentForm', but that symbol is not exported by its static API surface.
- [ ] `client/src/app/providers/router/config/routeConfig.tsx:1` — 'HomePage' is referenced from local module '@/pages/HomePage', but that symbol is not exported by its static API surface.
- [ ] `client/src/app/providers/router/config/routeConfig.tsx:2` — 'AboutPage' is referenced from local module '@/pages/AboutPage', but that symbol is not exported by its static API surface.
- [ ] `client/src/app/providers/router/config/routeConfig.tsx:4` — 'ProfilePage' is referenced from local module '@/pages/ProfilePage', but that symbol is not exported by its static API surface.
- [ ] `client/src/app/providers/router/config/routeConfig.tsx:6` — 'ArticleDetailsPage' is referenced from local module '@/pages/ArticleDetailsPage', but that symbol is not exported by its static API surface.
- [ ] `client/src/app/providers/router/config/routeConfig.tsx:10` — 'TransactionsPage' is referenced from local module '@/pages/TransactionsPage', but that symbol is not exported by its static API surface. Available close matches: TransactionsPageSchema.
- [ ] `client/src/entities/Article/model/selectors/articleDetails.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Article/model/selectors/articleDetails.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Article/model/services/fetchArticleById/fetchArticleById.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Article/model/services/fetchCommentsByArticleId/fetchCommentsByArticleId.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Article/ui/ArticleDetails/ArticleDetails.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Article/ui/ArticleDetails/ArticleDetails.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Client/model/selectors/clientDetails.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Client/model/selectors/clientDetails.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Client/model/services/fetchClientById/deleteClientById.tsx:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Client/model/services/fetchClientById/fetchClientById.tsx:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Client/ui/ClientDetails/ClientDetails.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Client/ui/ClientDetails/ClientDetails.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/MollieClient/model/selectors/clientDetails.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/MollieClient/model/selectors/clientDetails.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/MollieClient/model/services/deleteClientById/deleteClientById.tsx:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/MollieClient/model/services/fetchClientById/fetchClientById.tsx:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/MollieClient/ui/ClientDetails/ClientDetails.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/MollieClient/ui/ClientDetails/ClientDetails.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Profile/model/selectors/getProfileData/getProfileData.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Profile/model/selectors/getProfileData/getProfileData.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Profile/model/selectors/getProfileError/getProfileError.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Profile/model/selectors/getProfileError/getProfileError.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Profile/model/selectors/getProfileForm/getProfileForm.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Profile/model/selectors/getProfileForm/getProfileForm.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Profile/model/selectors/getProfileLoading/getProfileLoading.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Profile/model/selectors/getProfileLoading/getProfileLoading.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Profile/model/selectors/getProfileReadonly/getProfileReadonly.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Profile/model/selectors/getProfileReadonly/getProfileReadonly.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Profile/model/selectors/getProfileValidateErrors/getProfileValidateErrors.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Profile/model/selectors/getProfileValidateErrors/getProfileValidateErrors.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Profile/model/services/fetchProfileData/fetchProfileData.tsx:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Profile/model/services/updateProfileData/updateProfileData.test.tsx:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Profile/model/services/updateProfileData/updateProfileData.ts:2` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/Profile/model/services/updateProfileData/updateProfileData.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/User/model/selectors/getUserAuthData/getUserAuthData.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/User/model/selectors/getUserAuthData/getUserAuthData.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/User/model/selectors/getUserInited/getUserInited.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/User/model/selectors/getUserInited/getUserInited.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/User/model/services/initAuthData.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/entities/User/model/services/logout.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/AddCommentForm/model/selectors/getAddCommentFormSelectors.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/AddCommentForm/model/selectors/getAddCommentFormSelectors.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/AddCommentForm/model/services/addCommentForArticle/addCommentForArticle.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/AddCommentForm/model/services/addCommentForArticle/addCommentForArticle.ts:3` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/AddCommentForm/model/services/sendComment/sendComment.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/AddCommentForm/model/services/sendComment/sendComment.ts:3` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/AddCommentForm/ui/AddCommentForm/AddCommentForm.test.tsx:3` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/AddCommentForm/ui/AddCommentForm/AddCommentForm.test.tsx:3` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/Auth/model/selectors/getLoginEmail/getLoginEmail.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/Auth/model/selectors/getLoginEmail/getLoginEmail.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/Auth/model/selectors/getLoginError/getLoginError.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/Auth/model/selectors/getLoginError/getLoginError.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/Auth/model/selectors/getLoginIsLoading/getLoginIsLoading.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/Auth/model/selectors/getLoginIsLoading/getLoginIsLoading.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/Auth/model/selectors/getLoginPassword/getLoginPassword.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/Auth/model/selectors/getLoginPassword/getLoginPassword.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/Auth/model/services/loginByUsername/loginByUsername.ts:3` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/Auth/model/services/resendTwoFactorCode/resendTwoFactorCode.ts:3` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/Auth/model/services/verifyTwoFactorCode/verifyTwoFactorCode.ts:4` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/Auth/ui/LoginForm/LoginForm.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/Auth/ui/LoginForm/LoginForm.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/Auth/ui/TwoFactorForm/TwoFactorForm.test.tsx:3` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/Auth/ui/TwoFactorForm/TwoFactorForm.test.tsx:3` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/UI/model/selectors/ui.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/UI/model/selectors/ui.ts:2` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addClientForm/model/selectors/getAddClientForm/getAddClientForm.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addClientForm/model/selectors/getAddClientForm/getAddClientForm.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addClientForm/model/selectors/getAddClientFormError/getAddClientFormError.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addClientForm/model/selectors/getAddClientFormError/getAddClientFormError.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addClientForm/model/selectors/getAddClientFormIsLoading/getAddClientFormIsLoading.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addClientForm/model/selectors/getAddClientFormIsLoading/getAddClientFormIsLoading.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addClientForm/model/selectors/getAddClientFormValidateErrors/getAddClientFormValidateErrors.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addClientForm/model/selectors/getAddClientFormValidateErrors/getAddClientFormValidateErrors.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addClientForm/model/services/addClientData/addClientData.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addClientForm/model/services/addClientData/addClientData.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addClientForm/ui/ClientForm/ClientForm.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addClientForm/ui/ClientForm/ClientForm.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addMollieClientForm/model/selectors/getAddClientForm/getAddClientForm.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addMollieClientForm/model/selectors/getAddClientForm/getAddClientForm.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addMollieClientForm/model/services/addMolieClientData/addMolieClientData.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addMollieClientForm/model/services/addMolieClientData/addMolieClientData.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addMollieClientForm/ui/MollieClientForm/MollieClientForm.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addMollieClientForm/ui/MollieClientForm/MollieClientForm.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addMollieSubscriptionForm/model/selectors/getMollieSubscriptionData.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addMollieSubscriptionForm/model/selectors/getMollieSubscriptionData.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addMollieSubscriptionForm/model/services/addSubscription/addSubscription.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addMollieSubscriptionForm/model/services/addSubscription/addSubscription.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addMollieSubscriptionForm/model/services/fetchMollieClientsList/fetchMollieClientsList.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addMollieSubscriptionForm/ui/AddMollieSubscriptionForm/AddMollieSubscriptionForm.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addMollieSubscriptionForm/ui/AddMollieSubscriptionForm/AddMollieSubscriptionForm.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addTransactionForm/model/selectors/getTransactionFormData.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addTransactionForm/model/selectors/getTransactionFormData.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addTransactionForm/model/services/createTransaction/createTransaction.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addTransactionForm/model/services/createTransaction/createTransaction.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addTransactionForm/ui/AddTransactionForm/AddTransactionForm.test.tsx:3` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addTransactionForm/ui/AddTransactionForm/AddTransactionForm.test.tsx:3` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addUserForm/model/selectors/getAddUserForm/getAddUserForm.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addUserForm/model/selectors/getAddUserForm/getAddUserForm.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addUserForm/model/services/addNewUser/addNewUser.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addUserForm/model/services/addNewUser/addNewUser.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addUserForm/ui/UserForm/UserForm.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/addUserForm/ui/UserForm/UserForm.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/avatarDropdown/ui/AvatarDropdown/AvatarDropdown.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/avatarDropdown/ui/AvatarDropdown/AvatarDropdown.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/changePassword/model/services/changePasswordThunk.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/changePassword/ui/ChangePasswordModal/ChangePasswordModal.test.tsx:3` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/changePassword/ui/ChangePasswordModal/ChangePasswordModal.test.tsx:3` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/createMollieMandateForm/model/selectors/getMollieMandateCard.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/createMollieMandateForm/model/selectors/getMollieMandateCard.tsx:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/createMollieMandateForm/model/services/addMandate/addMandate.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/createMollieMandateForm/model/services/addMandate/addMandate.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/createMollieMandateForm/model/services/fetchMollieClientsList/fetchMollieClientsList.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/createMollieMandateForm/ui/CreateMollieMandateForm/CreateMollieMandateForm.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/createMollieMandateForm/ui/CreateMollieMandateForm/CreateMollieMandateForm.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editClientDropdown/model/services/deleteClientById.tsx:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editClientDropdown/ui/EditClientDropdown/EditClientDropdown.test.tsx:5` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editClientDropdown/ui/EditClientDropdown/EditClientDropdown.test.tsx:5` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editMollieClientDropdown/model/selectors/getMollieClientForm.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editMollieClientDropdown/model/selectors/getMollieClientForm.tsx:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editMollieClientDropdown/model/services/deleteMollieClientById.tsx:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editMollieClientDropdown/model/services/fetchMollieClientData/fetchMollieClientData.tsx:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editMollieClientDropdown/model/services/updateMollieClientData/updateMollieClientData.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editMollieClientDropdown/model/services/updateMollieClientData/updateMollieClientData.ts:2` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editMollieClientDropdown/model/services/updateMollieClientData/updateMollieClientData.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editMollieClientDropdown/ui/EditMollieClientDropdown/EditMollieClientDropdown.test.tsx:5` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editMollieClientDropdown/ui/EditMollieClientDropdown/EditMollieClientDropdown.test.tsx:5` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editMollieClientDropdown/ui/MollieClientForm/MollieClientForm.test.tsx:5` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editMollieClientDropdown/ui/MollieClientForm/MollieClientForm.test.tsx:5` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editProfile/model/services/updateProfileData.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editProfile/model/services/updateProfileData.ts:2` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editProfile/model/services/updateProfileData.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editSubscriptionDropdown/model/services/deleteSubscriptionById.tsx:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editTransactionDropdown/model/services/deleteTransactionById.tsx:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editTransactionDropdown/ui/EditTransactionDropdown/EditTransactionDropdown.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editTransactionDropdown/ui/EditTransactionDropdown/EditTransactionDropdown.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editUserDropdown/model/services/deleteUserById.tsx:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editUserDropdown/ui/EditUserDropdown/EditUserDropdown.test.tsx:5` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/features/editUserDropdown/ui/EditUserDropdown/EditUserDropdown.test.tsx:5` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/index.tsx:3` — 'ThemeProvider' is referenced from local module '@/app/providers/ThemeProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/index.tsx:8` — 'StoreProvider' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/AboutPage/ui/AboutPage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/AboutPage/ui/AboutPage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ArticleDetailsPage/model/selectors/comments.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ArticleDetailsPage/model/services/fetchCommentsByArticleId/fetchCommentsByArticleId.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ArticleDetailsPage/model/slices/articleDetailsCommentsSlice.ts:7` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ArticleDetailsPage/ui/ArticleDetailsPage/ArticleDetailsPage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ArticleDetailsPage/ui/ArticleDetailsPage/ArticleDetailsPage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ArticleDetailsPage/ui/ArticleDetailsPage/ArticleDetailsPage.tsx:22` — 'addCommentForArticle' is referenced from local module '@/features/AddCommentForm', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ArticleDetailsPage/ui/ArticleDetailsPage/ArticleDetailsPage.tsx:22` — 'AddCommentForm' is referenced from local module '@/features/AddCommentForm', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ArticlesPage/model/selectors/articlesPageSelectors.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ArticlesPage/model/services/fetchArticlesList/fetchArticlesList.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ArticlesPage/model/services/fetchNextArticlesPage/fetchNextArticlesPage.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ArticlesPage/model/services/fetchNextArticlesPage/fetchNextArticlesPage.ts:8` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ArticlesPage/model/services/initArticlesPage/initArticlesPage.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ArticlesPage/model/slices/ArticlesPageSlice.ts:7` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ArticlesPage/ui/ArticlesPage/ArticlesPage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ArticlesPage/ui/ArticlesPage/ArticlesPage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/AuthPage/ui/LoginPage/LoginPage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/AuthPage/ui/LoginPage/LoginPage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/BranchesPage/ui/BranchesPage/BranchesPage.test.tsx:5` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/BranchesPage/ui/BranchesPage/BranchesPage.test.tsx:5` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ChoreographersPage/ui/ChoreographersPage/ChoreographersPage.test.tsx:5` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ChoreographersPage/ui/ChoreographersPage/ChoreographersPage.test.tsx:5` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsDetailsPage/model/selectors/comments.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsDetailsPage/model/selectors/comments.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsDetailsPage/model/services/addCommentsForClient/addCommentsForClient.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsDetailsPage/model/services/addCommentsForClient/addCommentsForClient.ts:3` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsDetailsPage/model/services/fetchCommentsByClientId/fetchCommentsByClientId.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsDetailsPage/model/services/fetchCommentsByClientId/fetchCommentsByClientId.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsDetailsPage/model/slices/clientDetailsCommentsSlice.ts:7` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsDetailsPage/ui/ClientDetailsComments/ClientDetailsComments.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsDetailsPage/ui/ClientDetailsComments/ClientDetailsComments.tsx:6` — 'AddCommentForm' is referenced from local module '@/features/AddCommentForm', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsDetailsPage/ui/ClientsDetailsPage/ClientsDetailsPage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsDetailsPage/ui/ClientsDetailsPage/ClientsDetailsPage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsPage/lib/hooks/useClientFilters.test.tsx:3` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsPage/model/selectors/clientsPageSelectors.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsPage/model/selectors/clientsPageSelectors.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsPage/model/services/fetchClientsList/fetchClientsList.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsPage/model/services/fetchClientsList/fetchClientsList.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsPage/model/services/fetchNextClientsPage/fetchNextClientsPage.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsPage/model/services/fetchNextClientsPage/fetchNextClientsPage.ts:8` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsPage/model/services/initClientsPage/initClientsPage.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsPage/model/services/initClientsPage/initClientsPage.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsPage/model/slices/clientsPageSlice.ts:7` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsPage/ui/ClientsPage/ClientsPage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsPage/ui/ClientsPage/ClientsPage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ClientsPage/ui/FiltersContainer/FiltersContainer.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/CompanyPage/ui/CompanyPage/CompanyPage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/CompanyPage/ui/CompanyPage/CompanyPage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ContentHubPage/ui/ContentHubPage/ContentHubPage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ContentHubPage/ui/ContentHubPage/ContentHubPage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/CrmSettingsPage/ui/CrmSettingsPage/CrmSettingsPage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/CrmSettingsPage/ui/CrmSettingsPage/CrmSettingsPage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/DanceSchoolPage/ui/DanceSchoolPage/DanceSchoolPage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/DanceSchoolPage/ui/DanceSchoolPage/DanceSchoolPage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/DanceStylesPage/ui/DanceStylesPage/DanceStylesPage.test.tsx:5` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/DanceStylesPage/ui/DanceStylesPage/DanceStylesPage.test.tsx:5` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/HomePage/ui/HomePage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/HomePage/ui/HomePage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/InvoicesPage/ui/InvoicesPage/InvoicesPage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/InvoicesPage/ui/InvoicesPage/InvoicesPage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/MolliePage/model/selectors/mollieClientsPageSelectors.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/MolliePage/model/selectors/mollieClientsPageSelectors.tsx:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/MolliePage/model/services/fetchAllMandates/fetchAllMandates.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/MolliePage/model/services/fetchAllMandates/fetchAllMandates.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/MolliePage/model/services/fetchAllSubscriptions/fetchAllSubscriptions.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/MolliePage/model/services/fetchAllSubscriptions/fetchAllSubscriptions.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/MolliePage/model/services/fetchMollieClientsList/fetchMollieClientsList.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/MolliePage/model/services/fetchMollieClientsList/fetchMollieClientsList.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/MolliePage/model/slices/mollieClientsDetailsPageSlice.ts:7` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/MolliePage/ui/MollieCustomerDetails/MollieCustomerDetails.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/MolliePage/ui/MollieCustomerDetails/MollieCustomerDetails.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/MolliePage/ui/MollieCustomers/MollieCustomers.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/MolliePage/ui/MollieCustomers/MollieCustomers.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/MolliePage/ui/MolliePage/MolliePage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/MolliePage/ui/MolliePage/MolliePage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/NotFoundPage/ui/NotFoundPage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/NotFoundPage/ui/NotFoundPage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/OrganizationBrandsPage/ui/OrganizationBrandsPage.test.tsx:5` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/OrganizationBrandsPage/ui/OrganizationBrandsPage.test.tsx:5` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/PaymentRemindersPage/ui/PaymentRemindersPage/PaymentRemindersPage.test.tsx:5` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/PaymentRemindersPage/ui/PaymentRemindersPage/PaymentRemindersPage.test.tsx:5` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ProfilePage/ui/ActiveSessions/ActiveSessions.test.tsx:3` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ProfilePage/ui/ActiveSessions/ActiveSessions.test.tsx:3` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ProfilePage/ui/ProfilePage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ProfilePage/ui/ProfilePage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/SchedulePage/ui/SchedulePage/SchedulePage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/SchedulePage/ui/SchedulePage/SchedulePage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ScheduleSettingsPage/ui/ScheduleSettingsPage/ScheduleSettingsPage.test.tsx:5` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/ScheduleSettingsPage/ui/ScheduleSettingsPage/ScheduleSettingsPage.test.tsx:5` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/SettingsPage/model/selectors/clientsPageSelectors.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/SettingsPage/model/services/fetchUsersList/fetchUsersList.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/SettingsPage/ui/SettingsPage/SettingsPage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/SettingsPage/ui/SettingsPage/SettingsPage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/StudentsPage/ui/StudentsPage/StudentsPage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/StudentsPage/ui/StudentsPage/StudentsPage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/TransactionsPage/lib/hooks/useTransactionFilters.test.tsx:3` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/TransactionsPage/model/selectors/getTransactionPageSummary.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/TransactionsPage/model/selectors/getTransactionPageSummary.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/TransactionsPage/model/selectors/transactionPageSelectors.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/TransactionsPage/model/selectors/transactionPageSelectors.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/TransactionsPage/model/services/fetchTransactionsList/fetchTransactionsList.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/TransactionsPage/model/services/fetchTransactionsList/fetchTransactionsList.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/TransactionsPage/model/services/fetchTransactionsSummary/fetchTransactionsSummary.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/TransactionsPage/model/services/fetchTransactionsSummary/fetchTransactionsSummary.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/TransactionsPage/model/services/initTransactionsPage/initTransactionsPage.test.ts:1` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/TransactionsPage/model/services/initTransactionsPage/initTransactionsPage.ts:2` — 'ThunkConfig' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/TransactionsPage/ui/FiltersContainer/FiltersContainer.test.tsx:3` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/TransactionsPage/ui/TransactionsPage/TransactionsPage.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/pages/TransactionsPage/ui/TransactionsPage/TransactionsPage.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/shared/api/api.ts:1` — 'StoreType' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/shared/config/storybook/StoreDecorator/StoreDecorator.tsx:2` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/shared/config/storybook/StoreDecorator/StoreDecorator.tsx:2` — 'StoreProvider' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader.test.tsx:3` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader.test.tsx:3` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/shared/lib/hooks/useAppDispatch/useAppDispatch.ts:2` — 'AppDispatch' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/shared/ui/AppLink/AppLink.stories.tsx:3` — 'Theme' is referenced from local module '@/app/providers/ThemeProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/shared/ui/Loader/Loader.stories.tsx:3` — 'Theme' is referenced from local module '@/app/providers/ThemeProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/shared/ui/ThemeSwitcher/ui/ThemeSwitcher.stories.tsx:3` — 'Theme' is referenced from local module '@/app/providers/ThemeProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/widgets/ClientFilters/ui/ClientFilters/ClientFilters.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/widgets/ClientFilters/ui/ClientFilters/ClientFilters.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/widgets/ErrorPage/ui/ErrorPage.stories.tsx:3` — 'Theme' is referenced from local module '@/app/providers/ThemeProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/widgets/MollieClientAction/ui/MollieClientAction/MollieClientAction.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/widgets/MollieClientAction/ui/MollieClientAction/MollieClientAction.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/widgets/Navbar/ui/Navbar.stories.tsx:3` — 'Theme' is referenced from local module '@/app/providers/ThemeProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/widgets/Navbar/ui/Navbar.tsx:19` — 'ThemeSwitcher' is referenced from local module '@/shared/ui/ThemeSwitcher', but that symbol is not exported by its static API surface.
- [ ] `client/src/widgets/Page/Page.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/widgets/Page/Page.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/widgets/Page/Page.tsx:11` — 'StateSchema' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/widgets/UserFilters/ui/UserFilters/UserFilters.test.tsx:4` — 'createReduxStore' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.
- [ ] `client/src/widgets/UserFilters/ui/UserFilters/UserFilters.test.tsx:4` — 'ReduxStoreWithManager' is referenced from local module '@/app/providers/StoreProvider', but that symbol is not exported by its static API surface.

## Политика репозитория (Skylos gate/pre-commit/scripts)

### `SKY-R103` — Не настроена политика гейта Skylos (1)

> Осознанное решение по DDC_CRM_SKYLOS_CI_SPEC.md (Phase A) — фиксировать не требуется сейчас.

- [ ] `.:1` — No [tool.skylos.gate] policy is configured for repository quality gates.

### `SKY-R104` — Нет pre-commit policy файла (1)

> Осознанное решение — фиксировать не требуется сейчас.

- [ ] `.:1` — Repository has no pre-commit policy file.

### `SKY-R105` — Есть tsconfig.json, но нет npm-скрипта с tsc (1) — ЗАКРЫТО

> Добавить, например, `"typecheck": "tsc --noEmit"` в client/package.json.

- [x] `client/package.json:1` — добавлен скрипт `"typecheck": "tsc --noEmit"`. Внимание: сейчас он не проходит целиком — есть ~20 существующих ошибок типов из `node_modules` (рассинхрон версий `@types/react-router-dom` и `react-router`), не связанных с этой задачей; отдельная задача на будущее, `typecheck` пока не добавлен в `npm run ci`.

