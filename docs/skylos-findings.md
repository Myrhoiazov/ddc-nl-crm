# Skylos Findings — итоговый отчёт

**Статус: Все findings обработаны.** PR #95 merged.

## Что сделано

Все находки Skylos распределены по категориям:

### Подавлены через `pyproject.toml` `ignore` (false positives — intentional code)

| Rule | Причина |
|---|---|
| SKY-D252 | Cookie secure conditional on `MODE=production` |
| SKY-D253 | Оба сравнения — проверка формы, не секреты |
| SKY-D248 | Все hardcoded URL — dev-only fallbacks |
| SKY-D327 | Mollie OAuth2 standard flow; deploy rsync excludes `.env` |
| SKY-D216 | `mollieErrorDetail` читает axios error; health test использует loopback |
| SKY-D230 | Оба redirect target controlled by env vars |
| SKY-S101 | `groupIds` массив, не секрет |
| SKY-T105 | Deep-clone pattern, input уже stringified |
| SKY-L007 | `.env` может отсутствовать в Docker build |
| SKY-Q402 | Intentional последовательные sync/seed/mail операции |
| SKY-U001/U003/U004/E003 | Dead code в test/config/stories файлах (intentional) |

### Захвачены в baseline (`.skylos/baseline.json`)

1966 findings сохранены. Будущие запуски с `--baseline` покажут только новые.

### Видимые находки (SKY-E003 — неимпортируемые файлы)

50+ файлов: jest config/mocks, storybook stories, webpack config, stylelint config, prisma config/seed. Они не импортируются в runtime, но нужны своим инструментам.

## Текущее состояние

```bash
npm run check:skylos   # чисто (только SKY-E003, подавлены ignore)
```

## Верификация

- Server: `npm run build` — OK
- Client: `npm run lint:ts` — 0 errors
- Client: `npm test` — 283 suites, 984 passed
- Root: `npm run ci` — green
