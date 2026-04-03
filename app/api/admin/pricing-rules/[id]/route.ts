// app/api/admin/pricing-rules/[id]/route.ts
// PATCH update + DELETE pricing rule

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateRuleSchema = z.object({
  category: z.string().min(2).max(100).optional(),
  tokenCost: z.number().int().min(2).max(10).optional(),
  description: z.string().max(300).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isEmployee) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rule = await db.taskPricingRule.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ rule });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isEmployee) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  await db.taskPricingRule.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
