-- K-Bridge Knowledge Base migration
-- Run in Supabase SQL Editor BEFORE running npx prisma db push

CREATE TABLE IF NOT EXISTS "KnowledgeEntry" (
  "id"          TEXT NOT NULL,
  "category"    TEXT NOT NULL,   -- PRICING | PROCESS | SERVICE_SCOPE | VENDOR | LOCAL_INFO | POLICY
  "title"       TEXT NOT NULL,
  "content"     TEXT NOT NULL,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "appliesTo"   TEXT,            -- e.g. 'phone', 'transport', 'utilities', 'general'
  "source"      TEXT,            -- e.g. 'SK Telecom storefront, personal verification'
  "verifiedAt"  TIMESTAMP(3),
  "expiresAt"   TIMESTAMP(3),
  "createdById" TEXT NOT NULL,   -- employeeId who added it
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- Index for fast active-entry lookups (main query pattern at chat time)
CREATE INDEX IF NOT EXISTS "KnowledgeEntry_isActive_idx" ON "KnowledgeEntry"("isActive");
CREATE INDEX IF NOT EXISTS "KnowledgeEntry_appliesTo_idx" ON "KnowledgeEntry"("appliesTo");
CREATE INDEX IF NOT EXISTS "KnowledgeEntry_category_idx" ON "KnowledgeEntry"("category");

-- Auto-update updatedAt on row change
CREATE OR REPLACE FUNCTION update_knowledge_entry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS knowledge_entry_updated_at ON "KnowledgeEntry";
CREATE TRIGGER knowledge_entry_updated_at
  BEFORE UPDATE ON "KnowledgeEntry"
  FOR EACH ROW EXECUTE FUNCTION update_knowledge_entry_updated_at();

-- Seed: K-Bridge-specific knowledge entries to replace bad AI assumptions
-- Replace 'SYSTEM' with your actual admin employee ID after seeding

INSERT INTO "KnowledgeEntry" ("id", "category", "title", "content", "isActive", "appliesTo", "source", "verifiedAt", "createdById")
VALUES
  (
    'kb_seed_001',
    'SERVICE_SCOPE',
    'Korean bank account not required',
    'K-Bridge handles all Korean payments on behalf of users. Users do NOT need a Korean bank account for any service K-Bridge offers. A passport is sufficient identification for most services (phone contracts, utility setup, vendor payments). K-Bridge pays Korean vendors directly via our contracted accounts. Never tell users they need a Korean bank account — we handle that entirely.',
    true,
    'general',
    'K-Bridge policy',
    CURRENT_TIMESTAMP,
    'SYSTEM'
  ),
  (
    'kb_seed_002',
    'SERVICE_SCOPE',
    'ARC (Alien Registration Card) not required',
    'Users do NOT need an Alien Registration Card (ARC / 외국인등록증) to use K-Bridge services. A US passport or military ID is sufficient. For phone contracts specifically, most carriers and all MVNO plans accept a passport. K-Bridge staff handle the Korean-language paperwork — users just need to provide their passport number.',
    true,
    'general',
    'K-Bridge policy',
    CURRENT_TIMESTAMP,
    'SYSTEM'
  ),
  (
    'kb_seed_003',
    'PRICING',
    'Off-base vs on-base phone plans — pricing comparison',
    'OFF-BASE KOREAN CARRIERS (as of March 2026): KT basic plans start around ₩29,900/month. SK Telecom basic starts around ₩33,000/month. LG U+ similar range. Off-base plans typically offer better coverage on base and throughout Korea than US carriers with roaming. ON-BASE (AAFES/NEX): US-based plans with Korea coverage typically run approximately $95–105/month USD. OFF-BASE IS SIGNIFICANTLY CHEAPER for most users. K-Bridge can help set up and pay off-base phone bills — users never need to manage Korean billing portals themselves.',
    true,
    'phone',
    'Personal verification, March 2026',
    CURRENT_TIMESTAMP,
    'SYSTEM'
  ),
  (
    'kb_seed_004',
    'PROCESS',
    'Phone contract setup process',
    'For new phone plan setup: (1) User provides passport number and desired plan/carrier. (2) K-Bridge Korean team contacts carrier directly or visits MVNO store. (3) SIM delivered to user or available for pickup. (4) Monthly bill payment handled automatically by K-Bridge. No ARC required for MVNO plans. Major carrier contracts (SK, KT, LG) may require in-person visit with passport — K-Bridge staff can accompany or handle on behalf. K-Bridge pays monthly bills — user never needs to interact with Korean billing system.',
    true,
    'phone',
    'K-Bridge operational process',
    CURRENT_TIMESTAMP,
    'SYSTEM'
  ),
  (
    'kb_seed_005',
    'SERVICE_SCOPE',
    'What K-Bridge can and cannot help with',
    'K-Bridge CAN help with: (1) Paying Korean bills — utilities (전기, 가스, 수도), phone plans, internet, rent, traffic fines, daycare, government fees. (2) Setting up Korean services — phone contracts, utility accounts, any service requiring Korean language or payment. (3) Coordination with Korean vendors — price quotes, scheduling, Korean-language communication. (4) Recurring payment automation — rent, phone, utilities set up once and handled monthly. K-Bridge CANNOT help with: Real-time information lookups (movie times, store hours, live schedules), general tourism or restaurant recommendations, emergency services, anything requiring the user to be physically present without any K-Bridge involvement.',
    true,
    'general',
    'K-Bridge policy',
    CURRENT_TIMESTAMP,
    'SYSTEM'
  )
ON CONFLICT ("id") DO NOTHING;
