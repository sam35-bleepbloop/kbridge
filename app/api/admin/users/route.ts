import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/admin/users?search=&page=&sofaFilter=
export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const search      = searchParams.get("search")?.trim() ?? "";
  const sofaFilter  = searchParams.get("sofa") ?? "ALL";
  const page        = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize    = 50;

  const where: Record<string, unknown> = {
    // Exclude soft-deleted users (email set to deleted_*@deleted.invalid)
    NOT: { email: { contains: "@deleted.invalid" } },
  };

  if (search) {
    where.OR = [
      { email:       { contains: search, mode: "insensitive" } },
      { displayName: { contains: search, mode: "insensitive" } },
      { referralCode: { contains: search, mode: "insensitive" } },
    ];
  }

  if (sofaFilter !== "ALL") {
    where.sofaDeclaration = sofaFilter;
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id:              true,
        displayName:     true,
        email:           true,
        tokenBalance:    true,
        sofaDeclaration: true,
        derosDate:       true,
        referralCode:    true,
        createdAt:       true,
        lastActiveAt:    true,
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { lastActiveAt: "desc" },
      skip:  (page - 1) * pageSize,
      take:  pageSize,
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, pageSize });
}