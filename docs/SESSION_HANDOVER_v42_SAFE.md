# K-Bridge — Session Handover
**Last updated:** April 2, 2026 (v42 — Partners Portal design decisions locked, payment flow finalized, split burn model, savings relay rules)
**Session status (v42):** Design decision session only — no code written. Full Partners Portal payment flow designed and locked. Split token burn model finalized. Savings relay rules locked. Partner outcome structured form finalized. Payment confirmation card flow locked. All decisions ready for Partners Portal build session.

**Previous session (v41):** Design decision session only — no code written. Partner savings split model (50/40/10) designed. Three new user dashboard card areas scoped: savings tracker, "Did You Know" service suggestions, local deals. Landing page strategy updated to incorporate all three. Data model additions identified. No build blockers added — all deferred to post-Partners Portal.

**Previous session (v40):** Design decision session only — no code written. Provider swap (Sumsub → Persona), CAC verification path permanently removed, geographic enforcement criterion clarified (physically outside US, not SOFA status), VPN detection added as platform requirement. Tech spec updated to v4.2.

**Previous session (v39):** Design decision session only — no code written. Token fee ownership rules for partner-involved tasks fully locked. Employee → partner routing flow designed. Ready to build Partners Portal.

**Previous session (v37):** Opus deep-review session. Full codebase audit against tech spec and handover. 12 code bugs found; 11 fixed and committed. Tech spec updated to v4.1. New workarounds #120–#131 added.

**Previous session (v36):** Three known issues from v34 resolved. Chat page fix-only session — no new features.

**Previous session (v34):** Chat page bugs fixed + escalation signal conflict resolved.

**Previous session (v31):** Token model restructure locked. 1-token non-refundable deposit on task open; SUPPORT task type (always free); out-of-scope escalation card (3 additional tokens); 1-week inactivity auto-archive.

**Previous session (v30):** First major build session post-re-baseline. Full v4.0 schema deployed to Supabase.

---

## How to use this file

At the start of any new Claude or Claude Code session:
> "I'm continuing development of K-Bridge. Please read docs/SESSION_HANDOVER_v42_SAFE.md and docs/KBridge_Technical_Spec_v4_2_SAFE.md before we start."

---

## Project overview

**K-Bridge** is an English-first responsive web application serving ~50,000 U.S. military, government, and contractor personnel (SOFA status) in South Korea, primarily around Camp Humphreys. It acts as a bilingual concierge and payment facilitator — users describe needs in chat, AI handles coordination and Korean-language vendor outreach, and payments flow from the user's card/bank to Korean vendors via K-Bridge's contracted local service providers.

**K-Bridge is a registered MSB.** All compliance (AML/KYC) handled via Persona, a US-based third-party provider.

**Revenue model:**
- **Token burn** — concierge service fee. Pure service credits, not payment currency. Split burn: 50% at user token quote confirmation, 50% at task completion.
- **Direct card payment** — product/service cost via Stripe. Fee: product cost + Stripe fee (~2.9% + $0.30) + 2.6% FX buffer.
- **Nium ACH** — recurring payments (rent, utilities, daycare). No card surcharge.
- Service provider reimbursement: exact KRW product cost + configurable % of (token burn × $1.70 base).

**MVP scope:** Recurring payment rail + one-off direct card payment rail + inquiry-only tasks.

---

## Developer environment

**Machine:** Windows PC
**User home:** `C:\Users\samcv`
**Project location:** `C:\Users\samcv\projects\kbridge` (Git Bash: `~/projects/kbridge`)
**Docs location:** `~/projects/kbridge/docs/` (handover + spec live here for Claude Code access)

### Installed and confirmed working
| Tool | Version | Notes |
|------|---------|-------|
| Git | 2.53.0.windows.2 | Confirmed |
| Node.js | 24.14.0 | LTS |
| npm | 11.9.0 | |
| VS Code | Latest | Default terminal: Git Bash |
| Git Bash | Current | Always use — NOT PowerShell |
| Stripe CLI | 1.37.8 | Update to 1.38.0 available, not blocking |

### Terminal setup for local development
- **Terminal 1** — Stripe listener: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- **Terminal 2** — Dev server: `cd ~/projects/kbridge && npm run dev`
- **Terminal 3** — Claude Code / spare

**Important — Windows file lock:** Always stop both terminals before running `npx prisma db push` or `npx prisma generate`.

### All packages installed
```json
"dependencies": {
  "@anthropic-ai/sdk": "^0.27.0",
  "@auth/prisma-adapter": "^2.4.2",
  "@prisma/client": "^5.17.0",
  "@stripe/stripe-js": "^4.3.0",
  "ai": "^3.3.0",
  "bcryptjs": "^3.0.3",
  "clsx": "^2.1.1",
  "date-fns": "^3.6.0",
  "geist": "^1.7.0",
  "jose": "^6.2.2",
  "next": "^16.2.0",
  "next-auth": "^5.0.0-beta.20",
  "react": "^18",
  "react-dom": "^18",
  "react-markdown": "^10.1.0",
  "stripe": "^16.2.0",
  "tailwind-merge": "^2.4.0",
  "twilio": "^5.2.3",
  "zod": "^3.23.8"
}
```

---

## External accounts

| Service | Account | Status | Notes |
|---------|---------|--------|-------|
| GitHub | sam35-bleepbloop | ✓ Active | Repo: https://github.com/sam35-bleepbloop/kbridge (private) |
| Supabase | Created via GitHub | ✓ Active | Project: `kbridge`, Region: Northeast Asia (Seoul) |
| Anthropic | Created | ✓ Active | API key active |
| Stripe | Created | ✓ Active | TEST MODE — webhook tested end-to-end |

### Not yet created / pending
- Nium — PRIMARY ACH + FX + KRW provider. Apply after MSB registration underway.
- Persona — KYC/AML provider. Apply during build phase.
- Twilio — Phase 2
- Airwallex — DECLINED. Not in active pipeline.
- Dwolla — REMOVED. Do not re-approach.

---

## Environment variables

Two files must always be kept in sync: `.env` (Prisma CLI) and `.env.local` (Next.js app).

### Currently set (keys redacted — see actual .env files)
- `DATABASE_URL` — Supabase transaction pooler (port 6543)
- `DIRECT_URL` — Supabase direct connection (port 5432)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` — `http://localhost:3000`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` — `claude-sonnet-4-20250514`
- `STRIPE_SECRET_KEY` — test mode
- `STRIPE_PUBLISHABLE_KEY` — test mode
- `STRIPE_PRICE_SINGLE` — 1 token @ $2.00
- `STRIPE_PRICE_STARTER` — 10 tokens @ $19.00
- `STRIPE_PRICE_STANDARD` — 25 tokens @ $45.00
- `STRIPE_PRICE_VALUE` — 50 tokens @ $85.00
- `STRIPE_WEBHOOK_SECRET` — local CLI secret (replace before Vercel deploy)
- `NEXT_PUBLIC_APP_URL` — `http://localhost:3000`
- `FX_BUFFER_PCT` — 0.026
- `TOKEN_PURCHASE_CAP` — 60
- `TOKEN_WALLET_CAP` — 130
- `WELCOME_BONUS_TOKENS` — 5

### To be added (Phase 2)
- `NIUM_API_KEY`, `NIUM_CLIENT_HASH_ID`
- `PERSONA_API_KEY`, `PERSONA_WEBHOOK_SECRET`
- `VPN_DETECTION_API_KEY`
- `TWILIO_*`
- `RESEND_API_KEY`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `CRON_SECRET` — must set before Vercel deployment

---

## Database status

- Schema deployed via `npx prisma db push` (not `prisma migrate dev`)
- `_prisma_migrations` table NOT populated (see workarounds)
- RLS policies applied — `prisma/rls_policies.sql` run in Supabase SQL Editor
- `Task.isPioneerTask Boolean @default(false)` added — v38
- `TaskPricingRule` model added and deployed — v38. 10 seed rules confirmed.

### Test user
- **Email:** `test@kbridge.com` — **Password in actual .env / team knowledge only**
- Token balance may be inflated from webhook testing — reset if needed (see workaround #14)

### Note on RLS + NextAuth
RLS policies use `auth.uid()` (Supabase Auth). K-Bridge uses NextAuth JWT — `auth.uid()` always returns null. Prisma connects via service role key which bypasses RLS. Acceptable for MVP.

---

## WHERE WE STOPPED — NEXT SESSION STARTS HERE

### 🟢 Session v42 accomplished (April 2, 2026 — Partners Portal design decisions locked)

**Session type:** Design decisions only — no code written.

**All decisions below are locked and ready for Partners Portal build.**

---

### LOCKED: Partners Portal — Full Payment Flow (v42)

**Complete task flow for partner-involved tasks:**

```
1.  User explains task in chat
2.  AI collects details
3.  AI or employee quotes token cost
4.  User confirms token cost → FIRST TOKEN BURN (50%, round down)
5.  AI alerts partner of task (bilingual structured payload)
6.  Partner prepares task — retrieves price, finds savings if applicable
7.  AI relays price info to user (payment card in chat thread)
8.  Payment card shows 15-minute countdown timer
9.  User confirms and executes Stripe payment
10. Stripe webhook confirms payment
11. "Thank you — payment confirmed" message shown to user
12. AI alerts partner: payment confirmed, execute purchase
13. Partner executes purchase, submits structured outcome form
14. AI informs user of task completion with relevant details + savings info
15. SECOND TOKEN BURN (remaining 50%)
16. Task → COMPLETE
```

**Failed payment (customer-side):** First 50% token burn non-refundable. Second 50% released. Task returns to payment card state for retry or cancellation.

**Partner execution failure (K-Bridge/partner-side):** Full Stripe refund to customer. Both token burns fully refunded including the 1-token task opener. Admin-handled for MVP.

---

### LOCKED: AI Summarise-Before-Translate Rule (v42)

At every translation boundary, AI must first summarise and reflect content back to the originating party via an explicit confirmation card (same pattern as EscalateOfferCard) before translating and relaying to the other party. Applies in both directions:

- Partner submits in Korean → AI reflects to partner in Korean → partner confirms → AI translates to English for user
- User responds in English → AI reflects to user in English → user confirms → AI translates to Korean for partner
- Employee writes instruction → AI reflects to employee → employee confirms → AI generates bilingual payload

**Exception:** Structured form fields on the partner outcome submission form bypass reflect-back. Only the optional freeform notes field triggers reflect-back if populated.

---

### LOCKED: Partner Outcome Structured Form (v42)

Partners submit a structured form at execution — no freeform outcome submission. Fields:

| Field | Type | Notes |
|---|---|---|
| Vendor name | Text | Pre-filled from task payload |
| Original price (KRW) | Decimal | Pre-discount — feeds savings split calculation |
| Actual amount paid (KRW) | Decimal | What partner actually paid |
| Payment reference / receipt number | Text | |
| Execution date/time | DateTime | Defaults to now |
| Receipt / proof document | File upload | Required |
| Notes | Text (optional) | Freeform — triggers reflect-back if populated |

Reflect-back rule applies to notes field only. All other fields relay directly.

**Savings logic:** `savingsKrw = originalCostKrw - actualCostKrw`. If savings exist and exceed the task-type minimum threshold (admin-configurable, workaround #135), 50/40/10 split applies.

**Receipt is internal only** — not relayed to customer. K-Bridge generates a separate task receipt for the customer.

**Customer savings relay:** Customer is shown their 40% share only, framed as a benefit. Example: "Your K-Bridge saving on this order: ₩8,000." No disclosure of original price, full savings amount, or split structure. Savings amount is applied as a reduction at Stripe checkout — the payment card shows the already-discounted amount.

---

### LOCKED: Payment Card + Timer Flow (v42)

Payment card appears in chat thread (EscalateOfferCard pattern). Three UI states:

**State 1 — Active (countdown running):**
- Shows task summary, amount due (savings-adjusted if applicable)
- 15-minute countdown timer visible on card
- "Pay Now" button → Stripe Checkout
- Pulsing alert indicator on task dashboard card while timer active

**State 2 — Expired (awaiting user re-engagement):**
- Timer replaced with "Price window expired" message
- "Reconfirm Price" button
- Explanatory text: *"The price window has expired. Requesting a fresh price confirmation from our local partner will cost 2 additional tokens. Your current balance: X tokens."*
- Task sits dormant — no auto re-route, no zombie behaviour

**State 3 — Processing:**
- Shown after user taps Pay Now, while Stripe redirect/webhook pending

**On "Reconfirm Price" tap:**
- 2-token charge fires immediately (non-refundable, every re-route regardless of price change)
- Task routes back to PENDING_PARTNER with re-confirmation note
- Partner re-confirms or updates price
- New payment card issued with fresh 15-minute timer

---

### LOCKED: Token Split Burn Model (v42)

| Event | Tokens burned |
|---|---|
| Task creation | 1 token (opener, non-refundable — existing rule) |
| User confirms token cost quote | 50% of remaining quoted cost (round down on odd) |
| Task completion (partner execution confirmed) | Remaining 50% |

**Examples:**
- 10-token task: 1 at open, 4 at quote confirm (50% of 9, round down), 5 at completion = 10 total
- 5-token task: 1 at open, 2 at quote confirm (50% of 4, round down), 2 at completion = 5 total

**Failed Stripe payment after first burn:** First 50% non-refundable. Second 50% released. Customer-side failure.

**Partner execution failure:** Full refund — all tokens including opener. K-Bridge/partner-side failure. Admin-handled for MVP.

**Price re-route charge:** 2 tokens at point user taps "Reconfirm Price." Non-refundable. Every re-route.

---

### LOCKED: PartnerOrg Model Additions (v42)

Two new fields to add in next schema push:
- `description String?` — plain text description of services offered
- `serviceTagsJson Json @default("[]")` — structured array for AI/employee routing (e.g. `["grocery", "utilities", "transport", "government_docs"]`)

---

### LOCKED: New TaskStatus — PAYMENT_CONFIRMED (v42)

New status `PAYMENT_CONFIRMED` added between `PAYMENT_PENDING` and `COMPLETE`.

Updated state machine path for partner tasks:
```
PENDING_USER → PAYMENT_PENDING → PAYMENT_CONFIRMED → PENDING_PARTNER_EXECUTION → COMPLETE
```

Partner execution endpoint (`POST /api/partner/tasks/[id]/outcome`) must hard-gate on `PAYMENT_CONFIRMED` — reject 403 if status is anything else.

---

### New workarounds added this session (v42)

| # | Workaround |
|---|---|
| **#138** | `PAYMENT_CONFIRMED` status needs adding to `TaskStatus` enum and state machine before Partners Portal build. Also add `PENDING_PARTNER_EXECUTION` if that sub-state is needed. Coordinate as single schema push. |
| **#139** | Partner execution endpoint (`POST /api/partner/tasks/[id]/outcome`) must hard-gate on `PAYMENT_CONFIRMED` — reject 403 otherwise. Add this check at route handler level, not just state machine. |
| **#140** | Payment card 15-minute countdown: store server-authoritative expiry timestamp on `PartnerTask` (e.g. `paymentWindowExpiresAt DateTime?`). Client renders countdown from this timestamp. Do not rely on client clock alone. |
| **#141** | Payment card has three UI states (active/countdown, expired/reconfirm, processing). State machine for card must be driven by `PartnerTask.paymentWindowExpiresAt` and task status, not local React state alone. |
| **#142** | Dashboard task card pulsing alert indicator for active payment countdown. Use existing attention badge pattern. Full flashing version deferred if lift is high. |
| **#143** | Reflect-back confirmation card applies at all translation boundaries. Structured partner outcome form fields bypass reflect-back. Notes field triggers it if populated. Implement as reusable confirmation card component. |
| **#144** | Token split burn: `burnTokens()` called twice per task — first call at quote confirmation (50% round down), second at completion (remainder). Both calls must create separate ledger entries with clear descriptions. Ensure `tokenReserved` on Task tracks total reservation correctly across both burns. |
| **#145** | Partner execution failure refund flow (full Stripe refund + all token burns including opener) is admin-manual for MVP. Add dedicated admin action to task detail page before production. |
| **#146** | Savings reduction at Stripe checkout: `savingsKrw` must be calculated and passed to Stripe payment intent creation before checkout session opens. Payment card generation must be gated on partner outcome submission (which provides `originalCostKrw` and `actualCostKrw`). |
| **#147** | PartnerOrg `description` and `serviceTagsJson` fields not yet in schema — add in same push as `PAYMENT_CONFIRMED` enum update. |
| **#148** | Re-route 2-token charge fires at "Reconfirm Price" tap, not at timer expiry. Ensure charge is applied in the API route that handles re-route initiation, with clear ledger entry description. |

---

## Recommended next session

**🔴 NEXT SESSION — Partners Portal build**

Fully scoped. All DB models deployed (except enum update — workaround #138). Token fee ownership locked (v39). Payment flow locked (v42). Build order:

1. Schema push — add `PAYMENT_CONFIRMED` to `TaskStatus` enum + `PartnerOrg` fields (`description`, `serviceTagsJson`) + `PartnerTask.paymentWindowExpiresAt`
2. Route group scaffold — `app/(partner)/partners/`
3. Layout + auth guard (isPartner check)
4. Partner task queue — `app/(partner)/partners/dashboard/`
5. Partner task detail — `app/(partner)/partners/tasks/[id]/`
6. Reflect-back confirmation card component (reusable)
7. Clarification flow — `app/(partner)/partners/tasks/[id]/clarify/`
8. Structured outcome submission form — `app/(partner)/partners/tasks/[id]/outcome/`
9. Payment card component (3 states: active/countdown, expired/reconfirm, processing)
10. Stripe payment intent with savings reduction
11. Partner execution alert card
12. Admin PartnerOrg management — `/admin/partner-orgs/`
13. "Route to Partner" modal on admin task detail
14. AI prompt additions — `lib/ai/partner.ts`
15. API routes — partner tasks, clarification, outcome, re-route

**Partner UI is Korean-first throughout.**

---

## What is built (as of v38 — March 29, 2026)

### Key files
```
prisma/schema.prisma              ← Complete DB schema (v38: isPioneerTask + TaskPricingRule)
prisma/seed.ts                    ← Price references + admin employee + 10 task pricing rules
lib/auth.ts                       ← token.id fix; isEmployee/employeeRole in JWT+session
lib/db.ts                         ← Prisma client singleton
lib/tokens/engine.ts              ← v38: lookupOneOffCost(), pioneer path, PIONEER_TOKEN_COST=2
lib/tasks/stateMachine.ts         ← Task transitions + escalateToHuman + resumeAfterHuman
lib/tasks/inactivityArchive.ts    ← Auto-archive tasks inactive 7+ days
lib/ai/chat.ts                    ← v38: getPricingRulesPrompt(), TOKEN_PRICING_PROMPT_SECTION
lib/payments/orchestrator.ts      ← Fee calc, memo generation, payment stubs
lib/recurring/scheduler.ts        ← checkLowTokenAlerts() + runDueRecurrings()
app/(user)/tasks/[id]/page.tsx    ← Streaming chat + EscalateOfferCard
app/(admin)/admin/pricing-rules/  ← Token pricing rule management
app/(admin)/admin/pioneer-tasks/  ← Pioneer task review queue
components/tasks/EscalateOfferCard.tsx
```

### What is confirmed working
- Full signup, referral codes, SOFA/DEROS/consent ✓
- Login with employee auto-redirect ✓
- Dashboard, task chat (streaming AI), token purchase (all 4 packs), Stripe webhook ✓
- Admin: queue, tasks, users, vendors, employees, price references, token pricing rules, pioneer tasks ✓
- Recurring pause/resume + first-run approval ✓
- Landing page ✓

### What is stubbed / not yet built
- Partners Portal (next build priority)
- Admin tasks `[id]` PATCH route — workaround #128 ✅ fixed v37
- SOFA Tier 2 verification UI
- Persona KYC integration
- VPN detection
- Nium ACH + KRW integration
- Direct card payment flow
- DEROS lifecycle cron
- Email notifications (Resend)
- Twilio SMS

---

## All key decisions (do not re-litigate)

### Partners Portal
| Decision | Choice |
|----------|--------|
| URL | `mykbridge.com/partners` — route group in existing Next.js app |
| Auth | `isPartner Boolean` + `partnerOrgId String?` on User |
| Partner UI language | **Korean-first throughout** |
| Task delivery | Web portal queue — no API push for MVP |
| Communication routing | All partner ↔ user comms routed through AI — no direct contact |
| Payload format | Bilingual JSON: `instruction.en` + `instruction.ko` |
| Partner input | Structured outcome form primary; freeform notes field secondary |
| Reflect-back rule | Explicit confirmation card at every translation boundary. Structured fields bypass. Notes field triggers it. |
| Intent confirmation | Confirmation card (not chat bubble) at each translation boundary |
| Confirmation iterations | Max 3 rounds before escalation to admin |
| Partner UI language | Korean-first |
| Partner token visibility | Partners NEVER see token costs or amounts |
| Token fee ownership | AI-routed: from TaskPricingRule (partner cost baked in). Employee-routed: employee sets fee. User always confirms before task reaches partner queue. |
| Payment card | Chat thread card (EscalateOfferCard pattern). 3 states: active/countdown, expired/reconfirm, processing. |
| Payment window | 15 minutes. Server-authoritative expiry timestamp. Pulsing dashboard indicator. |
| Re-route | User-initiated via "Reconfirm Price" button. 2-token charge at tap. Every re-route. Explanatory text on card. |
| Token split burn | 50% at user quote confirmation (round down). 50% at task completion. |
| Failed Stripe payment | First 50% non-refundable. Second 50% released. |
| Partner execution failure | Full refund all tokens including opener. Admin-manual MVP. |
| Partner outcome form | Structured fields: vendor, original KRW, actual KRW, reference, datetime, receipt upload, optional notes. |
| Receipt relay | Internal only. K-Bridge generates separate customer task receipt. |
| Savings relay to customer | 40% share only. Framed as benefit. Applied as reduction at Stripe checkout. No disclosure of full savings or split. |
| PartnerOrg new fields | `description String?` + `serviceTagsJson Json @default("[]")` |
| New task status | `PAYMENT_CONFIRMED` between `PAYMENT_PENDING` and `COMPLETE` |
| Partner execution gate | Hard 403 if status != `PAYMENT_CONFIRMED` at outcome submission |

### Product
| Decision | Choice |
|----------|--------|
| Token role | Pure service fee credits. NOT payment currency. |
| Token pricing | Single $2.00 · Starter 10@$1.90 · Standard 25@$1.80 · Value 50@$1.70 |
| Token base value (reimbursement) | $1.70 fixed |
| Token purchase cap | 60 per transaction |
| Token wallet cap | 130 maximum |
| Token purchase method | Stripe card only |
| Token burn timing | Split burn — 50% at quote confirm, 50% at completion |
| Welcome bonus | 5 tokens on first signup |
| Referral bonus | 5 tokens per successful referral |
| One-off token pricing | Dynamic 2–10 tokens via TaskPricingRule. Pioneer: 2 tokens. Escalated one-offs: 4-token deposit, 0 additional. |
| Geographic enforcement | Physical presence outside US. Not SOFA status. |
| Tier 1 verification | Self-cert + IP geolocation + VPN detection → PENDING_SOFA |
| Tier 2 verification | Command letter (admin reviewed) → VERIFIED_SOFA. CAC permanently removed. |
| PENDING_SOFA payment limit | 5 one-off payments until VERIFIED_SOFA |
| Partner savings split | 50% partner / 40% customer / 40% K-Bridge on verified receipt savings |
| Savings minimum threshold | Admin-configurable per task type (workaround #135) |

### Technical
| Decision | Choice |
|----------|--------|
| Framework | Next.js 16 App Router + TypeScript |
| Styling | Tailwind CSS v3 + brand tokens |
| Auth | NextAuth.js v5 beta + JWT |
| Database | Supabase Postgres + Prisma v5.22.0 — do NOT upgrade to v7 mid-build |
| AI | Anthropic Claude `claude-sonnet-4-20250514` |
| Token purchases | Stripe card only |
| One-off payments | Stripe card (product cost + Stripe fee + 2.6% FX buffer) |
| Recurring payments | Nium ACH + KRW delivery |
| KYC/AML | Persona (US-based) |
| Next.js 16 params | Always `Promise<{ id: string }>` in route handlers — await before use |

### Brand
| Token | Value |
|-------|-------|
| Primary navy | #1B3A6B |
| Navy mid | #2D5499 |
| Navy light | #E8EEF7 |
| Navy pale | #F0F4FA |
| Alert red | #C0272D |
| Surface page | #F5F6F8 |
| Font (app) | Geist Sans |
| Font (landing) | DM Sans + DM Serif Display |
| User sidebar | #1B3A6B navy |
| Admin sidebar | #111827 dark |

---

## Workarounds Log

| # | Workaround | Risk | Action |
|---|-----------|------|--------|
| 1 | Password stored in `image` field | Medium | Add `passwordHash String?` in future migration |
| 2 | `_prisma_migrations` not populated | Medium | Run `npx prisma migrate resolve --applied init` when stable |
| 3 | RLS uses `auth.uid()` but app uses NextAuth | Low for MVP | Service role bypasses RLS |
| 4 | PrismaAdapter removed from NextAuth | Low | Re-evaluate when v5 stable |
| 5 | `prisma migrate dev` never ran | Medium | Investigate port 5432 blocking |
| 6 | Tailwind v4 downgraded to v3 | Low | Migrate before production |
| 7 | `middleware.ts` deprecation warning | Low | Rename to `proxy.ts` before Vercel deploy |
| 8 | KRW recurring — no live FX rate | HIGH | Scheduler must fetch live FX at execution (Phase 2) |
| 10 | Prisma JSONB `{ push }` broken | ✅ FIXED | Read + spread + write full array |
| 12 | Welcome bonus in register route | Low | Acceptable for credentials auth |
| 13 | Stripe webhook idempotency via AuditLog | Low | Acceptable for MVP |
| 14 | Test user token balance inflated | None | Reset via SQL if needed |
| 15 | STRIPE_WEBHOOK_SECRET is local CLI | HIGH | Replace before Vercel deploy |
| 16 | AuditLog.taskId optional via db push | Medium | Formalise in migration |
| 17 | DEROS day defaults to 01 | Low | Consider `derosExactDateKnown` flag |
| 18 | Several fields added via db push | Medium | Formalise when migration resolved |
| 19 | Account deletion cascade not defined | Medium | Define before production |
| 20 | Referral reward no abuse protection | Low | KYC catches most abuse |
| 21 | Existing users have no referral code | Low | Backfill script before promotion |
| 22 | Token history capped at 100 entries | Low | Add pagination before production |
| 23 | Landing page DM Sans vs app Geist | Low | Decide before production |
| 24 | Landing page testimonials placeholder | Medium | Replace before public launch |
| 29 | ACH timing not in recurring scheduler | HIGH | Confirm Nium settlement times |
| 30 | No handler for ACH unauthorized returns | HIGH | Nium webhook handler needed |
| 31 | On-demand ACH authorization not in bank-link flow | HIGH | Legal requirement |
| 40 | Vercel egress IPs not on provider allowlists | Medium | Add before go-live |
| 64 | @mykbridge.com Google Workspace deletion window | Medium (time-limited) | Use @k-bridgellc.com interim |
| 66 | Task-type-to-rail mapping table not built | Medium | Build before Phase 2 |
| 71 | Consent flags not versioned | Medium | Replace with ConsentRecord table before production |
| 72 | No email provider — payment confirmations not wired | HIGH | Resend — Phase 2 |
| 73 | No API rate limiting on `/api/ai/chat` | HIGH | Add before production |
| 74 | Vercel cron not designed for volume | Medium | Add pagination before scale |
| 77 | Inquiry-to-payment task upgrade path not built | Medium | |
| 78 | Urgency levels not wired to token burn formula | Medium | |
| 80 | DEROS lifecycle cron not built | HIGH | |
| 82 | Admin promotion code system not built | Medium | |
| 86 | PENDING_SOFA payment gate not enforced | Medium | |
| 90 | Welcome token abuse prevention partial | Medium | hashedEmail deployed; Persona duplicate check Phase 2 |
| 91 | Direct card payment flow not built | HIGH | After Nium onboarding |
| 92 | Token burn timing — now split burn model | Medium | Implement split burn in engine.ts |
| 93 | Service fee split hardcoded | Medium | Read from PartnerOrg.serviceFeeSharePct |
| 94 | SOFA Tier 2 command letter review not built | Medium | |
| 95 | FX buffer earmarking not tracked | Low | Phase 3 |
| 97 | `creditTokens()` return — ✅ FIXED v37 | | |
| 100 | Partners Portal routes not scaffolded | 🔴 NEXT BUILD | DB models deployed |
| 101 | `[TASK_COMPLETE]` signal relies on AI compliance | Medium | Manual close is fallback |
| 102 | Knowledge base prompt injection no size ceiling | Medium | Add char limit when KB grows |
| 104 | PATCH /api/tasks/[id] only handles user close | Low | Admin close via separate route |
| 109 | Double greeting on task open | Medium | Add in-flight guard |
| 113 | Admin task detail — verify no duplicate fetch | Medium | |
| 114 | My Tasks list doesn't show task.label | Low | Use `task.label ?? TYPE_LABELS[task.type]` |
| 116 | `[ESCALATE_TO_HUMAN]` Support-only — document | Low | Intentional |
| 121 | taskDone checked COMPLETED not COMPLETE — ✅ FIXED v37 | | |
| 124 | Token burn mapped wrong — ✅ FIXED v38 | | |
| 125 | Label route broken fetch — ✅ FIXED v37 | | |
| 126 | hashedEmail not populated — ✅ FIXED v37 | | |
| 127 | Stripe webhook ignored creditTokens return — ✅ FIXED v37 | | |
| 128 | Admin tasks route missing — ✅ FIXED v37 | | |
| 131 | Completion burn two ledger entries (noisy) | Low | Optional cleanup before production |
| 132 | Prisma v5 → v7 upgrade available | Medium | Dedicated session before deploy |
| 133 | sumsubApplicantId → personaInquiryId rename needed | Medium | Coordinate schema + code together |
| 134 | VPN detection provider not selected | Medium | Evaluate IPQualityScore, ipapi.is |
| 135 | Savings split minimum threshold not defined | Medium | Admin-configurable per task type |
| 136 | Savings/dashboard card models not in schema | Medium | One coordinated push post-Partners Portal |
| 137 | Landing page copy refresh blocked on real savings data | Medium | Defer until data available |
| **138** | `PAYMENT_CONFIRMED` (+ `PENDING_PARTNER_EXECUTION`?) not in TaskStatus enum | 🔴 Before build | Add in next schema push |
| **139** | Partner outcome endpoint must hard-gate on PAYMENT_CONFIRMED | 🔴 Before build | 403 reject if status wrong |
| **140** | Payment card timer must use server-authoritative expiry timestamp | HIGH | Store `paymentWindowExpiresAt` on PartnerTask |
| **141** | Payment card 3 UI states driven by server state, not local React state | HIGH | |
| **142** | Dashboard pulsing alert for active payment countdown | Low | Use existing attention badge pattern |
| **143** | Reflect-back confirmation card — reusable component needed | Medium | Structured fields bypass; notes field triggers |
| **144** | Split burn — two `burnTokens()` calls per task with clear ledger entries | HIGH | Ensure `tokenReserved` tracks correctly |
| **145** | Partner execution failure refund (full — including opener) is admin-manual | Medium | Add admin action before production |
| **146** | Savings reduction at Stripe checkout — gate payment card on partner outcome | HIGH | `savingsKrw` must be known before checkout opens |
| **147** | PartnerOrg `description` + `serviceTagsJson` not yet in schema | Medium | Add in same push as #138 |
| **148** | Re-route 2-token charge fires at "Reconfirm Price" tap — not at expiry | HIGH | Apply in re-route API route with ledger entry |

---

## Open questions

| Question | Status |
|----------|--------|
| Attorney: MSB + MTL geographic extraterritorial exposure | 🔴 CRITICAL — consultations scheduled |
| Attorney: self-cert + IP geolocation + VPN detection sufficient for MTL exemption? | 🔴 CRITICAL |
| Attorney: transaction velocity limits + new-user hold periods? | 🔴 CRITICAL |
| Attorney: VPN detection disclosure in ToS? | 🟡 Raise in consultations |
| Nium: MSB registration satisfies FI track license? | 🔴 Confirm during onboarding |
| Nium: USD→KRW fee schedule | 🔴 Negotiate during onboarding |
| Nium: same-day ACH / RTP availability | 🟡 Confirm during onboarding |
| Persona: SDK embed for Next.js App Router | 🟡 Confirm during onboarding |
| Persona: command letter as supported document type | 🟡 Confirm during onboarding |
| VPN detection provider selection | 🟡 Evaluate options (workaround #134) |
| Korean entity formalisation | 🟡 Confirm before service contract |
| Service contract (K-Bridge US ↔ K-Bridge Korea) | 🟡 Needs legal counsel |
| Transfer pricing structure | 🟡 Before first intercompany invoice |
| 2.6% FX buffer validation | 🟡 Validate in first 90 days |
| Real testimonials for landing page | Must replace before public launch |
| Google OAuth | Phase 2 |
| CRON_SECRET | Must set before Vercel deployment |
| Landing page copy refresh | Defer until real savings data available |
