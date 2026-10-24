import { readFileSync } from "fs";

/**
 * OpenCode V2 1.19.4 full fingerprint definitions extracted from official CLI traffic.
 */
let V2_DEFINITIONS = null;
try {
  const jsonPath = new URL("./opencodeV2Defs.json", import.meta.url);
  V2_DEFINITIONS = JSON.parse(readFileSync(jsonPath, "utf-8"));
} catch {
  try {
    V2_DEFINITIONS = JSON.parse(readFileSync("/tmp/fingerprint_v2_defs.json", "utf-8"));
  } catch {
    V2_DEFINITIONS = {};
  }
}

export const OPENCODE_V2_FINGERPRINT_TOOLS = Object.keys(V2_DEFINITIONS).length > 0
  ? Object.keys(V2_DEFINITIONS)
  : ["bash", "read", "edit", "glob", "grep", "skill", "task", "todowrite", "webfetch", "websearch", "write"];

export function getV2ToolDefinitions() {
  return V2_DEFINITIONS;
}

export function applyOpencodeV2Tools(body) {
  if (!body || typeof body !== "object") return;
  const tools = Array.isArray(body.tools) ? [...body.tools] : [];
  const existingNames = new Set(tools.map((t) => t?.function?.name || t?.name).filter(Boolean));

  for (const name of OPENCODE_V2_FINGERPRINT_TOOLS) {
    if (existingNames.has(name)) continue;
    const def = V2_DEFINITIONS[name];
    if (def) {
      tools.push({
        type: "function",
        function: {
          name,
          description: def.description,
          parameters: def.parameters,
        },
      });
    }
  }

  body.tools = tools;
  if (!body.tool_choice) body.tool_choice = "auto";
}
