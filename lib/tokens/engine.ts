import { db } from "@/lib/db";
import { TokenTxType } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN BURN SCHEDULE — REVISED v31
// Authoritative cost definitions — always reference these, never hardcode.
//
// MODEL: 1 token deducted at task creation (non-refundable deposit, credited
// toward final service fee). SUPPORT tasks are always free (0 tokens).
// Escalation to a human employee costs ESCALATION_UPLIFT additional tokens,
// shown to user via confirmation card before deduction.
//
// Completion costs below are ADDITIONAL tokens burned at task close,
// after the opening deposit has already been deducted.
// Total cost = TASK_OPEN_COST + completion cost shown here.
// ─────────────────────────────────────────────────────────────────────────────

/** Non-refundable deposit burned at task creation. Credited toward service fee.
 *  Exception: SUPPORT tasks cost 0 tokens to open. */
export const TASK_OPEN_COST = 1;

/** Additional tokens charged when user confirms escalation to a human employee.
 *  Shown on confirmation card before deduction.
 *  Total deposit on escalation = TASK_OPEN_COST + ESCALATION_UPLIFT = 4. */
export const ESCALATION_UPLIFT = 3;

export const TOKEN_COSTS = {
  // Recurring payments
  // Total: 1 (open) + 9 (completion) = 10
  RECURRING_SETUP:              9,   // Additional tokens at completion (opener already burned)
  RECURRING_EXECUTION:          3,   // Each subsequent auto-run (no opener — system-initiated)
  // One-off payments — total = 1 (open) + value below
  ONE_OFF_AI_ONLY:              4,   // AI handles fully, no human call (total: 5)
  ONE_OFF_WITH_HUMAN_CALL:      11,  // Employee makes one call (total: 12)
  // Traffic tickets
  TRAFFIC_TICKET_STANDARD:      7,   // OCR + employee verify (total: 8)
  TRAFFIC_TICKET_MULTIPLE:      17,  // Multiple tickets found (total: 18)
  // Inquiries — opener covers simple inquiry, no additional burn
  INQUIRY_SIMPLE:               0,   // No additional burn (total: 1)
  INQUIRY_RESEARCHED:           2,   // Multi-source research (total: 3)
  // Support — always free at every stage
  SUPPORT:                      0,   // Never charges tokens
  // Complex coordination
  COMPLEX_MULTI_VENDOR:         24,  // Multiple vendors, one domain (total: 25)
  COMPLEX_MULTI_DOMAIN:         39,  // Multiple vendors, multiple domains (total: 40)
  // Rare maximum
  EXCEPTIONAL:                  49,  // Extreme coordination effort (total: 50)
} as const;

// Estimate ranges shown to user (min, max) — TOTAL costs including opener
export const TOKEN_ESTIMATE_RANGES: Record<string, [number, number]> = {
  RECURRING_SETUP:          [10, 10],
  RECURRING_EXECUTION:      [3,  3],
  ONE_OFF_PAYMENT:          [5,  20],
  TRAFFIC_TICKET:           [8,  25],
  INQUIRY:                  [1,  3],
  SERVICE_BOOKING:          [8,  20],
  SUPPORT:                  [0,  0],
  OTHER:                    [5,  50],
};
// ─────────────────────────────────────────────────────────────────────────────
// TOKEN PACK DEFINITIONS — REVISED v4.0
// Prices: Single $2.00 | Starter 10×$1.90=$19 | Standard 25×$1.80=$45 | Value 50×$1.70=$85
// ─────────────────────────────────────────────────────────────────────────────
export const TOKEN_PACKS = [
  {
    id:            "single",
    label:         "Single Token",
    tokens:        1,
    priceUsd:      2.00,
    pricePerToken: 2.00,
    stripePriceId: process.env.STRIPE_PRICE_SINGLE!,
  },
  {
    id:            "starter",
    label:         "Starter",
    tokens:        10,
    priceUsd:      19.00,
    pricePerToken: 1.90,
    stripePriceId: process.env.STRIPE_PRICE_STARTER!,
  },
  {
    id:            "standard",
    label:         "Standard",
    tokens:        25,
    priceUsd:      45.00,
    pricePerToken: 1.80,
    stripePriceId: process.env.STRIPE_PRICE_STANDARD!,
    popular:       true,
  },
  {
    id:            "value",
    label:         "Value",
    tokens:        50,
    priceUsd:      85.00,
    pricePerToken: 1.70,
    stripePriceId: process.env.STRIPE_PRICE_VALUE!,
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN ECONOMY CONSTANTS — REVISED v4.0
// ─────────────────────────────────────────────────────────────────────────────
/** Welcome bonus on first signup (v4.0: 5, was 8) */
export const WELCOME_BONUS = 5;
/** Referral bonus credited to referrer on successful signup (v4.0: 5, was 3) */
export const REFERRAL_REWARD = 5;
/** Base value of 1 token for service provider reimbursement calculations.
 *  Fixed at $1.70 (lowest pack per-token rate) regardless of what customer paid.
 *  Used as: tokenBurn × TOKEN_BASE_VALUE × serviceFeeSharePct = provider service fee */
export const TOKEN_BASE_VALUE = 1.70;
/** Maximum tokens purchasable in a single transaction (protects against accidental over-purchase) */
export const TOKEN_PURCHASE_CAP = parseInt(process.env.TOKEN_PURCHASE_CAP ?? "60");
/** Maximum tokens a wallet can hold at any time (protects against unintended accumulation) */
export const TOKEN_WALLET_CAP = parseInt(process.env.TOKEN_WALLET_CAP ?? "130");

// ─────────────────────────────────────────────────────────────────────────────
// CORE ENGINE FUNCTIONS
// All token mutations go through these functions — never write directly to
// the users.tokenBalance field without also creating a ledger entry.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a user has enough tokens for a task.
 * Does NOT deduct — use reserveTokens or burnTokens for that.
 */
export async function hasEnoughTokens(
  userId: string,
  amount: number
): Promise<boolean> {
  const user = await db.user.findUnique({
    where:  { id: userId },
    select: { tokenBalance: true },
  });
  return (user?.tokenBalance ?? 0) >= amount;
}

/**
 * Reserve tokens at task creation (non-refundable deposit).
 * Burns TASK_OPEN_COST immediately. Remainder reserved against final burn.
 */
export async function reserveTokens(
  userId: string,
  taskId: string,
  amount: number,
  description: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where:  { id: userId },
      select: { tokenBalance: true },
    });
    if (!user || user.tokenBalance < amount) {
      return { success: false, newBalance: user?.tokenBalance ?? 0, error: 'Insufficient tokens' };
    }

    const newBalance = user.tokenBalance - amount;

    await tx.user.update({
      where: { id: userId },
      data:  { tokenBalance: newBalance },
    });

    await tx.tokenLedger.create({
      data: {
        userId,
        taskId,
        txType:       TokenTxType.RESERVATION,
        amount:       -amount,
        balanceAfter: newBalance,
        description,
      },
    });

    await tx.task.update({
      where: { id: taskId },
      data:  { tokenReserved: amount },
    });

    return { success: true, newBalance };
  });
}

/**
 * Burn tokens at task completion (confirms the reservation).
 * If actual burn < reservation, refunds the difference.
 * NOTE: Must only be called AFTER payment/purchase is fully confirmed complete (v4.0 rule).
 */
export async function burnTokens(
  userId: string,
  taskId: string,
  actualAmount: number,
  description: string
): Promise<void> {
  await db.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where:  { id: taskId },
      select: { tokenReserved: true },
    });

    const reserved   = task?.tokenReserved ?? actualAmount;
    const difference = reserved - actualAmount;

    const user = await tx.user.findUnique({
      where:  { id: userId },
      select: { tokenBalance: true },
    });

    // If actual burn < reservation, refund the difference
    const adjustedBalance = (user?.tokenBalance ?? 0) + difference;

    if (difference > 0) {
      await tx.user.update({
        where: { id: userId },
        data:  { tokenBalance: adjustedBalance },
      });
    }

    await tx.tokenLedger.create({
      data: {
        userId,
        taskId,
        txType:       TokenTxType.BURN,
        amount:       -actualAmount,
        balanceAfter: adjustedBalance,
        description,
      },
    });

    await tx.task.update({
      where: { id: taskId },
      data:  {
        tokenActual:   actualAmount,
        tokenReserved: 0,
      },
    });
  });
}

/**
 * Release a token reservation on task cancellation.
 */
export async function releaseReservation(
  userId: string,
  taskId: string,
  description: string = "Reservation released — task cancelled"
): Promise<void> {
  await db.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where:  { id: taskId },
      select: { tokenReserved: true },
    });

    const reserved = task?.tokenReserved ?? 0;
    if (reserved === 0) return;

    const user = await tx.user.findUnique({
      where:  { id: userId },
      select: { tokenBalance: true },
    });

    const newBalance = (user?.tokenBalance ?? 0) + reserved;

    await tx.user.update({
      where: { id: userId },
      data:  { tokenBalance: newBalance },
    });

    await tx.tokenLedger.create({
      data: {
        userId,
        taskId,
        txType:       TokenTxType.RESERVATION_RELEASE,
        amount:       reserved,
        balanceAfter: newBalance,
        description,
      },
    });

    await tx.task.update({
      where: { id: taskId },
      data:  { tokenReserved: 0 },
    });
  });
}

/**
 * Credit tokens (purchase, bonus, admin adjustment).
 * Enforces TOKEN_WALLET_CAP — returns error if cap would be exceeded.
 * Admin grants skip the cap check (pass skipCapCheck: true).
 */
export async function creditTokens(
  userId:       string,
  amount:       number,
  txType:       TokenTxType,
  description:  string,
  taskId?:      string,
  skipCapCheck: boolean = false
): Promise<{ success: boolean; newBalance: number; cappedAt?: number }> {
  return await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where:  { id: userId },
      select: { tokenBalance: true },
    });

    const currentBalance = user?.tokenBalance ?? 0;
    const newBalance     = currentBalance + amount;

    // Enforce wallet cap (admin grants warn but can override via skipCapCheck)
    if (!skipCapCheck && newBalance > TOKEN_WALLET_CAP) {
      return { success: false, newBalance: currentBalance, cappedAt: TOKEN_WALLET_CAP };
    }

    await tx.user.update({
      where: { id: userId },
      data:  { tokenBalance: newBalance },
    });

    await tx.tokenLedger.create({
      data: {
        userId,
        taskId:       taskId ?? null,
        txType,
        amount,
        balanceAfter: newBalance,
        description,
      },
    });

    return { success: true, newBalance };
  });
}
