import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  clearDashboardAuthCookie,
  getDashboardAuthSession,
  revokeDashboardSession,
} from "@/lib/auth/dashboardSession";
import { audit } from "@/lib/auth/auditLog";

export async function POST() {
  const cookieStore = await cookies();
  // Fix: logout revokes the token server-side (jti denylist), so the JWT dies
  // too — clearing the cookie alone left it valid for the full 24h TTL.
  const token = cookieStore.get("auth_token")?.value;
  if (token) {
    const session = await getDashboardAuthSession(token);
    if (session) {
      revokeDashboardSession(session);
      audit("logout", { role: session.role, keyId: session.keyId || null });
    }
  }
  clearDashboardAuthCookie(cookieStore);
  cookieStore.delete("oidc_state");
  cookieStore.delete("oidc_nonce");
  cookieStore.delete("oidc_code_verifier");
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
