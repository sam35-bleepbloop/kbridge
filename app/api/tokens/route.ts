import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { creditTokens, TOKEN_PACKS, TOKEN_PURCHASE_CAP, TOKEN_WALLET_CAP } from "@/lib/tokens/engine";
import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// POST /api/tokens — create Stripe checkout session
// Accepts { packId } for packs, or { packId: "single", quantity } for custom single token count
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body     = await req.json();
  const { packId, quantity } = body;

  const pack = TOKEN_PACKS.find((p) => p.id === packId);
  if (!pack) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
  }

  // For single token purchases, quantity is user-specified (1–TOKEN_PURCHASE_CAP)
  // For all other packs, quantity is always 1 (pack quantity fixed)
  const isSingle    = pack.id === "single";
  const qty         = isSingle ? (parseInt(quantity) || 1) : 1;
  const tokenCount  = pack.tokens * qty;

  // Enforce per-purchase cap
  if (tokenCount > TOKEN_PURCHASE_CAP) {
    return NextResponse.json(
      { error: `Maximum ${TOKEN_PURCHASE_CAP} tokens per purchase.` },
      { status: 400 }
    );
  }

  // Enforce wallet cap — check current balance
  const userId = session.user.id;
  const user   = await db.user.findUnique({
    where:  { id: userId },
    select: { email: true, stripeCustomerId: true, tokenBalance: true },
  });

  if ((user?.tokenBalance ?? 0) + tokenCount > TOKEN_WALLET_CAP) {
    return NextResponse.json(
      { error: `This purchase would exceed the maximum wallet balance of ${TOKEN_WALLET_CAP} tokens. You currently have ${user?.tokenBalance ?? 0}.` },
      { status: 400 }
    );
  }

  // Get or create Stripe customer
  let stripeCustomerId = user?.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({ email: user?.email! });
    stripeCustomerId = customer.id;
    await db.user.update({
      where: { id: userId },
      data:  { stripeCustomerId },
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer:   stripeCustomerId,
    mode:       "payment",
    currency:   "usd",  // Force USD — prevents Stripe showing KRW option to users in Korea
    line_items: [{
      price:    pack.stripePriceId,
      quantity: qty,
    }],
    metadata: {
      userId,
      packId:  pack.id,
      tokens:  tokenCount.toString(),  // Total tokens to credit (qty × pack.tokens)
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/tokens?success=true&pack=${pack.id}`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/tokens?cancelled=true`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}

// GET /api/tokens — return current balance and ledger
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { tokenBalance: true },
  });

  const ledger = await db.tokenLedger.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take:    100,
  });

  return NextResponse.json({ balance: user?.tokenBalance ?? 0, ledger });
}
