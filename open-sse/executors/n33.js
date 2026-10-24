import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";
import { proxyAwareFetch } from "../utils/proxyFetch.js";
import { prepareToolMessages, buildToolAwareResult } from "../translator/webTools.js";
import crypto from "node:crypto";
import { SSE_DONE, SSE_HEADERS } from "../utils/sseConstants.js";

const N33_BASE = "https://n33.ai";
const N33_AUTH_ANON = `${N33_BASE}/api/auth/sign-in/anonymous`;
const N33_STREAM_URL = `${N33_BASE}/api/chat/stream`;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

let activeCookie = null;
let activeCookieExpires = 0;

/**
 * Get or mint an anonymous session cookie.
 * Cookies from Better Auth last 30 days. We cache them for 25 days.
 */
export async function getOrCreateN33Cookie(credentials, proxyOptions = null) {
  const userCookie = credentials?.cookie || credentials?.apiKey;
  if (userCookie && typeof userCookie === "string" && userCookie.includes("__Secure-n33.session_token=")) {
    return userCookie;
  }

  if (activeCookie && Date.now() < activeCookieExpires) {
    return activeCookie;
  }

  try {
    const res = await proxyAwareFetch(
      N33_AUTH_ANON,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
          Origin: N33_BASE,
          Referer: `${N33_BASE}/guest?redirectUrl=%2Fchat`,
        },
        body: "{}",
      },
      proxyOptions
    );

    const setCookies = res.headers.get("set-cookie") || "";
    const m = setCookies.match(/__Secure-n33\.session_token=([^;]+)/);
    if (m) {
      activeCookie = `__Secure-n33.session_token=${m[1]}`;
      activeCookieExpires = Date.now() + 25 * 24 * 3600 * 1000;
      return activeCookie;
    }
  } catch (err) {
    console.error("[N33] anonymous sign-in failed:", err?.message || err);
  }

  return activeCookie || "";
}

export function evictN33Cookie() {
  activeCookie = null;
  activeCookieExpires = 0;
}

/**
 * Map incoming model string to canonical N33 model ID
 */
export function resolveN33Model(model) {
  const m = String(model || "").toLowerCase();
  if (m.startsWith("n33/")) {
    return resolveN33Model(m.slice(4));
  }

  // Exact known IDs
  if (
    [
      "n33-claude-opus",
      "n33-claude-sonnet",
      "n33-chat",
      "n33-gpt-sol",
      "n33-gpt",
      "n33-grok-4-7",
      "n33-grok",
      "kimi-k2-thinking",
    ].includes(m)
  ) {
    return m;
  }

  // Model aliases
  if (m.includes("opus")) return "n33-claude-opus";
  if (m.includes("sonnet")) return "n33-claude-sonnet";
  if (m.includes("haiku")) return "n33-chat";
  if (m.includes("sol")) return "n33-gpt-sol";
  if (m.includes("luna") || m.includes("gpt-4") || m.includes("gpt-5")) return "n33-gpt";
  if (m.includes("grok-4.7") || m.includes("grok-4-7")) return "n33-grok-4-7";
  if (m.includes("grok")) return "n33-grok";
  if (m.includes("kimi")) return "kimi-k2-thinking";

  return "n33-chat";
}

function normalizeContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part?.type === "text") return part.text || "";
      return "";
    })
    .join("\n")
    .trim();
}

/**
 * Format messages into (history, currentMessage) for N33 payload
 */
function extractMessages(rawMessages) {
  const messages = Array.isArray(rawMessages) ? rawMessages : [];
  let systemText = "";
  const filtered = [];

  for (const msg of messages) {
    if (!msg) continue;
    const role = msg.role;
    const text = normalizeContent(msg.content);
    if (role === "system") {
      systemText = systemText ? `${systemText}\n\n${text}` : text;
    } else if (role === "user" || role === "assistant") {
      filtered.push({ role, content: text });
    }
  }

  if (filtered.length === 0) {
    return {
      history: [],
      currentMessage: { role: "user", content: systemText || "Hello" },
    };
  }

  let lastUserIdx = -1;
  for (let i = filtered.length - 1; i >= 0; i--) {
    if (filtered[i].role === "user") {
      lastUserIdx = i;
      break;
    }
  }

  if (lastUserIdx === -1) {
    return {
      history: filtered.slice(0, -1),
      currentMessage: { role: "user", content: filtered[filtered.length - 1].content },
    };
  }

  const currentMessage = filtered[lastUserIdx];
  const history = filtered.slice(0, lastUserIdx);

  if (systemText) {
    if (history.length > 0 && history[0].role === "user") {
      history[0].content = `${systemText}\n\n${history[0].content}`;
    } else {
      currentMessage.content = `${systemText}\n\n${currentMessage.content}`;
    }
  }

  return { history, currentMessage };
}

export class N33Executor extends BaseExecutor {
  constructor() {
    super("n33", PROVIDERS["n33"]);
  }

  async execute(args) {
    const { model, body, stream = false, credentials, signal } = args;
    const requestedModel = model || body?.model || "n33-chat";
    const upstreamModel = resolveN33Model(requestedModel);
    const proxyOptions = this.getProxyOptions?.(credentials) || null;

    let cookie = await getOrCreateN33Cookie(credentials, proxyOptions);

    // Prepare tool awareness if tools are present
    const rawMessages = body?.messages || [];
    const { effectiveMessages, hasTools, requestedTools } = prepareToolMessages(body || {}, rawMessages);
    const { history, currentMessage } = extractMessages(effectiveMessages);

    const guestKey = `guest-${crypto.randomBytes(8).toString("hex")}`;
    const formData = new FormData();
    formData.append("message", JSON.stringify(currentMessage));
    formData.append("model", JSON.stringify({ modelId: upstreamModel }));
    formData.append("history", JSON.stringify(history));
    formData.append("webSearch", "false");
    formData.append("textChatMode", "chat");
    formData.append("guestKey", guestKey);

    let res;
    try {
      res = await proxyAwareFetch(
        N33_STREAM_URL,
        {
          method: "POST",
          body: formData,
          headers: {
            Cookie: cookie,
            Origin: N33_BASE,
            Referer: `${N33_BASE}/chat`,
            "User-Agent": USER_AGENT,
          },
          signal,
        },
        proxyOptions
      );

      // If token expired / unauthorized, evict and retry once
      if (res.status === 401 || res.status === 403) {
        evictN33Cookie();
        cookie = await getOrCreateN33Cookie(credentials, proxyOptions);
        res = await proxyAwareFetch(
          N33_STREAM_URL,
          {
            method: "POST",
            body: formData,
            headers: {
              Cookie: cookie,
              Origin: N33_BASE,
              Referer: `${N33_BASE}/chat`,
              "User-Agent": USER_AGENT,
            },
            signal,
          },
          proxyOptions
        );
      }
    } catch (err) {
      if (err.name === "AbortError") throw err;
      throw new Error(`N33 connection error: ${err.message}`);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        response: new Response(
          JSON.stringify({
            error: {
              message: `N33 upstream returned HTTP ${res.status}: ${errText.slice(0, 200)}`,
              type: "n33_upstream_error",
              code: res.status,
            },
          }),
          { status: res.status, headers: { "Content-Type": "application/json" } }
        ),
      };
    }

    const id = `chatcmpl-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
    const created = Math.floor(Date.now() / 1000);
    const streamModel = requestedModel;

    // Handle non-streaming
    if (!stream) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;
          try {
            const ev = JSON.parse(jsonStr);
            if (ev.chunk) fullText += ev.chunk;
          } catch {}
        }
      }

      if (hasTools) {
        const { content, toolCalls, finishReason } = buildToolAwareResult(fullText, requestedTools, id);
        return {
          response: new Response(
            JSON.stringify({
              id,
              object: "chat.completion",
              created,
              model: streamModel,
              choices: [
                {
                  index: 0,
                  message: {
                    role: "assistant",
                    content: content || null,
                    ...(toolCalls ? { tool_calls: toolCalls } : {}),
                  },
                  finish_reason: finishReason || "stop",
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          ),
        };
      }

      return {
        response: new Response(
          JSON.stringify({
            id,
            object: "chat.completion",
            created,
            model: streamModel,
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: fullText },
                finish_reason: "stop",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        ),
      };
    }

    // Handle streaming SSE
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const transformedStream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        let accumulatedText = "";
        let emittedRole = false;
        let isToolCalling = false;

        const emit = (obj) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        };

        const chunk = (delta, finish = null) => {
          emit({
            id,
            object: "chat.completion.chunk",
            created,
            model: streamModel,
            choices: [{ index: 0, delta, finish_reason: finish }],
          });
        };

        const ensureRole = () => {
          if (!emittedRole) {
            emittedRole = true;
            chunk({ role: "assistant", content: "" });
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const jsonStr = trimmed.slice(5).trim();
              if (!jsonStr) continue;

              let ev;
              try {
                ev = JSON.parse(jsonStr);
              } catch {
                continue;
              }

              if (ev.chunk) {
                accumulatedText += ev.chunk;

                if (hasTools) {
                  const accTrimmed = accumulatedText.trim();
                  if (accTrimmed.startsWith("<tool") || accTrimmed.startsWith("<tool_call")) {
                    isToolCalling = true;
                    continue;
                  }
                  if (!isToolCalling && accumulatedText.length > 25 && !accumulatedText.includes("<tool")) {
                    ensureRole();
                    chunk({ content: ev.chunk });
                    continue;
                  }
                }

                if (!isToolCalling) {
                  ensureRole();
                  chunk({ content: ev.chunk });
                }
              }

              if (ev.done) {
                if (hasTools && isToolCalling) {
                  const { content, toolCalls, finishReason } = buildToolAwareResult(accumulatedText, requestedTools, id);
                  if (toolCalls && toolCalls.length > 0) {
                    chunk({ tool_calls: toolCalls }, finishReason || "tool_calls");
                  } else if (content) {
                    ensureRole();
                    chunk({ content }, finishReason || "stop");
                  }
                } else {
                  chunk({}, "stop");
                }
              }
            }
          }

          controller.enqueue(encoder.encode(SSE_DONE));
          controller.close();
        } catch (streamErr) {
          controller.error(streamErr);
        }
      },
      cancel() {
        reader.cancel().catch(() => {});
      },
    });

    return {
      response: new Response(transformedStream, {
        status: 200,
        headers: { ...SSE_HEADERS },
      }),
    };
  }
}

export default N33Executor;
