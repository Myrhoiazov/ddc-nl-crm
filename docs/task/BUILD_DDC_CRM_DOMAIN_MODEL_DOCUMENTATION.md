# Task: Build DDC CRM Domain Model Documentation

## Цель

Построить domain model существующего DDC CRM как документацию и контракт.

Важно:
- не изменять код приложения;
- не менять Prisma schema;
- не переносить файлы;
- не делать DDD-рефакторинг;
- не придумывать новые business rules.

Задача — извлечь текущую предметную модель из существующего проекта и задокументировать её.

---

## Главный принцип

Domain Model отвечает не на вопрос:

> Где лежит код?

А на вопросы:

> Какие бизнес-домены существуют?  
> Какие сущности принадлежат каждому домену?  
> Какие между ними отношения?  
> Какие бизнес-правила уже существуют?  
> Какие состояния и переходы существуют?  
> Какие команды и события можно выделить из текущего поведения?

---

# 1. Источники

Используй только существующий repository как источник истины.

В первую очередь изучи:

- `CONTEXT.md`
- `README.md`
- `AGENTS.md`
- `server/prisma/schema/*.prisma`
- `server/src/routes/`
- `server/src/controllers/`
- `server/src/services/`
- `server/src/schemas/`
- релевантные `docs/spec/`
- релевантные `docs/roadmap/`
- релевантные `docs/security/`

Не считать название файла или таблицы достаточным доказательством business rule.

Правило должно подтверждаться текущим кодом или существующей документацией.

---

# 2. Не изменять приложение

В рамках этой задачи запрещено:

- менять TypeScript/JavaScript;
- менять React;
- менять Express;
- менять Prisma;
- менять migrations;
- менять API;
- переименовывать сущности в коде;
- переносить модули;
- менять runtime behavior.

Разрешено создавать и изменять только документацию domain model.

---

# 3. Создать структуру

Создай:

docs/domain/
├── README.md
├── GLOSSARY.md
├── crm.md
├── scheduling.md
├── billing.md
├── payments.md
├── communication.md
└── identity.md

Это стартовый набор.

До создания файлов сначала проверь реальный проект.

Если какой-либо из этих bounded contexts не подтверждается кодом, не выдумывай его.

Если обнаруживается важный отдельный домен, которого нет в списке, сначала обоснуй его в отчёте.

---

# 4. `docs/domain/README.md`

Это главная карта предметной области.

Документ должен содержать:

## Purpose

Объяснить, что `docs/domain/` является canonical source для business/domain knowledge проекта.

## Domain Map

Показать найденные bounded contexts.

Пример формата:

DDC CRM
├── CRM
├── Scheduling
├── Billing
├── Payments
├── Communication
└── Identity

Используй только подтверждённые домены.

## Context Responsibilities

Для каждого домена кратко описать:

- за что отвечает;
- за что не отвечает;
- с какими доменами взаимодействует.

## Domain Dependencies

Показать основные связи.

Например только если подтверждено:

Client
  ↓
Invoice
  ↓
Payment

или:

Scheduling
  ↓
Group
  ↓
Student

## Documentation Routing

Указать:

- какой файл читать для какого домена;
- что подробные technical implementation details остаются в коде и существующих specs.

---

# 5. `GLOSSARY.md`

Создать единый domain vocabulary.

Это особенно важно для AI agents.

Формат:

| Term | Meaning in DDC CRM | Related concepts | Notes |
|---|---|---|---|

Извлечь реальные термины из проекта.

Проверить, например:

- Client
- Student
- User
- Group
- Branch
- Choreographer
- Invoice
- Payment
- Transaction
- Mandate
- Subscription
- Reminder
- EmailAccount

Не придумывать определения.

Если смысл термина нельзя уверенно определить:

пометить:

`Needs clarification`

а не угадывать.

---

# 6. Структура каждого domain document

Каждый файл домена должен использовать одинаковую модель.

Например:

# Billing Domain

## Purpose

За что отвечает домен.

## Scope

Что входит.

## Out of Scope

Что относится к другим доменам.

## Entities

Перечислить реальные business entities.

Для каждой сущности:

### Invoice

- Purpose
- Identity
- Important fields
- Relationships
- States
- Invariants

Не копировать всю Prisma schema.

Указывать только поля, важные для понимания предметной области.

## Value Objects / Concepts

Если в проекте существуют значимые понятия:

- Money
- InvoiceStatus
- EmailAddress
- DateRange
- PaymentStatus

Не объявлять их Value Object в DDD-смысле, если код этого не подтверждает.

Можно использовать нейтральное название:

`Domain Concepts`.

## Relationships

Показать связи между сущностями.

Использовать Mermaid при необходимости.

Например:

```mermaid
graph TD
    Client --> Invoice
    Invoice --> Transaction