export default {
  id: "dolphin",
  priority: 110,
  alias: "dolphin",
  aliases: [
    "dp",
    "dphn",
  ],
  uiAlias: "dolphin",
  display: {
    name: "Dolphin Network",
    icon: "fish",
    color: "#06B6D4",
    textIcon: "DP",
    website: "https://v2.dphn.ai",
    notice: {
      text: "Dolphin Network decentralized inference. OpenAI-compatible API powered by DolphinPod nodes with up to 1M context.",
      apiKeyUrl: "https://v2.dphn.ai",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://lighthouse.dphn.ai/run/text-v/v1/chat/completions",
    validateUrl: "https://lighthouse.dphn.ai/run/text-v/v1/models",
    retry: {
      429: 2,
    },
  },
  models: [
    { id: "deepseek-ai/DeepSeek-V4.1-Flash", name: "DeepSeek V4.1 Flash (1M Context)" },
    { id: "nvidia/Gemma-4-26B-A4B-NVFP4", name: "Gemma 4 26B A4B NVFP4 (256k Context)" },
  ],
  modelsFetcher: { url: "https://lighthouse.dphn.ai/run/text-v/v1/models", type: "openai" },
  passthroughModels: true,
};
