import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import TaskDetailClient from "./TaskDetailClient";

export default async function AdminTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/auth/login");

  const { id } = await params;

  const employee = await db.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, role: true, isActive: true, name: true },
  });
  if (!employee?.isActive) redirect("/dashboard");

  const task = await db.task.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id:              true,
          displayName:     true,
          email:           true,
          tokenBalance:    true,
          sofaDeclaration: true,
          derosDate:       true,
          phoneKr:         true,
          phoneUs:         true,
          addressJson:     true,
          createdAt:       true,
        },
      },
      payments: {
        orderBy: { initiatedAt: "desc" },
      },
      assignments: {
        include: { employee: { select: { name: true, email: true, role: true } } },
        orderBy: { assignedAt: "desc" },
      },
      tokenLedger: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      auditLog: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!task) notFound();

  return (
    <TaskDetailClient
      task={JSON.parse(JSON.stringify(task))}
      employee={employee}
    />
  );
}