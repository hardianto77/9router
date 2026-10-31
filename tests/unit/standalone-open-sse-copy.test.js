import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyStandaloneAssets } from "../../scripts/copy-standalone-assets.mjs";

let projectRoot;

afterEach(() => {
  if (projectRoot) rmSync(projectRoot, { recursive: true, force: true });
  projectRoot = undefined;
});

describe("standalone local package staging", () => {
  it("mirrors open-sse under node_modules for bare runtime imports", () => {
    projectRoot = mkdtempSync(join(tmpdir(), "aries-standalone-copy-"));
    mkdirSync(join(projectRoot, ".next", "standalone"), { recursive: true });
    mkdirSync(join(projectRoot, "open-sse", "services"), { recursive: true });
    writeFileSync(join(projectRoot, "package.json"), JSON.stringify({ dependencies: {} }));
    writeFileSync(join(projectRoot, "open-sse", "services", "runtime.js"), "export const ready = true;\n");

    copyStandaloneAssets({ projectRoot });

    const packageFile = join(projectRoot, ".next", "standalone", "node_modules", "open-sse", "services", "runtime.js");
    expect(existsSync(packageFile)).toBe(true);
    expect(readFileSync(packageFile, "utf8")).toContain("export const ready = true");
  });
});
