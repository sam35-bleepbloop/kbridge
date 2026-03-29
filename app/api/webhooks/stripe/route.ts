import { creditTokens } from "@/lib/tokens/engine";
import { db } from "@/lib/db";
import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const alreadyProcessed = await db.auditLog.findFirst({
      where: {
        eventType: "stripe_webhook_processed",
        payloadJson: { path: ["stripeEventId"], equals: event.id },
      },
    });

    if (alreadyProcessed) {
      console.log(`[STRIPE] Duplicate event ignored: ${event.id}`);
      return NextResponse.json({ received: true });
    }

    const session    = event.data.object as Stripe.Checkout.Session;
    const metadata   = session.metadata;

    if (!metadata?.userId || !metadata?.tokens) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    const tokens     = parseInt(metadata.tokens);
    const packId     = metadata.packId;
    const amountPaid = (session.amount_total ?? 0) / 100;

    const creditResult = await creditTokens(
      metadata.userId,
      tokens,
      "PURCHASE",
      `Purchased ${packId} pack — ${tokens} tokens ($${amountPaid.toFixed(2)})`
    );

    // If credit failed (wallet cap exceeded), log for admin review (workaround #127)
    if (!creditResult.success) {
      console.error(`[STRIPE] CRITICAL: Token credit failed for user ${metadata.userId} — wallet cap (${creditResult.cappedAt}) would be exceeded. User has paid $${amountPaid.toFixed(2)} but tokens NOT credited. Requires admin review.`);

      await db.auditLog.create({
        data: {
          actorId:     metadata.userId,
          actorType:   "system",
          eventType:   "stripe_token_credit_failed",
          payloadJson: {
            stripeEventId:  event.id,
            userId:         metadata.userId,
            tokens,
            packId,
            amountPaid,
            reason:         "wallet_cap_exceeded",
            cappedAt:       creditResult.cappedAt,
            currentBalance: creditResult.newBalance,
          },
        },
      });
    }

    await db.auditLog.create({
      data: {
        actorId:     metadata.userId,
        actorType:   "system",
        eventType:   "stripe_webhook_processed",
        payloadJson: {
          stripeEventId: event.id,
          userId:        metadata.userId,
          tokens,
          packId,
          amountPaid,
          credited:      creditResult.success,
        },
      },
    });

    console.log(`[STRIPE] ${creditResult.success ? "Credited" : "FAILED to credit"} ${tokens} tokens to user ${metadata.userId}`);
  }

  return NextResponse.json({ received: true });
}