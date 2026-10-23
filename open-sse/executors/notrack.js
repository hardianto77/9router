import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";
import { proxyAwareFetch } from "../utils/proxyFetch.js";
import {
  prepareToolMessages,
  parseToolCallReply,
  emitToolCallChunks,
} from "./deepseekWebToolBridge.js";

const NOTRACK_HOST = "notrack.ai";
const NOTRACK_BASE = "https://notrack.ai";
const NOTRACK_REGISTER = `${NOTRACK_BASE}/api/account.php`;
const NOTRACK_DISPATCH = `${NOTRACK_BASE}/api/dispatch`;

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

let activeCookie = null;
let activeCookieExpires = 0;

export async function getOrCreateNoTrackCookie(credentials, proxyOptions = null) {
  const userCookie = credentials?.cookie || credentials?.apiKey;
  if (userCookie && typeof userCookie === "string" && userCookie.includes("nt_session=")) {
    return userCookie;
  }
  if (activeCookie && Date.now() < activeCookieExpires) {
    return activeCookie;
  }

  // Fast auto-registration (no captcha, 1-year session)
  const nick = `nt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const pass = `XR#${Math.random().toString(36).slice(2, 10)}!9`;
  try {
    const regRes = await proxyAwareFetch(
      NOTRACK_REGISTER,
      {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/json",
          "X-Requested-With": "nt",
          Origin: NOTRACK_BASE,
          Referer: `${NOTRACK_BASE}/chat`,
        },
        body: JSON.stringify({ do: "register", nickname: nick, password: pass, device: "web" }),
      },
      proxyOptions
    );

    const setCookies = regRes.headers.get("set-cookie") || "";
    const m = setCookies.match(/nt_session=([^;]+)/);
    if (m) {
      activeCookie = `nt_session=${m[1]}`;
      activeCookieExpires = Date.now() + 30 * 24 * 3600 * 1000;
      return activeCookie;
    }
  } catch (err) {
    console.error("[NoTrack] auto-register failed:", err?.message || err);
  }
  return activeCookie || "";
}

function resolveModelCode(model) {
  const m = String(model || "").toLowerCase();
  if (m.includes("chatgpt") || m === "b" || m.endsWith("/b")) return "B";
  if (m.includes("minimax") || m === "a" || m.endsWith("/a")) return "A";
  return "C";
}

function foldMessages(messages, maxChars = 3850) {
  if (!Array.isArray(messages) || messages.length === 0) return "";

  // Extract text per message
  const normalized = messages.map((msg) => {
    let text = "";
    if (typeof msg.content === "string") text = msg.content;
    else if (Array.isArray(msg.content)) {
      text = msg.content.map((c) => c?.text || "").join("");
    }
    return { role: msg.role || "user", text };
  });

  // Always preserve the active user command (the last message)
  const last = normalized[normalized.length - 1];
  let lastText = last ? (last.role === "user" ? last.text : `${last.role}: ${last.text}`) : "";
  if (lastText.length > maxChars - 200) {
    lastText = lastText.slice(0, maxChars - 200);
  }

  // Find system prompt or tool contract if any
  const sysMsg = normalized.find((m) => m.role === "system");
  let sysText = sysMsg ? `[System Instructions]:\n${sysMsg.text}\n\n` : "";
  if (sysText.length > 1200) {
    sysText = sysText.slice(0, 1200) + "\n...\n\n";
  }

  // Budget remaining for earlier conversation turns
  let budget = maxChars - lastText.length - sysText.length;
  const historyParts = [];

  // Walk backwards from second to last message
  for (let i = normalized.length - 2; i >= 0; i--) {
    const m = normalized[i];
    if (m === sysMsg) continue;
    let label = m.role === "assistant" ? "Assistant: " : m.role === "tool" ? "[Tool Result]: " : "User: ";
    let content = m.text;
    if (content.length > 600) {
      content = content.slice(0, 250) + "\n...[truncated]...\n" + content.slice(-250);
    }
    const line = label + content + "\n\n";
    if (budget - line.length < 0) break;
    budget -= line.length;
    historyParts.unshift(line);
  }

  const result = (sysText + historyParts.join("") + lastText).trim();
  return result.length > maxChars ? result.slice(0, maxChars) : result;
}

export class NoTrackExecutor extends BaseExecutor {
  constructor() {
    super("notrack", PROVIDERS["notrack"] || { baseUrl: NOTRACK_DISPATCH });
    this.noAuth = true;
  }

  buildUrl() {
    return this.config?.baseUrl || NOTRACK_DISPATCH;
  }

  async execute({ model, body, stream, credentials, signal, log, proxyOptions = null }) {
    const cookie = await getOrCreateNoTrackCookie(credentials, proxyOptions);
    const modelCode = resolveModelCode(model);
    const requestedTools = body?.tools;
    const clientHasTools = Array.isArray(requestedTools) && requestedTools.length > 0;

    let effectiveMessages = body?.messages || [];
    if (clientHasTools) {
      const prep = prepareToolMessages(body, body.messages);
      if (prep?.effectiveMessages) {
        effectiveMessages = prep.effectiveMessages;
      }
    }

    const userInput = foldMessages(effectiveMessages);
    const url = this.buildUrl();

    log?.debug?.("FETCH", `NOTRACK → ${url} | model=${model} → ${modelCode} (tools=${clientHasTools})`);

    const upstreamRes = await proxyAwareFetch(
      url,
      {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/json",
          Accept: "text/event-stream, application/json",
          "X-Requested-With": "nt",
          Origin: NOTRACK_BASE,
          Referer: `${NOTRACK_BASE}/chat`,
          Cookie: cookie,
        },
        body: JSON.stringify({
          user_input: userInput,
          mode: "usual",
          model: modelCode,
          persona: "normal",
          max_turns: 6,
          chat_id: null,
          attachments: [],
          regenerate: false,
          edit: false,
          edit_mid: null,
          via: "typed",
        }),
        signal,
      },
      proxyOptions
    );

    if (upstreamRes.status === 429) {
      // Invalidate cookie on rate-limit so next attempt creates new session
      activeCookie = null;
      activeCookieExpires = 0;
    }

    if (!upstreamRes.ok || !upstreamRes.body) {
      return { response: upstreamRes, url, headers: {}, transformedBody: body };
    }

    // Transform NoTrack SSE stream to standard OpenAI format with tool call translation
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const streamModel = model || "notrack";
    const id = `chatcmpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const created = Math.floor(Date.now() / 1000);

    const transformedStream = new ReadableStream({
      async start(controller) {
        const reader = upstreamRes.body.getReader();
        let buffer = "";
        let accumulatedText = "";
        let emittedRole = false;
        let isToolCalling = false;
        let finished = false;

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
              const payloadStr = trimmed.slice(5).trim();
              if (!payloadStr) continue;

              let ev;
              try {
                ev = JSON.parse(payloadStr);
              } catch {
                continue;
              }

              if (ev.type === "delta" && typeof ev.chunk === "string") {
                accumulatedText += ev.chunk;

                if (clientHasTools) {
                  // If model started emitting <tool, hold back chunks to inspect
                  if (accumulatedText.trim().startsWith("<tool") || accumulatedText.trim().startsWith("<tool_call")) {
                    isToolCalling = true;
                    continue;
                  }
                  // Not starting with <tool after initial text -> flush and stream normally
                  if (isToolCalling === false && accumulatedText.length > 25 && !accumulatedText.includes("<tool")) {
                    ensureRole();
                    chunk({ content: ev.chunk });
                    continue;
                  }
                }

                if (!isToolCalling) {
                  ensureRole();
                  chunk({ content: ev.chunk });
                }
              } else if (ev.type === "message" || ev.type === "done") {
                if (finished) continue;
                finished = true;

                if (clientHasTools) {
                  const parsed = parseToolCallReply(accumulatedText, requestedTools);
                  if (parsed.calls && parsed.calls.length > 0) {
                    emitToolCallChunks(chunk, ensureRole, parsed.calls);
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    controller.close();
                    return;
                  }
                }

                // If not a tool call but we buffered
                if (isToolCalling && accumulatedText) {
                  ensureRole();
                  chunk({ content: accumulatedText });
                }

                ensureRole();
                chunk({}, "stop");
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
                return;
              }
            }
          }

          if (!finished) {
            finished = true;
            if (clientHasTools) {
              const parsed = parseToolCallReply(accumulatedText, requestedTools);
              if (parsed.calls && parsed.calls.length > 0) {
                emitToolCallChunks(chunk, ensureRole, parsed.calls);
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
                return;
              }
            }
            if (isToolCalling && accumulatedText) {
              ensureRole();
              chunk({ content: accumulatedText });
            }
            ensureRole();
            chunk({}, "stop");
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        } catch (streamErr) {
          controller.error(streamErr);
        }
      },
    });

    const response = new Response(transformedStream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

    return { response, url, headers: {}, transformedBody: body };
  }
}

export default NoTrackExecutor;
