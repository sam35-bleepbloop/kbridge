# K-Bridge Platform — Technical Specification v4.2
**Architecture · Database · API · Token Engine · Payment Rails · Build Plan**
April 2026 | CONFIDENTIAL

> **Note:** This is the sanitised version for use with Claude Code. All passwords, API keys, and sensitive credentials have been removed. See actual `.env` / `.env.local` files for live credentials.

---

## v4.2 Changes from v4.1

Attorney consultation session (April 1, 2026):
- **Persona replaces Sumsub** as KYC/AML provider
- **CAC scan removed** as verification method — prohibited for non-official government use
- **Verification model clarified** — goal is physical presence outside US, not SOFA status verification
- **VPN detection** added as platform requirement
- **Geographic gate reframed** — "not physically in the US" replaces "SOFA status" throughout
- **Schema fields:** `sumsubApplicantId` / `sumsubVerificationStatus` → `personaInquiryId` / `personaVerificationStatus` (rename pending — workaround #133)

## v4.2b Changes (April 2, 2026 — Partners Portal design session)

- **Partners Portal payment flow fully designed** — split burn model, payment card, timer, re-route flow
- **AI reflect-before-translate rule locked** — explicit confirmation card at every translation boundary
- **Partner outcome structured form locked** — fields, savings tracking, receipt handling
- **Token split burn model locked** — 50% at quote confirmation, 50% at completion
- **PAYMENT_CONFIRMED** status added to state machine
- **PartnerOrg model additions** — `description`, `serviceTagsJson`
- **Savings relay rules locked** — 40% customer share only, applied at checkout, no disclosure of full split

---

## 1. Executive Summary

| Item | Detail |
|---|---|
| Target users | ~50,000 SOFA-status personnel in South Korea, primarily Camp Humphreys |
| Core value prop | English-language AI concierge bridging payment, language, and logistics gap |
| Revenue model | Token service fee + direct card payment for product/service cost + 2.6% FX buffer |
| MVP scope | Recurring payment rail + one-off direct card payment + inquiry-only tasks |
| Regulatory posture | Registered federal MSB (FinCEN). KYC/AML via Persona. Geographic gate: physically outside US. |
| Scale targets | 100 users / 3 months → 1,500 users / 18 months |

---

## 2. Regulatory & Compliance

### MSB Registration (Federal)
K-Bridge is a registered federal MSB under FinCEN. Foundational architectural decision.
- Written BSA/AML compliance program
- Designated BSA Compliance Officer
- Transaction monitoring via Persona
- Annual AML audit
- **180-day rule:** Clock starts at first money transmission activity, not platform launch

### MTL Posture
K-Bridge does NOT hold state MTLs. Basis: all transacting users physically outside the US. Written attorney opinion required before first payment rail goes live.

**Hard enforcement rule:** Any user attempting a payment task must be verified as physically outside the US — enforced at both UI and API level.

### KYC/AML — Persona
Standalone KYC/AML provider, independent of payment providers. US-based company.
- Identity verification (government ID, facial biometrics)
- Document verification (command letters)
- Ongoing AML transaction monitoring
- Raw PII retained by Persona only — K-Bridge stores `personaInquiryId` + `personaVerificationStatus` only
- KYC triggered on first payment task confirmation attempt (not at signup)

---

## 3. High-Level Architecture

| Layer | Detail |
|---|---|
| Frontend | Next.js 16 App Router + TypeScript. Responsive web. No native mobile app in MVP. |
| Database | Supabase (Postgres) + Prisma v5 ORM. Row-level security on all tables. |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`). Chat, translations, task payloads, token estimates. |
| Payment — card | Stripe Checkout. Token purchases + direct one-off product/service charges. |
| Payment — ACH + FX | Nium. ACH pull + USD→KRW FX + KRW local delivery. Apply after MSB registration. |
| KYC/AML | Persona. US-based. Independent of payment providers. |
| Communication | Twilio — Korean SMS. Phase 2. |
| Background jobs | Vercel Cron — daily 06:00 KST (21:00 UTC) |
| Auth | NextAuth.js v5 beta (5.0.0-beta.20) + JWT. Credentials active. Google OAuth stubbed. |
| Hosting | Vercel |

---

## 4. Payment Architecture

### Provider Stack

| Function | Provider | Status |
|---|---|---|
| Token purchases | Stripe (card only) | ✅ Live (test mode) |
| One-off product/service charge | Stripe | Architecture defined — Phase 2 |
| Recurring payments (ACH + FX + KRW) | Nium | Apply after MSB underway |
| KYC/AML | Persona | Apply during build phase |
| Dwolla | REMOVED | Do not re-approach |
| Airwallex | DECLINED | Not in active pipeline |

### One-Off Payment Model (Direct Card)
```
Product/service cost (KRW → USD at spot rate)
+ Stripe processing fee (~2.9% + $0.30)
+ 2.6% FX exposure buffer
= Total charged to customer card
```
The 2.6% FX buffer belongs entirely to K-Bridge. Earmarked as FX reserve.

### Recurring Payment Model (Nium ACH)
Nium ACH pull from US bank. No card option for recurring. Nium handles USD→KRW FX and KRW local delivery.

### Token Purchase Model (Stripe Only)
Domestic USD transaction. No FX component. 2.6% buffer does NOT apply.

### Service Provider Reimbursement
```
Provider receives:
  Exact KRW product/service cost
  + Service fee share % × (token burn count × $1.70 base value)

K-Bridge retains:
  2.6% FX buffer
  Stripe fee recovery
  Remaining service fee share × (token burn count × $1.70)
```
Token base value: $1.70 fixed. Service fee split configurable per contract (`PartnerOrg.serviceFeeSharePct`). Default 80% to provider.

### Payment Memo Standard
```
Format:  KBRIDGE-[4-char taskId suffix]-[user initials]-[YYYYMM]
Example: KBRIDGE-4F2A-JRS-202503
```

---

## 5. Geographic Verification System

Physical presence outside the United States is the enforcement criterion — not SOFA status.

### Verification Status Model

| Status | How Achieved | Permissions |
|---|---|---|
| `US_BASED` | Default | Inquiry tasks only. DRAFT tasks. Token purchases. No payment tasks. |
| `PENDING_SOFA` | Tier 1: Self-cert + IP geolocation + VPN check | Inquiry + first 5 one-off payments. DRAFT tasks activated. No recurring. |
| `VERIFIED_SOFA` | Tier 2: Command letter (admin reviewed) | Full access — all task types, unlimited payments, recurring. |

> Enum names retain "SOFA" for DB continuity. Internal meaning is geographic.

### Tier 1 — Self-Certification + IP Geolocation + VPN Detection
- User checks in-country self-declaration
- Server runs VPN/proxy/Tor detection — blocks cert if VPN detected
- Server logs IP + geolocation at certification
- Status upgrades to `PENDING_SOFA`

### Tier 2 — Command Letter Only
- K-Bridge downloadable PDF template
- User presents to command for countersignature
- Admin reviews submitted letter → manually approves → `VERIFIED_SOFA`
- **CAC scans are NOT a verification method — permanently removed**

### Database Fields
```
User:
  sofaDeclaration          SofaDeclaration @default(US_BASED)
  pendingSofaPaymentCount  Int @default(0)
  personaInquiryId         String?   (rename from sumsubApplicantId — workaround #133)
  personaVerificationStatus String?  (rename from sumsubVerificationStatus — workaround #133)
  tier2VerificationMethod  String?   (COMMAND_LETTER only)
  tier2VerifiedAt          DateTime?
  ipGeoLoggedAt            DateTime?
  expectedArrivalDate      DateTime?
  arrivedAt                DateTime?
  hashedEmail              String?
```

---

## 6. Token Economy & Engine

All token logic lives in `lib/tokens/engine.ts`.

### What Tokens Are
**Tokens are K-Bridge's service fee currency — not payment currency.**
- Users pay for Korean product/service directly via Stripe or Nium
- Tokens are burned separately as concierge service fee
- Tokens have no FX component — domestic USD product

### Token Split Burn Model (v42 — LOCKED)

Token burn is split across two events:

| Event | Tokens burned |
|---|---|
| Task creation (opener) | 1 token — non-refundable. Support exempt. |
| User confirms token cost quote | 50% of remaining quoted cost (round down on odd) |
| Task completion (partner execution confirmed) | Remaining 50% |

**Examples:**
- 10-token task: 1 opener + 4 at quote confirm + 5 at completion = 10 total
- 5-token task: 1 opener + 2 at quote confirm + 2 at completion = 5 total

**Failed Stripe payment after first burn:** First 50% non-refundable. Second 50% released.

**Partner execution failure (K-Bridge/partner-side):** Full refund — all tokens including opener. Admin-manual for MVP.

**Price re-route charge:** 2 tokens at "Reconfirm Price" tap. Non-refundable. Every re-route.

### Token Open/Escalation Model (v31)

| Constant | Value |
|---|---|
| `TASK_OPEN_COST` | 1 — deducted at creation. Non-refundable. Support exempt. |
| `ESCALATION_UPLIFT` | 3 — additional tokens when user confirms escalation to human |

| Task type | Open | Escalation | Total if escalated |
|---|---|---|---|
| Inquiry | 1 | +3 | 4 |
| One-off payment | 1 | +3 | 4 |
| Recurring setup | 1 | +3 | 4 (10 total with completion) |
| Support | 0 | 0 | 0 |

### Token Pricing

| Purchase Option | Price |
|---|---|
| Single Token | $2.00 |
| Starter Pack | 10 × $1.90 = $19.00 |
| Standard Pack | 25 × $1.80 = $45.00 |
| Value Pack | 50 × $1.70 = $85.00 |

### Token Caps

| Cap | Value |
|---|---|
| Per-purchase | 60 tokens |
| Wallet | 130 tokens |

### Welcome & Referral Bonuses

| Bonus | Amount |
|---|---|
| Welcome | 5 tokens on first signup |
| Referral | 5 tokens to referrer on successful signup |

### Token Burn Schedule (Completion Costs)

| Task Type | Cost |
|---|---|
| RECURRING_SETUP | 10 tokens fixed |
| RECURRING_EXECUTION | 3 tokens fixed |
| ONE_OFF (dynamic) | 2–10 tokens via TaskPricingRule |
| ONE_OFF pioneer | 2 tokens |
| ONE_OFF escalated | 4-token deposit only (0 additional) |
| INQUIRY_SIMPLE | 1 token |
| INQUIRY_RESEARCHED | 3 tokens |
| COMPLEX_MULTI_VENDOR | 25 tokens |
| COMPLEX_MULTI_DOMAIN | 40 tokens |
| EXCEPTIONAL | 50 tokens max |

---

## 7. Database Schema

### Enums

**`SofaDeclaration`:** `US_BASED | PENDING_SOFA | VERIFIED_SOFA`

**`TaskType`:** `RECURRING_SETUP | RECURRING_EXECUTION | ONE_OFF_PAYMENT | SERVICE_BOOKING | INQUIRY | SUPPORT | OTHER`

**`TaskStatus`:** `DRAFT | OPEN | CLARIFYING | AI_PROCESSING | PENDING_HUMAN | PENDING_PARTNER | PENDING_USER | PAYMENT_PENDING | PAYMENT_CONFIRMED | PENDING_PARTNER_EXECUTION | COMPLETE | CANCELLED | FAILED`

> `PAYMENT_CONFIRMED` and `PENDING_PARTNER_EXECUTION` added v4.2b — workaround #138

**`PaymentGateway`:** `NIUM | STRIPE`

**`PaymentRouteType`:** `ACH_RECURRING | DIRECT_CARD | TOKEN_PURCHASE`

### User (key fields)

| Column | Type |
|---|---|
| id | String cuid() |
| email | String unique |
| image | String? — stores bcrypt password hash (workaround #1) |
| sofaDeclaration | SofaDeclaration @default(US_BASED) |
| pendingSofaPaymentCount | Int @default(0) |
| personaInquiryId | String? (rename pending — workaround #133) |
| personaVerificationStatus | String? (rename pending — workaround #133) |
| tier2VerificationMethod | String? (COMMAND_LETTER only) |
| tokenBalance | Int @default(5) |
| stripeCustomerId | String? unique |
| derosDate | DateTime? |
| hashedEmail | String? |
| isPartner | Boolean @default(false) |
| partnerOrgId | String? |
| totalVerifiedSavingsKrw | Decimal @default(0) — post-Partners Portal |
| totalEstimatedSavingsUsd | Decimal @default(0) — post-Partners Portal |

### Task (key fields)

| Column | Type |
|---|---|
| id | String cuid() |
| userId | FK → User |
| type | TaskType |
| status | TaskStatus |
| tokenEstimate | Int? |
| tokenActual | Int? |
| tokenReserved | Int? |
| requiresHuman | Boolean @default(false) |
| isPioneerTask | Boolean @default(false) |
| label | String? |
| assignedEmployeeId | String? |

### PartnerOrg

```prisma
model PartnerOrg {
  id                 String   @id @default(cuid())
  name               String
  type               String   // EXECUTION_PARTNER | VENDOR_AFFILIATE | SERVICE_PROVIDER
  description        String?  // v4.2b
  serviceTagsJson    Json     @default("[]")  // v4.2b — e.g. ["grocery","utilities","transport"]
  contactEmail       String?
  serviceFeeSharePct Float    @default(0.80)
  isActive           Boolean  @default(true)
  createdAt          DateTime @default(now())
  users              User[]
  partnerTasks       PartnerTask[]
}
```

### PartnerTask

```prisma
model PartnerTask {
  id                      String    @id @default(cuid())
  taskId                  String    FK → Task
  partnerOrgId            String    FK → PartnerOrg
  payloadJson             Json      // bilingual structured payload
  status                  String    // PENDING | IN_PROGRESS | CLARIFYING | OUTCOME_SUBMITTED | COMPLETE
  paymentWindowExpiresAt  DateTime? // v4.2b — server-authoritative payment timer
  outcome                 PartnerOutcome?
  messages                PartnerMessage[]
  createdAt               DateTime  @default(now())
}
```

### PartnerOutcome

```prisma
model PartnerOutcome {
  id                   String    @id @default(cuid())
  partnerTaskId        String    unique FK → PartnerTask
  vendorName           String
  originalCostKrw      Decimal?  @db.Decimal(15,0)  // v4.2b — pre-discount
  actualCostKrw        Decimal   @db.Decimal(15,0)
  savingsKrw           Decimal?  @db.Decimal(15,0)  // originalCostKrw - actualCostKrw
  savingsSplitApplied  Boolean   @default(false)
  flaggedForAudit      Boolean   @default(false)
  referenceNumber      String?
  executedAt           DateTime
  receiptDocumentUrl   String?   // internal only — not relayed to customer
  notes                String?   // freeform — triggers reflect-back if populated
  submittedAt          DateTime  @default(now())
  approvedByUserId     String?
  settlementStatus     String    @default("PENDING")
}
```

### TaskPricingRule

```prisma
model TaskPricingRule {
  id          String   @id @default(cuid())
  category    String   @unique
  tokenCost   Int      // 2–10
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Payment (key fields)

| Column | Type |
|---|---|
| gateway | PaymentGateway |
| routeType | PaymentRouteType |
| amountUsd | Decimal |
| fxBufferUsd | Decimal? |
| fxBufferPct | Decimal? |
| amountKrw | Decimal |
| fxRate | Decimal |
| savingsAppliedKrw | Decimal? | // v4.2b — customer 40% savings reduction
| memo | String |

---

## 8. Task State Machine

### Status Definitions (updated v4.2b)

| Status | Description |
|---|---|
| `DRAFT` | Pre-arrival task — not active, not billed |
| `OPEN` | Task created; AI begins clarification |
| `CLARIFYING` | AI actively gathering information |
| `AI_PROCESSING` | AI building proposal |
| `PENDING_HUMAN` | Requires employee action |
| `PENDING_PARTNER` | Routed to Partners Portal queue |
| `PENDING_USER` | Awaiting user confirmation (token cost or payment) |
| `PAYMENT_PENDING` | Payment dispatched to Stripe |
| `PAYMENT_CONFIRMED` | Stripe webhook confirmed — partner may now execute |
| `PENDING_PARTNER_EXECUTION` | Partner alerted, executing purchase |
| `COMPLETE` | Execution confirmed; tokens burned (terminal) |
| `CANCELLED` | Cancelled; token reservation released (terminal) |
| `FAILED` | Gateway or system failure; retriable |

### Valid Transitions (updated v4.2b)

```
DRAFT                    → OPEN, CANCELLED
OPEN                     → CLARIFYING, AI_PROCESSING, PENDING_HUMAN, CANCELLED
CLARIFYING               → AI_PROCESSING, PENDING_HUMAN, CANCELLED
AI_PROCESSING            → PENDING_USER, PENDING_HUMAN, PENDING_PARTNER, CANCELLED
PENDING_HUMAN            → AI_PROCESSING, PENDING_USER, CANCELLED, FAILED
PENDING_PARTNER          → AI_PROCESSING, PENDING_USER, CANCELLED
PENDING_USER             → PAYMENT_PENDING, AI_PROCESSING, CANCELLED
PAYMENT_PENDING          → PAYMENT_CONFIRMED, FAILED
PAYMENT_CONFIRMED        → PENDING_PARTNER_EXECUTION, FAILED
PENDING_PARTNER_EXECUTION → COMPLETE, FAILED
COMPLETE                 → (terminal)
CANCELLED                → (terminal)
FAILED                   → AI_PROCESSING, CANCELLED
```

---

## 9. Partners Portal

### Overview
K-Bridge operates as a SaaS platform. KKB (K-Bridge Korea) is the first execution partner.

### Design Decisions (Locked)

| Decision | Choice |
|---|---|
| URL | `mykbridge.com/partners` — route group in existing Next.js app |
| Auth | `isPartner Boolean` + `partnerOrgId String?` on User |
| Partner UI language | **Korean-first throughout** |
| Task delivery | Web portal queue — no API push for MVP |
| Communication routing | All partner ↔ user comms through AI — no direct contact |
| Payload format | Bilingual JSON: `instruction.en` + `instruction.ko` |
| Partner input | Structured outcome form primary; freeform notes secondary |
| Reflect-back rule | Explicit confirmation card at every translation boundary. Structured fields bypass. Notes triggers it. |
| Confirmation iterations | Max 3 rounds before admin escalation |
| Partner token visibility | Partners NEVER see token costs |

### AI Reflect-Before-Translate Rule (v42 — LOCKED)

At every translation boundary, AI summarises and reflects content back to the originating party via explicit confirmation card before translating and relaying. Applies in both directions:

- Partner (Korean) → AI reflects to partner in Korean → confirmed → translated to English for user
- User (English) → AI reflects to user in English → confirmed → translated to Korean for partner
- Employee instruction → AI reflects to employee → confirmed → bilingual payload generated

**Exception:** Structured partner outcome form fields bypass reflect-back. Notes field triggers it if populated.

### Full Payment Flow (v42 — LOCKED)

```
1.  User explains task
2.  AI collects details
3.  AI or employee quotes token cost
4.  User confirms token cost → FIRST TOKEN BURN (50%, round down)
5.  AI alerts partner (bilingual payload)
6.  Partner retrieves price, finds savings if applicable
7.  AI relays price to user via payment card in chat
8.  Payment card shows 15-minute countdown timer
9.  User pays via Stripe
10. Stripe webhook confirms → PAYMENT_CONFIRMED status
11. "Payment confirmed" message shown to user
12. Partner receives execution alert card
13. Partner executes, submits structured outcome form
14. AI informs user of completion + savings info
15. SECOND TOKEN BURN (remaining 50%)
16. COMPLETE
```

### Payment Card — Three UI States (v42)

**State 1 — Active:**
- Task summary + amount (savings-adjusted)
- 15-minute countdown timer
- "Pay Now" → Stripe Checkout
- Pulsing indicator on dashboard task card

**State 2 — Expired:**
- "Price window expired" message
- "Reconfirm Price" button
- Text: *"Requesting a fresh price confirmation will cost 2 additional tokens. Your balance: X tokens."*
- Task dormant until user re-engages

**State 3 — Processing**

### Partner Outcome Structured Form (v42 — LOCKED)

| Field | Type | Notes |
|---|---|---|
| Vendor name | Text | Pre-filled from payload |
| Original price (KRW) | Decimal | Pre-discount — feeds savings calc |
| Actual amount paid (KRW) | Decimal | |
| Payment reference | Text | |
| Execution date/time | DateTime | Defaults to now |
| Receipt / proof | File upload | Required — internal only |
| Notes | Text optional | Triggers reflect-back if populated |

### Savings Relay (v42 — LOCKED)

- Receipt is internal only — not relayed to customer
- K-Bridge generates separate customer task receipt
- Customer sees their **40% savings share only**, framed as a benefit
- Example: *"Your K-Bridge saving on this order: ₩8,000"*
- No disclosure of original price, full savings, or split structure
- Savings applied as reduction **at Stripe checkout** — discounted amount shown on payment card

### Partner Execution Gate (v42)

`POST /api/partner/tasks/[id]/outcome` rejects with 403 unless `task.status === PAYMENT_CONFIRMED`.

### Task Payload Schema

```json
{
  "taskId": "clx4abc123",
  "type": "ONE_OFF_PAYMENT",
  "instruction": {
    "en": "Pay the user's KT internet bill for April.",
    "ko": "사용자의 4월 KT 인터넷 요금을 납부해 주세요."
  },
  "requiredAction": {
    "vendor": "KT Corporation",
    "estimatedAmountKRW": 55000,
    "dueDateKST": "2026-04-05"
  },
  "context": {
    "userFirstName": "James",
    "notes": "Bill may be slightly higher due to overage."
  },
  "tokenBudget": {
    "authorised": 12,
    "costIfCompleted": 12
  },
  "partnerResponse": {
    "status": "PENDING",
    "clarificationRequests": [],
    "outcome": null
  }
}
```

---

## 10. DEROS Lifecycle

| Days Relative to DEROS | Action |
|---|---|
| DEROS - 45 days | In-app banner + email |
| DEROS - 14 days | Second outreach |
| DEROS date | All active recurrings paused |
| DEROS + 5 business days | Recurrings cancelled, account frozen |
| DEROS + 45 days | Account soft-deleted |

---

## 11. AI Integration

| Setting | Value |
|---|---|
| Provider | Anthropic |
| Model | `claude-sonnet-4-20250514` |
| SDK | `@anthropic-ai/sdk ^0.27.0` |
| Streaming | Full streaming via ReadableStream |

### AI Functions

| Function | Location | Status |
|---|---|---|
| `estimateTokenCost()` | `lib/ai/chat.ts` | ✅ Built |
| `draftKoreanSms()` | `lib/ai/chat.ts` | ✅ Built |
| `getPricingRulesPrompt()` | `lib/ai/chat.ts` | ✅ Built v38 |
| `generateTaskPayload()` | `lib/ai/partner.ts` | 🔴 Needed |
| `verifyPartnerClarification()` | `lib/ai/partner.ts` | 🔴 Needed |
| `translateToUser()` | `lib/ai/partner.ts` | 🔴 Needed |
| `verifyUserResponse()` | `lib/ai/partner.ts` | 🔴 Needed |
| `translateToPartner()` | `lib/ai/partner.ts` | 🔴 Needed |
| `reflectBeforeRelay()` | `lib/ai/partner.ts` | 🔴 Needed — reusable reflect-back prompt |

---

## 12. Admin Portal

| Route | Status |
|---|---|
| `/admin/queue` | ✅ Built |
| `/admin/tasks` | ✅ Built |
| `/admin/tasks/[id]` | ✅ Built |
| `/admin/users` | ✅ Built |
| `/admin/users/[id]` | ✅ Built |
| `/admin/vendors` | ✅ Built |
| `/admin/vendors/[id]` | ✅ Built |
| `/admin/employees` | ✅ Built |
| `/admin/employees/[id]` | ✅ Built |
| `/admin/prices` | ✅ Built |
| `/admin/pricing-rules` | ✅ Built v38 |
| `/admin/pioneer-tasks` | ✅ Built v38 |
| `/admin/partner-orgs` | 🔴 Not yet built |
| Admin promotion code management | 🔴 Not yet built |
| Admin token grant (direct bonus) | 🔴 Not yet built |

---

## 13. Development Build Status

### What Is Built (v38 — March 29, 2026)
- Auth + onboarding, signup, referral codes, SOFA/DEROS/consent ✅
- Dashboard, task chat (streaming AI), token purchase, My Tasks, Recurring ✅
- Chat signals: `[TASK_COMPLETE]`, `[ESCALATE_OFFER]`, `[ESCALATE_TO_HUMAN]` ✅
- Admin portal: all routes listed above ✅
- Token model v31: 1-token opener, escalation uplift, Support free ✅
- Pioneer tasks + dynamic pricing (TaskPricingRule) ✅
- Landing page ✅
- Git repo initialised, commits pushed ✅

### Next Build Priority

**Partners Portal** — all DB models deployed, design locked. Build order:

1. Schema push — `PAYMENT_CONFIRMED` enum + `PartnerOrg` fields + `PartnerTask.paymentWindowExpiresAt`
2. Route group scaffold `app/(partner)/partners/`
3. Layout + auth guard (isPartner)
4. Partner task queue (Korean UI)
5. Partner task detail (Korean UI)
6. Reflect-back confirmation card component (reusable)
7. Clarification flow
8. Structured outcome form
9. Payment card component (3 states + countdown timer)
10. Stripe payment intent with savings reduction
11. Partner execution alert card
12. Admin PartnerOrg management
13. "Route to Partner" modal on admin task detail
14. `lib/ai/partner.ts` — all AI functions
15. API routes

---

## 14. Environment Variables

### Currently Set (values in .env / .env.local — not in this file)
- `DATABASE_URL` — Supabase transaction pooler (port 6543)
- `DIRECT_URL` — Supabase direct connection (port 5432)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` — `claude-sonnet-4-20250514`
- `STRIPE_SECRET_KEY` — test mode
- `STRIPE_PUBLISHABLE_KEY` — test mode
- `STRIPE_PRICE_SINGLE`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_STANDARD`, `STRIPE_PRICE_VALUE`
- `STRIPE_WEBHOOK_SECRET` — local CLI (replace before deploy)
- `NEXT_PUBLIC_APP_URL`
- `FX_BUFFER_PCT` — 0.026
- `TOKEN_PURCHASE_CAP` — 60
- `TOKEN_WALLET_CAP` — 130
- `WELCOME_BONUS_TOKENS` — 5

### To Be Added (Phase 2)
- `NIUM_API_KEY`, `NIUM_CLIENT_HASH_ID`
- `PERSONA_API_KEY`, `PERSONA_WEBHOOK_SECRET`
- `VPN_DETECTION_API_KEY`
- `TWILIO_*`
- `RESEND_API_KEY`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `CRON_SECRET` — before Vercel deployment

---

## 15. Brand Tokens

| Token | Value |
|---|---|
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
| Logo | `public/logo.png` — transparent PNG |

---

## 16. Key Workarounds Summary

See full workarounds log in SESSION_HANDOVER_v42_SAFE.md. Critical items for next build session:

| # | Item | Priority |
|---|---|---|
| 138 | Add PAYMENT_CONFIRMED to TaskStatus enum | 🔴 Before build |
| 139 | Partner outcome endpoint 403 gate | 🔴 Before build |
| 140 | Server-authoritative payment timer timestamp | HIGH |
| 144 | Split burn — two burnTokens() calls with ledger entries | HIGH |
| 146 | Savings reduction at Stripe checkout — gate on partner outcome | HIGH |
| 132 | Prisma v5 → v7 upgrade — do NOT mid-build | Medium |
| 15 | STRIPE_WEBHOOK_SECRET replace before Vercel deploy | HIGH |
| 133 | sumsubApplicantId → personaInquiryId rename | Medium |

---

*K-Bridge Platform — Technical Specification v4.2 (sanitised) — CONFIDENTIAL*
*Last updated: April 2, 2026*
