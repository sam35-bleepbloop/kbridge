import { db } from "@/lib/db";
import { PaymentRouteType, PaymentGateway } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { TOKEN_BASE_VALUE } from "@/lib/tokens/engine";

// ─────────────────────────────────────────────────────────────────────────────
// FEE CONSTANTS — REVISED v4.0
// Replaces old BANK_ROUTE_FEE / CARD_ROUTE_FEE / MIN_FEE_USD model.
// ─────────────────────────────────────────────────────────────────────────────

/** Stripe card processing fee: 2.9% + $0.30 flat */
const STRIPE_PCT    = 0.029;
const STRIPE_FLAT   = 0.30;

/** FX exposure buffer for direct card payments: 2.6% of product amount.
 *  Protects K-Bridge during the ~3-day Stripe settlement window (USD/KRW drift).
 *  Historical: worst-case 3-day drift ~4.4%, average ~1.5%, buffer set at 2.6%.
 *  Configurable via env var for easy adjustment based on live data. */
const FX_BUFFER_PCT = parseFloat(process.env.FX_BUFFER_PCT ?? "0.026");

// ─────────────────────────────────────────────────────────────────────────────
// FEE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the 2.6% FX buffer on a product amount (DIRECT_CARD payments only).
 * This buffer belongs entirely to K-Bridge — never shared with service provider.
 */
export function calculateFxBuffer(productAmountUsd: number): number {
  return Math.round(productAmountUsd * FX_BUFFER_PCT * 100) / 100;
}

/**
 * Calculate Stripe processing fee on a given amount.
 * Returns fee only — caller adds to product amount for total charged.
 */
export function calculateStripeFee(amountUsd: number): number {
  return Math.round((amountUsd * STRIPE_PCT + STRIPE_FLAT) * 100) / 100;
}

/**
 * Calculate the total amount to charge to the user's card for a direct card payment.
 * Formula: productAmountUsd + stripeFee(productAmountUsd + fxBuffer) + fxBuffer
 * Stripe fee is calculated on the full charge amount (product + buffer).
 */
export function calculateDirectCardTotal(productAmountUsd: number): {
  productAmountUsd: number;
  fxBufferUsd:      number;
  fxBufferPct:      number;
  stripeFeeUsd:     number;
  totalChargedUsd:  number;
} {
  const fxBufferUsd    = calculateFxBuffer(productAmountUsd);
  const subtotal       = productAmountUsd + fxBufferUsd;
  const stripeFeeUsd   = calculateStripeFee(subtotal);
  const totalChargedUsd = Math.round((subtotal + stripeFeeUsd) * 100) / 100;

  return {
    productAmountUsd,
    fxBufferUsd,
    fxBufferPct: FX_BUFFER_PCT,
    stripeFeeUsd,
    totalChargedUsd,
  };
}

/**
 * Calculate the service provider's reimbursement service fee.
 * Formula: tokenBurn × TOKEN_BASE_VALUE ($1.70) × serviceFeeSharePct
 * TOKEN_BASE_VALUE is fixed regardless of what customer paid per token.
 */
export function calculateProviderServiceFee(
  tokenBurn:          number,
  serviceFeeSharePct: number  // e.g. 0.80 for 80% to provider
): number {
  return Math.round(tokenBurn * TOKEN_BASE_VALUE * serviceFeeSharePct * 100) / 100;
}

/**
 * Generate the identifying payment memo.
 * Format: KBRIDGE-[shortId]-[initials]-[YYYYMM]
 */
export function generateMemo(
  taskId:      string,
  displayName: string | null
): string {
  const shortId  = taskId.slice(-4).toUpperCase();
  const initials = (displayName ?? "US")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
  const yyyymm = new Date().toISOString().slice(0, 7).replace("-", "");
  return `KBRIDGE-${shortId}-${initials}-${yyyymm}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIATE RECURRING PAYMENT (Nium ACH)
// Called by the scheduler for each auto-execution.
// NOTE: Nium integration is a stub — real gateway call added after Nium onboarding.
// ─────────────────────────────────────────────────────────────────────────────

export async function initiateRecurringPayment(params: {
  taskId:    string;
  userId:    string;
  recurring: {
    id:                string;
    label:             string;
    amountUsd:         Decimal;
    vendorDetailsJson: unknown;
  };
}): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  const { taskId, userId, recurring } = params;
  const amountUsd = parseFloat(recurring.amountUsd.toString());

  const user = await db.user.findUnique({
    where:  { id: userId },
    select: { displayName: true },
  });

  const memo = generateMemo(taskId, user?.displayName ?? null);

  const payment = await db.payment.create({
    data: {
      taskId,
      userId,
      gateway:   PaymentGateway.NIUM,
      routeType: PaymentRouteType.ACH_RECURRING,
      amountUsd,
      feeUsd:    0,    // Nium fee negotiated separately — updated on gateway confirmation
      feePct:    0,
      amountKrw: 0,    // Updated when Nium confirms with actual FX rate
      fxRate:    0,
      status:    "INITIATED",
      memo,
    },
  });

  await db.auditLog.create({
    data: {
      taskId,
      actorId:     "system",
      actorType:   "system",
      eventType:   "payment_initiated",
      payloadJson: {
        paymentId:   payment.id,
        recurringId: recurring.id,
        amountUsd,
        gateway:     "NIUM",
        routeType:   "ACH_RECURRING",
        memo,
      },
    },
  });

  // TODO (Phase 2): Call Nium ACH pull API
  // POST /api/v1/nium/fund-wallet with fundingChannel: DIRECT_DEBIT
  // Then POST /api/v1/nium/payout to KRW beneficiary
  console.log(`[PAYMENT] Nium ACH recurring: $${amountUsd}. Memo: ${memo}`);

  return { success: true, paymentId: payment.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIATE DIRECT CARD PAYMENT (Stripe)
// Called when a user confirms a one-off task.
// Creates the Payment record; Stripe PaymentIntent created in the API route.
// Token burn happens AFTER this completes successfully (v4.0 rule).
// ─────────────────────────────────────────────────────────────────────────────

export async function initiateDirectCardPayment(params: {
  taskId:        string;
  userId:        string;
  amountKrw:     number;
  fxRateAtQuote: number;   // USD/KRW spot rate at time of quote shown to user
}): Promise<{
  success:         boolean;
  paymentId?:      string;
  totalChargedUsd?: number;
  fxBufferUsd?:    number;
  error?:          string;
}> {
  const { taskId, userId, amountKrw, fxRateAtQuote } = params;

  if (fxRateAtQuote <= 0) {
    return { success: false, error: "Invalid FX rate" };
  }

  const productAmountUsd = Math.round((amountKrw / fxRateAtQuote) * 100) / 100;
  const fees             = calculateDirectCardTotal(productAmountUsd);

  const user = await db.user.findUnique({
    where:  { id: userId },
    select: { displayName: true },
  });

  const memo = generateMemo(taskId, user?.displayName ?? null);

  const payment = await db.payment.create({
    data: {
      taskId,
      userId,
      gateway:            PaymentGateway.STRIPE,
      routeType:          PaymentRouteType.DIRECT_CARD,
      amountUsd:          fees.productAmountUsd,
      feeUsd:             fees.stripeFeeUsd,
      feePct:             STRIPE_PCT,
      fxBufferUsd:        fees.fxBufferUsd,
      fxBufferPct:        fees.fxBufferPct,
      amountKrw,
      fxRate:             fxRateAtQuote,
      status:             "INITIATED",
      memo,
    },
  });

  await db.auditLog.create({
    data: {
      taskId,
      actorId:     userId,
      actorType:   "user",
      eventType:   "payment_initiated",
      payloadJson: {
        paymentId:      payment.id,
        productAmountUsd: fees.productAmountUsd,
        fxBufferUsd:    fees.fxBufferUsd,
        stripeFeeUsd:   fees.stripeFeeUsd,
        totalChargedUsd: fees.totalChargedUsd,
        amountKrw,
        fxRateAtQuote,
        memo,
      },
    },
  });

  console.log(`[PAYMENT] Direct card: $${fees.totalChargedUsd} total (product $${fees.productAmountUsd} + buffer $${fees.fxBufferUsd} + Stripe $${fees.stripeFeeUsd}). Memo: ${memo}`);

  return {
    success:         true,
    paymentId:       payment.id,
    totalChargedUsd: fees.totalChargedUsd,
    fxBufferUsd:     fees.fxBufferUsd,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIATE PROVIDER REIMBURSEMENT (Nium KRW payout)
// Called after direct card payment is confirmed by Stripe.
// K-Bridge reimburses the service provider in KRW via Nium.
// ─────────────────────────────────────────────────────────────────────────────

export async function initiateProviderReimbursement(params: {
  taskId:             string;
  partnerOrgId:       string;
  amountKrw:          number;
  tokenBurn:          number;
  serviceFeeSharePct: number;
}): Promise<{ success: boolean; niumPayoutRef?: string; error?: string }> {
  const { taskId, partnerOrgId, amountKrw, tokenBurn, serviceFeeSharePct } = params;

  const serviceFeePayout = calculateProviderServiceFee(tokenBurn, serviceFeeSharePct);

  // TODO (Phase 2): Call Nium payout API to KRW beneficiary
  // POST /api/v1/nium/payout with amountKrw + serviceFeePayout
  // Store Nium systemReferenceNumber in externalTransferRef
  console.log(`[REIMBURSEMENT] KRW ${amountKrw.toLocaleString()} + service fee $${serviceFeePayout} to partner ${partnerOrgId}. Task: ${taskId}`);

  return { success: true, niumPayoutRef: "STUB_PENDING_NIUM_INTEGRATION" };
}
