# Skylos — чек-лист найденных проблем

Сгенерировано из `npm run check:skylos` (см. `AGENTS.md` — команда информационная, не входит в `npm run ci`; описание проверки — `docs/spec/DDC_CRM_SKYLOS_CI_SPEC.md`, Phase A).

Итоговая оценка прогона: **F (53/100)**. Всего находок в этом файле: **985**.

## Как пользоваться чек-листом

- Отмечайте `[x]` только после реального исправления и повторного запуска `npm run check:skylos`, показавшего, что строка больше не встречается.
- Один PR — одна категория (или один файл), чтобы ревью оставалось управляемым.
- Разделы **SKY-D260** и **SKY-L012** отмечены отдельно ниже — с высокой вероятностью это шумные срабатывания для этого проекта, не исправлять их вслепую поштучно.

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

- **SKY-D260** (187) — почти все срабатывания это обычный русский текст вперемешку с английским/кодом в markdown-документации (`CONTEXT.md`, `docs/**`, `AGENTS.md` и т.д.), что и создаёт смешение кириллицы/латиницы. Правило существует, чтобы ловить спрятанные инструкции для AI-агентов внутри вроде бы обычного текста — стоит один раз просмотреть список глазами на предмет реально подозрительных вставок, но переписывать сам текст ради снятия предупреждения не нужно.
- **SKY-L012** (281) — почти наверняка ложные срабатывания для текущей FSD-конфигурации (`@/`-алиасы и barrel `index.ts`): инструмент не видит переэкспорт `StateSchema`, `ThunkConfig`, `Navbar`, `TransactionsPage` и т.д. как часть публичного API модуля. Разумный следующий шаг — один раз поправить конфигурацию Skylos под этот alias-resolver (или добавить исключение), а не редактировать сотни файлов.

## Безопасность

### `SKY-D253` — Сравнение с уязвимостью к timing-атаке (5)

> Использовать crypto.timingSafeEqual() для сравнения секретов/паролей.

- [ ] `client/src/features/changePassword/model/services/changePasswordThunk.ts:23` — Timing-unsafe comparison of 'newPassword'. Use crypto.timingSafeEqual() for constant-time comparison.
- [ ] `server/scripts/reset-user-password.ts:67` — Timing-unsafe comparison of 'password'. Use crypto.timingSafeEqual() for constant-time comparison.
- [ ] `server/src/controllers/controller.Instagram.ts:43` — Timing-unsafe comparison of 'token'. Use crypto.timingSafeEqual() for constant-time comparison.
- [ ] `server/src/controllers/controller.Instagram.ts:20` — Timing-unsafe comparison of 'signature'. Use crypto.timingSafeEqual() for constant-time comparison.
- [ ] `server/src/services/service.Token.ts:181` — Timing-unsafe comparison of 'tokenHash'. Use crypto.timingSafeEqual() for constant-time comparison.

### `SKY-D248` — Захардкоженный внутренний URL (7)

> Вынести хост в переменную окружения.

- [ ] `client/webpack.config.ts:31` — Hardcoded internal URL detected. Use environment variables for host configuration.
- [ ] `server/src/app.ts:25` — Hardcoded internal URL detected. Use environment variables for host configuration.
- [ ] `server/src/controllers/conteroller.Mollie.ts:318` — Hardcoded internal URL detected. Use environment variables for host configuration.
- [ ] `server/src/middlewares/middleware.Csrf.ts:11` — Hardcoded internal URL detected. Use environment variables for host configuration.
- [ ] `server/src/services/service.Files.ts:7` — Hardcoded internal URL detected. Use environment variables for host configuration.
- [ ] `server/src/services/service.InvoiceDelivery.ts:24` — Hardcoded internal URL detected. Use environment variables for host configuration.
- [ ] `server/src/services/service.PaymentReminders.ts:11` — Hardcoded internal URL detected. Use environment variables for host configuration.

### `SKY-D327` — Возможная эксфильтрация данных (2)

> Запрос отправляет process.env/секреты во внешний адрес — подтвердить адресата и убрать чувствительные данные из payload.

- [ ] `scripts/deploy-docker.sh:66` — Shell command may exfiltrate environment variables or local secrets to an external destination.
- [ ] `server/src/controllers/conteroller.Mollie.ts:294` — HTTP request sends process.env data to an external destination.

### `SKY-D216` — Потенциальный SSRF (4)

> axios-запрос с URL из переменной — свалидировать против allowlist перед запросом.

- [ ] `server/src/controllers/conteroller.Mollie.ts:2482` — axios call with variable URL — potential SSRF. Validate URL against allowlist.
- [ ] `server/src/controllers/conteroller.Mollie.ts:2416` — axios call with variable URL — potential SSRF. Validate URL against allowlist.
- [ ] `server/src/controllers/conteroller.Mollie.ts:2575` — axios call with variable URL — potential SSRF. Validate URL against allowlist.
- [ ] `server/src/routes/router.Health.test.ts:20` — fetch() with variable URL — potential SSRF. Validate URL against allowlist.

### `SKY-D230` — Открытый редирект (open redirect) (2)

> res.redirect() с переменным аргументом — свалидировать целевой адрес.

- [ ] `server/src/controllers/conteroller.Mollie.ts:270` — Open redirect — res.redirect() with variable argument. Validate redirect target.
- [ ] `server/src/controllers/conteroller.Mollie.ts:318` — Open redirect — res.redirect() with variable argument. Validate redirect target.

### `SKY-D252` — Флаги безопасности cookie не подтверждены (5)

> Явно выставить secure: true (не полагаться на значение по умолчанию/переменную).

- [ ] `server/src/controllers/conteroller.Mollie.ts:262` — Cookie security flags are not proven enabled (httpOnly=true, secure=unknown). Set secure to literal true.
- [ ] `server/src/controllers/controller.Auth.ts:105` — Cookie security flags are not proven enabled (httpOnly=true, secure=unknown). Set secure to literal true.
- [ ] `server/src/controllers/controller.Auth.ts:172` — Cookie security flags are not proven enabled (httpOnly=true, secure=unknown). Set secure to literal true.
- [ ] `server/src/controllers/controller.Auth.ts:254` — Cookie security flags are not proven enabled (httpOnly=true, secure=unknown). Set secure to literal true.
- [ ] `server/src/controllers/controller.Auth.ts:353` — Cookie security flags are not proven enabled (httpOnly=true, secure=unknown). Set secure to literal true.

### `SKY-D251` — Чувствительные данные в console.log (1)

> Убрать или замаскировать значение перед логированием.

- [ ] `server/src/controllers/controller.Instagram.ts:40` — Sensitive data 'token' passed to console.log(). Remove or mask before logging.

### `SKY-D291` — CI workflow без ограничения permissions (4)

> Задать permissions: {} на уровне workflow и минимально необходимые — на уровне job.

- [ ] `.github/workflows/ci.yml:1` — Workflow does not declare top-level permissions. Set permissions: {} and grant minimal permissions per job.
- [ ] `.github/workflows/ci.yml:18` — Job client-checks inherits the default GITHUB_TOKEN permissions because neither workflow nor job permissions are set.
- [ ] `.github/workflows/ci.yml:52` — Job server-checks inherits the default GITHUB_TOKEN permissions because neither workflow nor job permissions are set.
- [ ] `.github/workflows/ci.yml:78` — Job docs-links inherits the default GITHUB_TOKEN permissions because neither workflow nor job permissions are set.

### `SKY-D293` — actions/checkout сохраняет credentials (1)

> Выставить persist-credentials: false, если далее в workflow нет git push.

- [ ] `.github/workflows/ci.yml:28` — actions/checkout leaves credentials persisted by default. Set persist-credentials: false unless later git pushes need it.

### `SKY-D312` — Установка npm-пакетов в CI выполняет lifecycle-скрипты (1)

> Использовать --ignore-scripts, если install-скрипты не обязательны.

- [ ] `.github/workflows/ci.yml:36` — JavaScript package installation runs lifecycle scripts. Use --ignore-scripts in workflows unless install scripts are required.

### `SKY-D260` — Похожий на ASCII символ другого алфавита (homoglyph) (187)

> Смешение кириллицы/латиницы — в основном естественный русскоязычный текст в документации; выборочно проверить, не спрятана ли инструкция, точечно фиксить не нужно.

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

### `SKY-S101` — Значение с высокой энтропией (похоже на секрет) (1)

> Проверить, не закоммичен ли реальный секрет/токен; при необходимости — ротировать и вынести в .env.

- [ ] `server/src/controllers/controller.Clients.ts:193` — High-entropy value detected (entropy=4.23)

## Типобезопасность

### `SKY-T103` — Цепочка `as unknown as X` (40)

> В основном тестовые моки состояния — заменить на валидацию/сузение типа или на фабрику тестового state.

- [ ] `client/config/jest/setupTests.ts:24` — Chained assertion uses 'unknown' to force a value to 'typeof IntersectionObserver'; validate or narrow the value instead.
- [ ] `client/src/entities/ClientStatus/ui/ClientStatusSelect/ClientStatusSelect.tsx:32` — Chained assertion uses 'unknown' to force a value to 'keyof typeof ClientStatusKey'; validate or narrow the value instead.
- [ ] `client/src/entities/Month/ui/MonthSelect/MonthSelect.tsx:40` — Chained assertion uses 'unknown' to force a value to 'keyof typeof Month'; validate or narrow the value instead.
- [ ] `client/src/entities/Profile/model/services/updateProfileData/updateProfileData.test.tsx:16` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/entities/Role/ui/RoleSelect/RoleSelect.tsx:32` — Chained assertion uses 'unknown' to force a value to 'keyof typeof RoleKey'; validate or narrow the value instead.
- [ ] `client/src/entities/Transaction/ui/TransactionListItem/TransactionListItem.tsx:22` — Chained assertion uses 'unknown' to force a value to 'keyof typeof PaymentMethod'; validate or narrow the value instead.
- [ ] `client/src/features/AddCommentForm/model/services/addCommentForArticle/addCommentForArticle.test.ts:11` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/features/AddCommentForm/model/services/sendComment/sendComment.test.ts:13` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/features/addClientForm/model/services/addClientData/addClientData.test.ts:7` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/features/addMollieClientForm/model/services/addMolieClientData/addMolieClientData.test.ts:7` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/features/addMollieSubscriptionForm/model/services/addSubscription/addSubscription.test.ts:8` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/features/addTransactionForm/model/services/createTransaction/createTransaction.test.ts:11` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/features/addUserForm/model/services/addNewUser/addNewUser.test.ts:7` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/features/createMollieMandateForm/model/services/addMandate/addMandate.test.ts:8` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/features/editMollieClientDropdown/model/services/updateMollieClientData/updateMollieClientData.test.ts:8` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/features/editProfile/model/services/updateProfileData.test.ts:16` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/pages/ArticlesPage/model/services/fetchNextArticlesPage/fetchNextArticlesPage.test.ts:13` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/pages/ArticlesPage/model/services/fetchNextArticlesPage/fetchNextArticlesPage.test.ts:22` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/pages/ArticlesPage/model/services/fetchNextArticlesPage/fetchNextArticlesPage.test.ts:31` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/pages/ClientsDetailsPage/model/selectors/comments.test.ts:6` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/pages/ClientsDetailsPage/model/services/addCommentsForClient/addCommentsForClient.test.ts:13` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/pages/ClientsPage/model/selectors/clientsPageSelectors.test.ts:20` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/pages/ClientsPage/model/services/fetchClientsList/fetchClientsList.test.ts:9` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/pages/ClientsPage/model/services/fetchNextClientsPage/fetchNextClientsPage.test.ts:10` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/pages/ClientsPage/model/services/fetchNextClientsPage/fetchNextClientsPage.test.ts:18` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/pages/ClientsPage/model/services/fetchNextClientsPage/fetchNextClientsPage.test.ts:26` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/pages/ClientsPage/model/services/initClientsPage/initClientsPage.test.ts:17` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/pages/MolliePage/model/selectors/mollieClientsPageSelectors.test.ts:15` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/pages/MolliePage/model/selectors/mollieClientsPageSelectors.test.ts:32` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/pages/TransactionsPage/model/selectors/getTransactionPageSummary.test.ts:7` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/pages/TransactionsPage/model/selectors/transactionPageSelectors.test.ts:23` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/pages/TransactionsPage/model/services/fetchTransactionsList/fetchTransactionsList.test.ts:15` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/pages/TransactionsPage/model/services/fetchTransactionsSummary/fetchTransactionsSummary.test.ts:10` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/pages/TransactionsPage/model/services/initTransactionsPage/initTransactionsPage.test.ts:17` — Chained assertion uses 'unknown' to force a value to 'StateSchema'; validate or narrow the value instead.
- [ ] `client/src/shared/lib/hooks/useAppDispatch/useAppDispatch.test.ts:12` — Chained assertion uses 'unknown' to force a value to 'jest.Mock'; validate or narrow the value instead.
- [ ] `client/src/shared/lib/hooks/useRefreshToken/useRefreshToken.test.ts:11` — Chained assertion uses 'unknown' to force a value to 'jest.Mock'; validate or narrow the value instead.
- [ ] `client/src/shared/ui/AppImage/AppImage.test.tsx:22` — Chained assertion uses 'unknown' to force a value to '{ Image: typeof Image }'; validate or narrow the value instead.
- [ ] `client/src/shared/ui/AppImage/AppImage.test.tsx:22` — Chained assertion uses 'unknown' to force a value to 'typeof Image'; validate or narrow the value instead.
- [ ] `client/src/shared/ui/Avatar/Avatar.test.tsx:22` — Chained assertion uses 'unknown' to force a value to '{ Image: typeof Image }'; validate or narrow the value instead.
- [ ] `client/src/shared/ui/Avatar/Avatar.test.tsx:22` — Chained assertion uses 'unknown' to force a value to 'typeof Image'; validate or narrow the value instead.

### `SKY-T104` — @ts-ignore скрывает все ошибки следующей строки (2)

> Заменить на @ts-expect-error с пояснением или исправить тип.

- [ ] `client/src/app/providers/StoreProvider/config/store.ts:21` — @ts-ignore hides every TypeScript error on the next line; fix the type or use @ts-expect-error with a reason.
- [ ] `client/src/app/providers/StoreProvider/config/store.ts:35` — @ts-ignore hides every TypeScript error on the next line; fix the type or use @ts-expect-error with a reason.

### `SKY-T105` — JSON.parse() приведён к типу без проверки в рантайме (1)

> Добавить валидацию (zod/схема) перед приведением типа.

- [ ] `server/src/controllers/controller.Invoices.ts:198` — JSON.parse() result is asserted as 'Prisma.InputJsonValue' without runtime validation.

### `SKY-T106` — Публичный API использует `any` (4)

> Заменить на точный тип или unknown + валидацию.

- [ ] `server/src/middlewares/middleware.Auth.ts:30` — Exported API 'asyncHandler' uses the exact type 'any'; use a precise type or unknown with validation.
- [ ] `server/src/middlewares/middlewares.Error.ts:10` — Exported API 'errorMiddleware' uses the exact type 'any'; use a precise type or unknown with validation.
- [ ] `server/src/services/service.Clients.ts:246` — Exported API 'updateClient' uses the exact type 'any'; use a precise type or unknown with validation.
- [ ] `server/src/types/mollie.types.ts:43` — Exported API 'MollieCustomer' uses 'Record<string, any>'; use a precise type or unknown with validation.

## Мёртвый код (неиспользуемое)

### `SKY-U001` — Неиспользуемая функция (22)

> Проверить реальную неиспользуемость (в т.ч. динамические/publicAPI-экспорты) и удалить либо оставить с пометкой, почему используется.

- [ ] `client/config/jest/__mocks__/react-i18next.ts:1` — unused function: useTranslation
- [ ] `client/config/jest/jestEnptyComponent.tsx:3` — unused function: jestEnptyComponent
- [ ] `client/config/jest/setupTests.ts:27` — unused function: disconnect
- [ ] `client/config/jest/setupTests.ts:28` — unused function: takeRecords
- [ ] `client/src/pages/ArticleDetailsPage/model/selectors/comments.ts:4` — unused function: getArticleCommentsError
- [ ] `client/src/pages/MolliePage/ui/MolliePayments/MolliePayments.tsx:153` — unused function: getCrmClientName
- [ ] `client/src/pages/SettingsPage/model/selectors/clientsPageSelectors.ts:5` — unused function: getSettingsPageIsLoading
- [ ] `client/src/pages/SettingsPage/model/selectors/clientsPageSelectors.ts:6` — unused function: getSettingsPageError
- [ ] `client/src/shared/config/storybook/StoreDecorator/StoreDecorator.tsx:12` — unused function: StoreDecorator
- [ ] `client/src/shared/const/router.ts:39` — unused function: getRouteTransactionEdit
- [ ] `client/src/shared/const/router.ts:40` — unused function: getRouteTransactionCreate
- [ ] `client/src/shared/const/router.ts:37` — unused function: getRouteTransactions
- [ ] `client/src/shared/const/router.ts:38` — unused function: getRouteTransactionDetails
- [ ] `server/src/middlewares/middleware.Auth.ts:34` — unused function: isOwner
- [ ] `server/src/middlewares/middleware.Logger.ts:8` — unused function: logEvents
- [ ] `server/src/middlewares/middleware.Logger.ts:26` — unused function: logger
- [ ] `server/src/services/service.ClientStatus.ts:7` — unused function: createClientStatus
- [ ] `server/src/services/service.Clients.ts:275` — unused function: findClientByEmailOrPhone
- [ ] `server/src/services/service.Customer.ts:21` — unused function: createCustomer
- [ ] `server/src/services/service.Customer.ts:34` — unused function: updateCustomer
- [ ] `server/src/services/service.Customer.ts:47` — unused function: deleteAllCustomers
- [ ] `server/src/services/service.TwoFactorAuth.ts:256` — unused function: revokeTrustedDevices

### `SKY-U002` — Неиспользуемый импорт (75)

> Удалить импорт.

- [ ] `client/config/jest/jestEnptyComponent.tsx:1` — unused import: React
- [ ] `client/eslint.config.mjs:10` — unused import: IndentStyle
- [ ] `client/src/app/providers/router/ui/PublicRoute/PublicRoute.tsx:3` — unused import: Outlet
- [ ] `client/src/entities/Article/ui/ArticleDetails/ArticleDetails.tsx:9` — unused import: TextSize
- [ ] `client/src/entities/Article/ui/ArticleDetails/ArticleDetails.tsx:9` — unused import: TextAlign
- [ ] `client/src/entities/Article/ui/ArticleImageBlockComponent/ArticleImageBlockComponent.tsx:3` — unused import: TextAlign
- [ ] `client/src/entities/Client/ui/ClientDetails/ClientDetails.tsx:1` — unused import: React
- [ ] `client/src/entities/Client/ui/ClientList/ClientList.tsx:1` — unused import: React
- [ ] `client/src/entities/Client/ui/ClientListHeader/ClientListHeader.tsx:1` — unused import: React
- [ ] `client/src/entities/Client/ui/ClientListItem/ClientListItem.tsx:1` — unused import: React
- [ ] `client/src/entities/Mandate/ui/MandateCard/MandateCard.tsx:1` — unused import: classNames
- [ ] `client/src/entities/Mandate/ui/MandateItem/MandateItem.tsx:1` — unused import: React
- [ ] `client/src/entities/Mandate/ui/MandateList/MandateList.tsx:1` — unused import: React
- [ ] `client/src/entities/MollieClient/ui/ClientDetails/ClientDetails.tsx:1` — unused import: React
- [ ] `client/src/entities/MollieClient/ui/ClientListHeader/ClientListHeader.tsx:1` — unused import: React
- [ ] `client/src/entities/MollieClient/ui/MollieClientList/MollieClientList.tsx:1` — unused import: React
- [ ] `client/src/entities/MollieClient/ui/MollieClientListItem/MollieClientListItem.tsx:1` — unused import: React
- [ ] `client/src/entities/MollieSubscription/ui/MollieSubscriptionItem/MollieSubscriptionItem.tsx:1` — unused import: React
- [ ] `client/src/entities/MollieSubscription/ui/MollieSubscriptionList/MollieSubscriptionList.tsx:1` — unused import: React
- [ ] `client/src/entities/PaymentMethod/ui/PaymentMethod/PaymentMethodSelect.tsx:3` — unused import: useMemo
- [ ] `client/src/entities/PaymentMethod/ui/PaymentMethod/PaymentMethodSelect.tsx:6` — unused import: ListBox
- [ ] `client/src/entities/Profile/model/types/profile.ts:1` — unused import: Role
- [ ] `client/src/entities/Transaction/ui/TransactionCard/TransactionCard.tsx:1` — unused import: classNames
- [ ] `client/src/entities/Transaction/ui/TransactionList/TransactionList.tsx:1` — unused import: React
- [ ] `client/src/entities/Transaction/ui/TransactionListItem/TransactionListItem.tsx:1` — unused import: React
- [ ] `client/src/entities/TransactionCategory/ui/TransactionCategorySelect/TransactionCategorySelect.tsx:3` — unused import: cls
- [ ] `client/src/entities/TransactionType/ui/TransactionSelect/TransactionSelect.tsx:3` — unused import: useMemo
- [ ] `client/src/entities/TransactionType/ui/TransactionSelect/TransactionSelect.tsx:6` — unused import: ListBox
- [ ] `client/src/entities/User/ui/UserListItem/UserListItem.tsx:1` — unused import: React
- [ ] `client/src/entities/User/ui/UsersList/UsersList.tsx:1` — unused import: React
- [ ] `client/src/features/ClientSortSelector/ui/ClientSortSelector/ClientSortSelector.tsx:1` — unused import: React
- [ ] `client/src/features/TransactionSortSelector/ui/TransactionSortSelector/TransactionSortSelector.tsx:1` — unused import: React
- [ ] `client/src/features/TransactionSortSelector/ui/TransactionSortSelector/TransactionSortSelector.tsx:3` — unused import: ClientSortField
- [ ] `client/src/features/addUserForm/model/types/addUserFormSchema.ts:1` — unused import: Client
- [ ] `client/src/features/addUserForm/model/types/addUserFormSchema.ts:3` — unused import: User
- [ ] `client/src/features/createMollieMandateForm/model/slices/createMollieMandateFormSlice.ts:6` — unused import: access
- [ ] `client/src/features/createMollieMandateForm/ui/CreateMollieMandateForm/CreateMollieMandateForm.tsx:4` — unused import: cls
- [ ] `client/src/features/createMollieMandateForm/ui/CreateMollieMandateForm/CreateMollieMandateForm.tsx:2` — unused import: classNames
- [ ] `client/src/features/editMollieClientDropdown/model/services/deleteMollieClientById.tsx:3` — unused import: Client
- [ ] `client/src/features/editMollieClientDropdown/model/types/mollieClientFormSchema.ts:1` — unused import: Client
- [ ] `client/src/pages/AuthPage/ui/LoginPage/LoginPage.tsx:1` — unused import: React
- [ ] `client/src/pages/ClientsDetailsPage/ui/ClientsDetailsPage/ClientsDetailsPage.tsx:1` — unused import: React
- [ ] `client/src/pages/ClientsDetailsPage/ui/HeaderDetails/HeaderDetails.tsx:1` — unused import: React
- [ ] `client/src/pages/ClientsPage/model/services/fetchNextClientsPage/fetchNextClientsPage.ts:7` — unused import: fetchClientsList
- [ ] `client/src/pages/ClientsPage/ui/ClientsPageFilters/ClientsPageFilters.tsx:1` — unused import: React
- [ ] `client/src/pages/MolliePage/model/services/fetchAllMandates/fetchAllMandates.ts:3` — unused import: MollieClient
- [ ] `client/src/pages/MolliePage/ui/MollieCustomerDetails/MollieCustomerDetails.tsx:1` — unused import: React
- [ ] `client/src/pages/MolliePage/ui/MollieCustomers/MollieCustomers.tsx:2` — unused import: React
- [ ] `client/src/pages/SettingsPage/model/selectors/clientsPageSelectors.ts:3` — unused import: ClientStatusKey
- [ ] `client/src/pages/SettingsPage/model/selectors/clientsPageSelectors.ts:2` — unused import: ClientView
- [ ] `client/src/pages/SettingsPage/model/selectors/clientsPageSelectors.ts:2` — unused import: ClientSortField
- [ ] `client/src/pages/SettingsPage/model/services/fetchUsersList/fetchUsersList.ts:4` — unused import: ClientStatusKey
- [ ] `client/src/pages/SettingsPage/model/services/fetchUsersList/fetchUsersList.ts:3` — unused import: Client
- [ ] `client/src/pages/SettingsPage/ui/SettingsPage/SettingsPage.tsx:2` — unused import: use
- [ ] `client/src/pages/TransactionsPage/ui/FiltersContainer/FiltersContainer.tsx:2` — unused import: HStack
- [ ] `client/src/pages/TransactionsPage/ui/TransactionsPage/TransactionsPage.tsx:1` — unused import: React
- [ ] `client/src/shared/ui/CheckBox/CheckBox.tsx:2` — unused import: React
- [ ] `client/src/shared/ui/Loader/Loader.tsx:1` — unused import: React
- [ ] `client/src/widgets/ClientFilters/ui/ClientFilters/ClientFilters.tsx:1` — unused import: React
- [ ] `client/src/widgets/MollieClientAction/ui/MollieClientAction/MollieClientAction.tsx:1` — unused import: React
- [ ] `client/src/widgets/MollieClientAction/ui/MollieClientAction/MollieClientAction.tsx:6` — unused import: Input
- [ ] `client/src/widgets/MollieClientAction/ui/MollieClientAction/MollieClientAction.tsx:10` — unused import: ClientSortField
- [ ] `client/src/widgets/MollieClientAction/ui/MollieClientAction/MollieClientAction.tsx:8` — unused import: SearchIcon
- [ ] `client/src/widgets/MollieClientAction/ui/MollieClientAction/MollieClientAction.tsx:9` — unused import: ClientSortSelector
- [ ] `client/src/widgets/MollieClientAction/ui/MollieClientAction/MollieClientAction.tsx:11` — unused import: SortOrder
- [ ] `client/src/widgets/MollieClientAction/ui/MollieClientAction/MollieClientAction.tsx:13` — unused import: ClientFormModal
- [ ] `client/src/widgets/TransactionFilters/ui/TransactionFilters/TransactionFilters.tsx:1` — unused import: React
- [ ] `client/src/widgets/UserFilters/ui/UserFilters/UserFilters.tsx:1` — unused import: React
- [ ] `server/scripts/reset-user-password.ts:2` — unused import: readline
- [ ] `server/src/controllers/conteroller.Mollie.ts:7` — unused import: merge
- [ ] `server/src/controllers/controller.Users.ts:1` — unused import: NextFunction
- [ ] `server/src/routes/router.Instagram.ts:2` — unused import: isAuthenticated
- [ ] `server/src/routes/router.Instagram.ts:3` — unused import: verifyRequestSignature
- [ ] `server/src/services/recalculateLoyalty.ts:3` — unused import: LOYALTY_LEVELS
- [ ] `server/src/services/recalculateLoyalty.ts:3` — unused import: LoyaltyLevel

### `SKY-U004` — Неиспользуемый класс (6)

> Проверить и удалить, либо задокументировать причину сохранения.

- [ ] `client/src/app/providers/ErrorBoundary/ui/ErrorBoundary.tsx:12` — unused class: ErrorBoundary
- [ ] `client/src/app/providers/ThemeProvider/ui/theme.ts:1` — unused class: Theme
- [ ] `client/src/entities/Client/model/consts/consts.ts:1` — unused class: ValidateClientError
- [ ] `client/src/entities/MollieClient/model/consts/consts.ts:1` — unused class: ValidateClientError
- [ ] `client/src/entities/MollieClient/model/consts/consts.ts:13` — unused class: ClientSortField
- [ ] `client/src/features/addMollieClientForm/model/consts/consts.ts:1` — unused class: ValidateClientError

### `SKY-U003` — Неиспользуемая переменная (15)

> Удалить переменную или использовать `_`-префикс, если требуется по сигнатуре.

- [ ] `client/config/jest/jest.config.ts:9` — unused variable: config
- [ ] `client/config/storybook/main.ts:3` — unused variable: config
- [ ] `client/src/pages/ArticleDetailsPage/model/services/fetchCommentsByArticleId/fetchCommentsByArticleId.ts:5` — unused variable: fetchCommentsByArticleId
- [ ] `client/src/pages/ProfilePage/ui/Sidebar.stories.tsx:11` — unused variable: Light
- [ ] `client/src/shared/const/localstorage.ts:1` — unused variable: USER_LOCALSTORAGE_TOKEN
- [ ] `client/src/shared/const/localstorage.ts:5` — unused variable: LOCAL_STORAGE_LAST_DESIGN_KEY
- [ ] `client/src/shared/const/router.ts:43` — unused variable: AppRouteByPathPattern
- [ ] `client/src/shared/ui/Button/Button.stories.tsx:14` — unused variable: Outline
- [ ] `client/src/shared/ui/Button/Button.stories.tsx:29` — unused variable: Clear
- [ ] `client/src/shared/ui/Input/Input.stories.tsx:4` — unused variable: meta
- [ ] `client/src/shared/ui/Input/Input.stories.tsx:12` — unused variable: Primary
- [ ] `client/src/widgets/Navbar/ui/Navbar.stories.tsx:11` — unused variable: Light
- [ ] `client/src/widgets/Sidebar/ui/Sidebar/Sidebar.stories.tsx:11` — unused variable: Light
- [ ] `server/src/services/service.Files.ts:6` — unused variable: isDev
- [ ] `server/src/utils/paths.ts:12` — unused variable: UPLOAD_DIR

### `SKY-E003` — Файл, который никто не импортирует (67)

> Проверить (напр. Jest setup/mocks подключаются через конфиг, не import) и удалить только реально мёртвые файлы.

- [ ] `client/config/jest/__mocks__/react-i18next.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/config/jest/fileMock.js:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/config/jest/jestEnptyComponent.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/config/jest/setupTests.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/config/storybook/preview.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/config/storybook/webpack.config.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/app/providers/StoreProvider/config/middleware/authInterceptor.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/app/providers/ThemeProvider/ui/theme.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/app/providers/ThemeProvider/ui/withTheme.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/entities/Article/ui/ArticleDetails/ArticleDetails.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/entities/Article/ui/ArticleList/ArticleList.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/entities/Article/ui/ArticleListItem/ArticleListItem.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/entities/Article/ui/ArticleViewSelector/ArticleViewSelector.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/entities/Client/ui/ClientViewSelector/ClientViewSelector.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/entities/ClientStatus/ui/ClientStatusSelect/RoleSelect.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/entities/Comment/ui/CommentCard/CommentCard.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/entities/Comment/ui/CommentList/CommentList.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/entities/Country/ui/CountrySelect/CountrySelect.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/entities/MollieClient/model/consts/consts.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/entities/MollieSubscription/ui/MollieSubscriptionCard/MollieSubscriptionCard.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/entities/Month/ui/MonthSelect/MonthSelect.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/entities/PaymentMethod/ui/PaymentMethod/TransactionSelect.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/entities/Role/ui/RoleSelect/RoleSelect.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/entities/Summary/ui/SummaryCards/Summary.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/entities/Transaction/model/slices/TransactionSlice.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/entities/TransactionCategory/ui/TransactionCategorySelect/TransactionCategory.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/entities/TransactionType/ui/TransactionSelect/TransactionSelect.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/features/Auth/ui/LoginForm/LoginForm.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/features/ClientTypeTabs/ui/ClientTypeTabs/ArticleTypeTabs.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/features/TransactionTypeTabs/ui/TransactionTypeTabs/TransactionTypeTabs.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/features/addMollieClientForm/model/consts/consts.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/features/addMollieSubscriptionForm/ui/AddMollieSubscriptionForm/AddMollieSubscriptionForm.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/features/addTransactionForm/ui/AddTransactionForm/AddTransactionForm.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/features/avatarDropdown/ui/AvatarDropdown/AvatarDropdown.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/features/createMollieMandateForm/ui/CreateMollieMandateForm/CreateMollieMandateForm.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/shared/config/storybook/RouterDecorator/RouterDecorator.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/shared/config/storybook/StoreDecorator/StoreDecorator.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/shared/config/storybook/StyleDecorator/StyleDecorator.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/shared/const/common.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/shared/ui/AppImage/AppImage.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/shared/ui/AppLink/AppLink.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/shared/ui/Avatar/Avatar.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/shared/ui/Button/Button.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/shared/ui/Card/Card.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/shared/ui/Code/Code.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/shared/ui/Input/Input.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/shared/ui/Loader/Loader.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/shared/ui/Modal/Modal.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/shared/ui/Select/Select.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/shared/ui/Skeleton/Skeleton.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/shared/ui/Text/Text.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/shared/ui/ThemeSwitcher/ui/ThemeSwitcher.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/widgets/ErrorPage/ui/ErrorPage.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/widgets/Navbar/ui/Navbar.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/widgets/Page/Page.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/src/widgets/Sidebar/ui/Sidebar/Sidebar.stories.tsx:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/stylelint.config.mjs:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `client/webpack.config.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `server/prisma.config.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `server/prisma/seed.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `server/src/api/api.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `server/src/middlewares/middleware.Logger.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `server/src/schemas/schema.product.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `server/src/services/recalculateLoyalty.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `server/src/services/service.ClientStatus.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `server/src/shared/helpers/cron.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)
- [ ] `server/src/types/ProcedureDTO.ts:1` — Unused TypeScript/JavaScript file (not imported by any other file)

## Качество кода (сложность/размер функций)

### `SKY-C304` — Слишком длинная функция (185)

> Разбить на более мелкие функции/хуки.

- [ ] `client/src/entities/Article/ui/ArticleDetails/ArticleDetails.tsx:38` — Function 'anonymous' is 82 lines long (limit: 50)
- [ ] `client/src/entities/Article/ui/ArticleListItem/ArticleListItem.tsx:27` — Function 'anonymous' is 63 lines long (limit: 50)
- [ ] `client/src/entities/Client/ui/ClientCard/ClientCard.tsx:28` — Function 'anonymous' is 94 lines long (limit: 50)
- [ ] `client/src/entities/Client/ui/ClientDetails/ClientDetails.tsx:53` — Function 'anonymous' is 58 lines long (limit: 50)
- [ ] `client/src/entities/Client/ui/ClientListItem/ClientListItem.tsx:16` — Function 'anonymous' is 68 lines long (limit: 50)
- [ ] `client/src/entities/EmailMessage/model/services/emailMessageApi.test.ts:20` — Function 'anonymous' is 98 lines long (limit: 50)
- [ ] `client/src/entities/EmailMessage/ui/EmailComposer/EmailComposer.test.tsx:4` — Function 'anonymous' is 53 lines long (limit: 50)
- [ ] `client/src/entities/EmailMessage/ui/EmailComposer/EmailComposer.tsx:34` — Function 'anonymous' is 179 lines long (limit: 50)
- [ ] `client/src/entities/EmailMessage/ui/EmailMessageDetail/EmailMessageDetail.test.tsx:30` — Function 'anonymous' is 67 lines long (limit: 50)
- [ ] `client/src/entities/EmailMessage/ui/EmailMessageDetail/EmailMessageDetail.tsx:60` — Function 'anonymous' is 125 lines long (limit: 50)
- [ ] `client/src/entities/MollieClient/ui/ClientDetails/ClientDetails.tsx:51` — Function 'anonymous' is 116 lines long (limit: 50)
- [ ] `client/src/entities/MollieClient/ui/MollieClientCard/MollieClientCard.tsx:24` — Function 'anonymous' is 96 lines long (limit: 50)
- [ ] `client/src/entities/MollieClient/ui/MollieClientList/MollieClientList.tsx:37` — Function 'anonymous' is 52 lines long (limit: 50)
- [ ] `client/src/entities/MollieClient/ui/MollieClientListItem/MollieClientListItem.test.tsx:14` — Function 'anonymous' is 55 lines long (limit: 50)
- [ ] `client/src/entities/MollieClient/ui/MollieClientListItem/MollieClientListItem.tsx:16` — Function 'anonymous' is 72 lines long (limit: 50)
- [ ] `client/src/entities/MollieSubscription/ui/MollieSubscriptionCard/MollieSubscriptionCard.tsx:23` — Function 'anonymous' is 76 lines long (limit: 50)
- [ ] `client/src/entities/Profile/model/services/updateProfileData/updateProfileData.test.tsx:22` — Function 'anonymous' is 59 lines long (limit: 50)
- [ ] `client/src/entities/Profile/model/slice/profileSlice.test.ts:6` — Function 'anonymous' is 110 lines long (limit: 50)
- [ ] `client/src/entities/Profile/ui/ProfileCard/ProfileCard.tsx:23` — Function 'anonymous' is 102 lines long (limit: 50)
- [ ] `client/src/entities/Summary/ui/SummaryCards/SummaryCards.tsx:16` — Function 'anonymous' is 52 lines long (limit: 50)
- [ ] `client/src/entities/Transaction/ui/TransactionCard/TransactionCard.tsx:25` — Function 'anonymous' is 55 lines long (limit: 50)
- [ ] `client/src/entities/Transaction/ui/TransactionListItem/TransactionListItem.test.tsx:6` — Function 'anonymous' is 60 lines long (limit: 50)
- [ ] `client/src/entities/User/ui/UserCard/UserCard.tsx:24` — Function 'anonymous' is 91 lines long (limit: 50)
- [ ] `client/src/features/Auth/model/services/loginByUsername/loginByUsername.test.ts:21` — Function 'anonymous' is 54 lines long (limit: 50)
- [ ] `client/src/features/Auth/model/slice/authSlice.test.ts:5` — Function 'anonymous' is 53 lines long (limit: 50)
- [ ] `client/src/features/Auth/ui/LoginForm/LoginForm.tsx:39` — Function 'anonymous' is 138 lines long (limit: 50)
- [ ] `client/src/features/Auth/ui/TwoFactorForm/TwoFactorForm.test.tsx:33` — Function 'anonymous' is 62 lines long (limit: 50)
- [ ] `client/src/features/Auth/ui/TwoFactorForm/TwoFactorForm.tsx:24` — Function 'anonymous' is 132 lines long (limit: 50)
- [ ] `client/src/features/TransactionSortSelector/ui/TransactionSortSelector/TransactionSortSelector.test.tsx:6` — Function 'anonymous' is 56 lines long (limit: 50)
- [ ] `client/src/features/TransactionSortSelector/ui/TransactionSortSelector/TransactionSortSelector.tsx:24` — Function 'anonymous' is 109 lines long (limit: 50)
- [ ] `client/src/features/TransactionSortSelector/ui/TransactionSortSelector/TransactionSortSelector.tsx:65` — Function 'anonymous' is 54 lines long (limit: 50)
- [ ] `client/src/features/addClientForm/model/services/addClientData/addClientData.ts:13` — Function 'anonymous' is 60 lines long (limit: 50)
- [ ] `client/src/features/addClientForm/model/slices/clientSlice.test.ts:6` — Function 'anonymous' is 63 lines long (limit: 50)
- [ ] `client/src/features/addClientForm/ui/ClientForm/ClientForm.test.tsx:42` — Function 'anonymous' is 68 lines long (limit: 50)
- [ ] `client/src/features/addClientForm/ui/ClientForm/ClientForm.tsx:68` — Function 'anonymous' is 282 lines long (limit: 50)
- [ ] `client/src/features/addMollieClientForm/ui/MollieClientForm/MollieClientForm.tsx:33` — Function 'anonymous' is 86 lines long (limit: 50)
- [ ] `client/src/features/addMollieSubscriptionForm/model/slices/addMollieSubscriptionSlice.test.ts:7` — Function 'anonymous' is 78 lines long (limit: 50)
- [ ] `client/src/features/addMollieSubscriptionForm/ui/AddMollieSubscriptionForm/AddMollieSubscriptionForm.tsx:38` — Function 'anonymous' is 105 lines long (limit: 50)
- [ ] `client/src/features/addTransactionForm/model/slices/addTransactionFormSlice.test.ts:5` — Function 'anonymous' is 59 lines long (limit: 50)
- [ ] `client/src/features/addTransactionForm/ui/AddTransactionForm/AddTransactionForm.tsx:34` — Function 'anonymous' is 79 lines long (limit: 50)
- [ ] `client/src/features/addUserForm/model/slices/newUserSlice.test.ts:6` — Function 'anonymous' is 52 lines long (limit: 50)
- [ ] `client/src/features/addUserForm/ui/UserForm/UserForm.tsx:31` — Function 'anonymous' is 77 lines long (limit: 50)
- [ ] `client/src/features/changePassword/model/services/changePasswordThunk.test.ts:12` — Function 'anonymous' is 65 lines long (limit: 50)
- [ ] `client/src/features/changePassword/ui/ChangePasswordModal/ChangePasswordModal.test.tsx:30` — Function 'anonymous' is 61 lines long (limit: 50)
- [ ] `client/src/features/changePassword/ui/ChangePasswordModal/ChangePasswordModal.tsx:21` — Function 'anonymous' is 112 lines long (limit: 50)
- [ ] `client/src/features/createMollieMandateForm/model/slices/createMollieMandateFormSlice.test.ts:7` — Function 'anonymous' is 68 lines long (limit: 50)
- [ ] `client/src/features/createMollieMandateForm/ui/CreateMollieMandateForm/CreateMollieMandateForm.tsx:42` — Function 'anonymous' is 73 lines long (limit: 50)
- [ ] `client/src/features/editMollieClientDropdown/model/slices/mollieClientSlice.test.ts:7` — Function 'anonymous' is 103 lines long (limit: 50)
- [ ] `client/src/features/editMollieClientDropdown/ui/EditMollieClientDropdown/EditMollieClientDropdown.tsx:25` — Function 'anonymous' is 57 lines long (limit: 50)
- [ ] `client/src/features/editMollieClientDropdown/ui/MollieClientForm/MollieClientForm.tsx:28` — Function 'anonymous' is 114 lines long (limit: 50)
- [ ] `client/src/features/editSubscriptionDropdown/ui/EditSubscriptionDropdown/EditSubscriptionDropdown.test.tsx:36` — Function 'anonymous' is 55 lines long (limit: 50)
- [ ] `client/src/features/editSubscriptionDropdown/ui/EditSubscriptionDropdown/EditSubscriptionDropdown.tsx:30` — Function 'anonymous' is 143 lines long (limit: 50)
- [ ] `client/src/features/globalSearch/ui/GlobalSearch/GlobalSearch.test.tsx:46` — Function 'anonymous' is 65 lines long (limit: 50)
- [ ] `client/src/features/globalSearch/ui/GlobalSearch/GlobalSearch.tsx:35` — Function 'anonymous' is 66 lines long (limit: 50)
- [ ] `client/src/features/globalSearch/ui/GlobalSearch/GlobalSearch.tsx:115` — Function 'anonymous' is 192 lines long (limit: 50)
- [ ] `client/src/pages/BranchesPage/ui/BranchModal/BranchModal.tsx:16` — Function 'anonymous' is 111 lines long (limit: 50)
- [ ] `client/src/pages/BranchesPage/ui/BranchesPage/BranchesPage.tsx:11` — Function 'anonymous' is 87 lines long (limit: 50)
- [ ] `client/src/pages/ChoreographersPage/ui/ChoreographerModal/ChoreographerModal.test.tsx:19` — Function 'anonymous' is 54 lines long (limit: 50)
- [ ] `client/src/pages/ChoreographersPage/ui/ChoreographerModal/ChoreographerModal.tsx:29` — Function 'anonymous' is 322 lines long (limit: 50)
- [ ] `client/src/pages/ChoreographersPage/ui/ChoreographersPage/ChoreographersPage.tsx:11` — Function 'anonymous' is 79 lines long (limit: 50)
- [ ] `client/src/pages/ClientsDetailsPage/ui/ClientEmailBlock/ClientEmailBlock.tsx:35` — Function 'anonymous' is 159 lines long (limit: 50)
- [ ] `client/src/pages/ClientsDetailsPage/ui/ClientPaymentBlock/ClientPaymentBlock.tsx:134` — Function 'anonymous' is 570 lines long (limit: 50)
- [ ] `client/src/pages/ClientsDetailsPage/ui/EditClientModal/EditClientModal.tsx:49` — Function 'anonymous' is 214 lines long (limit: 50)
- [ ] `client/src/pages/ClientsDetailsPage/ui/EditClientModal/EditClientModal.tsx:126` — Function 'anonymous' is 55 lines long (limit: 50)
- [ ] `client/src/pages/ClientsDetailsPage/ui/PaymentLinkModal/PaymentLinkModal.tsx:33` — Function 'anonymous' is 142 lines long (limit: 50)
- [ ] `client/src/pages/ClientsPage/lib/hooks/useClientFilters.ts:18` — Function 'useClientFilters' is 72 lines long (limit: 50)
- [ ] `client/src/pages/ClientsPage/model/slices/clientsPageSlice.test.ts:6` — Function 'anonymous' is 83 lines long (limit: 50)
- [ ] `client/src/pages/ClientsPage/ui/ClientsPage/ClientsPage.tsx:41` — Function 'anonymous' is 79 lines long (limit: 50)
- [ ] `client/src/pages/CrmSettingsPage/ui/CrmSettingsPage/CrmSettingsPage.tsx:21` — Function 'anonymous' is 120 lines long (limit: 50)
- [ ] `client/src/pages/DanceStylesPage/ui/DanceStylesPage/DanceStylesPage.tsx:51` — Function 'anonymous' is 157 lines long (limit: 50)
- [ ] `client/src/pages/EmailPage/ui/ComposeEmailModal/ComposeEmailModal.tsx:22` — Function 'anonymous' is 77 lines long (limit: 50)
- [ ] `client/src/pages/EmailPage/ui/EmailAccountsPanel/EmailAccountsPanel.test.tsx:31` — Function 'anonymous' is 60 lines long (limit: 50)
- [ ] `client/src/pages/EmailPage/ui/EmailAccountsPanel/EmailAccountsPanel.tsx:47` — Function 'anonymous' is 117 lines long (limit: 50)
- [ ] `client/src/pages/EmailPage/ui/EmailPage/EmailPage.tsx:51` — Function 'anonymous' is 328 lines long (limit: 50)
- [ ] `client/src/pages/HomePage/ui/HomePage.test.tsx:57` — Function 'anonymous' is 52 lines long (limit: 50)
- [ ] `client/src/pages/HomePage/ui/HomePage.tsx:126` — Function 'anonymous' is 295 lines long (limit: 50)
- [ ] `client/src/pages/InvoicesPage/ui/CreateInvoiceModal/CreateInvoiceModal.test.tsx:46` — Function 'anonymous' is 92 lines long (limit: 50)
- [ ] `client/src/pages/InvoicesPage/ui/CreateInvoiceModal/CreateInvoiceModal.tsx:44` — Function 'anonymous' is 353 lines long (limit: 50)
- [ ] `client/src/pages/InvoicesPage/ui/CreateInvoiceModal/CreateInvoiceModal.tsx:191` — Function 'anonymous' is 59 lines long (limit: 50)
- [ ] `client/src/pages/InvoicesPage/ui/InvoiceActionModal/InvoiceActionModal.test.tsx:33` — Function 'anonymous' is 85 lines long (limit: 50)
- [ ] `client/src/pages/InvoicesPage/ui/InvoiceActionModal/InvoiceActionModal.tsx:63` — Function 'anonymous' is 75 lines long (limit: 50)
- [ ] `client/src/pages/InvoicesPage/ui/InvoiceActionModal/InvoiceActionModal.tsx:200` — Function 'anonymous' is 65 lines long (limit: 50)
- [ ] `client/src/pages/InvoicesPage/ui/InvoiceActionModal/InvoiceActionModal.tsx:139` — Function 'anonymous' is 60 lines long (limit: 50)
- [ ] `client/src/pages/InvoicesPage/ui/InvoicesPage/InvoicesPage.test.tsx:73` — Function 'anonymous' is 83 lines long (limit: 50)
- [ ] `client/src/pages/InvoicesPage/ui/InvoicesPage/InvoicesPage.tsx:57` — Function 'anonymous' is 424 lines long (limit: 50)
- [ ] `client/src/pages/InvoicesPage/ui/InvoicesPage/InvoicesPage.tsx:293` — Function 'anonymous' is 157 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/model/services/fetchMollieClientsList/fetchMollieClientsList.test.ts:13` — Function 'anonymous' is 72 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/model/slices/mollieClientsDetailsPageSlice.test.ts:6` — Function 'anonymous' is 76 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/model/slices/mollieClientsDetailsPageSlice.ts:44` — Function 'anonymous' is 59 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/ui/MollieCustomerDetails/MollieCustomerDetails.tsx:105` — Function 'anonymous' is 188 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/ui/MollieCustomerDetails/MollieCustomerDetails.tsx:294` — Function 'anonymous' is 153 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/ui/MollieCustomerDetails/MollieCustomerDetails.tsx:448` — Function 'anonymous' is 103 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/ui/MollieCustomers/MollieCustomers.test.tsx:40` — Function 'anonymous' is 71 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/ui/MollieCustomers/MollieCustomers.tsx:74` — Function 'anonymous' is 185 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/ui/MollieIncidents/MollieIncidents.test.tsx:52` — Function 'anonymous' is 78 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/ui/MollieIncidents/MollieIncidents.tsx:388` — Function 'anonymous' is 75 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/ui/MollieIncidents/MollieIncidents.tsx:191` — Function 'anonymous' is 279 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/ui/MollieMain/MollieMain.tsx:25` — Function 'anonymous' is 104 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/ui/MolliePayments/MolliePayments.test.tsx:43` — Function 'anonymous' is 88 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/ui/MolliePayments/MolliePayments.tsx:173` — Function 'anonymous' is 262 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/ui/MolliePaymentsMatrix/MolliePaymentsMatrix.test.tsx:82` — Function 'anonymous' is 53 lines long (limit: 50)
- [ ] `client/src/pages/MolliePage/ui/MolliePaymentsMatrix/MolliePaymentsMatrix.tsx:104` — Function 'anonymous' is 342 lines long (limit: 50)
- [ ] `client/src/pages/OrganizationBrandsPage/ui/OrganizationBrandsPage.tsx:57` — Function 'anonymous' is 131 lines long (limit: 50)
- [ ] `client/src/pages/PaymentRemindersPage/ui/PaymentRemindersPage/PaymentRemindersPage.test.tsx:67` — Function 'anonymous' is 65 lines long (limit: 50)
- [ ] `client/src/pages/PaymentRemindersPage/ui/PaymentRemindersPage/PaymentRemindersPage.tsx:95` — Function 'anonymous' is 329 lines long (limit: 50)
- [ ] `client/src/pages/ProfilePage/ui/ActiveSessions/ActiveSessions.tsx:53` — Function 'anonymous' is 125 lines long (limit: 50)
- [ ] `client/src/pages/ProfilePage/ui/ProfilePage.tsx:38` — Function 'anonymous' is 90 lines long (limit: 50)
- [ ] `client/src/pages/ProfilePage/ui/ProfilePageHeader/ProfilePageHeader.tsx:20` — Function 'anonymous' is 88 lines long (limit: 50)
- [ ] `client/src/pages/SchedulePage/ui/SchedulePage/SchedulePage.test.tsx:65` — Function 'anonymous' is 62 lines long (limit: 50)
- [ ] `client/src/pages/SchedulePage/ui/SchedulePage/SchedulePage.tsx:46` — Function 'anonymous' is 126 lines long (limit: 50)
- [ ] `client/src/pages/ScheduleSettingsPage/ui/CreateGroupModal/CreateGroupModal.test.tsx:25` — Function 'anonymous' is 66 lines long (limit: 50)
- [ ] `client/src/pages/ScheduleSettingsPage/ui/CreateGroupModal/CreateGroupModal.tsx:26` — Function 'anonymous' is 284 lines long (limit: 50)
- [ ] `client/src/pages/ScheduleSettingsPage/ui/GroupCard/GroupCard.tsx:41` — Function 'anonymous' is 79 lines long (limit: 50)
- [ ] `client/src/pages/ScheduleSettingsPage/ui/ScheduleSettingsPage/ScheduleSettingsPage.test.tsx:69` — Function 'anonymous' is 60 lines long (limit: 50)
- [ ] `client/src/pages/ScheduleSettingsPage/ui/ScheduleSettingsPage/ScheduleSettingsPage.tsx:34` — Function 'anonymous' is 327 lines long (limit: 50)
- [ ] `client/src/pages/ScheduleSettingsPage/ui/ScheduleSettingsPage/ScheduleSettingsPage.tsx:184` — Function 'anonymous' is 109 lines long (limit: 50)
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
- [ ] `client/src/widgets/Navbar/ui/Navbar.tsx:28` — Function 'anonymous' is 100 lines long (limit: 50)
- [ ] `client/src/widgets/Page/Page.test.tsx:29` — Function 'anonymous' is 60 lines long (limit: 50)
- [ ] `client/src/widgets/Sidebar/ui/Sidebar/Sidebar.tsx:22` — Function 'anonymous' is 114 lines long (limit: 50)
- [ ] `client/src/widgets/Sidebar/ui/SidebarItemGroup/SidebarItemGroup.tsx:16` — Function 'anonymous' is 59 lines long (limit: 50)
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

### `SKY-Q301` — Слишком высокая цикломатическая сложность (35)

> Упростить ветвления, вынести под-функции.

- [ ] `client/src/entities/EmailMessage/ui/EmailMessageDetail/EmailMessageDetail.tsx:60` — Function 'anonymous' has cyclomatic complexity 11 (limit: 10)
- [ ] `client/src/features/addClientForm/ui/ClientForm/ClientForm.tsx:68` — Function 'anonymous' has cyclomatic complexity 14 (limit: 10)
- [ ] `client/src/features/editSubscriptionDropdown/ui/EditSubscriptionDropdown/EditSubscriptionDropdown.tsx:30` — Function 'anonymous' has cyclomatic complexity 16 (limit: 10)
- [ ] `client/src/features/globalSearch/ui/GlobalSearch/GlobalSearch.tsx:115` — Function 'anonymous' has cyclomatic complexity 16 (limit: 10)
- [ ] `client/src/pages/ChoreographersPage/ui/ChoreographerModal/ChoreographerModal.tsx:29` — Function 'anonymous' has cyclomatic complexity 35 (limit: 10)
- [ ] `client/src/pages/ClientsDetailsPage/ui/ClientEmailBlock/ClientEmailBlock.tsx:35` — Function 'anonymous' has cyclomatic complexity 15 (limit: 10)
- [ ] `client/src/pages/ClientsDetailsPage/ui/ClientPaymentBlock/ClientPaymentBlock.tsx:134` — Function 'anonymous' has cyclomatic complexity 43 (limit: 10)
- [ ] `client/src/pages/ClientsDetailsPage/ui/EditClientModal/EditClientModal.tsx:49` — Function 'anonymous' has cyclomatic complexity 22 (limit: 10)
- [ ] `client/src/pages/ClientsDetailsPage/ui/EditClientModal/EditClientModal.tsx:126` — Function 'anonymous' has cyclomatic complexity 17 (limit: 10)
- [ ] `client/src/pages/DanceStylesPage/ui/DanceStylesPage/DanceStylesPage.tsx:51` — Function 'anonymous' has cyclomatic complexity 20 (limit: 10)
- [ ] `client/src/pages/EmailPage/ui/EmailPage/EmailPage.tsx:51` — Function 'anonymous' has cyclomatic complexity 21 (limit: 10)
- [ ] `client/src/pages/HomePage/ui/HomePage.tsx:126` — Function 'anonymous' has cyclomatic complexity 12 (limit: 10)
- [ ] `client/src/pages/InvoicesPage/ui/CreateInvoiceModal/CreateInvoiceModal.tsx:44` — Function 'anonymous' has cyclomatic complexity 37 (limit: 10)
- [ ] `client/src/pages/InvoicesPage/ui/CreateInvoiceModal/CreateInvoiceModal.tsx:191` — Function 'anonymous' has cyclomatic complexity 12 (limit: 10)
- [ ] `client/src/pages/InvoicesPage/ui/InvoicesPage/InvoicesPage.tsx:57` — Function 'anonymous' has cyclomatic complexity 29 (limit: 10)
- [ ] `client/src/pages/MolliePage/ui/MollieCustomerDetails/MollieCustomerDetails.tsx:294` — Function 'anonymous' has cyclomatic complexity 11 (limit: 10)
- [ ] `client/src/pages/MolliePage/ui/MollieIncidents/MollieIncidents.tsx:191` — Function 'anonymous' has cyclomatic complexity 15 (limit: 10)
- [ ] `client/src/pages/MolliePage/ui/MolliePayments/MolliePayments.tsx:173` — Function 'anonymous' has cyclomatic complexity 14 (limit: 10)
- [ ] `client/src/pages/MolliePage/ui/MolliePaymentsMatrix/MolliePaymentsMatrix.tsx:104` — Function 'anonymous' has cyclomatic complexity 25 (limit: 10)
- [ ] `client/src/pages/OrganizationBrandsPage/ui/OrganizationBrandsPage.tsx:57` — Function 'anonymous' has cyclomatic complexity 12 (limit: 10)
- [ ] `client/src/pages/PaymentRemindersPage/ui/PaymentRemindersPage/PaymentRemindersPage.tsx:95` — Function 'anonymous' has cyclomatic complexity 21 (limit: 10)
- [ ] `client/src/pages/ScheduleSettingsPage/ui/CreateGroupModal/CreateGroupModal.tsx:26` — Function 'anonymous' has cyclomatic complexity 14 (limit: 10)
- [ ] `client/src/pages/ScheduleSettingsPage/ui/ScheduleSettingsPage/ScheduleSettingsPage.tsx:34` — Function 'anonymous' has cyclomatic complexity 21 (limit: 10)
- [ ] `server/src/controllers/conteroller.Mollie.ts:785` — Function 'anonymous' has cyclomatic complexity 14 (limit: 10)
- [ ] `server/src/controllers/conteroller.Mollie.ts:380` — Function 'anonymous' has cyclomatic complexity 13 (limit: 10)
- [ ] `server/src/controllers/conteroller.Mollie.ts:1611` — Function 'anonymous' has cyclomatic complexity 18 (limit: 10)
- [ ] `server/src/controllers/controller.Auth.ts:110` — Function 'anonymous' has cyclomatic complexity 11 (limit: 10)
- [ ] `server/src/controllers/controller.Invoices.ts:584` — Function 'anonymous' has cyclomatic complexity 15 (limit: 10)
- [ ] `server/src/controllers/controller.Invoices.ts:762` — Function 'anonymous' has cyclomatic complexity 18 (limit: 10)
- [ ] `server/src/controllers/controller.Invoices.ts:793` — Function 'anonymous' has cyclomatic complexity 11 (limit: 10)
- [ ] `server/src/controllers/controller.Schedule.ts:336` — Function 'anonymous' has cyclomatic complexity 12 (limit: 10)
- [ ] `server/src/controllers/controller.Users.ts:65` — Function 'anonymous' has cyclomatic complexity 13 (limit: 10)
- [ ] `server/src/services/service.InvoiceDelivery.ts:62` — Function 'anonymous' has cyclomatic complexity 12 (limit: 10)
- [ ] `server/src/services/service.InvoicePdf.ts:66` — Function 'anonymous' has cyclomatic complexity 25 (limit: 10)
- [ ] `server/src/services/service.Transaction.ts:200` — Function 'anonymous' has cyclomatic complexity 15 (limit: 10)

### `SKY-Q302` — Слишком большая глубина вложенности (4)

> Использовать ранние return/guard clauses.

- [ ] `client/src/pages/InvoicesPage/ui/InvoicesPage/InvoicesPage.tsx:57` — Function 'anonymous' has nesting depth 6 (limit: 4)
- [ ] `client/src/pages/InvoicesPage/ui/InvoicesPage/InvoicesPage.tsx:108` — Function 'anonymous' has nesting depth 6 (limit: 4)
- [ ] `server/src/controllers/conteroller.Mollie.ts:785` — Function 'anonymous' has nesting depth 5 (limit: 4)
- [ ] `server/src/services/service.PaymentReminders.ts:197` — Function 'anonymous' has nesting depth 5 (limit: 4)

### `SKY-L007` — Пустой catch-блок (1)

> Обработать ошибку, залогировать или задокументировать, почему её можно игнорировать.

- [ ] `client/webpack.config.ts:9` — Empty catch block silently discards an error; handle it, report it, or document why ignoring it is safe.

### `SKY-Q402` — await внутри цикла (23)

> Использовать Promise.all()/Promise.allSettled() для параллельного выполнения, если итерации независимы.

- [ ] `server/prisma/seed.ts:35` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/controllers/controller.Invoices.ts:654` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/controllers/controller.Invoices.ts:276` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/controllers/controller.Invoices.ts:280` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/controllers/controller.Invoices.ts:655` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/services/service.EmailImap.ts:170` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/services/service.EmailImap.ts:90` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/services/service.EmailImap.ts:160` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/services/service.EmailImap.ts:196` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/services/service.EmailImap.ts:168` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/services/service.EmailSmtp.ts:108` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/services/service.EmailSyncCron.ts:16` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/services/service.InvoiceDelivery.ts:173` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/services/service.InvoiceDelivery.ts:177` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/services/service.MollieSync.ts:311` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/services/service.MollieSync.ts:461` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/services/service.MollieSync.ts:200` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/services/service.MollieSync.ts:312` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/services/service.MollieSync.ts:329` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/services/service.MollieSync.ts:387` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/services/service.MollieSync.ts:458` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/services/service.MollieSync.ts:384` — await inside loop — consider using Promise.all() for parallel execution.
- [ ] `server/src/services/service.PaymentReminders.ts:210` — await inside loop — consider using Promise.all() for parallel execution.

### `SKY-C303` — Слишком много параметров функции (1)

> Сгруппировать параметры в один объект.

- [ ] `server/src/controllers/controller.Invoices.ts:203` — Function 'anonymous' has 6 parameters (limit: 5)

## Архитектура / публичные API модулей

### `SKY-L012` — Символ используется, но не экспортирован из публичного API модуля (281)

> В основном false positive для текущей FSD-конфигурации алиасов/barrel-экспортов (`StateSchema`, `ThunkConfig`, компоненты страниц и т.д.) — нужен точечный ревью конфигурации Skylos под алиас `@/`, а не массовое переписывание экспортов.

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

### `SKY-R105` — Есть tsconfig.json, но нет npm-скрипта с tsc (1)

> Добавить, например, `"typecheck": "tsc --noEmit"` в client/package.json.

- [ ] `client/package.json:1` — client/package.json has tsconfig.json but no npm script that runs tsc.

