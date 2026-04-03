// app/api/admin/pioneer-tasks/route.ts
// GET all completed pioneer tasks awaiting pricing rule creation

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isEmployee) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tasks = await db.task.findMany({
    where: {
      isPioneerTask: true,
      status: "COMPLETE",
    },
    select: {
      id: true,
      label: true,
      type: true,
      status: true,
      tokenActual: true,
      createdAt: true,
      closedAt: true,
      user: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
    orderBy: { closedAt: "desc" },
  });

  return NextResponse.json({ tasks });
}
