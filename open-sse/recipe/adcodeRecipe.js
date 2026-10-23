import crypto from "node:crypto";

/**
 * ADCode / Tagflow wire recipe — encrypted at rest.
 *
 * Everything that describes *how* to talk to the upstream gateway (endpoints,
 * client headers, user agent, and the Firebase web key) lives in an
 * AES-256-GCM blob instead of plain source. The executor imports this module
 * and never spells any of it out, so the recipe is not readable from the repo,
 * from `npm i xrouter-ai`, or from a bundled chunk.
 *
 * Override with ADCODE_RECIPE_KEY when rotating the at-rest key; the plaintext
 * itself can be replaced by re-running scripts/genAdcodeRecipe.mjs.
 *
 * Note: this is obfuscation with integrity checking, not a secret-management
 * boundary — a determined reader of the running process can still recover the
 * plaintext. It exists so the recipe is not copy-pasteable from public source.
 */

const SALT = "xrouter-adcode-recipe-v1";
const BLOB =
  "u37kuYHXylxeoVIH18meAsM7ItGdKOcvp49Ji3tdgxs7+uEUJWozxC8JXVaedeDT3XZEczzC6j5p" +
  "DYwkevcuub6dpENalbFG88xoJgJBQSr3p2nkM1eh/fEa+rT2ljRF5EeEW46ZUEiZ1msxM5XHd9Xi" +
  "4V6yXByA0UWlwYeUXj/DFlKk31Z39UOWc5vHt3L53KsO8A/gAzpEclUYlwVjWcjduJBSGaFRjbw8" +
  "FcaAWcdo5qhNFCSuMryhY3mv1GoU5oMAZ26UyS4MiVmo50zg42f69e4jJk03/dD8nzZoFi3ZuvS8" +
  "2EwACruAWvmwa7TURE9ulQWKLSh1iLsggKIR68PnXkC8X9wyeQHGYEFjLfFGXDfcr4pTwXV/sghX" +
  "BeJS4u0vDZEMli5TCEibI0DUpZ5f5PTY7mg39MDGC+yUWqDECqLlXEbN0SnEn45p40UWIFr/INv5" +
  "xODxgIaDF0wIeMYUvp6bIQjTz639T29IkroLbS/8N10DUb6t+Og6I3yxL0vuBK1HBGmm/gimmUVG" +
  "Kb4PugP5JbofCjRMlraX";

function deriveKey() {
  return crypto.createHash("sha256")
    .update(process.env.ADCODE_RECIPE_KEY || SALT)
    .digest();
}

let cache = null;

export function getRecipe() {
  if (cache) return cache;
  const raw = Buffer.from(BLOB, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const body = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", deriveKey(), iv);
  decipher.setAuthTag(tag);
  const json = Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  cache = JSON.parse(json);
  return cache;
}

export default getRecipe;
