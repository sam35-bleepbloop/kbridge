import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

function requireAdmin(session: any) {
  return session?.user?.isEmployee;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!requireAdmin(session)) return new Response("Forbidden", { status: 403 });

  const entries = await db.knowledgeEntry.findMany({
    orderBy: [{ isActive: "desc" }, { category: "asc" }, { updatedAt: "desc" }],
  });

  return Response.json({ entries });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!requireAdmin(session)) return new Response("Forbidden", { status: 403 });

  const body = await req.json();
  const { category, title, content, isActive, appliesTo, source, verifiedAt, expiresAt } = body;

  if (!category || !title?.trim() || !content?.trim()) {
    return Response.json({ error: "category, title, and content are required." }, { status: 400 });
  }

  const entry = await db.knowledgeEntry.create({
    data: {
      category,
      title:      title.trim(),
      content:    content.trim(),
      isActive:   isActive ?? true,
      appliesTo:  appliesTo ?? null,
      source:     source    ?? null,
      verifiedAt: verifiedAt ? new Date(verifiedAt) : null,
      expiresAt:  expiresAt  ? new Date(expiresAt)  : null,
      createdById: session!.user.id!,
    },
  });

  return Response.json({ entry }, { status: 201 });
}
