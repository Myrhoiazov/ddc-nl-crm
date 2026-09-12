# Backend Module Refactor Checklist

- [x] Health module migration merged into `develop`.

- [x] Phase 1 discovery: route/controller/service/test/front-end consumers identified.
- [x] Baseline verification: `npm run test:transactions`.
- [x] Phase 2 structural migration.
- [x] Phase 3 structural verification.
- [x] Phase 4 API contract inventory.
- [x] Phase 5 data projection.
- [x] Phase 6 DTO decision: no separate DTO; `FinancialTransaction` is already the API view type and Prisma projections preserve its shape.
- [x] Phase 7 mapper decision: existing mappers retained because Mollie/manual rows are transformed into one financial transaction view.
- [x] Phase 8 reusable code review: Mollie sync/CSV helpers remain in existing shared service area; no ownership move in this module.
- [x] Phase 9 module boundary review.
- [x] Phase 10 contract tests.
- [x] Phase 11 final verification.
