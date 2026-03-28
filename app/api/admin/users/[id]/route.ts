import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { creditTokens } from "@/lib/tokens/engine";
import { TokenTxType, SofaDeclaration } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET /api/admin/users/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employee = await db.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, role: true, isActive: true },
  });
  if (!employee?.isActive) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const user = await db.user.findUnique({
    where:  { id },
    select: {
      id:               true,
      displayName:      true,
      email:            true,
      tokenBalance:     true,
      sofaDeclaration:  true,
      derosDate:        true,
      phoneKr:          true,
      phoneUs:          true,
      addressJson:      true,
      preferencesJson:  true,
      consentFlagsJson: true,
      referralCode:     true,
      referredByCode:   true,
      stripeCustomerId: true,
      createdAt:        true,
      lastActiveAt:     true,
      tasks: {
        orderBy: { lastActivityAt: "desc" },
        take: 20,
        select: {
          id:             true,
          type:           true,
          status:         true,
          tokenEstimate:  true,
          tokenActual:    true,
          requiresHuman:  true,
          createdAt:      true,
          closedAt:       true,
          lastActivityAt: true,
        },
      },
      tokenLedger: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      payments: {
        orderBy: { initiatedAt: "desc" },
        take: 10,
        select: {
          id:          true,
          amountUsd:   true,
          feeUsd:      true,
          status:      true,
          gateway:     true,
          routeType:   true,
          memo:        true,
          initiatedAt: true,
          confirmedAt: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

// PATCH /api/admin/users/[id]
const PatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("adjust_tokens"),
    amount: z.number().int().min(-10000).max(10000),
    reason: z.string().min(1).max(300),
  }),
  z.object({
    action: z.literal("set_sofa"),
    status: z.nativeEnum(SofaDeclaration),
  }),
  z.object({
    action: z.literal("suspend"),
    reason: z.string().min(1).max(300),
  }),
  z.object({
    action: z.literal("unsuspend"),
  }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employee = await db.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, role: true, isActive: true },
  });
  if (!employee?.isActive || employee.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;

  const body   = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where:  { id },
    select: { id: true, email: true, tokenBalance: true, sofaDeclaration: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (parsed.data.action === "adjust_tokens") {
    const { amount, reason } = parsed.data;
    const newBalance = await creditTokens(
      user.id,
      amount,
      TokenTxType.ADMIN_ADJUSTMENT,
      `Admin adjustment by ${session.user.email}: ${reason}`,
    );
    await db.auditLog.create({
      data: {
        actorId:     employee.id,
        actorType:   "employee",
        eventType:   "admin_token_adjustment",
        payloadJson: { userId: user.id, amount, reason, newBalance, adminEmail: session.user.email },
      },
    });
    return NextResponse.json({ ok: true, newBalance });
  }

  if (parsed.data.action === "set_sofa") {
    await db.user.update({
      where: { id: user.id },
      data:  { sofaDeclaration: parsed.data.status },
    });
    await db.auditLog.create({
      data: {
        actorId:     employee.id,
        actorType:   "employee",
        eventType:   "admin_sofa_change",
        payloadJson: { userId: user.id, from: user.sofaDeclaration, to: parsed.data.status },
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "suspend") {
    await db.recurring.updateMany({
      where: { userId: user.id, isActive: true },
      data:  { pausedReason: "ADMIN_PAUSED" },
    });
    await db.auditLog.create({
      data: {
        actorId:     employee.id,
        actorType:   "employee",
        eventType:   "admin_user_suspended",
        payloadJson: { userId: user.id, reason: parsed.data.reason, adminEmail: session.user.email },
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "unsuspend") {
    await db.recurring.updateMany({
      where: { userId: user.id, pausedReason: "ADMIN_PAUSED" },
      data:  { pausedReason: "NONE" },
    });
    await db.auditLog.create({
      data: {
        actorId:     employee.id,
        actorType:   "employee",
        eventType:   "admin_user_unsuspended",
        payloadJson: { userId: user.id, adminEmail: session.user.email },
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}