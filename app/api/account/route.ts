// app/api/account/route.ts

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash, compare } from "bcryptjs";

// ── GET — fetch current profile ───────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: {
      displayName:      true,
      email:            true,
      phoneKr:          true,
      phoneUs:          true,
      addressJson:      true,
      sofaDeclaration:  true,
      derosDate:        true,
      consentFlagsJson: true,
      preferencesJson:  true,
      referralCode:     true,
      createdAt:        true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

// ── PATCH — update profile sections ──────────────────────────────────────────

const patchSchema = z.object({
  // Profile
  displayName: z.string().min(1).max(100).optional(),
  phoneKr:     z.string().max(20).optional().nullable(),
  phoneUs:     z.string().max(20).optional().nullable(),

  // Address (partial update — merged server-side)
  address: z.object({
    street: z.string().max(200).optional().default(""),
    city:   z.string().max(100).optional().default(""),
    base:   z.string().max(100),
    unit:   z.string().max(100).optional().default(""),
  }).optional(),

  // DEROS
  derosDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),

  // Consent flags (partial — only updatable flags)
  consentFlags: z.object({
    usePreferences: z.boolean().optional(),
    marketing:      z.boolean().optional(),
    // dataRetention cannot be revoked via this endpoint
  }).optional(),

  // Preferences (kids/pets stored here)
  preferences: z.object({
    hasKids: z.boolean().optional(),
    hasPets: z.boolean().optional(),
  }).optional(),

  // Password change
  passwordChange: z.object({
    current: z.string().min(1),
    new:     z.string().min(8).max(100),
  }).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body   = await req.json();
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { displayName, phoneKr, phoneUs, address, derosDate, consentFlags, preferences, passwordChange } = parsed.data;

  // Fetch current user for merge operations
  const current = await db.user.findUnique({
    where:  { id: session.user.id },
    select: {
      image:            true, // password hash stored here (workaround #1)
      addressJson:      true,
      consentFlagsJson: true,
      preferencesJson:  true,
    },
  });

  if (!current) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // ── Password change ───────────────────────────────────────────────────────
  let newImageField: string | undefined;
  if (passwordChange) {
    const valid = await compare(passwordChange.current, current.image ?? "");
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
    newImageField = await hash(passwordChange.new, 12);
  }

  // ── Merge JSONB fields ────────────────────────────────────────────────────
  const currentAddress      = (current.addressJson      as Record<string, string> | null) ?? {};
  const currentConsent      = (current.consentFlagsJson as Record<string, boolean> | null) ?? {};
  const currentPreferences  = (current.preferencesJson  as Record<string, unknown> | null) ?? {};

  const updatedAddress = address
    ? { ...currentAddress, ...address }
    : undefined;

  const updatedConsent = consentFlags
    ? { ...currentConsent, ...consentFlags }
    : undefined;

  const updatedPreferences = preferences
    ? { ...currentPreferences, ...preferences }
    : undefined;

  // ── Build update payload ──────────────────────────────────────────────────
  const updateData: Record<string, unknown> = {};

  if (displayName)         updateData.displayName      = displayName;
  if (phoneKr !== undefined) updateData.phoneKr         = phoneKr;
  if (phoneUs !== undefined) updateData.phoneUs         = phoneUs;
  if (updatedAddress)      updateData.addressJson       = updatedAddress;
  if (derosDate !== undefined) updateData.derosDate     = derosDate ? new Date(derosDate) : null;
  if (updatedConsent)      updateData.consentFlagsJson  = updatedConsent;
  if (updatedPreferences)  updateData.preferencesJson   = updatedPreferences;
  if (newImageField)       updateData.image             = newImageField;

  await db.user.update({
    where: { id: session.user.id },
    data:  updateData,
  });

  return NextResponse.json({ success: true });
}

// ── DELETE — account deletion ─────────────────────────────────────────────────

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Soft approach: anonymise rather than hard delete to preserve ledger integrity
  // Hard delete cascades are not fully defined yet — this is safe for MVP
  await db.user.update({
    where: { id: session.user.id },
    data: {
      email:            `deleted_${session.user.id}@deleted.invalid`,
      displayName:      "Deleted user",
      image:            null,
      phoneKr:          null,
      phoneUs:          null,
      addressJson:      Prisma.JsonNull,
      consentFlagsJson: Prisma.JsonNull,
      preferencesJson:  Prisma.JsonNull,
      referralCode:     null,
      referredByCode:   null,
    },
  });

  return NextResponse.json({ success: true });
}