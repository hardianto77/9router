// Node loader hooks so custom-server.js can import the Next.js source tree
// (src/* uses "@/..." aliases, plus a few CJS packages with named exports).
// Only used by the auth guard — Next.js itself bundles normally via webpack.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..") + path.sep;
const SRC = ROOT + "src" + path.sep;
const OPENSSE = ROOT + "open-sse" + path.sep;

function tryResolve(p) {
  if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  for (const ext of [".js", ".mjs"]) if (fs.existsSync(p + ext)) return p + ext;
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
    for (const idx of ["index.js", "index.mjs"]) {
      const q = path.join(p, idx);
      if (fs.existsSync(q)) return q;
    }
  }
  return null;
}

// node-machine-id is CJS whose named exports the ESM lexer cannot see.
const NMID_SHIM = `
import { createRequire } from "node:module";
const mod = createRequire(${JSON.stringify(ROOT)})("node-machine-id");
export const machineIdSync = mod.machineIdSync;
export const machineId = mod.machineId;
export default mod;
`;

// Self-contained NextResponse shim so the auth guard doesn't depend on Next.js internal server.js
// which gets pruned in Next.js standalone tracing builds.
const NEXT_SERVER_SHIM = `
export class NextResponse extends Response {
  static json(body, init = {}) {
    const headers = new Headers(init.headers);
    headers.set("content-type", "application/json; charset=utf-8");
    return new NextResponse(JSON.stringify(body), { ...init, headers });
  }
  static redirect(url, status = 307) {
    const headers = new Headers();
    headers.set("location", typeof url === "string" ? url : (url.href || String(url)));
    return new NextResponse(null, { status: typeof status === "number" ? status : 307, headers });
  }
  static next(init = {}) {
    const headers = new Headers(init.headers);
    headers.set("x-middleware-next", "1");
    return new NextResponse(null, { status: 200, headers });
  }
}
export default { NextResponse };
`;

// UUID v4 fallback shim
const UUID_SHIM = `
import crypto from "node:crypto";
export const v4 = () => crypto.randomUUID();
export default { v4 };
`;

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const r = tryResolve(SRC + specifier.slice(2));
    if (r) return { url: pathToFileURL(r).href, shortCircuit: true };
  }
  if (specifier === "open-sse" || specifier.startsWith("open-sse/")) {
    const sub = specifier === "open-sse" ? "index.js" : specifier.slice("open-sse/".length);
    const r = tryResolve(OPENSSE + sub);
    if (r) return { url: pathToFileURL(r).href, shortCircuit: true };
  }
  if (specifier === "next/server") {
    const nextServerPath = path.join(ROOT, "node_modules", "next", "server.js");
    if (fs.existsSync(nextServerPath)) {
      return { url: pathToFileURL(nextServerPath).href, shortCircuit: true };
    }
    return { url: "data:text/javascript," + encodeURIComponent(NEXT_SERVER_SHIM), shortCircuit: true };
  }
  if (specifier === "node-machine-id") {
    return { url: "data:text/javascript," + encodeURIComponent(NMID_SHIM), shortCircuit: true };
  }
  if (specifier === "uuid") {
    const uuidPath = path.join(ROOT, "node_modules", "uuid");
    if (fs.existsSync(uuidPath)) {
      return next(specifier, context);
    }
    return { url: "data:text/javascript," + encodeURIComponent(UUID_SHIM), shortCircuit: true };
  }
  return next(specifier, context);
}
