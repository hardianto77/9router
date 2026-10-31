import { describe, expect, it } from "vitest";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve as resolveLocalSpecifier } from "../../scripts/auth-guard-hooks.mjs";

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), "../..");

describe("standalone auth-guard ESM resolver", () => {
  it("resolves extensionless relative imports from the local src tree", async () => {
    const parentURL = pathToFileURL(resolvePath(root, "src/shared/constants/models.js")).href;
    const result = await resolveLocalSpecifier(
      "./pluginKeys",
      { parentURL },
      async () => { throw new Error("local import should be resolved by the hook"); }
    );

    expect(result.shortCircuit).toBe(true);
    expect(fileURLToPath(result.url)).toBe(resolvePath(root, "src/shared/constants/pluginKeys.js"));
  });

  it("delegates relative imports from third-party packages to Node", async () => {
    const parentURL = pathToFileURL(resolvePath(root, "node_modules/next/server.js")).href;
    let delegatedSpecifier;
    const result = await resolveLocalSpecifier("./internal.js", { parentURL }, async (specifier) => {
      delegatedSpecifier = specifier;
      return { url: "file:///external/internal.js" };
    });

    expect(delegatedSpecifier).toBe("./internal.js");
    expect(result.url).toBe("file:///external/internal.js");
  });
});
