# Coursible — Production SaaS Roadmap

Goal: take Coursible from a working single-user-quality app to a revenue-generating B2C SaaS.
Sequencing decision: **monetize first** — every feature after Stage 2 ships into a product that can take money.

## Decisions log (locked)

| Decision | Choice |
|---|---|
| Business model | Free + Pro subscription |
| Pro price | $12/mo, $99/yr (~31% off) |
| Free tier | 1 lifetime custom course generation + all starter courses |
| Background jobs | Inngest (Trigger.dev as fallback) |
| Observability | Sentry (errors) + PostHog (product analytics) |
| Rate limiting | Upstash Ratelimit |
| Marketing surface | Single strong landing page |
| Legal | Full scaffold (ToS, Privacy, GDPR export/delete, cookie consent) |
| Mobile | PWA (manifest, offline caching, push for streaks) |
| TTS | OpenAI TTS |
| LLM provider | Kimi K2.6 (Moonshot AI) for generation + grading — implemented; Anthropic Opus/Haiku retained as fallback via `GENERATION_PROVIDER` |
| Domain | `coursible.dev` (purchased, on Vercel) |
| Learning features in plan | Spaced repetition, flashcards, sharing/publishing, audio lessons, progressive unlock, file-upload ingestion |

---

## Stage 0 — Cleanup & foundations

Small, unglamorous fixes that should land before anything public-facing.

- [x] Fix content bug: `lib/data/starter-courses/markdown-basics.json:2146` has a distractor with `"misconception": "placeholder"`. Regenerate or hand-fix that option.
- [x] Harden validator (`lib/validation/course-content.ts`): reject low-effort misconception strings (`placeholder`, `n/a`, strings < 10 chars) so this class of bug is caught mechanically.
- [ ] Generate the remaining 8 starter courses: `npx tsx scripts/generate-starters.ts` (briefs at `scripts/generate-starters.ts:19-113`), then re-seed.
- [x] Fix proxy API behavior (`proxy.ts:25`): unauthenticated calls to `/api/generation` should get JSON 401, not a 307 to `/signin`. Exclude API routes from the redirect branch.
- [x] Rewrite README: setup instructions (Neon, Google OAuth, Resend, Anthropic), scripts, architecture overview. Replace create-next-app boilerplate.
- [x] Add `engines: { node: ">=22" }` to package.json + `.nvmrc` (`lib/db/index.ts:4` requires global WebSocket).
- [x] Fix stale comment `components/wizard/course-preview.tsx:15` ("mocked AI course preview").
- [x] Add `$onUpdate` to `course_content.updatedAt` (`lib/db/schema.ts:123`).
- [x] GitHub Actions CI: `lint`, `tsc --noEmit`, `vitest run`, `next build` on PR + main.
- [ ] Buy domain; configure Resend sending domain (SPF/DKIM) and set `EMAIL_FROM`. — **domain done: coursible.dev (Vercel). Remaining: add domain in Resend, add SPF/DKIM records in Vercel DNS, set `EMAIL_FROM`.**

**Done when:** CI green on main, 9 starter courses seeded, no known placeholder content shipped.

---

## Stage 1 — Observability, rate limits, Inngest

Protect the expensive endpoints and get eyes on production before real traffic.

### Error tracking (Sentry)
- [ ] `@sentry/nextjs` init: client, server, edge configs; sourcemap upload in CI; release tagging.
- [ ] Capture generation pipeline failures with job id + user id context (`lib/generation/pipeline.ts`, `jobs.ts`).
- [ ] Alert rules: generation failure rate, grading fallback rate, webhook errors (Stage 2).

### Product analytics (PostHog)
- [ ] `posthog-js` client init behind consent flag (Stage 3); `posthog-node` server-side.
- [ ] Event taxonomy (keep small and deliberate):
  `signed_up`, `generation_started`, `generation_completed`, `generation_failed`,
  `course_started`, `lesson_completed`, `page_answered` (correct/incorrect),
  `paywall_shown`, `checkout_started`, `checkout_completed`, `subscription_cancelled`,
  `review_session_completed`, `share_created`, `audio_played`.
- [ ] Funnels: signup → first generation → first lesson complete; paywall shown → checkout → subscribed.
- [ ] Session replay on app routes only (not /signin email field).

### Rate limiting (Upstash)
- [ ] `@upstash/ratelimit` + `@upstash/redis`; fail-open or fail-closed decision per endpoint (fail-closed for generation).
- [ ] Limits:
  - `/api/generation`: 5/day free users, 30/day Pro (defense-in-depth under entitlement check)
  - `gradeOpenEnded`: 60/hour per user
  - magic-link sends: 5/hour per email + per IP
- [ ] Standard 429 JSON shape + retry-after; friendly UI state in wizard.

### Inngest migration
- [ ] Replace `after()` in `app/api/generation/route.ts` with an Inngest event (`course/generate.requested`).
- [ ] `lib/generation/pipeline.ts` becomes step functions: `outline` → per-lesson `generate.lesson` (fan-out, concurrency 3) → `validate` → `persist`. Each step retried independently; no more 800s single-invocation dependency.
- [ ] Job status updates (`generation_jobs.status`) written from steps so wizard polling keeps working unchanged.
- [ ] Serve handler at `/api/inngest`; add to proxy public matcher.
- [ ] Scheduled functions: reap `generation_jobs` older than 30 days; (later) streak-reminder push, review-due digests.

**Done when:** a killed mid-pipeline job resumes or fails cleanly with full Sentry context; generation endpoint returns 429 past limits; events flowing in PostHog.

---

## Stage 2 — Stripe billing & paywall

The revenue stage. Everything gated behind one entitlement helper.

### Schema (Drizzle migration)
- [ ] `subscription` table: `userId` (PK, →user cascade), `stripeCustomerId` (unique), `stripeSubscriptionId`, `priceId`, `status` (active/trialing/past_due/canceled/incomplete), `currentPeriodEnd`, `cancelAtPeriodEnd`, timestamps.
- [ ] No new table for course-count entitlements — derive from `courses` (`source = 'custom'`) and `generation_jobs` (monthly count for Pro fair-use).

### Entitlements
- [ ] `lib/billing/entitlements.ts`: `getEntitlements(userId)` →
  `{ plan: 'free' | 'pro', customCoursesUsed, customCoursesLimit (1 | Infinity), monthlyGenerationsUsed, monthlyGenerationsLimit (∞ soft / 30 fair-use), features: { audio, offline, sharing } }`.
- [ ] Enforce in `/api/generation` route **and** in the wizard UI (hide behind upgrade dialog, don't just error).
- [ ] Every Server Action that is Pro-only checks server-side; client checks are cosmetic.

### Stripe integration
- [ ] Products/prices: `pro_monthly` $12, `pro_annual` $99. Test + live mode.
- [ ] Checkout Session (subscription mode) from `/pricing` and upgrade dialogs; `allow_promotion_codes: true`; collect customer on first checkout (lazy creation, store `stripeCustomerId`).
- [ ] Webhooks at `/api/stripe/webhook` (raw body via `await req.text()`, signature verify, idempotent handlers keyed on event id):
  - `checkout.session.completed` → activate Pro
  - `customer.subscription.updated` → sync status/period/cancel flag
  - `customer.subscription.deleted` → downgrade to free
  - `invoice.payment_failed` → past_due state (Stripe dunning handles retry emails)
- [ ] Customer Portal for manage/cancel/payment-method; link from `/profile` (new Billing section).
- [ ] Webhook endpoint excluded from auth proxy matcher; failures → Sentry.

### Paywall UX
- [ ] `/pricing` page (public): Free vs Pro comparison table.
- [ ] Upgrade dialog component: triggered from wizard when limit hit, from Pro feature badges (audio, sharing).
- [ ] Post-checkout success route: confirm session, show "You're Pro" state, PostHog `checkout_completed`.
- [ ] Downgrade grace: user keeps Pro until `currentPeriodEnd`; no content is ever deleted on downgrade — existing courses remain accessible, new custom generation blocked.

### Tests
- [ ] Entitlement matrix unit tests (free at 0/1/2 courses, pro, past_due, canceled).
- [ ] Webhook handler tests with signed fixture payloads (stripe CLI fixtures), incl. duplicate delivery idempotency.
- [ ] Generation route: free user at limit → 402/403 with upgrade payload.

**Done when:** full loop in Stripe test mode — sign up, generate 1 free course, hit paywall on 2nd, subscribe, generate freely, manage/cancel via portal, downgrade at period end. Then flip to live keys and buy yourself a real subscription.

---

## Stage 3 — Legal & compliance

Required before public launch with payments + analytics.

- [ ] `/terms` and `/privacy` pages (markdown-driven, placeholder entities to fill: company name, jurisdiction, contact email). Cover: AI-generated content disclaimer, no guarantee of accuracy, subscription/auto-renewal terms, refund policy.
- [ ] Cookie/analytics consent banner (blocks PostHog until accepted; Sentry is fine without — no PII beyond what's needed).
- [ ] Account deletion: `/profile` danger zone → cancels Stripe subscription, deletes user row (cascades sessions/courses/progress/stats), sets `course_content.createdBy` null, confirms via email. 
- [ ] Data export (GDPR): Server Action producing a JSON archive of profile, courses, progress, stats; download link.
- [ ] Footer links from landing + app shell; last-updated dates.
- [ ] Subprocessors listed in privacy policy: Anthropic, OpenAI, Stripe, Neon, Vercel, Resend, PostHog, Sentry, Upstash, Inngest.

**Done when:** a user can read terms, consent to (or reject) analytics, export their data, and delete their account end-to-end.

---

## Stage 4 — Landing page & SEO → LAUNCH

### Route restructure
- [ ] `/` becomes the public landing page. Dashboard moves to `/dashboard` (signed-in users hitting `/` see landing with "Open app" CTA, or server-redirect — decide; redirect is better for returning users).
- [ ] Update `proxy.ts` matcher: public = `/`, `/pricing`, `/signin`, `/terms`, `/privacy`, `/share/*` (Stage 8), `/api/stripe/webhook`, `/api/inngest`, PWA assets.

### Landing page (single, strong)
- [ ] Sections: hero (product screenshot/short clip of generation → lesson flow), how-it-works (3 steps), live sample lesson embed (a starter-course lesson playable anonymously — strongest possible proof), starter catalog preview, pricing table, FAQ, footer w/ legal.
- [ ] Copy angle: "Describe what you want to be able to do. Get a full interactive course in minutes." Lead with outcome-based generation, not "AI courses".
- [ ] Performance budget: LCP < 2s, no client-side mermaid on landing (static screenshot or lazy embed).

### SEO
- [ ] Per-route metadata, OG/Twitter card images (dynamic `opengraph-image` for landing + pricing).
- [ ] `robots.ts`, `sitemap.ts`, canonical URLs, JSON-LD `SoftwareApplication` + `FAQPage` on landing.
- [ ] `NEXT_PUBLIC_SITE_URL` env everywhere absolute URLs are needed.

### Launch checklist (gate)
- [ ] All env vars in Vercel production (see Environment section below).
- [ ] Stripe live mode: products recreated, webhook endpoint registered, test charge refunded.
- [ ] Domain cutover + Resend verified on the real domain.
- [ ] Sentry alert rules routing to email/Slack; PostHog dashboards for the two funnels.
- [ ] Neon: PITR/backups confirmed; connection limits reviewed.
- [ ] Runbook: generation outage procedure (LLM provider down → flip `GENERATION_PROVIDER` and/or show status banner), Stripe webhook failure replay, DB rollback contact.
- [ ] Smoke script: signup → free course → paywall → checkout (Stripe test card on live-disabled?) — manual checklist is fine at this scale.
- [ ] Support channel: `support@<domain>` forwarding somewhere you read.

**LAUNCH.**

---

## Stage 5 — PWA & lifecycle emails

### PWA
- [ ] `app/manifest.ts`, icon set (192/512/maskable/apple-touch), theme color already defined.
- [ ] Service worker (serwist or hand-rolled): cache app shell + starter course content so started lessons work offline; network-first for Server Actions, cache-first for static.
- [ ] Install prompt UX (dismissible, shown after 2nd lesson complete).
- [ ] Push notifications (opt-in): `push_subscriptions` table, web-push, streak-at-risk evening reminder via Inngest scheduled function. Deep-link to `/dashboard`.

### Lifecycle emails (Resend + React Email)
- [ ] Welcome email (post-signup, nudge to first generation/starter).
- [ ] "Your course is ready" when generation completes (deep link).
- [ ] Streak-at-risk (evening, if `xpToday = 0` and streak ≥ 3).
- [ ] Weekly progress digest (XP, lessons, reviews due) — Inngest cron, one email, unsubscribe link.
- [ ] Email preference toggles in `/profile`; receipts remain Stripe's job.

**Done when:** installable on iOS/Android, a started lesson loads in airplane mode, all emails have working unsubscribe.

---

## Stage 6 — Spaced repetition + flashcards

`nextReviewAt` exists and is ignored — this stage makes the learning loop real.

### Review system
- [ ] Scheduling: replace flat +2 days with mastery-tiered intervals — mastery <50 → 1d, 50–79 → 3d, ≥80 → 7d; updated on every `completePage` (`lib/data/core.ts`).
- [ ] `getDueReviews` Server Action: nodes past `nextReviewAt`, ordered by weakest mastery.
- [ ] Review mode UI: pulls the question pages of due nodes into a focused session. Re-answering **does not** insert `page_completions` (PK would no-op anyway) and awards **no base XP** — instead: small review XP bonus (e.g. 5/question correct) tracked in a new `review_sessions` table (userId, courseId, startedAt, finishedAt, questionsCorrect/Total) so stats stay honest.
- [ ] Dashboard "Reviews due" card + count badge; completing reviews counts toward streak.
- [ ] PostHog: `review_session_completed`.

### Flashcards
- [ ] Pipeline change: extend lesson generation schema — 2–4 flashcards per lesson (front/back, derived from the lesson's concepts); validator rules (front non-empty, back < 300 chars, tied to taught concepts). Schema version bump handling for existing content (cards optional on v2 content).
- [ ] `flashcard_reviews` table: (userId, courseId, cardId) PK, ease factor, intervalDays, dueAt, reps. SM-2-lite (again/good/easy).
- [ ] Deck UI at `/courses/[courseId]/flashcards`: flip animation, keyboard shortcuts, progress; due-count badge on course card.
- [ ] Regenerate starter courses with cards; existing user courses: backfill job (Inngest) generating cards per lesson.

**Done when:** a user who finished a course 3 days ago gets pulled back by a due review, and flashcard due counts decay as they study.

---

## Stage 7 — Progressive unlock + file ingestion

The two biggest generation-UX upgrades. Both lean on Inngest from Stage 1.

### Progressive course unlock
- [ ] Persist outline first: `course_content` row created after the outline step (lessons=[]), `courses.status` gains `generating`.
- [ ] Each lesson step appends its lesson transactionally (jsonb `lessons || new` + per-lesson validator); final step runs course-wide validation and flips status to `active`.
- [ ] Course page polls while `generating`: skill tree visible immediately, nodes fill in; lesson 1 playable while lesson 8 is still writing. Skill-tree nodes for ungenerated lessons show a "writing..." shimmer.
- [ ] Failure semantics: failed lesson retries bounded (existing repair loop), then marks just that lesson failed — user can regenerate the single failed lesson without redoing the course. (Keep all-or-nothing quality bar on validation errors that cross lessons, e.g. concept coverage.)
- [ ] Careful with `courses` auto-complete logic and progress math while lesson count grows mid-flight.

### File-upload ingestion
- [ ] Real uploads: wizard files → Vercel Blob (`file_uploads` table: id, userId, jobId, fileName, blobUrl, createdAt). 10 MB cap stays.
- [ ] Text extraction server-side: pdf (unpdf), docx (mammoth), md/txt raw; truncate to ~50k chars total with per-file budget.
- [ ] Prompts: extracted content goes into the outline prompt (`lib/generation/prompts.ts:24-38` — replace the "contents unavailable" note) and relevant lesson prompts; instruct the model to ground the course in the materials.
- [ ] Pro-only? Decide: ingestion is cheap vs generation; suggest free users get it (it's part of the magic), revisit if abused.
- [ ] Privacy: files deletable by user; excluded from any sharing.

**Done when:** a user uploads a real PDF, watches the skill tree appear in seconds, starts lesson 1 within a minute, and the course clearly reflects the uploaded material.

---

## Stage 8 — Sharing/publishing + audio lessons

### Course sharing (Pro feature)
- [ ] `share_links` table: id, `contentId` → course_content, `ownerId`, `token` (unique), createdAt, revokedAt. (Use this instead of the unused `cohorts` table for v1; cohorts stay for future classroom features.)
- [ ] `/share/[token]` public route: read-only course preview (skill tree + lesson list + one sample lesson playable). No auth required to view.
- [ ] "Copy to my library" for signed-in users → `duplicateCourse` (`lib/data/actions.ts` exists) with `source: 'shared'`; copies are snapshots (decouple from future edits).
- [ ] Replace mocked `share-course-dialog.tsx` (real URLs, revoke, copy count); OG tags on share routes for nice unfurls.
- [ ] "Publish update" stays deferred (needs versioning semantics) — keep disabled with honest copy.

### Audio lessons (Pro feature)
- [ ] On-demand TTS: Server Action `getPageAudio(courseId, pageId)` → cache key `sha256(voice + content)` → generate via OpenAI TTS if missing → store in Vercel Blob → return URL. Never regenerate unchanged content.
- [ ] Inline player in `text-page.tsx`: play/pause/speed, highlight-less (no word timing in v1).
- [ ] Entitlement-gated (`features.audio`); cost guard: per-user daily generation cap (e.g. 100k chars) under the entitlement check.
- [ ] Voice: one good default (`alloy`/`nova`); voice picker is backlog.

**Done when:** a Pro user shares a course link that a friend can preview and copy; any text page can be listened to, cached so replays cost nothing.

---

## Environment variables (target state)

```
# existing
DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL,
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
RESEND_API_KEY, EMAIL_FROM,
GENERATION_PROVIDER, MOONSHOT_API_KEY, ANTHROPIC_API_KEY (fallback only)
# new
NEXT_PUBLIC_SITE_URL
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PRICE_MONTHLY, NEXT_PUBLIC_STRIPE_PRICE_ANNUAL
UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN
NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_POSTHOG_HOST, POSTHOG_PERSONAL_API_KEY
INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY
OPENAI_API_KEY
BLOB_READ_WRITE_TOKEN
```

## Estimated monthly fixed costs (early)

| Service | Cost |
|---|---|
| Vercel Pro | $20 |
| Neon (Launch) | ~$19 |
| Domain | ~$1 |
| Resend | $0–20 |
| Upstash Redis | $0–10 |
| Sentry | $0 (dev tier) |
| PostHog | $0 (free tier covers ~1M events) |
| Inngest | $0 (free tier) |
| Vercel Blob | ~$0–5 |
| **Fixed total** | **~$40–75/mo** |
| Variable | Kimi K2.6 generation (order-of-magnitude cheaper than Opus — cents per course, not $1–3), OpenAI TTS (~$0.015/1k chars, cached), Stripe 2.9% + 30¢ |

---

## Backlog (explicitly not in the plan)

- Per-lesson regeneration on demand / difficulty adjustment
- Certificates & social share cards
- Video pages (`VideoPage` schema exists, renderer is a placeholder)
- Full marketing site, blog, changelog
- Native app wrapper (Capacitor/Expo)
- Referral/affiliate program
- Cohorts/classrooms (B2B pivot — table already exists)
- Course marketplace
- Voice picker for TTS, word-level highlighting
- Localized UI / multilingual course generation
