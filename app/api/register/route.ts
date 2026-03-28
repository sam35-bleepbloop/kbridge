import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUniqueReferralCode } from "@/lib/utils/referral";
import { WELCOME_BONUS, REFERRAL_REWARD } from "@/lib/tokens/engine";

const addressSchema = z.object({
  street: z.string().max(200).optional().default(""),
  city:   z.string().max(100).optional().default(""),
  base:   z.string().max(100),
  unit:   z.string().max(100).optional().default(""),
});

const consentSchema = z.object({
  usePreferences: z.boolean().default(false),
  dataRetention:  z.boolean(),
  marketing:      z.boolean().default(false),
});

const schema = z.object({
  displayName:    z.string().min(1).max(100),
  email:          z.string().email(),
  password:       z.string().min(8).max(100),
  address:        addressSchema,
  consentFlags:   consentSchema,
  derosDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  referredByCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body   = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { displayName, email, password, address, consentFlags, derosDate, referredByCode } = parsed.data;

  if (!consentFlags.dataRetention) {
    return NextResponse.json({ error: "Data retention consent is required." }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  // Validate referral code if provided
  let referrer = null;
  if (referredByCode) {
    referrer = await db.user.findUnique({
      where: { referralCode: referredByCode.toUpperCase() },
    });
    // Silently ignore invalid codes — don't block signup
  }

  const passwordHash = await hash(password, 12);
  const referralCode = await getUniqueReferralCode();

  // Create user — password stored in image field (workaround #1)
  // sofaDeclaration defaults to US_BASED — Tier 1 self-cert upgrades to PENDING_SOFA
  const user = await db.user.create({
    data: {
      email,
      displayName,
      image:            passwordHash,
      tokenBalance:     WELCOME_BONUS,
      sofaDeclaration:  "US_BASED",
      addressJson:      address,
      consentFlagsJson: consentFlags,
      derosDate:        new Date(derosDate),
      referralCode,
      referredByCode:   referrer ? referredByCode!.toUpperCase() : null,
    },
  });

  // Credit welcome bonus to ledger
  await db.tokenLedger.create({
    data: {
      userId:       user.id,
      txType:       "BONUS",
      amount:       WELCOME_BONUS,
      balanceAfter: WELCOME_BONUS,
      description:  `Welcome bonus — ${WELCOME_BONUS} tokens on us`,
    },
  });

  // Credit referral reward to referrer if valid code was used
  if (referrer) {
    const newBalance = referrer.tokenBalance + REFERRAL_REWARD;

    await db.user.update({
      where: { id: referrer.id },
      data:  { tokenBalance: newBalance },
    });

    await db.tokenLedger.create({
      data: {
        userId:       referrer.id,
        txType:       "BONUS",
        amount:       REFERRAL_REWARD,
        balanceAfter: newBalance,
        description:  `Referral reward — ${displayName} signed up with your code`,
      },
    });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
