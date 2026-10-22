export default {
  id: "duckduckgo-web",
  priority: 149,
  alias: "duckduckgo-web",
  aliases: ["ddgw", "duckchat", "duck-ai", "duckai"],
  uiAlias: "ddgw",
  display: {
    name: "DuckDuckGo AI (Duck.ai)",
    icon: "bolt",
    color: "#DE5833",
    textIcon: "DDG",
    website: "https://duck.ai",
    notice: {
      apiKeyUrl: "https://duck.ai",
    },
  },
  category: "webCookie",
  authType: "cookie",
  authHint: "Paste your x-vqd-4 header or session cookie from duck.ai / duckduckgo.com/duckchat (Optional, can run anonymous)",
  transport: {
    baseUrl: "https://duckduckgo.com/duckchat/v1",
    format: "openai",
    authType: "cookie",
    auth: { header: "Cookie", scheme: "raw" },
  },
  models: [
    { id: "gpt-4o-mini", name: "GPT-4o Mini (via Duck.ai)" },
    { id: "o3-mini", name: "o3-mini (via Duck.ai)" },
    { id: "meta-llama/Llama-3.3-70B-Instruct", name: "Llama 3.3 70B (via Duck.ai)" },
    { id: "mistralai/Mistral-Small-24B-Instruct-2501", name: "Mistral Small 24B (via Duck.ai)" },
  ],
  passthroughModels: true,
};
