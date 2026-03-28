-- ─────────────────────────────────────────────────────────────────────────────
-- K-Bridge v4.0 Enum Migration
-- Run this in Supabase SQL Editor BEFORE running `npx prisma db push`
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── STEP 1: SofaDeclaration ─────────────────────────────────────────────────
-- Rename existing enum values on all User rows before the enum is changed.
-- Old: PENDING | VERIFIED | DECLINED
-- New: US_BASED | PENDING_SOFA | VERIFIED_SOFA

-- Add new enum values to the existing type first
ALTER TYPE "SofaDeclaration" ADD VALUE IF NOT EXISTS 'US_BASED';
ALTER TYPE "SofaDeclaration" ADD VALUE IF NOT EXISTS 'PENDING_SOFA';
ALTER TYPE "SofaDeclaration" ADD VALUE IF NOT EXISTS 'VERIFIED_SOFA';

-- Migrate existing row data to new values
UPDATE "User" SET "sofaDeclaration" = 'PENDING_SOFA'  WHERE "sofaDeclaration" = 'VERIFIED';
UPDATE "User" SET "sofaDeclaration" = 'US_BASED'      WHERE "sofaDeclaration" IN ('PENDING', 'DECLINED');

-- NOTE: Postgres does not allow dropping enum values directly.
-- The old values (PENDING, VERIFIED, DECLINED) will remain in the enum type
-- but will no longer be used by any row. They are harmless dead values.
-- If you need them fully removed in future, use the create-new-type swap method.

-- ─── STEP 2: PaymentGateway ──────────────────────────────────────────────────
-- Old: DWOLLA | WISE | ADYEN | TAZAPAY | STRIPE
-- New: NIUM | STRIPE

ALTER TYPE "PaymentGateway" ADD VALUE IF NOT EXISTS 'NIUM';

-- Migrate any existing Payment rows (likely none in test, but safe to run)
UPDATE "Payment" SET "gateway" = 'STRIPE' WHERE "gateway" IN ('DWOLLA', 'WISE', 'ADYEN', 'TAZAPAY');

-- ─── STEP 3: PaymentRouteType ────────────────────────────────────────────────
-- Old: BANK | CARD_WALLET
-- New: ACH_RECURRING | DIRECT_CARD | TOKEN_PURCHASE

ALTER TYPE "PaymentRouteType" ADD VALUE IF NOT EXISTS 'ACH_RECURRING';
ALTER TYPE "PaymentRouteType" ADD VALUE IF NOT EXISTS 'DIRECT_CARD';
ALTER TYPE "PaymentRouteType" ADD VALUE IF NOT EXISTS 'TOKEN_PURCHASE';

-- Migrate existing Payment rows
UPDATE "Payment"   SET "routeType" = 'ACH_RECURRING' WHERE "routeType" = 'BANK';
UPDATE "Payment"   SET "routeType" = 'DIRECT_CARD'   WHERE "routeType" = 'CARD_WALLET';

-- Migrate existing Recurring rows (gateway column uses PaymentRouteType)
UPDATE "Recurring" SET "gateway"   = 'ACH_RECURRING' WHERE "gateway"   = 'BANK';
UPDATE "Recurring" SET "gateway"   = 'DIRECT_CARD'   WHERE "gateway"   = 'CARD_WALLET';

-- ─── STEP 4: TaskStatus ──────────────────────────────────────────────────────
-- Adding new values only — no data migration needed.
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'PENDING_PARTNER';

-- ─── DONE ─────────────────────────────────────────────────────────────────────
-- After running this script successfully, run in your terminal:
--   npx prisma db push
--   npx prisma generate
-- ─────────────────────────────────────────────────────────────────────────────
