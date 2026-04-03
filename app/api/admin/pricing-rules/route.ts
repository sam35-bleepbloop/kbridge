// app/api/admin/pricing-rules/route.ts
// GET all pricing rules + POST create new rule

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const CreateRuleSchema = z.object({
  category: z.string().min(2).max(100),
  tokenCost: z.number().int().min(2).max(10),
  description: z.string().max(300).optional(),
  isActive: z.boolean().optional().default(true),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.isEmployee) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rules = await db.taskPricingRule.findMany({
    orderBy: { category: "asc" },
  });

  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isEmployee) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreateRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { category, tokenCost, description, isActive } = parsed.data;

  // Check for duplicate category
  const existing = await db.taskPricingRule.findUnique({ where: { category } });
  if (existing) {
    return NextResponse.json({ error: "A rule for this category already exists." }, { status: 409 });
  }

  const rule = await db.taskPricingRule.create({
    data: { category, tokenCost, description, isActive },
  });

  return NextResponse.json({ rule }, { status: 201 });
}
