import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { VendorCategory } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET /api/admin/vendors/[id]
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
    select: { id: true, isActive: true },
  });
  if (!employee?.isActive) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const vendor = await db.vendor.findUnique({
    where: { id },
    include: {
      recurrings: {
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { displayName: true, email: true } },
        },
      },
      reviews: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { displayName: true } },
        },
      },
    },
  });

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  return NextResponse.json({ vendor });
}

// PATCH /api/admin/vendors/[id]
const PatchSchema = z.discriminatedUnion("action", [
  z.object({
    action:     z.literal("set_approval"),
    isApproved: z.boolean(),
  }),
  z.object({
    action:       z.literal("edit"),
    name:         z.string().min(1).max(200).optional(),
    nameKorean:   z.string().max(200).optional().nullable(),
    category:     z.nativeEnum(VendorCategory).optional(),
    phoneKorean:  z.string().max(30).optional().nullable(),
    email:        z.string().email().optional().nullable().or(z.literal("")),
    bankDetailsJson: z.object({
      bankName:      z.string().optional(),
      accountNumber: z.string().optional(),
      accountHolder: z.string().optional(),
    }).optional().nullable(),
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

  const vendor = await db.vendor.findUnique({
    where:  { id },
    select: { id: true, name: true, isApproved: true },
  });
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  if (parsed.data.action === "set_approval") {
    const { isApproved } = parsed.data;
    await db.vendor.update({
      where: { id },
      data:  { isApproved },
    });

    await db.auditLog.create({
      data: {
        actorId:     employee.id,
        actorType:   "employee",
        eventType:   isApproved ? "vendor_approved" : "vendor_unapproved",
        payloadJson: { vendorId: id, name: vendor.name, adminEmail: session.user.email },
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "edit") {
    const { action, bankDetailsJson, email, ...fields } = parsed.data;

    await db.vendor.update({
      where: { id },
      data:  {
        ...fields,
        email:           email === "" ? null : email,
        bankDetailsJson: bankDetailsJson ?? undefined,
        lastContactedAt: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        actorId:     employee.id,
        actorType:   "employee",
        eventType:   "vendor_edited",
        payloadJson: { vendorId: id, changes: fields, adminEmail: session.user.email },
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
