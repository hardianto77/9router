// Runtime interceptor for Custom Plugins.
//
// Plugins are REAL, not prompt injection:
//   - Image Vision: signals caps.vision = true on the request so the translator
//     keeps raw image blocks intact instead of stripping them.
//   - Think Deeper: sets native reasoning parameters (reasoning_effort, thinking
//     config) so the provider routes to its deepest reasoning tier.
//   - Speed Mode: sets native reasoning-disabled parameters so the provider
//     skips all thinking and returns the answer directly.
//   - JSON Guard: repairs machine-readable output on the way back (fenced JSON,
//     prose around it, Python literals, a tail cut off by the output limit) and
//     removes tool-call argument names the declared schema never had.
//   - Context Squeezer: trims a conversation that no longer fits the model's
//     window, keeping the newest turns and dropping the oldest behind a recap.
//
// This module owns selection (which plugin applies to which model) and the
// request side. The two response-side repairs live next door so the chat path
// can reach them without pulling the plugin registry in:
//   - open-sse/translator/concerns/jsonGuard.js       (answers)
//   - open-sse/translator/concerns/contextSqueezer.js (requests)

import { getSettings } from "@/lib/localDb";
import { FORMATS } from "open-sse/translator/formats.js";
import { matchesModel } from "@/shared/utils/pluginModelMatch.js";
import { injectSystemPrompt } from "open-sse/rtk/systemInject.js";

// Default plugin state for fresh installs / missing settings
const DEFAULT_PLUGINS = {
  adaptiveThinking: { enabled: false, models: [], level: "full" },
};

// Cached plugin settings to avoid DB hits on every stream chunk
let cachedPlugins = null;
let lastFetch = 0;
const CACHE_TTL_MS = 2000;

async function getPluginConfig() {
  const now = Date.now();
  if (cachedPlugins && now - lastFetch < CACHE_TTL_MS) {
    return cachedPlugins;
  }
  try {
    const settings = await getSettings();
    cachedPlugins = settings?.customPlugins || DEFAULT_PLUGINS;
    lastFetch = now;
  } catch {
    cachedPlugins = DEFAULT_PLUGINS;
  }
  return cachedPlugins;
}

export function clearPluginCache() {
  cachedPlugins = null;
  lastFetch = 0;
}

function matchesModel(modelList, modelKey) {
  if (!Array.isArray(modelList) || !modelKey) return false;
  const key = String(modelKey).toLowerCase();
  const bare = key.includes("/") ? key.split("/").pop() : key;
  return modelList.some((m) => {
    const s = String(m).toLowerCase();
    const sBare = s.includes("/") ? s.split("/").pop() : s;
    return s === key || sBare === bare || s === bare || key === sBare;
  });
}

/**
 * Every name this request could be called by, in the order the layers know it:
 * what the client asked for, provider/model as routed, the bare model id, and the
 * bare name behind a namespaced call. Shared by the request and response paths so
 * a model picked for a plugin on the dashboard is found by identical rules on
 * both sides — a plugin that silently stopped applying halfway through a request
 * would be worse than one that never applied.
 */
export function modelKeysToTest(requestedModel, provider, model) {
  const keys = [
    requestedModel,
    `${provider}/${model}`,
    model,
  ].filter(Boolean);

  if (requestedModel && requestedModel.includes("/")) {
    keys.push(requestedModel.split("/").pop());
  }
  return keys;
}

/**
 * Adaptive Thinking & Multi-Framework Cognitive Architecture.
 *
 * Real synthesized cognitive protocol derived from:
 * 1. Depth Protocol v2.0 (Kshitijpalsinghtomar/depth-skills): Interrupts premature closure,
 *    demands root problem reframing, minimum 3 distinct hypothesis branches, and explicit failure envelope boundaries.
 * 2. Adversaria Dialectic Engine (damionrashford/Adversaria): Dissoi Logoi & Crucible red-team elenchus,
 *    hostile challenge, and truth survivor verification before answering.
 * 3. Thinking Frameworks & First Principles (tjboudreaux/cc-thinking-skills):
 *    Separates physics/math/measured facts from conventional assumptions, discarding false limits.
 * 4. Superpowers Methodology (obra/superpowers):
 *    Systematic step-by-step verification, complexity reduction, and grounded evidence.
 */
export const ADAPTIVE_THINKING_COGNITIVE_ARCHITECTURE = `[Cognitive Architecture: Multi-Framework Adaptive Thinking Active]
You are operating under an integrated multi-agent cognitive architecture synthesized from verified agent reasoning frameworks (The Depth Protocol v2.0, Adversaria Dialectic Engine, First Principles Decomposition, and Superpowers).

🛑 Core Mandate: INTERRUPT PREMATURE CLOSURE.
Do not emit the statistically familiar, first-match surface response. The easy pattern-matched answer is a local optimum. You must systematically explore, stress-test, and verify before delivering.

Before presenting your final answer, execute this structured reasoning protocol:

<thinking_process>
1. REFRAME & DECONSTRUCT (Depth Protocol & First Principles):
   - Uncover the true root objective behind the user's prompt (translate the prompt to actual problem structure).
   - Classify claimed constraints: Separate hard facts (math, logic, measured limits) from artificial conventions or analogies. Discard unsupported assumptions.

2. HYPOTHESIS DIVERGENCE (Multi-Branch Exploration):
   - Formulate at least 2 to 3 genuinely distinct approaches that disagree on what they optimize for (e.g. simplicity vs performance vs fault tolerance).
   - Identify what each approach assumes, what it sacrifices, and the precise conditions under which it fails.

3. ADVERSARIAL STRESS-TEST (Crucible & Dissoi Logoi):
   - Mount the strongest possible critique against your preferred approach: What does it get right in common scenarios but fail at in critical edge cases?
   - Conduct a self-directed Red Team challenge: Attempt to break your own logic. If an approach fails this test, revise or replace it.

4. FAILURE ENVELOPE & BOUNDARIES (Systematic Superpowers):
   - State the operational boundaries: Where does this solution break (scale limits, boundary inputs, environmental shifts)?
   - Identify any blind spot the user might not be actively considering.

5. GROUNDED SYNTHESIS:
   - Deliver the verified resolution concisely, clearly, and directly without filler, fluff, or unwarranted hesitation.
</thinking_process>

Adaptive Depth Tuning:
- For trivial greetings or simple lookups: Keep internal verification lightweight and deliver directly.
- For non-trivial engineering, architecture, logic, code, or strategic problems: Enforce the complete multi-framework thinking protocol thoroughly.`;

export function applyAdaptiveThinking(body, sourceFormat) {
  if (!body) return;

  // 1. Native Provider Reasoning Parameters
  if (sourceFormat === FORMATS.CLAUDE) {
    // Claude uses thinking object
    body.thinking = {
      type: "enabled",
      budget_tokens: body.thinking?.budget_tokens || 10240,
    };
  } else {
    // OpenAI / OpenAI-compatible
    body.reasoning_effort = "high";
    // Some providers use these alternate fields
    if (!body.reasoning) {
      body.reasoning = { effort: "high" };
    }
  }
}

  // 2. Multi-Framework Cognitive Architecture Injection
  injectSystemPrompt(body, sourceFormat, ADAPTIVE_THINKING_COGNITIVE_ARCHITECTURE);
}

/* ------------------------------------------------------------------ *
 * Dispatch
 * ------------------------------------------------------------------ */

/**
 * Run every plugin that applies to the target model.
 *
 * Returns the capability flags chatCore needs before it strips modalities, plus
 * the two response-path flags so the response layer knows whether to repair the
 * answer without asking the settings table a second time.
 */
export async function applyCustomPlugins(body, provider, model, sourceFormat, requestedModel) {
  const config = await getPluginConfig();
  const keysToTest = modelKeysToTest(requestedModel, provider, model);
  const checkMatch = (modelList) => keysToTest.some((key) => matchesModel(modelList, key));

  const result = {
    isAdaptiveThinkingActive: false,
  };

  if (config.adaptiveThinking?.enabled && checkMatch(config.adaptiveThinking.models)) {
    result.isAdaptiveThinkingActive = true;
    result.isThinkDeeperActive = true; // backward compat with existing loggers/badges
    applyAdaptiveThinking(body, sourceFormat);
  }

  return result;
}

export { getPluginConfig };
