import { checkLowTokenAlerts, runDueRecurrings } from "@/lib/recurring/scheduler";
import { archiveInactiveTasks } from "@/lib/tasks/inactivityArchive";
import { NextRequest, NextResponse } from "next/server";

// This route is called by Vercel Cron daily at 06:00 KST (21:00 UTC prev day)
// Configure in vercel.json:
// { "crons": [{ "path": "/api/cron/recurring", "schedule": "0 21 * * *" }] }

export async function GET(req: NextRequest) {
  // Verify request is from Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[CRON] Starting daily recurring job —", new Date().toISOString());

  try {
    // Step 1: Alert users with low tokens before their payment runs
    await checkLowTokenAlerts();
    console.log("[CRON] Low token alerts complete");

    // Step 2: Execute due recurring payments
    await runDueRecurrings();
    console.log("[CRON] Recurring executions complete");

    // Step 3: Auto-archive tasks with no user activity for 7+ days
    const archived = await archiveInactiveTasks();
    console.log(`[CRON] Inactivity archive complete — ${archived} task(s) archived`);

    return NextResponse.json({ ok: true, ran: new Date().toISOString(), archivedInactive: archived });
  } catch (error) {
    console.error("[CRON] Error:", error);
    return NextResponse.json(
      { error: "Cron job failed", detail: String(error) },
      { status: 500 }
    );
  }
}
