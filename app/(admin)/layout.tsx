import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  // Verify the user is a registered employee
  const employee = await db.employee.findUnique({
    where:    { email: session.user.email! },
    select:   { id: true, name: true, role: true, isActive: true },
  });

  if (!employee || !employee.isActive) {
    redirect("/dashboard"); // Not an employee — send to user area
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--surface-page)" }}>
      <AdminSidebar employee={employee} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
