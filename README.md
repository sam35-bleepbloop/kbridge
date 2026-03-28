# K-Bridge

Concierge and payment facilitator for U.S. SOFA-status personnel in South Korea.

---

## Quick start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env.local
# Fill in all values — see comments in .env.example
```

### 3. Set up the database (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your connection strings into `.env.local`
3. Run the initial migration:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Add your logo
Place your logo file at `public/logo.png` (the K-Bridge circular logo).

### 5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database commands

```bash
npm run db:migrate    # Run migrations
npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:studio     # Open Prisma Studio (visual DB browser)
npm run db:push       # Push schema changes without creating a migration (dev only)
```

---

## Project structure

```
kbridge/
├── app/
│   ├── (user)/           # Authenticated user area
│   │   ├── dashboard/    # Main dashboard
│   │   ├── tasks/[id]/   # Chat interface per task
│   │   ├── recurring/    # Recurring payment management
│   │   └── tokens/       # Token pack purchase
│   ├── (admin)/          # Employee + admin area
│   │   ├── queue/        # Task assignment queue
│   │   └── vendors/      # Vendor database
│   └── api/              # API routes
│       ├── ai/chat/      # Streaming AI chat
│       ├── tasks/        # Task CRUD
│       ├── tokens/       # Token purchase + balance
│       ├── recurring/    # Recurring management
│       ├── cron/         # Daily scheduled jobs
│       └── webhooks/     # Stripe, Dwolla, Wise
├── components/
│   ├── layout/           # Sidebar, headers
│   └── dashboard/        # Dashboard cards and widgets
├── lib/
│   ├── ai/               # Claude API integration + prompts
│   ├── payments/         # Gateway orchestration + fee calc
│   ├── tokens/           # Token engine (reserve/burn/credit)
│   ├── tasks/            # State machine
│   ├── recurring/        # Scheduler + cron logic
│   └── notifications/    # Email, SMS (to implement)
├── prisma/
│   └── schema.prisma     # Database schema (source of truth)
├── types/                # TypeScript type extensions
└── middleware.ts          # Route protection
```

---

## External services to configure

| Service | Purpose | Notes |
|---------|---------|-------|
| Supabase | Database + auth storage | Start here |
| Google Cloud | OAuth + Calendar API | Enable Calendar API in console |
| Anthropic | AI chat engine | Get API key from console.anthropic.com |
| Stripe | Token pack purchases | Create prices in dashboard |
| Twilio | Korean SMS | Needs international SMS capability |
| Dwolla | US ACH payments | 4–8 week approval — apply now |
| Wise | Cross-border FX | Apply alongside Dwolla |
| Adyen/Tazapay | Card/wallet payments | Decision pending between the two |

---

## Phase 1 checklist (weeks 1–4)

- [ ] Install dependencies and confirm build passes
- [ ] Connect Supabase and run initial migration
- [ ] Configure Google OAuth and test login
- [ ] Add Anthropic API key and test chat endpoint
- [ ] Place `public/logo.png`
- [ ] Test full flow: signup → welcome tokens → create task → chat
- [ ] Deploy to Vercel (preview environment)
- [ ] Apply for Dwolla partner account (runs in parallel)
- [ ] Apply for Wise business API access (runs in parallel)

---

## Token economy

| Pack | Tokens | Price |
|------|--------|-------|
| Starter | 10 | $15.00 |
| Standard | 25 | $37.50 |
| Value | 50 | $75.00 |

New users receive **8 free welcome tokens** on signup.

| Task type | Token cost |
|-----------|-----------|
| Recurring setup | 10 (fixed) |
| Recurring execution | 3 (fixed) |
| One-off payment (AI only) | 5–8 |
| One-off payment (human call) | 10–20 |
| Traffic ticket | 8–25 |
| Inquiry | 1–3 |

---

## Payment fees

| Route | Fee | Minimum |
|-------|-----|---------|
| Bank (Dwolla → Wise) | 1.5% | $5.00 |
| Card/wallet (Adyen/Tazapay) | 4.0% | $5.00 |

Fees are always displayed to the user before they confirm payment.

---

## Cron job

The daily cron runs at **06:00 KST** (21:00 UTC previous day) via Vercel Cron:

1. Alerts users with low tokens if a recurring payment is due within 5 days
2. Executes all due recurring payments

Configure `CRON_SECRET` in Vercel environment variables and add to `.env.local`.
