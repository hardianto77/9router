import { NextResponse } from "next/server";
import { getRecentLogs } from "@/lib/usageDb";
import { getSessionContext } from "@/lib/auth/dashboardPermissions";

export async function GET() {
  try {
    // Cross-tenant log disclosure fix: scope rows to the caller's key.
    // Admin sessions (no key filter) keep the full global view.
    const ctx = await getSessionContext();
    const logs = await getRecentLogs(200, ctx.apiKeyFilter);
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
