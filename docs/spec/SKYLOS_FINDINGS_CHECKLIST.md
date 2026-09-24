# Skylos — чек-лист найденных проблем

Сгенерировано полным репозиторным прогоном (не `npm run check:skylos` — та команда
diff-scoped относительно `origin/develop` и на чистом дереве без диффа отдаёт 0 находок,
см. «Известное ограничение пайплайна» ниже). Команда полного аудита:

```bash
skylos . -a --format concise --exclude coverage --exclude graphify-out \
  --config-file pyproject.toml
```

Дата снимка: **2026-09-24** (начальный прогон — grade **D- (62/100)**, `security` F).
После wave1–3 (та же дата, ветка `chore/skylos-findings-wave1`): **D (66/100)** — все
реальные security-находки закрыты, `SKY-T103` закрыт полностью, `SKY-E004` закрыт на
37/54 (остаток — false positive), остальное — false positives/by design, см. разбор
по волнам ниже.

## Известное ограничение пайплайна (важно прочитать перед новой волной)

1. **`npm run check:skylos` — это diff-scan, не полный аудит.** `scripts/check-skylos.sh`
   всегда добавляет `--diff-base origin/<base>`. На чистой ветке без диффа с базой это
   легитимно возвращает пустой вывод (exit 0) — это НЕ означает «находок нет», это
   значит «в диффе с base branch находок нет». Для полного аудита репозитория (как
   этот) нужно гонять `skylos . -a ...` без `--diff-base`/`--baseline` напрямую.
2. **`[tool.skylos] ignore` в `pyproject.toml` не подавляет все перечисленные там
   правила в Skylos 4.35.0.** Проверено прямым сравнением (одинаковый вывод с
   `--config-file` и без): `ignore` реально работает для `SKY-D2xx` (danger),
   `SKY-A1xx` (ai-defect) и `SKY-L012` — но **не действует** на `SKY-S101`, `SKY-U001`,
   `SKY-U003`, `SKY-U004`, `SKY-E003` и (по всей видимости) `SKY-E004`, хотя они уже
   присутствуют в списке. Это тот же класс проблемы, что был найден раньше для
   `SKY-D260` (`overrides.<путь>.whitelist` не работал, помогал только глобальный
   `ignore`) — только на этот раз не помогает и глобальный `ignore`. Практический
   вывод: для этих правил `ignore` в `pyproject.toml` — это **документация решения**
   для человека/агента, а не работающий сапрессор для сканера; реальное подавление
   шума для них возможно только через удаление/рефактор кода или (если Skylos это
   поддерживает для конкретного правила) построчный `# skylos: ignore`.
3. **`.skylos/baseline.json` содержит абсолютные пути с другой машины**
   (`/Users/mac1_factif/Desktop/Practice/ddc-nl-crm/...`), а не с этой
   (`/Users/admin/Projects/ddc-nl`). `--baseline` матчит fingerprint'ы по абсолютному
   пути, так что на этой машине (и в CI, где путь ещё другой) он не подавит уже
   разобранные находки. Нужно перегенерировать (`skylos baseline .` с этой машины/из
   CI-раннера) или устанавливать `--diff-base`/`--baseline` только в контексте, где
   путь стабилен (CI-раннер с фиксированным checkout-путём).

## Итоговые счётчики (полный прогон, после wave1–3)

| Категория | Найдено | Реально закрыто | False positive / by design (задокументировано) | Осталось на новую волну |
|---|---|---|---|---|
| `SKY-D226` (XSS via innerHTML) | 6 | 0 | 6 | 0 |
| `SKY-D212` (predicted command injection) | 1 | 0 | 1 | 0 |
| `SKY-D292` (unpinned Action) | 1 | 1 | 0 | 0 |
| `SKY-D311` (`if-no-files-found`) | 1 | 0 | 1 (accepted deviation) | 0 |
| `SKY-D312` (lifecycle scripts) | 1 | 1 (частично — root `npm ci`) | 1 (server `npm ci`, by design) | 0 |
| `SKY-S101` (высокая энтропия) | 3 | 0 | 3 | 0 |
| `SKY-S102` (client-side secret exposure) | 8 | 0 | 8 | 0 |
| `SKY-U002` (unused import) | 1 | 1 | 0 | 0 |
| `SKY-U001`/`U003`/`U004` (unused func/var, tooling) | 6 | 0 | 6 | 0 |
| `SKY-E003` (unused file) | 51 | 0 | 51 (stories/jest/storybook/build-config — не входят в граф импортов Skylos) | 0 |
| `SKY-E004` (unnecessary export) | 54 | 37 (`export` снят — символ реально нигде не импортируется извне) | 17 (Storybook CSF named exports — тот же класс, что `SKY-E003`) | 0 |
| `SKY-C304` (функция > 50 строк) | ~45 | 0 | 0 | ~45 (production vs test policy) |
| `SKY-Q301` (цикломатическая сложность > 10) | ~10 | 0 | 0 | ~10 |
| `SKY-C303` (> 5 параметров) | 3 | 0 | 0 | 3 |
| `SKY-T103` (`as unknown as X` в тестах) | 44 | 44 | 0 | 0 |

## Волна 1 (2026-09-24, ветка `chore/skylos-findings-wave1`) — Security/CI

**Реально исправлено:**

- `SKY-D292` — `actions/upload-artifact@v4` в `.github/workflows/e2e.yml:44` не был
  закреплён на commit SHA (в отличие от `actions/checkout`/`actions/setup-node` в том
  же файле). Закреплён на `ea165f8d65b6e75b540449e92b4886f43607fa02` (тег `v4`,
  подтверждено `gh api repos/actions/upload-artifact/git/refs/tags/v4`).
- `SKY-D312` (частично) — корневой `npm ci` в `.github/workflows/e2e.yml:26` не имел
  `--ignore-scripts`, хотя у корневого `package.json` нет ни `postinstall`, ни
  `prepare`, ни нативных зависимостей — добавлено `--ignore-scripts`, аналогично уже
  существующему шагу `client` (строка 29).
- `SKY-U002` — неиспользуемый импорт `buildDraftContext` в
  `server/src/modules/ai-email-assistant/draft-pipeline.service.ts:3` — удалён (символ
  экспортируется и используется в `draft.service.ts` напрямую вызывающим кодом, а не
  из `draft-pipeline.service.ts`).

**False positive (проверено вручную, код не менялся):**

- `SKY-D226` × 6 (`client/telegram-mini-app/src/{screens/dashboard.ts:19,
  screens/new-student.ts:22,38,54, screens/search.ts:35, ui.ts:16}`) — везде, где в
  `innerHTML` попадают пользовательские/серверные данные (имя ученика, контакт,
  результаты поиска), они уже проходят через `escapeHtml()` из `ui.ts` перед
  интерполяцией (см. `new-student.ts:41,54`, `search.ts:39`). `dashboard.ts:19`
  интерполирует только числа/валюту из доверенного ответа собственного API.
  `ui.ts:16` — статический шаблон без пользовательских данных. Правило детектирует
  сам факт `.innerHTML =`, не отслеживая прохождение значения через кастомный
  escape-хелпер — тот же класс ограничения, что и `SKY-D260` (homoglyph без
  taint-tracking).
- `SKY-D212` × 1 (`server/src/modules/ai-email-assistant/telegram-approval.controller.ts:13,27`)
  — это не `child_process.exec()`, а `RegExp.prototype.exec()`
  (`callbackPattern.exec(value)` / инлайн-regex `.exec(value.trim())`). Правило
  матчит по имени метода `.exec(` без проверки типа receiver'а.
- `SKY-S101` × 3 — `.env:62` (`TELEGRAM_TOKEN=...`) — это реальный секрет, но файл
  `.env` **не отслеживается git** (`git ls-files .env` — пусто, есть в
  `.gitignore:5`), т.е. никогда не попадал ни в репозиторий, ни в историю — находка
  корректна как «в файле есть секрет», но нерелевантна как security-риск репозитория.
  `server/src/modules/clients/clients.controller.ts:344` и
  `server/src/modules/knowledge-ingestion/knowledge-ingestion.controller.ts:44` —
  на этих строках нет никаких секретов (вызов `validateGroupSelection(...)` и
  русскоязычная строка `credentials_in_url: 'URL не должен содержать логин/пароль'`
  соответственно) — энтропийный детектор ложно сработал на идентификаторе/кириллице.
- `SKY-S102` × 8 (`server/src/common/telegram/telegram-bot-api.client.ts:32` + 7×
  в `telegram-bot-api.client.test.ts`) — `process.env.TELEGRAM_TOKEN` используется
  в файле под `server/src/common/telegram/`, который физически не входит в client
  webpack-граф (client и server — раздельные независимые сборки, `client/webpack.config.ts`
  не резолвит пути из `server/`). Правило проверяет только имя env-переменной по
  известному списку «серверных» секретов, не бандл-граф.

**Accepted deviation (осознанно не приводим к «требованиям» правила, обоснование инлайн):**

- `SKY-D311` — `actions/upload-artifact` в `.github/workflows/e2e.yml` теперь
  `if-no-files-found: warn` (было `ignore`, правило хочет `error`). Апгрейд с `ignore`
  на `warn` даёт видимость в логах без риска: шаг выполняется только на
  `if: failure()` и грузит `playwright-report/` + `test-results/`, а
  `playwright.config.ts:29` в CI использует `reporter: 'github'` (не `html`), из-за
  чего `playwright-report/` в CI обычно вообще не создаётся — `error` сделал бы этот
  диагностический шаг систематически проваливающимся при каждом реальном E2E-падении,
  маскируя в списке GitHub Checks настоящую причину (упавший E2E) вторичной ошибкой
  аплоада артефактов.
- `SKY-D312` (остаток) — `npm ci` в `.github/workflows/e2e.yml:33` (`server`) **не**
  получил `--ignore-scripts`: `@prisma/client` регистрирует свой `postinstall`,
  который генерирует Prisma Client; без него `scripts/e2e-setup.sh` (`npx ts-node
  scripts/e2e-seed.ts`) не найдёт `@prisma/client` во время сидинга E2E-базы. Это
  осознанное исключение, а не забытый фикс. **Примечание:** после фикса корневого
  `npm ci` повторный прогон Skylos продолжает указывать на строку 26 для этого
  единственного оставшегося нарушения (`"value": "npm ci"` в JSON) — судя по всему,
  правило репортит первое найденное в файле совпадение `npm ci`/`npm install` вместо
  фактической непокрытой строки (33); проверено вручную по содержимому файла, номер
  строки в выводе Skylos для этого конкретного случая недостоверен.

**Проверено:** `python3 -c "import yaml; yaml.safe_load(...)"` на изменённый
`e2e.yml` (валидный YAML); `skylos . --file-filter ".github/workflows/e2e.yml" -a`
— `SKY-D292` больше не встречается; `skylos server/src/modules/ai-email-assistant/draft-pipeline.service.ts -a`
— `SKY-U002` больше не встречается.

## Волна 2 (2026-09-24, та же ветка) — SKY-T103 (`@total-typescript/shoehorn`)

**Закрыто полностью — 44/44.** Тот же паттерн, что уже закрывал 47 находок T103 в
прошлом (тогда только в `client/`) — на этот раз в `server/`, который до этой волны
не имел `@total-typescript/shoehorn` вовсе (`npm i -D` добавлен в `server/package.json`).

- 12 файлов, все — тестовые (`server/src/modules/{ai-email-assistant,auth,auth/telegram,
  clients,comments,knowledge-ingestion,payments,schedule,users}/*.test.ts`).
- `{...} as unknown as Request/Response` → `fromPartial({...})` — реальные partial-фейки
  Express `Request`/`Response`, где нехватка полей была осознанной.
- `'80.00' as unknown as MolliePaymentForPdf['amountValue']` (и `refundedAmount`/
  `chargedBackAmount`) → `fromAny('80.00') as MolliePaymentForPdf['amountValue']` —
  намеренно "неправильный" тип (строка вместо `Prisma.Decimal`), тест проверяет только
  `.toString()`-путь форматирования; аналогично внешний `basePayment` целиком мигрирован
  на `fromPartial<MolliePaymentForPdf>(...)`, а не только 3 внутренних поля.
- `(async () => new Response(...)) as unknown as typeof fetch` → `const fetchImpl: typeof
  fetch = fromAny(async () => ...)` — явная аннотация типа переменной обязательна:
  `fromAny<T, U>(mock: U | NoInfer<T>): T` без контекстной типизации иначе резолвит
  `T` в `unknown`, а не в целевой тип.
- `[...] as unknown as ManagementBranches` (вложенные Prisma-подобные фикстуры филиалов/
  групп) → `fromPartial([...])`.
- Общий хелпер `stub<T>()` (переиспользуется в 5 файлах: `comments.service.test.ts` —
  оригинал с пояснением в комментарии, `auth.telegram.controller/identity/transaction
  .service.test.ts`) — `delegate[method] = impl as unknown as never` оказался вообще
  избыточным кастом: `delegate` типизирован как `Record<string, unknown>`, значение `T`
  уже присваиваемо в `unknown` без каста — каст просто убран, shoehorn здесь не нужен.
- Побочные находки при типизации через `fromPartial<Response>`: `response()`/
  `linkResponse()` в `clients.controller.test.ts` и `users.controller.test.ts` держали
  несуществующее у `Response` поле `body` прямо в моке (типизация `fromPartial` против
  реального `Response` это поймала, как в прошлый раз с `fromPartial`/`StateSchema` на
  клиенте) — `body` вынесен в отдельный `calls`-объект (тот же паттерн, что уже
  использует `fakeResponse()` в `telegram-approval.controller.test.ts`), у
  `linkResponse()` просто убран (никем не читался).

**Проверено:** `tsc --noEmit` (server) — 0 ошибок; `npm run test:ci` (server, все 10
сьютов) — 0 fail; `skylos . --select SKY-T103` по всему репозиторию — 0 находок.

## Волна 3 (2026-09-24, та же ветка) — SKY-E004 (снятие лишнего `export`)

**Закрыто 37/54, оставшиеся 17 — false positive (Storybook CSF), задокументировано.**

Важная поправка к тому, что было заявлено про эту категорию в конце wave1: это
**не** тот же корневой паттерн, что `SKY-L012` (FSD-барели). Проверено вручную по
каждому из 54 symbol'ов (`grep` по всему репозиторию, включая тестовые файлы, на
точное имя символа) — большинство реально нигде не импортируется:

- **37 реальных находок закрыто** — у каждой снят только `export` (сам код/поведение
  не менялся, только видимость символа за пределы модуля):
  - 15 Redux-слайсов (`client/src/{entities,features}/**/model/slice*/*.ts`) —
    паттерн Redux Toolkit: наружу нужен только `xReducer`/`xActions` (сам объект
    `createSlice(...)` — `xSlice` — потребляется только внутри своего файла для их
    получения). Подтверждено по каждому файлу: внешние импортёры (UI-компоненты,
    `index.ts`-барели, `*.test.ts`) всегда берут `xReducer`/`xActions`, никогда сам
    `xSlice`.
  - 21 находка в `server/` — константы/хелперы уровня модуля (`MAX_ATTEMPTS`,
    `MAX_RESENDS`, `RESEND_COOLDOWN_SECONDS`, `sendTwoFactorCodeEmail` в
    `auth.two-factor.service.ts`; `cleanupAuthSecurityEvents`;
    `telegramOidcClientId/Secret/RedirectUri`; `TRANSACTION_TTL_MINUTES`;
    `createClientSchema`; `syncAllActiveEmailAccounts`; `isEmailNotifyConfigured` +
    `buildNewEmailNotification`; `getPaymentReminderTemplate` +
    `selectSubscriptionsDueForReminder` + `sendReminderForSubscription`;
    `encryptMollieToken` + `decryptMollieToken`; `csvEscape`; `MINI_APP_SCREENS`;
    enum `Month` в `transactions.service.ts`) и `client/telegram-mini-app/src/telegram.ts`'s
    `telegramWebApp` — каждый вызывается только внутри своего файла (координирующей
    функцией того же модуля — cron-обёрткой, контроллером, другим хелпером того же
    файла), внешних импортёров нет ни в коде, ни в тестах.
  - Осторожность с наивным `grep`: общие имена (`MAX_ATTEMPTS`, `Month`, `Dark`,
    `Primary`) дают ложные совпадения на одноимённые, но не связанные символы в
    других файлах (например, 4 разных модуля rate-limit независимо друг от друга
    объявляют свой собственный module-private `const MAX_ATTEMPTS`) — каждое
    совпадение проверялось конкретным импортом (`import { X } from '...'`), а не
    просто наличием слова в файле.
- **17 findings — false positive, тот же класс, что `SKY-E003`**: именованные
  экспорты Storybook CSF (`Primary`, `Dark`, `Normal`, `Light`, `Secondary`,
  `SecondaryDark`, `Red`, `RedDark`, `PrimaryDark`, `OutlineDark` в
  `AppLink.stories.tsx` / `Button.stories.tsx` / `Loader.stories.tsx` /
  `Modal.stories.tsx` / `ThemeSwitcher.stories.tsx` / `ErrorPage.stories.tsx` /
  `Navbar.stories.tsx` / `Sidebar.stories.tsx`) — Storybook подхватывает их по
  glob-паттерну файла, не через JS `import`, поэтому Skylos не видит потребителя;
  снятие `export` здесь сломало бы соответствующий сторис. Конфиг-`ignore` не
  применим (см. «Известное ограничение» выше — `SKY-E004` в списке `ignore`, но не
  подавляется), так что решение по этим 17 — просто зафиксировать здесь, без правок.

**Проверено:** `tsc --noEmit` (client + server) — 0 ошибок сверх baseline (20
предсуществующих ошибок в `node_modules/@types/{mdx,react-router-dom}`, не в этой
работе); `npm run lint:ts` (client) — 0 errors, 62 baseline warnings без изменений;
`npm test` (client) — 287/287 suites, 1020/1020 тестов; `npm run test:ci` (server,
все 10 сьютов) — 0 fail; `npm run test:telegram-admin-bot` — 18/18;
`skylos . --exclude coverage --exclude graphify-out` — `unused_exports` 54 → 17
(только Storybook CSF).

## На следующую волну

- **`SKY-C304`/`SKY-Q301`/`SKY-C303`** — по историческому паттерну этого чек-листа
  (волны 16–24, см. git history файла) тестовые файлы (`*.test.ts(x)`) сознательно не
  декомпозируются ради метрики; production-хиты (`useLoginForm.ts`,
  `auth.controller.ts:320`, `auth.telegram.controller.ts:164,266`,
  `email-imap.service.ts:164`, `embedding.service.ts:39`, `file-ingestion.service.ts:22,55`,
  `query-expansion.service.ts:46`, `retrieval.service.ts:53`,
  `telegram-admin-bot.service.ts:55`, `telegram-approval.controller.ts:47`,
  `telegram-miniapp-init-data.service.ts:19`, `KnowledgeBasePage.tsx:91`,
  `usePromptLibrary.ts:7`, `LoginForm.tsx:29`, `email-assistant.persistence.ts:36`,
  `auth.login-rate-limit.middleware.ts:18`) — реальные кандидаты на декомпозицию,
  отдельной волной/PR.

## Постоянно задокументированные false positive классы (без действий)

- **`SKY-E003`** (51, unused file) — `*.stories.tsx` (Storybook, glob-загрузка),
  `client/config/jest/**` + `client/config/storybook/**` (не входят в основной граф
  импортов Skylos), `webpack.config.ts`, `stylelint.config.mjs`, `prisma.config.ts`,
  `prisma/seed.ts` — все запускаются CLI-конвенцией инструмента, не прямым импортом.
- **`SKY-E004`** (17, см. волну 3) — именованные Storybook CSF экспорты, тот же
  root cause, что `SKY-E003`.
- **`SKY-U001`/`U003`/`U004`** (6, jest/storybook config helpers) — та же категория:
  `client/config/**` не входит в граф импортов Skylos.
