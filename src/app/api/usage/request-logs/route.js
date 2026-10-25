import { NextResponse } from "next/server";
import { getRecentLogs } from "@/lib/usageDb";
import { getSessionContext } from "@/lib/auth/dashboardPermissions";

export async function GET() {
  try {
    // Fix (cross-tenant log disclosure): scope rows to the caller. Admin /
    // open-mode sessions keep the full list; apikey sessions only their own.
    const ctx = await getSessionContext();
    const logs = await getRecentLogs(200, ctx.apiKeyFilter);
    return NextResponse.json(logs);
  } catch (error) {
    console.error("[API ERROR] /api/usage/logs failed:", error);
    console.error("[API ERROR] Stack:", error?.stack);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
