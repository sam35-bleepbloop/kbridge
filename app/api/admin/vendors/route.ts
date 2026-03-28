import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { VendorCategory } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET /api/admin/vendors?search=&category=&approved=&page=
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employee = await db.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, isActive: true },
  });
  if (!employee?.isActive) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search   = searchParams.get("search")?.trim() ?? "";
  const category = searchParams.get("category") ?? "ALL";
  const approved = searchParams.get("approved") ?? "ALL";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 50;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name:        { contains: search, mode: "insensitive" } },
      { nameKorean:  { contains: search, mode: "insensitive" } },
      { email:       { contains: search, mode: "insensitive" } },
      { phoneKorean: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category !== "ALL") {
    where.category = category as VendorCategory;
  }

  if (approved === "APPROVED") {
    where.isApproved = true;
  } else if (approved === "UNAPPROVED") {
    where.isApproved = false;
  }

  const [vendors, total] = await Promise.all([
    db.vendor.findMany({
      where,
      select: {
        id:             true,
        name:           true,
        nameKorean:     true,
        category:       true,
        phoneKorean:    true,
        email:          true,
        isApproved:     true,
        avgRating:      true,
        lastContactedAt: true,
        createdAt:      true,
        _count: {
          select: { recurrings: true, reviews: true },
        },
      },
      orderBy: [{ isApproved: "desc" }, { name: "asc" }],
      skip:  (page - 1) * pageSize,
      take:  pageSize,
    }),
    db.vendor.count({ where }),
  ]);

  return NextResponse.json({ vendors, total, page, pageSize });
}

// POST /api/admin/vendors — create new vendor
const CreateSchema = z.object({
  name:            z.string().min(1).max(200),
  nameKorean:      z.string().max(200).optional(),
  category:        z.nativeEnum(VendorCategory),
  phoneKorean:     z.string().max(30).optional(),
  email:           z.string().email().optional().or(z.literal("")),
  bankDetailsJson: z.object({
    bankName:       z.string().optional(),
    accountNumber:  z.string().optional(),
    accountHolder:  z.string().optional(),
  }).optional(),
  isApproved: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
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

  const body   = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { bankDetailsJson, email, ...rest } = parsed.data;

  const vendor = await db.vendor.create({
    data: {
      ...rest,
      email:           email || null,
      bankDetailsJson: bankDetailsJson ?? undefined,
    },
  });

  await db.auditLog.create({
    data: {
      actorId:     employee.id,
      actorType:   "employee",
      eventType:   "vendor_created",
      payloadJson: { vendorId: vendor.id, name: vendor.name, adminEmail: session.user.email },
    },
  });

  return NextResponse.json({ vendor });
}
