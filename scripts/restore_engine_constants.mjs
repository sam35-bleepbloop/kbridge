import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/lib/tokens/engine.ts';
let content = readFileSync(path, 'utf8');

const anchor = `// ─────────────────────────────────────────────────────────────────────────────
// CORE ENGINE FUNCTIONS`;

const insertion = `// ─────────────────────────────────────────────────────────────────────────────
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

`;

if (content.includes(anchor)) {
  content = content.replace(anchor, insertion + anchor);
  writeFileSync(path, content, 'utf8');
  console.log('SUCCESS — constants block restored');
} else {
  console.log('MATCH FAILED — anchor not found');
}