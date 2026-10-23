import { resolveDns } from "../shared/dnsResolver.js";
import { HEALTH_CHECK } from "./config.js";

export async function probeUrlAlive(url) {
  if (!url) return false;
  try {
    const res = await fetch(`${url}/api/health`, {
      signal: AbortSignal.timeout(HEALTH_CHECK.fetchTimeoutMs),
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

export async function waitForHealth(url, cancelToken = { cancelled: false }) {
  const start = Date.now();
  while (Date.now() - start < HEALTH_CHECK.timeoutMs) {
    if (cancelToken.cancelled) throw new Error("cancelled");
    if (await probeUrlAlive(url)) return true;
    await new Promise((r) => setTimeout(r, HEALTH_CHECK.intervalMs));
  }
  return false;
}
