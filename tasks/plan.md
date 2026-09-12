# Transactions Module Refactor Plan

## Scope

Migrate only the Transactions backend module from the legacy layer-first folders into `server/src/modules/transactions/`.

## Dependency Map

```text
transactions.routes
-> auth middleware
-> transactions.controller
-> transactions.service
-> Prisma transaction/payment models
-> Mollie sync service
-> Mollie CSV helper
```

## Phases

1. Move Transactions route/controller/service/test into `server/src/modules/transactions/`.
2. Update route wiring and module test script.
3. Verify structural migration before API/data changes.
4. Inventory API responses and frontend consumers.
5. Add safe Prisma projections where the current response contract is clear.
6. Add or update focused contract/projection tests only if they protect real behavior.
7. Run module, server, and root checks.
