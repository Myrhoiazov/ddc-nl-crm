# Ticketing Domain

## Purpose

Sell concert tickets with assigned seats: venues and versioned seat maps, events and sessions,
per-session seat inventory, and temporary seat holds. Orders, payments, tickets and check-in are
planned and not implemented yet — see `docs/ticketing/IMPLEMENTATION_PLAN.md` for the phases.

## Scope

- `TicketVenue`, `TicketSeatMap`, `TicketSeatCategory`, `TicketSeat` — a venue and its versioned
  seating plan.
- `TicketEvent`, `TicketSession`, `TicketSessionPrice` — what is sold, when, and at what price.
- `TicketSessionSeat` — the inventory: one row per seat per session.
- `TicketHold` — a buyer's temporary claim on a set of seats.

## Out of Scope

- School clients and Mollie payers (`Client`, `Customer`) — a ticket buyer is a guest and is never
  written to those tables.
- Subscriptions, mandates, invoices — Ticketing shares only the Mollie client with Payments.

## Entities

### TicketSeatMap

- **Purpose**: one version of a venue's seating plan.
- **Identity**: `id`; unique on `(venueId, version)`.
- **States**: `DRAFT` → `PUBLISHED` → `ARCHIVED`.
- **Invariants**: a `PUBLISHED` version is immutable. A change means a new `DRAFT` version, so a
  session already on sale never sees its seating plan change underneath it.

### TicketSession

- **Purpose**: one performance of an event, bound to one published seat-map version.
- **States**: `DRAFT`, `ON_SALE`, `PAUSED`, `CLOSED`, `CANCELLED`.
- **Invariants**: seats can be held only while the status is `ON_SALE` and the current time is
  inside the sales window (`hold.policy.ts` → `isSalesOpen`).

### TicketSessionSeat

- **Purpose**: the allocation state of one seat in one session.
- **Identity**: composite primary key `(sessionId, seatId)`.
- **States**: `AVAILABLE` ⇄ `HELD` → `SOLD`; `AVAILABLE` ⇄ `BLOCKED`.
- **Invariants**: the primary key is what guarantees one active allocation per seat per session.
  The database also rejects inconsistent rows through `CHECK` constraints (a `HELD` seat must
  reference a hold, an `AVAILABLE` seat must reference nothing). There is deliberately no expiry
  time on the seat row — a seat stays taken until a transaction explicitly frees it.

### TicketHold

- **Purpose**: a temporary claim on one or more seats.
- **Identity**: `id`; `tokenHash` unique. Only the SHA-256 of the buyer's opaque token is stored.
- **States**: `ACTIVE` → `CONVERTED` (became an order) / `RELEASED` (buyer gave up) / `EXPIRED`.
- **Invariants**: a hold takes every requested seat or none of them, in one transaction
  (`hold.repository.ts` → `holdSeatsInTransaction`). Only `ACTIVE` holds expire.

## Domain Concepts

- **All-or-nothing hold**: one conditional `UPDATE` moves the requested seats from `AVAILABLE` to
  `HELD`; if fewer rows change than were requested, the transaction rolls back. Seat ids are
  sorted first so overlapping requests lock rows in the same order.
- **Idempotent retry**: when the client sends a `requestKey`, the hold token is derived from it
  with a server secret, so a repeated request returns the same hold instead of a seat conflict.
  A key whose hold is no longer live is refused.
- **Inventory generation**: publishing a session creates one inventory row per seat of its seat
  map, priced by category. Seats marked blocked on the map start as `BLOCKED`. Running it again
  changes nothing.

## Relationships

```mermaid
graph TD
    TicketVenue --> TicketSeatMap --> TicketSeat
    TicketSeatMap --> TicketSeatCategory --> TicketSeat
    TicketEvent --> TicketSession
    TicketSeatMap --> TicketSession
    TicketSession --> TicketSessionPrice
    TicketSession --> TicketSessionSeat
    TicketSeat --> TicketSessionSeat
    TicketHold --> TicketSessionSeat
```
