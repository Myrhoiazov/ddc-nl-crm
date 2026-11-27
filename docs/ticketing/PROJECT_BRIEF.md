# DDC Ticketing — Project brief v0.1

Status: concept approved; technical design pending repository discovery.

## Goal
Sell concert tickets with assigned seats through WordPress, using the existing DDC CRM, API and Mollie integration. First event: 260 seats; actual row layout must be confirmed by venue.

## Proposed architecture
Existing backend owns inventory, reservations, orders, payments and tickets. Existing CRM owns administration and staff access. React/TypeScript storefront embedded through a minimal WordPress plugin/shortcode; evaluate iframe versus script integration. React/SVG seating editor. MySQL is authoritative; Redis optional for cache and notifications. Reuse existing services rather than duplicating them. All choices subject to audit.

## MVP
- Events and sessions; reusable versioned venues and seat maps; row generator, category assignment, blocked seats.
- Per-session inventory and pricing; guest checkout; mobile-friendly seat selection.
- Atomic multi-seat holds with expiry; server-side pricing; Mollie one-off checkout and verified webhook processing.
- One ticket per seat, unique opaque QR token, PDF and email; order recovery and resend.
- Admin order search, manual blocking, refunds, sales reports; authenticated mobile check-in with atomic duplicate prevention.
- WordPress embedding, locale support, privacy and access controls.

## Critical invariants
- One active allocation per session/seat; concurrent holds must be all-or-nothing. Use DB transactions and constraints; never rely on Redis alone.
- Hold expiry and payment expiry are distinct. Do not release seats while a payment can still succeed without a defined reconciliation strategy. Late payment must never double-sell; define refund/manual review path.
- Verify payment ID, status, amount, currency and order association with Mollie; redirect is not proof of payment. Idempotent creation, webhook processing and ticket issuance. Recover missing webhooks and failed email delivery.
- Refunds and chargebacks must have explicit ticket invalidation and inventory policies. Check-in must reject invalid or already-used tickets atomically.
- Snapshot prices, seat labels and event details; do not silently change published seating plans. Protect public order access with opaque tokens; avoid PII in QR codes and logs.

## Deferred
General admission, session passes, promotions, wallets, Telegram, waitlists, seat exchanges and multi-site rollout. Avoid speculative infrastructure.

## Delivery gates
Discovery → reviewed specification and architecture → approved implementation plan → incremental development → QA and production readiness. No implementation before discovery approval. Pricing, tax treatment, fees, refund policy, venue plan and operational responsibilities remain open.
