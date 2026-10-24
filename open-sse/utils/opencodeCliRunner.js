import fs from "fs";
import path from "path";
import { spawn, execSync } from "child_process";

export function findOpencodeBinary() {
  const isWin = process.platform === "win32";

  const candidates = isWin
    ? [
        process.env.OPENCODE_BIN,
        path.join(process.cwd(), "node_modules", ".bin", "opencode.cmd"),
        path.join(process.cwd(), "node_modules", ".bin", "opencode.exe"),
        path.join(process.cwd(), "node_modules", ".bin", "opencode.bat"),
        path.join(process.cwd(), "node_modules", ".bin", "opencode"),
      ]
    : [
        process.env.OPENCODE_BIN,
        "/usr/local/bin/opencode",
        "/usr/bin/opencode",
        "/root/bin/opencode",
        "/tmp/oc-cli/package/bin/opencode",
        path.join(process.cwd(), "node_modules", ".bin", "opencode"),
        path.join(process.cwd(), "node_modules", ".bin", "opencode.cmd"),
      ];

  for (const bin of candidates) {
    if (!bin) continue;
    try {
      if (fs.existsSync(bin)) {
        if (isWin && !/\.(cmd|exe|bat)$/i.test(bin)) {
          if (fs.existsSync(`${bin}.cmd`)) return `${bin}.cmd`;
          if (fs.existsSync(`${bin}.exe`)) return `${bin}.exe`;
          if (fs.existsSync(`${bin}.bat`)) return `${bin}.bat`;
        }
        return bin;
      }
    } catch {
      /* ignore */
    }
  }

  // Probe system PATH
  try {
    const cmd = isWin ? "where opencode 2>nul" : "which opencode 2>/dev/null";
    const lines = execSync(cmd, { encoding: "utf8", timeout: 2000 })
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    for (const p of lines) {
      if (isWin) {
        if (/\.(cmd|exe|bat)$/i.test(p) && fs.existsSync(p)) return p;
        if (fs.existsSync(`${p}.cmd`)) return `${p}.cmd`;
        if (fs.existsSync(`${p}.exe`)) return `${p}.exe`;
      } else if (fs.existsSync(p)) {
        return p;
      }
    }
    if (lines[0] && fs.existsSync(lines[0])) return lines[0];
  } catch {
    /* ignore */
  }

  return null;
}

export function formatOpencodeCliPrompt(body) {
  if (!body) return "";

  const systemParts = [];

  // 1. Direct system field (Anthropic or custom)
  if (typeof body.system === "string" && body.system.trim()) {
    systemParts.push(body.system.trim());
  } else if (Array.isArray(body.system)) {
    const s = body.system
      .map((p) => (typeof p === "string" ? p : p?.text || ""))
      .filter(Boolean)
      .join("\n")
      .trim();
    if (s) systemParts.push(s);
  }

  // 2. System and developer messages from body.messages
  const dialogMsgs = [];
  if (Array.isArray(body.messages)) {
    for (const msg of body.messages) {
      if (!msg) continue;
      const role = String(msg.role || "").toLowerCase();
      const content = msg.content;
      const text = typeof content === "string"
        ? content.trim()
        : Array.isArray(content)
          ? content
              .map((c) => (typeof c === "string" ? c : c?.text || ""))
              .filter(Boolean)
              .join("\n")
              .trim()
          : "";

      if (role === "system" || role === "developer") {
        if (text) systemParts.push(text);
      } else if (role === "user" || role === "assistant") {
        if (text) dialogMsgs.push({ role, text });
      }
    }
  }

  // If there are no dialog messages, return system text directly
  if (dialogMsgs.length === 0) {
    return systemParts.join("\n\n").trim();
  }

  // If there are no system parts and only 1 user message, return it directly
  if (systemParts.length === 0 && dialogMsgs.length === 1 && dialogMsgs[0].role === "user") {
    return dialogMsgs[0].text;
  }

  const promptSections = [];

  // Add system instructions section
  if (systemParts.length > 0) {
    promptSections.push(`[System Instructions]\n${systemParts.join("\n\n")}`);
  }

  // If multi-turn conversation, format earlier history
  if (dialogMsgs.length > 1) {
    const earlierTurns = dialogMsgs.slice(0, -1);
    const historyText = earlierTurns
      .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.text}`)
      .join("\n\n");
    promptSections.push(`[Conversation History]\n${historyText}`);

    const lastMsg = dialogMsgs[dialogMsgs.length - 1];
    promptSections.push(`User: ${lastMsg.text}`);
  } else {
    // Single user turn with system instructions
    promptSections.push(`User: ${dialogMsgs[0].text}`);
  }

  return promptSections.join("\n\n").trim();
}

export function executeOpencodeCli({
  opencodeBin,
  targetModel,
  promptText,
  proxyOptions,
  signal,
  log,
  rawModel,
  providerTag = "OPENCODE",
}) {
  const env = { ...process.env };
  if (!env.HOME || env.HOME === "/") {
    env.HOME = "/app/data-home";
  }
  const proxyUrl = proxyOptions?.connectionProxyUrl || "";
  if (proxyUrl) {
    env.HTTP_PROXY = proxyUrl;
    env.HTTPS_PROXY = proxyUrl;
    env.http_proxy = proxyUrl;
    env.https_proxy = proxyUrl;
  }

  const isWin = process.platform === "win32";
  let executable = opencodeBin;
  if (isWin && !/\.(cmd|exe|bat)$/i.test(executable)) {
    if (fs.existsSync(`${executable}.cmd`)) {
      executable = `${executable}.cmd`;
    } else if (fs.existsSync(`${executable}.exe`)) {
      executable = `${executable}.exe`;
    } else if (fs.existsSync(`${executable}.bat`)) {
      executable = `${executable}.bat`;
    }
  }

  const child = spawn(
    executable,
    ["run", "--model", targetModel, "--format", "default", promptText],
    {
      cwd: process.cwd(),
      env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: isWin,
      windowsHide: true,
    }
  );

  if (log?.info) {
    log.info(providerTag, `Engine running via ${executable} for ${targetModel}`);
  }

  if (signal) {
    signal.addEventListener("abort", () => {
      if (!child.killed) child.kill("SIGTERM");
    });
  }

  const responseId = `chatcmpl-oc-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);

  const sseStream = new ReadableStream({
    start(controller) {
      const emit = (str) => {
        try {
          controller.enqueue(new TextEncoder().encode(str));
        } catch {
          /* fail open if stream closed */
        }
      };

      // Leading role chunk
      emit(
        `data: ${JSON.stringify({
          id: responseId,
          object: "chat.completion.chunk",
          created,
          model: rawModel,
          choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }],
        })}\n\n`
      );

      child.stdout.on("data", (chunk) => {
        const text = chunk.toString("utf-8");
        if (text) {
          emit(
            `data: ${JSON.stringify({
              id: responseId,
              object: "chat.completion.chunk",
              created,
              model: rawModel,
              choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
            })}\n\n`
          );
        }
      });

      child.on("close", (code) => {
        emit(
          `data: ${JSON.stringify({
            id: responseId,
            object: "chat.completion.chunk",
            created,
            model: rawModel,
            choices: [{ index: 0, delta: {}, finish_reason: code === 0 ? "stop" : "error" }],
          })}\n\n`
        );
        emit("data: [DONE]\n\n");
        controller.close();
      });

      child.on("error", (err) => {
        emit(
          `data: ${JSON.stringify({
            error: { message: `OpenCode CLI process error: ${err.message}`, type: "cli_error" },
          })}\n\n`
        );
        emit("data: [DONE]\n\n");
        controller.close();
      });
    },
  });

  return {
    response: new Response(sseStream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }),
    url: "opencode://cli/run",
    headers: {},
    transformedBody: { model: targetModel, prompt: promptText.slice(0, 100) },
  };
}
