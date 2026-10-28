# Ревью кода (`code-review`)

Проверяет дифф DDC CRM по двум осям: **Standards** (соответствие правилам репозитория) и **Spec**
(соответствие запросу, issue или `tasks/plan.md`). Итог — отчёт с находками по уровням серьёзности
и числом блокирующих.

## Обзор

Ревью сфокусировано на багах, регрессиях, пропущенных проверках, ошибках безопасности и приватности
и расхождениях со спецификацией. Замечания только по стилю — кратко, если они не нарушают
задокументированное правило. Каждая находка привязана к `file:line` и содержит предложение по
исправлению.

## Когда применять

- Перед публикацией PR (этап 5 в `agent-loop`).
- Ревью незакоммиченных изменений.
- Ревью «начиная с» ветки, коммита или тега.

## Workflow

```mermaid
graph TD
    Start["Запрос на ревью"] --> Pin["1. Зафиксировать дифф<br/>по умолчанию develop...HEAD<br/>+ незакоммиченные изменения"]
    Pin --> Empty{"Дифф пустой?"}
    Empty -- "Да" --> Stop["Сообщить: ревьюить нечего"]
    Empty -- "Нет" --> Std["2. Standards<br/>AGENTS.md, FSD, токены темы,<br/>routes→controllers→services,<br/>auth, секреты"]
    Empty -- "Нет" --> Spec["3. Spec<br/>запрос → tasks/plan.md → issue"]
    Std --> Report["4. Отчёт<br/>## Standards / ## Spec"]
    Spec --> Report
    Report --> Count["Итог: число Blocking"]
    Count --> Blocking{"Blocking > 0?"}
    Blocking -- "Да" --> Back["Назад в Development"]
    Blocking -- "Нет" --> Next["Дальше: QA / PR"]
```

## Уровни серьёзности

| Уровень | Значение |
|---|---|
| `Blocking` | Исправить до PR |
| `Non-blocking` | Стоит исправить, но PR может идти |
| `Question` | Нужно уточнение от продукта или пользователя |

## Постоянные проверки Standards

- FSD-импорты только через публичный API слайса (`@/slice`), без глубоких импортов.
- Функциональные компоненты с `memo()`, текст через i18next, SCSS Modules и токены темы, тёмная тема.
- Сервер: `routes → controllers → services`, Zod в `schemas/`.
- Auth не ослаблен: cookie-сессии, CSRF, Argon2id, rate limiting.
- После изменения Prisma — `prisma:generate` и миграция.
- Нет секретов, `.env`, uploads, `.DS_Store`, `node_modules/` и AI-трейлеров в коммитах.
- Архитектурный quality gate (`.claude/rules/architecture-quality-gate.md`) для исполняемого кода.

## Структура и связанные скиллы

```
code-review/
├── README.md   # обзор и граф (этот файл)
└── SKILL.md    # шаги, постоянные проверки, формат отчёта
```

- Вызывается из [agent-loop](../agent-loop/README.md) на этапе 5.
- Ось Spec берёт критерии приёмки из [planning-and-task-breakdown](../planning-and-task-breakdown/README.md).
- Находки возвращаются в [tdd](../tdd/README.md); при чистом ревью — дальше в [pull-request](../pull-request/README.md).
