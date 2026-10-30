import { defineConfig } from "vitest/config";
import { resolve } from "path";
import os from "node:os";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");

export default defineConfig({
  root: repoRoot,
  test: {
    environment: "node",
    globals: true,
    // Tests must never touch the real user DB (~/.xrouter): point DATA_DIR at a
    // throwaway directory for the whole run, otherwise fixtures write rows into
    // the live database (seeded keys/connections leak into production).
    env: {
      DATA_DIR: resolve(os.tmpdir(), "xrouter-test-data-" + process.pid),
    },
    include: ["tests/**/*.test.js"],
    // Keep dependencies and generated output out of test collection at repo root.
    exclude: ["**/node_modules/**", "**/.claude/**", "**/dist/**"],
    // Allow many it.concurrent cases (real provider smoke runs ~50 providers in parallel)
    maxConcurrency: 60,
    // Suppress noisy console output from handlers under test
    silent: false,
  },
  resolve: {
    // Use array form so subpath aliases (e.g. "@/lib/db/index.js") resolve correctly.
    alias: [
      { find: /^open-sse\//, replacement: resolve(__dirname, "../open-sse") + "/" },
      { find: "open-sse", replacement: resolve(__dirname, "../open-sse") },
      { find: /^@\//, replacement: resolve(__dirname, "../src") + "/" },
    ],
  },
});
