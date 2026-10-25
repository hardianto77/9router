import { ProxyAgent, fetch as undiciFetch } from "undici";
import { assertPublicUrlResolved } from "@/shared/utils/ssrfGuard.js";

const DEFAULT_TEST_URL = "https://1.1.1.1/cdn-cgi/trace";
const DEFAULT_TIMEOUT_MS = 10000;

function getErrorMessage(err) {
  if (!err) return "Unknown error";
  const base = err?.message || String(err);
  const causeCode = err?.cause?.code || err?.code;
  const causeMessage = err?.cause?.message;

  if (causeMessage && causeMessage !== base) {
    return causeCode ? `${base}: ${causeMessage} (${causeCode})` : `${base}: ${causeMessage}`;
  }

  if (causeCode && !base.includes(causeCode)) {
    return `${base} (${causeCode})`;
  }

  return base;
}

function normalizeString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export async function testProxyUrl({ proxyUrl, testUrl, timeoutMs } = {}) {
  const normalizedProxyUrl = normalizeString(proxyUrl);
  if (!normalizedProxyUrl) {
    return { ok: false, status: 400, error: "proxyUrl is required" };
  }

  const normalizedTestUrl = normalizeString(testUrl) || DEFAULT_TEST_URL;
  // M8 fix: the probe target must be an http(s) URL on a PUBLIC address —
  // previously any URL (incl. 169.254.169.254 / RFC1918) was fetched directly.
  try {
    const parsedTest = new URL(normalizedTestUrl);
    if (parsedTest.protocol !== "http:" && parsedTest.protocol !== "https:") {
      return { ok: false, status: 400, error: "testUrl must be http(s)" };
    }
    await assertPublicUrlResolved(parsedTest.toString());
  } catch {
    return { ok: false, status: 400, error: "testUrl not allowed (public address required)" };
  }
  // M8: validate proxy scheme explicitly (local proxies stay allowed by design)
  try {
    const parsedProxy = new URL(normalizedProxyUrl);
    if (parsedProxy.protocol !== "http:" && parsedProxy.protocol !== "https:") {
      return { ok: false, status: 400, error: "proxyUrl must be http(s)" };
    }
  } catch {
    return { ok: false, status: 400, error: "Invalid proxy URL" };
  }
  const timeoutMsRaw = Number(timeoutMs);
  const normalizedTimeoutMs =
    Number.isFinite(timeoutMsRaw) && timeoutMsRaw > 0
      ? Math.min(timeoutMsRaw, 30000)
      : DEFAULT_TIMEOUT_MS;

  let dispatcher;

  try {
    try {
      dispatcher = new ProxyAgent({ uri: normalizedProxyUrl });
    } catch (err) {
      return {
        ok: false,
        status: 400,
        error: `Invalid proxy URL: ${err?.message || String(err)}`,
      };
    }

    const controller = new AbortController();
    const startedAt = Date.now();
    const timer = setTimeout(() => controller.abort(), normalizedTimeoutMs);

    try {
      const res = await undiciFetch(normalizedTestUrl, {
        method: "GET",
        dispatcher,
        signal: controller.signal,
        redirect: "manual", // M8: never follow a redirect into internal space
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
      });

      if (res.status === 407) {
        return {
          ok: false,
          status: 407,
          statusText: "Proxy Authentication Required",
          url: normalizedTestUrl,
          error: "HTTP 407 Proxy Authentication Required (credentials invalid or plan expired)",
          elapsedMs: Date.now() - startedAt,
        };
      }

      const isSuccess = res.ok || (res.status >= 300 && res.status < 400);

      let egressIp = null;
      let loc = null;
      let warp = null;
      if (isSuccess) {
        try {
          const bodyText = await res.text();
          const ipMatch = bodyText.match(/^ip=([^\r\n]+)/m);
          if (ipMatch) egressIp = ipMatch[1].trim();
          const locMatch = bodyText.match(/^loc=([^\r\n]+)/m);
          if (locMatch) loc = locMatch[1].trim();
          const warpMatch = bodyText.match(/^warp=([^\r\n]+)/m);
          if (warpMatch) warp = warpMatch[1].trim();
        } catch {
          // ignore body read errors
        }
      }

      return {
        ok: isSuccess,
        status: res.status,
        statusText: res.statusText,
        url: normalizedTestUrl,
        elapsedMs: Date.now() - startedAt,
        egressIp,
        loc,
        warp,
      };
    } catch (err) {
      const message =
        err?.name === "AbortError"
          ? "Proxy test timed out"
          : getErrorMessage(err);
      return { ok: false, status: 500, error: message };
    } finally {
      clearTimeout(timer);
    }
  } finally {
    try {
      await dispatcher?.close?.();
    } catch {
      // ignore
    }
  }
}
