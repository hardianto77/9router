import { describe, expect, it } from "vitest";

import REGISTRY from "../../open-sse/providers/registry/index.js";
import {
  getExecutor,
  hasSpecializedExecutor,
} from "../../open-sse/executors/index.js";
import AdcodeExecutor from "../../open-sse/executors/adcode.js";
import { FREE_PROVIDERS } from "../../src/shared/constants/providers.js";

describe("ADCode Tagflow provider", () => {
  const entry = REGISTRY.find((provider) => provider.id === "adcode");

  it("supports token-based API-key connections without removing OAuth", () => {
    expect(entry).toBeDefined();
    expect(entry.authModes).toEqual(["oauth", "apikey"]);
    expect(entry.apiKeyPlaceholder).toBe("Firebase refresh token or idToken");
    expect(entry.skipApiKeyValidation).toBe(true);
  });

  it("is available to the Custom Providers UI with its token guidance", () => {
    expect(FREE_PROVIDERS.adcode).toMatchObject({
      name: "ADCode Tagflow",
      authType: "oauth",
      authModes: ["oauth", "apikey"],
      apiKeyPlaceholder: "Firebase refresh token or idToken",
      skipApiKeyValidation: true,
    });
  });

  it("routes Tagflow requests through its specialized executor", () => {
    expect(hasSpecializedExecutor("adcode")).toBe(true);
    expect(getExecutor("adcode")).toBeInstanceOf(AdcodeExecutor);
  });
});
