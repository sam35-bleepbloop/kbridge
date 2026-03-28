import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { pause } = await req.json();

  const recurring = await db.recurring.findUnique({
    where: { id },
  });

  if (!recurring || recurring.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.recurring.update({
    where: { id },
    data:  {
      isActive:     !pause,
      pausedReason: pause ? "USER_PAUSED" : "NONE",
    },
  });

  return NextResponse.json({ ok: true });
}
