# Implementation Plan: DDC Local AI Email Assistant

## Overview

Deliver the local, human-approved email assistant in vertical phases. The local runtime, email
classification foundation, and knowledge ingestion/retrieval foundation are implemented. The next
vertical slice is Phase 3: read-only CRM context and draft generation.

## Relevant Context

- The server is an Express/TypeScript module-based API with environment configuration in
  `server/src/config/config.ts`.
- Email IMAP/SMTP and Telegram integrations already exist under
  `server/src/modules/communication/`.
- Docker Compose passes explicit environment variables to the backend; there is no Ollama service
  or LLM abstraction today.
- Production targets 2 CPU / 4 GB RAM, so concurrency and context defaults must remain bounded.

## Task List

- [x] Task 1: Phase 0 AI runtime configuration and benchmark procedure.
  - Acceptance: typed configuration exposes Ollama URL, model, context length, temperature,
    keep-alive, and max concurrency with the specified defaults; the model is never hard-coded in
    business logic; Docker dev/prod pass the variables; `.env.example` documents them.
  - Acceptance: an opt-in benchmark command records `free -h`, `docker stats --no-stream` when
    available, request latency, and Ollama response status without making CI depend on Ollama.
  - Verification: focused config tests, server build, inspect diff/status.
  - Dependencies: None.
  - Files likely touched: `server/src/config/ai.config.ts`, its test, Compose files, `.env.example`,
    benchmark script, local AI operations documentation.
  - Estimated scope: S.
- [x] Task 2: Phase 1 ingestion/normalization/classification foundation.
  - Acceptance: IMAP persistence stores bounded normalized text; deterministic spam checks run before
    model calls; Ollama classification is behind a narrow client and strict runtime schema with one
    repair retry.
  - Verification: AI module tests, existing email domain tests, and server build.
  - Dependencies: Task 1.
  - Files likely touched: `server/src/modules/ai-email-assistant/*`,
    `server/src/modules/communication/email/email-imap.service.ts`.
  - Estimated scope: M.
- [x] Task 3: Phase 2A website knowledge discovery and normalization foundation.
  - Acceptance: WordPress REST discovery with sitemap fallback, domain/include/exclude policy,
    normalized content, deterministic hash, and `knowledge:sync -- --dry-run` preview are available.
  - Verification: knowledge ingestion tests and server build.
  - Dependencies: Task 2.
  - Files likely touched: `server/src/modules/knowledge-ingestion/*`, `server/scripts/knowledge-sync.ts`.
  - Estimated scope: M.
- [x] Task 4: Phase 2B file ingestion and controlled import foundation.
  - Acceptance: allowlisted extensions, MIME/signature/size validation, text/HTML extraction,
    normalization, hashing, and explicit PDF/DOCX extraction errors are available.
  - Verification: file ingestion tests and server build.
  - Dependencies: Task 3.
  - Files likely touched: `server/src/modules/knowledge-ingestion/file-ingestion.service.ts`.
  - Estimated scope: S.
- [x] Task 5: Phase 2C local embeddings and indexing foundation.
  - Acceptance: configurable local embedding adapter defaults to the selected `bge-m3` model,
    semantic chunks, source/hash attribution, and benchmark procedure exist.
  - Verification: embedding/chunk tests and server build.
  - Dependencies: Task 4.
  - Estimated scope: M.
- [x] Task 6: Phase 2D retrieval and scheduled incremental updates foundation.
  - Acceptance: top-K/threshold/deduplicating retrieval, incremental sync planner, and opt-in
    scheduler exist behind storage/source interfaces.
  - Verification: retrieval/planner tests and server build.
  - Dependencies: Task 5.
  - Estimated scope: M.
- [x] Task 7: Phase 3 read-only CRM context and draft generation.
  - Delivered: `crm-context.service.ts` (read-only projection), `draft.service.ts`,
    `draft-pipeline.service.ts` wired behind `AI_EMAIL_DRAFT_ENABLED`.
- [x] Task 8: Phase 4 Telegram approval workflow.
  - Delivered: `telegram-approval.controller.ts`/`.routes.ts` mounted at
    `/api/v1/telegram/webhook`, `approval.service.ts` with actor allowlist and
    version-locked approval to prevent stale-draft approval.
- [x] Task 9: Phase 5 approved-only SMTP delivery and audit. (See Task 15 below — implemented
  together as part of the audit follow-up.)
- [ ] Task 10: Phase 6 hardening and evaluation.

## Audit follow-up (2026-09-16)

A spec-vs-implementation audit of this branch found the items below. Ordered safe-first;
each is independently verifiable.

- [ ] Task 11: Repo hygiene and doc/config drift fixes.
  - Acceptance: `server/server/` stray artifact removed; `LLM_KEEP_ALIVE` default is `0`
    everywhere (spec §3) — `ai.config.ts` fallback and `.env.example` currently say `300`,
    while Compose and `OPERATIONS.md` already say `0`; `tasks/todo.md` reflects Phase 3/4
    as done.
  - Verification: `git status` shows no stray files; `grep -rn "300" server/src/config/ai.config.ts .env.example` returns nothing for `LLM_KEEP_ALIVE`; server build.
  - Dependencies: None.
  - Files: `server/server/` (delete), `server/src/config/ai.config.ts`, `.env.example`, `tasks/todo.md`.
  - Estimated scope: XS.
- [ ] Task 12: Container resource limits for the Ollama service.
  - Acceptance: the shared `ollama` service in `docker-compose.yml` declares `mem_limit`
    and `cpus`, matching spec §16 ("container memory/CPU limits where supported") and the
    2 CPU / 4 GB VPS constraint; values are env-overridable with safe defaults.
  - Verification: `docker compose config` renders the limits; no change to healthcheck behavior.
  - Dependencies: None.
  - Files: `docker-compose.yml`, `.env.example`.
  - Estimated scope: XS.
- [ ] Task 13: Deterministic reply-language enforcement.
  - Acceptance: `OllamaLlmClient.generateDraft` treats a `replyLanguage` that disagrees with
    the detected `classification.language` (when both are known) as invalid output — it
    triggers the existing one-shot repair retry, then fails the draft (routed to
    `failed`/manual review) rather than persisting a mismatched-language draft. This
    replaces relying on prompt wording alone for the "always reply in the sender's
    language" requirement.
  - Verification: new `ollama.client.test.ts` cases for matching/mismatching language,
    repair-then-succeed, and repair-then-still-mismatched → throws.
  - Dependencies: None.
  - Files: `server/src/modules/ai-email-assistant/ollama.client.ts`, its test.
  - Estimated scope: S.
- [ ] Task 14: Phase 2B real PDF/DOCX extraction.
  - Acceptance: `.pdf` files extract text via `pdf-parse`, `.docx` via `mammoth`; empty or
    near-empty extraction still reports `extraction_required` (never silently indexed);
    existing MIME/signature/size checks are unchanged; no new dependency pulls in a native
    binary requiring build tooling beyond what's already available in the Docker image.
  - Verification: file-ingestion tests cover a real extractable PDF/DOCX fixture, an
    empty/image-only PDF fixture (still reports `extraction_required`), and unchanged
    `.txt/.md/.html` behavior.
  - Dependencies: None.
  - Files: `server/src/modules/knowledge-ingestion/file-ingestion.service.ts` and test,
    `server/package.json`.
  - Estimated scope: S.
  - Implementation note: `pdf-parse@1.1.1` (the pure-JS, no-native-deps release) was tried
    first, but its vendored pdf.js v1.10.100 reproducibly threw `bad XRef entry` on a
    buffer returned by `fs.readFile` (works fine on a `Buffer.concat` result — a real bug
    in that ancient bundled parser, not a test artifact). Switched to `pdf-parse@2.4.5`
    (`PDFParse` class over `pdfjs-dist`), which parses `readFile` buffers correctly.
    Its `dependencies` include `@napi-rs/canvas` (prebuilt native binary, only used by the
    unused `getImage`/`getScreenshot` APIs — plain `getText()` never touches it); the prod
    Dockerfile already has `python3 make g++` for `argon2`, so a missing prebuild would at
    worst fall back to that, not break the image. `pdfjs-dist`'s own `.d.ts` also referenced
    a DOM lib type (`ImageDataArray`) newer than this repo's implicit `lib` setting, which
    required adding `"skipLibCheck": true` to `server/tsconfig.json` — this only skips
    type-checking `.d.ts` files (ours and third-party), not application code.
- [ ] Task 15: Phase 5 approved-only SMTP delivery and audit.
  - Acceptance: a new opt-in cron (`AI_EMAIL_SEND_ENABLED`, default `false`, mirroring the
    classification/draft flags) claims `APPROVED` drafts one at a time
    (`AI_MAX_CONCURRENCY`-bounded), atomically transitions `APPROVED -> SENDING` guarded by
    `(id, version, status)` so a retry or duplicate cron tick cannot double-claim; sends via
    the existing `replyToMessage` SMTP path (reusing original thread headers/mailbox,
    spec §13) keyed off `AiEmailMessage.sourceEmailMessageId`; on success transitions
    `SENDING -> SENT` and records the outbound `EmailMessage` id and timestamp; on failure
    transitions to `FAILED` with the error recorded — never re-attempts automatically (an
    operator must re-approve), so retries cannot duplicate outbound mail.
  - Verification: new unit tests for the claim/skip/success/failure transitions with an
    in-memory fake repository and fake SMTP sender (no live SMTP in CI); server build;
    `npm run test:ci` unaffected.
  - Dependencies: None (independent of Tasks 11-14).
  - Files: `server/prisma/schema/ai-email.prisma` (+ new migration), new
    `server/src/modules/ai-email-assistant/send-pipeline.service.ts`,
    `send.persistence.ts`, `send-pipeline.cron.service.ts`, `index.ts` wiring,
    `server/src/index.ts`, `.env.example`, Compose files, `docs/spec/DDC_LOCAL_AI_EMAIL_ASSISTANT_OPERATIONS.md`.
  - Estimated scope: M.
  - Status: Done. `AiEmailDraftStatus` gained `SENDING`/`FAILED`; `AiEmailDraft` gained
    `sendIdempotencyKey` (unique), `sendAttempts`, `sentEmailMessageId`, `sentAt`, `sendError`
    (migration `20260916100000_add_ai_email_send_state`, hand-written — no live DB available
    in this environment to run `prisma migrate dev`; review the SQL against a real DB before
    deploying). New `AI_EMAIL_SEND_ENABLED` flag (default `false`) gates a 5-minute cron
    mirroring the classification/draft crons. Reuses
    `communication/email/email-smtp.service.ts`'s `replyToMessage` (same pattern already used
    by `telegram-notification.service.ts` reaching into `communication/telegram`) so thread
    headers/mailbox continuity come for free. 6 new unit tests in
    `send-pipeline.service.test.ts` cover claim/skip/success/failure with fakes (no live SMTP).
    Also found and fixed: `server/package.json`'s `test:local-ai` script (which `test:ci` runs)
    was missing `email-assistant.persistence/service/worker.test.ts` and
    `ollama.client.test.ts` entirely — those tests existed but never ran in CI. Fixed and
    documented in `AGENTS.md`.
- [ ] Task 16: Document the Phase 0 benchmark gap (cannot be closed from this environment).
  - Acceptance: `OPERATIONS.md`/`tasks/todo.md` clearly state that RAM/CPU/latency numbers
    from `scripts/benchmark-ollama*.sh` have not yet been captured against the real 2 CPU /
    4 GB target and must be run by an operator with access to that host before enabling any
    `AI_EMAIL_*_ENABLED`/`KNOWLEDGE_SYNC_ENABLED` flag in production. No fabricated numbers.
  - Verification: doc review only.
  - Dependencies: None.
  - Files: `docs/spec/DDC_LOCAL_AI_EMAIL_ASSISTANT_OPERATIONS.md`, `tasks/todo.md`.
  - Estimated scope: XS.

## Verification Plan

- Phase 0: focused Node test, `npm --prefix server run build`, and relevant documentation-link
  check; no live Ollama dependency in normal CI.
- Later phases: domain tests, integration tests, and root `npm run ci` before publishing.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Ollama is not currently deployed | Medium | Keep URL/model configurable and benchmark opt-in; defer service deployment until measured. |
| Limited VPS memory/CPU | High | Defaults enforce 2048 context, keep-alive 0, concurrency 1; benchmark captures runtime cost. |
| Secrets or email data leak into diagnostics | High | Benchmark records metadata/latency only and never sends email content or credentials. |
| Future code bypasses the LLM boundary | High | Introduce a dedicated configuration boundary before provider/workflow phases. |

- [x] Task 17: Fix real crawler correctness against talentcenterddc.nl and rebuild the knowledge base.
  - Found live, against the real site + dev MySQL/Ollama: (1) language was hardcoded `'nl'`
    everywhere (WP REST API exposes no `lang` field on this site); (2) no filtering excluded
    `/nl/`, `/en/`, `/uk/` translation duplicates, so every page was indexed 4x; (3)
    `SitemapKnowledgeSource`'s `<loc>` regex silently matched zero URLs against this site's
    AIOSEO sitemaps because they wrap every `<loc>` in `CDATA`; (4) it also never recursed into
    a `<sitemapindex>`, so the per-post-type sub-sitemaps (styles, choreographer, schedule) were
    never reached — those are custom post types with **no WordPress REST route at all**
    (`/wp-json/wp/v2/styles` → 404), so `WordPressKnowledgeSource` (the prior primary discovery
    strategy) could never see them regardless; (5) WooCommerce cart/shop/my-account and thin
    category/tag archives were being indexed as knowledge.
  - Fix: added `detectKnowledgeLanguage()` (URL path-prefix → language, falling back to a new
    `KnowledgePolicy.canonicalLanguage`, configurable via `KNOWLEDGE_CANONICAL_LANGUAGE`, default
    `nl` per spec — set to `ru` for this deployment since the site's un-prefixed pages are
    Russian, confirmed via `hreflang="ru"`/`x-default` and `<html lang="ru-RU">`); wired it into
    both sources; `isAllowedKnowledgeUrl` now excludes any non-canonical-language-prefixed path
    and adds `cart`/`shop`/`my-account`/`category`/`tag` to the existing exclude list; rewrote
    `SitemapKnowledgeSource` to parse both plain and CDATA-wrapped `<loc>`, recurse into a
    `<sitemapindex>` (bounded depth 2), and de-duplicate URLs found in more than one sub-sitemap;
    flipped `scripts/knowledge-sync.ts` to try sitemap first (complete) with WordPress REST as
    fallback (previously the reverse).
  - Verified live: cleared `knowledge_documents`/`knowledge_chunks` (was 95 docs/543 chunks,
    mixed `bge-m3`/`all-minilm` embeddings, ~56 docs were an unrelated file corpus from earlier
    `knowledge:import` testing) and re-ran `knowledge:sync` against the real site — 23 documents,
    94 chunks, 0 failures, all `language=ru`, all `bge-m3` (1024-dim, single model). Discovery
    now includes all 6 individual style pages and the choreographer page that were previously
    invisible. Retrieval re-tested with real queries: style-specific queries now correctly
    surface `/styles/hip-hop/`, `/styles/contemporary/`, etc. as top results; no more duplicate
    same-page-different-language results in top-K.
  - Also fixed: local `.env` had `OLLAMA_EMBEDDING_MODEL=locusai/all-minilm-l6-v2` (not the spec
    default `bge-m3`) — root cause of the mixed-embedding-model chunks found in the pre-rebuild
    DB; changed to `bge-m3`. Added `KNOWLEDGE_CANONICAL_LANGUAGE` to `.env`, `.env.example`, and
    both Compose files.
  - Known remaining content-quality caveats (not fixed, documented in OPERATIONS.md): `/agreement/`
    embeds other-language text directly in its HTML via a client-side widget (not gated by URL
    prefix); `/schedule/<branch>/` pages render their real timetable client-side, so the raw HTML
    fetch mostly captures template boilerplate instead of schedule data. Both would need JS
    rendering or a structured data source to fix properly — out of scope for this task.
  - Verification: 3 new/updated test files (`knowledge-ingestion.service.test.ts` — 11 tests,
    covering `detectKnowledgeLanguage`, non-canonical-language exclusion, CDATA parsing,
    sitemap-index recursion, cross-sub-sitemap dedup); `npm run test:local-ai` (59/59) and
    `npx tsc --noEmit` both clean.
  - Files: `server/src/modules/knowledge-ingestion/knowledge-ingestion.service.ts` (+test),
    `server/src/modules/knowledge-ingestion/index.ts`, `server/scripts/knowledge-sync.ts`,
    `.env`, `.env.example`, `docker-compose.dev.yml`, `docker-compose.prod.yml`,
    `docs/spec/DDC_LOCAL_AI_EMAIL_ASSISTANT_OPERATIONS.md`.

- [x] Task 18: `needsReply` classification fix.
  - `classificationPrompt` in `ollama.client.ts` gave the model a field name (`needsReply:
    boolean`) with zero semantic guidance. Live-reproduced on a real customer email sent through
    the site's own contact form during this session (`ai_email_messages.id=59`, sender
    denis.mirgoyazov@gmail.com via the WordPress contact-form notification path): `needsReply`
    came back `false` on both `qwen3:0.6b` (9/9 synthetic runs) and initially on `qwen3:1.7b` for
    this specific real email, despite an explicit question about styles/schedule.
  - Fix: added one line — "A reply is needed whenever the sender asks a question, requests
    information, pricing, scheduling, or action from staff — even implicitly. It is NOT needed
    only for confirmations, auto-replies, or messages requiring no response." Re-verified live:
    `needsReply:true` consistently afterward on the same real email and on the earlier synthetic
    trial-lesson sample (2/2, 3/3).
  - Verification: new regression test in `ollama.client.test.ts` asserting the prompt contains
    this guidance (can't assert live-LLM determinism in a unit test, but the wording is now
    pinned against silent removal); `npm run test:local-ai` (60/60), `tsc --noEmit` clean.
  - Files: `server/src/modules/ai-email-assistant/ollama.client.ts` (+test).
- [x] Task 19: Draft-generation JSON-format reliability fix.
  - Even with `needsReply` fixed, live drafting for the same real email failed schema validation
    5/5 times on `qwen3:1.7b` — the model consistently answered in well-formatted Markdown prose
    (headers, bold text) instead of the required raw JSON object, ignoring the explicit "raw JSON
    only" prompt instruction, and the existing one-shot repair retry did not recover (the model
    repeated the same style). This did not happen for the shorter classification prompt.
  - Fix: added Ollama's native `format: "json"` constrained-decoding parameter to both the
    classification and draft `/api/generate` requests — this is Ollama's own grammar-constrained
    JSON mode, not a prompt-wording workaround, and directly prevents markdown/prose output
    regardless of prompt phrasing. Confirmed via a standalone `curl` test before wiring it in.
  - Verified end-to-end, live, for real: with `AI_EMAIL_CLASSIFICATION_ENABLED=true` and
    `AI_EMAIL_DRAFT_ENABLED=true` already set in this dev `.env`, the actual running
    `ddc-nl-backend-dev` container (bind-mounted source, picks up edits without a rebuild) itself
    reclassified and drafted email id=59 on its own 5-minute cron tick (`[AiEmailDraft]
    processed=1, skipped=0, failed=0` in its logs) and sent the real Telegram approval
    notification via `notifyDraftForApproval` — not a script simulation.
  - Files: `server/src/modules/ai-email-assistant/ollama.client.ts`.

- [x] Task 20: Knowledge normalizer/chunking fixes (found while diagnosing why the real draft for
  email id=59 just paraphrased the customer's own question instead of answering it).
  - `normalizeKnowledgeHtml`'s `<li>`/`<p>` regexes were unanchored (`/<li[^>]*>/`,
    `/<\/?p[^>]*>/`), so "li" also matched "link" and "p" also matched "path"/"picture"/"pre".
    Every `<link>` tag in a WordPress page's `<head>` (favicons, canonical, hreflang alternates —
    15-30 per page) became a content-free "- " bullet. Confirmed live against
    talentcenterddc.nl/contact/: ~15 bullet lines of pure noise before any real content. Fixed
    with a lookahead anchor (`<li(?=[\s>/])`, `<\/?p(?=[\s>/])`).
  - Separately, `chunkKnowledgeDocument`'s default `maxCharacters` (1200) combined with `ragTopK`
    (4) produced a ~7100-character draft prompt against a 2048-token `num_ctx` — confirmed live
    that qwen3:1.7b returns an empty `{}` for an over-budget prompt regardless of `num_ctx` used
    at *inference* time if the training/serving default truncation still applies unpredictably;
    reduced the default to 500 so 4 chunks stay within budget alongside the rest of the prompt.
  - The user asked directly whether chunking accounts for overlap between consecutive chunks — it
    did not. Added a `overlapCharacters` parameter (default 250, approximating a 100-token
    minimum for Cyrillic text at this codebase's character-based budgeting) that stitches the
    trailing slice of each chunk onto the next one, so a fact landing on a chunk boundary isn't
    invisible to whichever half retrieval doesn't return.
  - Verification: 5 new/updated tests in `knowledge-ingestion.service.test.ts` and
    `embedding.service.test.ts`; full `test:local-ai` and `tsc --noEmit` clean after each change;
    knowledge base rebuilt twice more against the real site to verify live.
  - Files: `server/src/modules/knowledge-ingestion/knowledge-ingestion.service.ts` (+test),
    `server/src/modules/knowledge-ingestion/embedding.service.ts` (+test).
- [ ] Task 21: Draft-generation reliability with `qwen3:1.7b` — **still open, not resolved**.
  - Tried `format: "json"` (Ollama's grammar-constrained JSON mode) for drafting: this reliably
    returned an **empty `{}`** for the real, knowledge-grounded prompt (confirmed at `num_ctx`
    2048, 4096, and 8192, and at temperature 0 and 0.2 — ruling out context truncation and
    sampling noise as the sole cause). Reverted `format: "json"` for `generateDraft` specifically
    (kept for `classifyEmail`, where it works reliably) and increased the repair-retry budget
    from 1 to 2 (3 attempts total).
  - Final live test after all Task 20 fixes (clean knowledge, no format:json, 3 attempts): **1/3
    real end-to-end runs against the real email succeeded**; 2/3 still returned markdown/prose
    that failed schema validation after all 3 attempts. The one success was schema-valid and
    correctly flagged `needsManualAnswer: true`, but its content was vague/lightly hallucinated
    ("среди стилей: грация, красота, пластика" — marketing-copy phrases, not the actual style
    names from FAQ/styles pages) rather than precisely grounded in the retrieved knowledge.
  - This is an unresolved model-capability question, not a prompt-wording bug: `qwen3:1.7b`
    reliably handles the short classification task but is inconsistent at the compound task
    (strict JSON schema + RAG grounding + tone/length instructions) needed for drafting. Spec
    section 20's Phase 0 gate ("quality is acceptable for assisted drafting") is not yet met.
  - Options going forward (not decided): (a) accept the current failure rate — a failed draft
    just stays `FAILED`/unset rather than sending anything, so the safety property holds, it's
    only availability that suffers; (b) try `qwen3:4b` (already pulled locally) or another larger
    model and re-benchmark against the 2 CPU / 4 GB resource ceiling (still blocked on the Phase 0
    benchmark from Task 16, never run against real hardware); (c) more structural prompt work
    (few-shot example of the exact JSON, or splitting drafting into two calls: free-text answer
    then a second small JSON-formatting-only pass).

- [x] Task 22: Draft generation redesigned to a body-only call — resolves Task 21, no larger model
  needed. User's direction: cannot deploy a bigger model on this server, must optimize for the
  small one already running.
  - Root design change: only the reply **body** is generated by the LLM now. Every other
    `EmailDraft` field (`replyLanguage`, `subject`, `usedKnowledgeIds`, `confidence`,
    `needsManualAnswer`) is computed deterministically in `ollama.client.ts` from data the
    pipeline already has — `replyLanguage` from the classification just run,
    `usedKnowledgeIds` from the chunks retrieval already selected, `subject` via the existing
    `buildReplySubject` helper (reused from `communication/email/email-smtp.service.ts`),
    `confidence`/`needsManualAnswer` from the top retrieval score (`CONFIDENT_KNOWLEDGE_SCORE =
    0.55`; below that or with no knowledge at all, `needsManualAnswer` is forced `true`). This
    removes an entire failure class: the model no longer needs to correctly emit a JSON object
    with 6 fields matching a schema, it only needs to write a paragraph.
  - Discovered live while investigating: Ollama's API already separates reasoning from the final
    answer (`thinking` field vs. `response` field) — reasoning tokens were never leaking into our
    parsed output, ruling that out as a cause. But the reasoning phase itself was expensive
    (hundreds of tokens for a trivial question) and, for THIS drafting task specifically, harmful:
    with thinking enabled the model would "creatively" mistranslate exact facts pulled from
    KNOWLEDGE (e.g. invented "Фанк-живопись" for the style name "Jazz Funk"); with `think: false`
    it copied the same facts verbatim, correctly, and 3-5x faster. Passed `think: false` for
    `generateDraft` only.
  - Tried disabling thinking for `classifyEmail` too (in the spirit of "minimize cost") — this was
    a regression: live-tested 3/3, classification consistently misreported an unambiguously
    Russian email body as `language: "en"` without thinking, but got it right with thinking on.
    Reverted — `classifyEmail` keeps the reasoning phase and `format: "json"` (both already
    working reliably there); only `generateDraft` disables thinking and drops `format: "json"`
    (which, per Task 19/21, actively broke drafting by returning an empty `{}` for this longer,
    knowledge-grounded prompt).
  - Verified live via the real `generateEmailDraft` production function (not a standalone script)
    against the real email id=59, 5 consecutive runs: **5/5 succeeded**, 1.3-2.7s each (vs. the
    prior ~1/3 success rate at 10-15s+ per attempt with thinking on). Content stayed grounded in
    retrieved knowledge (specific age ranges, "занятия по принципу от простого к сложному",
    correct style-name handling) without the price/free hallucination seen in earlier tests with
    this exact email — not guaranteed to never recur, but meaningfully more reliable.
  - Verification: rewrote the draft-related `ollama.client.test.ts` tests (language-mismatch
    retry tests no longer apply — `replyLanguage` can't mismatch by construction now) — new tests
    assert body-only prompting, `think: false`, deterministic field population independent of
    model output, and score-derived `confidence`/`needsManualAnswer`. Full `test:local-ai`
    (64/64) and `tsc --noEmit` clean.
  - Files: `server/src/modules/ai-email-assistant/ollama.client.ts` (+test).

## Open Questions

- Which Ollama host placement is appropriate? `bge-m3` is the V1 embedding default; operator-run
  latency and cross-language retrieval measurements remain a deployment gate.
- Content-accuracy hallucination risk remains even with format reliability solved (Task 22) — the
  model has been observed inventing a "free trial" claim not present in KNOWLEDGE despite an
  explicit instruction not to. Every draft still requires human Telegram approval before send, so
  this cannot reach a customer unreviewed, but reviewers should know to specifically check
  price/availability claims.

- [x] Task 23: Telegram inbound delivery — no webhook registered, fixed with local-dev polling.
  - The user tapped Edit in Telegram, nothing happened, then sent `/edit 12 1 <text>` — no
    response, no DB change (`ai_email_drafts` status stayed `GENERATED`, no row in
    `ai_email_approvals`). Diagnosed with `GET https://api.telegram.org/bot<token>/getWebhookInfo`:
    `"url": ""` — Telegram had never been told where to deliver updates, so nothing the user did
    in the chat could reach the server, independent of any application code (including the
    genuine Edit-response bug fixed earlier this session, which could only matter once an update
    actually arrives). `getUpdates` also returned 0 pending — Telegram does not retain
    undelivered updates indefinitely, so the user's original tap and message are not recoverable
    and had to be redone once polling was live.
  - Offered a temporary `ngrok` tunnel to register a real webhook; the user explicitly declined
    ("не надо делать туннель и нгрок") and asked for a way to do it without exposing anything
    publicly, then declined running the tunnel manually too.
  - Implemented `getUpdates` long polling as a full alternative: the server pulls updates from
    Telegram every request (no inbound HTTP path, nothing to expose). Refactored
    `telegram-approval.controller.ts` to extract a transport-agnostic `handleTelegramApprovalUpdate`
    core (previously the logic lived directly in the Express handler) so the webhook route and the
    new polling loop share one implementation instead of two that could drift. New
    `telegram-approval.polling.service.ts`: `fetchTelegramUpdates` (one long-poll call, 25s
    timeout), `pollTelegramApprovalUpdatesOnce` (processes a batch, advances the offset past a
    failing update too — so one poison update can't wedge the loop forever), and
    `startTelegramApprovalPolling` (opt-in via `TELEGRAM_POLLING_ENABLED`, off by default since
    production is expected to use a real webhook on a real domain).
  - Enabled for this session's dev environment (`.env`), recreated the `ddc-nl-backend-dev`
    container so it picked up the new env var, confirmed live in its logs:
    `[TelegramPolling] started (local-dev alternative to the webhook)`.
  - Verification: 6 new tests in `telegram-approval.polling.service.test.ts` (long-poll request
    shape, offset handling, error propagation, and — via mocking `handleTelegramApprovalUpdate`
    through the shared CommonJS module object, the same technique this codebase already uses for
    `axios.post` — that one failing update doesn't stop the batch or get retried forever). Wired
    into `test:local-ai` (was missed on the first pass — caught by rerunning the suite and noticing
    the count didn't include the new file). 72/72, `tsc --noEmit` clean.
  - Files: `server/src/modules/ai-email-assistant/telegram-approval.controller.ts` (+test),
    new `telegram-approval.polling.service.ts` (+test), `index.ts`, `server/src/index.ts`,
    `.env`, `.env.example`, both Compose files.
  - Follow-up (same session, still Task 23): recreating the backend container to pick up
    `TELEGRAM_POLLING_ENABLED=true` also recreated `ddc-nl-ollama` (both defined in the same
    `docker compose up` invocation), and polling immediately started failing with `HTTP 409` from
    `getUpdates` — Telegram's documented "Conflict: terminated by other getUpdates request"
    response for two concurrent long-polls on one token. Traced to
    `~/.claude/channels/telegram/.env` (this Claude Code session's own Telegram channel) using the
    **same bot token** as this project's `.env` (compared safely — lengths/hash-style equality
    check, never printed either secret). Set `TELEGRAM_POLLING_ENABLED=false` and recreated the
    backend again to stop the conflict and stop competing with the user's own Claude channel.
    Resolution needs a second, dedicated bot token for DDC (via @BotFather) before polling can be
    re-enabled — not something to fix by touching the other process, which isn't this project's.
  - Files: `server/src/modules/ai-email-assistant/telegram-approval.controller.ts` (+test),
    new `telegram-approval.polling.service.ts` (+test), `index.ts`, `server/src/index.ts`,
    `.env`, `.env.example`, both Compose files.
  - Open: a dedicated Telegram bot token for DDC (separate from this Claude Code session's own
    channel) is needed before `TELEGRAM_POLLING_ENABLED` can go back to `true`. The user's
    original Edit tap and `/edit` message are unrecoverable either way (Telegram doesn't retain
    undelivered updates) and will need to be redone once a working delivery path exists.

- [x] Task 24: Removed `format: "json"` from `classifyEmail` too.
  - Found while first live-testing Task 25's new CLI tool: classification — previously reliable
    with `format: "json"` (Task 19) — started reproducibly returning an empty `{}` (schema
    validation: every field `undefined`), for both a brand-new short synthetic email AND the same
    real customer email that had classified correctly earlier in this session. Verified via direct
    `curl` against the raw Ollama API: the identical prompt returned `{}` 4/4 times with
    `format: "json"` and correct, schema-valid JSON on the first try when `format: "json"` was
    dropped (4/4 correct, including right `language`/`needsReply`) — isolating the parameter, not
    prompt content, resource limits, or model state, as the variable that mattered. (Ruled out
    Docker resource limits specifically: the container that was actually reachable at
    `127.0.0.1:11434` for all of this session's testing is the native macOS `ollama serve`
    process, not the Compose-managed `ddc-nl-ollama` container that the earlier `mem_limit`
    change applies to — confirmed via `docker stats`/`ollama ps` before ruling it out.)
  - Fix: dropped `format: "json"` from `classifyEmail`'s request, matching what `generateDraft`
    already does (Task 22) — plain generation, schema validation, one repair retry. Does not
    achieve 100% reliability (a live rerun of the real client showed 3/4), but that residual
    failure rate was already an accepted, designed-for outcome for drafting (a failed
    classification/draft is marked `FAILED` for manual review, never guessed) — this just extends
    the same tradeoff to classification instead of leaving it exposed to a *worse*, undiscovered
    failure mode.
  - Files: `server/src/modules/ai-email-assistant/ollama.client.ts`.

- [x] Task 25: `npm run ai:test-flow` — local CLI for the pipeline.
  - The whole session up to this point exercised the pipeline through one-off throwaway scripts
    deleted after each use; the user asked for a permanent, reusable CLI instead. Runs one
    hand-written subject/body through normalize → deterministic spam check → classify → RAG
    retrieve → draft using the real production functions for every stage. Read-only: no writes to
    `ai_email_messages`/`ai_email_drafts`, no Telegram notification, only real (read-only) CRM
    contact lookup and knowledge retrieval.
  - Flags: `--from`, `--subject` (required), `--body`/`--body-file`/stdin for the body, `--top-k`
    to override `RAG_TOP_K` for one run, `--no-knowledge` to skip retrieval (classification-only
    testing), `--force-draft` to see what the model would write even when classification says
    spam/no-reply-needed, `--json` for a single machine-readable object instead of the
    stage-by-stage human-readable output.
  - Hit a pre-existing circular-import landmine on the first run: importing from the
    `ai-email-assistant` barrel (`index.ts`) as the *first* thing a fresh entry point does pulls in
    `send.persistence.ts` → `communication/email/email-smtp.service.ts` →
    `communication/email/email-imap.service.ts`, which itself imports back from the same barrel —
    a cycle that happens to resolve fine in the real app's own import order but leaves
    `createPrismaAiEmailRepository` (and friends) `undefined` when entered this way. Fixed by
    importing the specific submodules the script actually needs
    (`email-assistant.service`, `ollama.client`, `crm-context.service`, `draft.service`) instead
    of the barrel — sidesteps the cycle entirely and only pulls in what a classification/drafting
    test actually needs (not the unrelated SMTP-sending machinery).
  - Verified live end-to-end multiple times, including `--json`, `--no-knowledge`, and
    `--force-draft`; all behaved as designed.
  - Files: new `server/scripts/test-email-flow.ts`, `server/package.json` (`ai:test-flow` script),
    `docs/spec/DDC_LOCAL_AI_EMAIL_ASSISTANT_OPERATIONS.md`.

- [x] Task 26: Two fixes surfaced directly by using `ai:test-flow` as a real user.
  - `ai:test-flow` (without the env wrapper) failed with a confusing Prisma/`DATABASE_URL` error
    when run without first manually sourcing and overriding the environment — the user hit this
    twice. Rather than rely on remembering a separate `:local` variant, swapped the names: plain
    `ai:test-flow` is now the host-env-aware wrapper (`scripts/run-local.sh`) by default, and the
    wrapper now echoes its resolved `OLLAMA_URL`/`OLLAMA_MODEL`/`DATABASE_URL` (password masked)
    to stderr on every run so a misconfiguration is visible immediately. The pre-wrapper behavior
    is still available as `ai:test-flow:raw` for use inside the backend container, where the
    environment is already correct.
  - Live classification failure the user hit through the CLI: valid `spam`/`needsReply`/
    `language`/`intent`/`confidence`, but `reason` missing — `emailClassificationSchema` was
    `.strict()` and required all six fields, so losing the one field nothing branches on (spec
    section 8: "`reason` ... must not be treated as hidden reasoning") discarded an otherwise
    correct classification and burned the repair retry. Made `reason` optional with an empty-string
    default; every field that actually drives control flow stays required. New tests for both the
    accept-without-reason and still-reject-without-a-real-field cases.
  - Files: `server/scripts/run-local.sh`, `server/package.json`,
    `server/src/modules/ai-email-assistant/email-assistant.service.ts` (+test).

- [x] Task 27: Draft prompt rewritten in Russian with an explicit persona and tone.
  - User's direct request: identify where the "system prompt" lives (answer: there isn't a
    separate system role — `/api/generate` takes one flat prompt string; the closest equivalent is
    the instruction lines at the top of `draftBodyPrompt`/`classificationPrompt` in
    `ollama.client.ts`) and give the customer-facing drafting call a persona: "a dance school's
    consultant assistant", in Russian, with a defined tone.
  - Scope decision (stated to the user, not silently assumed): only `draftBodyPrompt` — the
    customer-facing text — was rewritten. `classificationPrompt` stays in English and untouched
    for now: it produces internal structured data, not customer-facing prose, and its reliability
    was only just stabilized (Task 24); re-testing a full-language change there wasn't warranted
    unless asked for separately.
  - First pass (persona line + abstract tone adjectives — "доброжелательный, тёплый и
    профессиональный") measurably improved nothing structurally but the tone still read flat/
    encyclopedic live ("У нас есть программы для детей..." with no greeting or acknowledgment of
    what the customer actually wrote). Small models respond better to concrete, checkable
    instructions than adjectives, so added one: open with a short greeting and reference something
    specific from the customer's email. Verified live, 3/3: every run opened with
    "Здравствуйте!"/"Привет!" and referenced the customer's stated age/experience before answering.
  - `replyLanguage` selection (`LANGUAGE_NAMES_RU`, e.g. "на английском языке") stayed independent
    of the prompt's own language — a Russian-language instruction set asking for a Dutch/English/
    Ukrainian reply was not separately re-verified beyond the existing `replyLanguage` pass-through
    guarantee (Task 22 made it deterministic, not model-reported, so it cannot drift regardless of
    prompt language).
  - Files: `server/src/modules/ai-email-assistant/ollama.client.ts` (+test).

- [x] Task 28: Removed an age assumption the user caught in Task 27's own prompt, and a verbatim-copy
  regression found while verifying the fix.
  - The user pointed out that the greeting/acknowledgment instruction added in Task 27 literally
    said "если он упомянул возраст ребёнка" (if they mentioned the CHILD's age) — hardcoding that
    any inquiry is about a child, when the studio serves all ages (kids, teens, adults) and levels.
    Reworded to be audience-neutral and added an explicit instruction not to default to "child"
    just because the retrieved KNOWLEDGE skews that way (the site's content is genuinely
    kids-heavy) — determine who the email is actually about strictly from the email itself.
  - Live-testing that fix on an adult-themed sample ("Мне 32 года, никогда не танцевала...")
    surfaced two more real issues: (1) the draft opened by copying the customer's email almost
    verbatim — a "never copy the email body" instruction existed in the pre-Task-22 JSON prompt
    but was dropped during that redesign, unnoticed until now; (2) even after the audience-bias
    fix, the model still echoed "ребёнка" because the actual retrieved KNOWLEDGE chunk phrased a
    fact that way (e.g. "адаптирует под уровень каждого ребёнка") and the prompt's own "copy facts
    verbatim" instruction (anti-hallucination) pulled directly against the audience-neutrality one.
  - Fixed both: an abstract "don't copy the email" instruction did nothing on its own (matches
    Task 27's earlier finding — small models need concrete examples, not adjectives/prohibitions);
    replaced with a concrete instruction to open with a one-sentence paraphrase demonstrating
    understanding, with worked examples for both an adult and a child case. Added a specific rule
    for the audience-word conflict: keep the underlying fact (price, trial availability, etc.)
    verbatim, but swap only the audience word itself ("ребёнок"/"взрослый") for a neutral one
    ("ученик"/"вы") when it doesn't match what the actual email says.
  - Verified live: 3/3 adult-themed runs opened with a paraphrase (not a copy), correctly surfaced
    the adult-specific "High Heels" content, and used "ученика" instead of "ребёнка"; re-ran the
    original child-themed sample once more to confirm that case is still handled correctly
    (unchanged: "детей 7–10 лет", accurate schedule/styles). 75/75, `tsc --noEmit` clean.
  - Files: `server/src/modules/ai-email-assistant/ollama.client.ts`.

## Confirmed

- Telegram approval delivery for the Task 19 live test was confirmed by the user via a screenshot
  of the actual Telegram message (draft `11:1`, full formatted notification with Approve/Edit/
  Reject/Spam buttons) — the end-to-end classify → draft → Telegram-notify path genuinely works.
