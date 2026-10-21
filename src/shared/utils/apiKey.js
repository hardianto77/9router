import crypto from "crypto";
import fs from "fs";
import path from "path";
import { DATA_DIR } from "@/lib/dataDir";

// Secret behind the sk-…-crc8 suffix. NEVER ship a literal fallback (public
// repo = published secret). env -> persisted random file -> fresh random.
// Server-side key validation is a direct DB string lookup, so this value is
// only used when minting keys — rotating it never invalidates existing keys.
function loadApiKeySecret() {
  if (process.env.API_KEY_SECRET) return process.env.API_KEY_SECRET;
  const file = path.join(DATA_DIR, "api-key-secret");
  try {
    const existing = fs.readFileSync(file, "utf8").trim();
    if (existing) return existing;
  } catch {}
  const fresh = crypto.randomBytes(32).toString("hex");
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, fresh, { mode: 0o600 });
  } catch {}
  return fresh;
}
const API_KEY_SECRET = loadApiKeySecret();

/**
 * Standard compact 35-digit key format:
 * "sk-" (3) + machineId (16) + "-" (1) + keyId (6) + "-" (1) + crc (8) = 35 characters!
 */
function generateKeyId(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate CRC (8-char HMAC)
 */
function generateCrc(machineId, keyId) {
  return crypto
    .createHmac("sha256", API_KEY_SECRET)
    .update(machineId + keyId)
    .digest("hex")
    .slice(0, 8);
}

/**
 * Default total character length for standardized compact API keys (35 digits)
 */
export const STANDARD_API_KEY_LENGTH = 35;

/**
 * Maximum custom prefix/slug length: exactly 19 characters!
 * Formula: {slug: 19} + "-" (1) + {keyId: 6} + "-" (1) + {crc: 8} = 35 characters total!
 * Reserves exactly 16 characters for the security suffix (1 + 6 + 1 + 8).
 */
export const MAX_KEY_SLUG_LENGTH = 19;
export const MIN_SECRET_LENGTH = 15; // 6 keyId + 1 dash + 8 crc = 15

/**
 * Generate a crypto-secure Base62 random secret suffix of requested length
 */
export function generateKeySecret(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Generate cryptographic secret suffix for a custom slug to reach exactly 35 characters:
 * Format: {keyId: random} + "-" + {crc: 8}
 * If slug is 19 chars -> keyId is 6 chars, crc is 8 chars -> total 35 chars!
 * If slug is shorter (e.g. "kink" = 4 chars) -> keyId expands dynamically to pad total key to 35 chars.
 */
export function generateSecretForSlug(slug, targetTotalLength = STANDARD_API_KEY_LENGTH) {
  const slugLen = typeof slug === "string" ? slug.length : 0;
  // Account for: 2 dashes (between slug-keyId-crc) and 8-char CRC HMAC
  // total = slugLen + 1 + keyIdLen + 1 + 8 = targetTotalLength (35)
  // keyIdLen = targetTotalLength - slugLen - 10
  const keyIdLen = Math.max(6, targetTotalLength - slugLen - 10);
  const keyId = generateKeyId(keyIdLen);
  const crc = generateCrc(slug, keyId);
  return `${keyId}-${crc}`;
}

/**
 * Sanitize and format a custom key slug:
 * - Lowercase / case preserved
 * - Replaces spaces, underscores, and special chars with "-"
 * - Strips leading/trailing dashes and collapses multiple dashes
 * - Clamps to maxLength 19 (so {slug:19}-{keyId:6}-{crc:8} = 35)
 */
export function sanitizeCustomKeySlug(raw, maxLength = MAX_KEY_SLUG_LENGTH) {
  if (!raw || typeof raw !== "string") return "";
  let slug = raw
    .trim()
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug.slice(0, maxLength);
}

/**
 * Generate API key with machineId embedded
 * Format: sk-{machineId}-{keyId}-{crc8}
 * @param {string} machineId - 16-char machine ID
 * @returns {{ key: string, keyId: string }}
 */
export function generateApiKeyWithMachine(machineId) {
  const keyId = generateKeyId();
  const crc = generateCrc(machineId, keyId);
  const key = `sk-${machineId}-${keyId}-${crc}`;
  return { key, keyId };
}

/**
 * Parse API key and extract machineId + keyId
 * Supports both formats:
 * - New: sk-{machineId}-{keyId}-{crc8}
 * - Old: sk-{random8}
 * @param {string} apiKey
 * @returns {{ machineId: string, keyId: string, isNewFormat: boolean } | null}
 */
export function parseApiKey(apiKey) {
  if (!apiKey || !apiKey.startsWith("sk-")) return null;

  const parts = apiKey.split("-");
  
  // New format: sk-{machineId}-{keyId}-{crc8} = 4 parts
  if (parts.length === 4) {
    const [, machineId, keyId, crc] = parts;
    
    // Validate CRC
    const expectedCrc = generateCrc(machineId, keyId);
    if (crc !== expectedCrc) return null;
    
    return { machineId, keyId, isNewFormat: true };
  }
  
  // Old format: sk-{random8} = 2 parts
  if (parts.length === 2) {
    return { machineId: null, keyId: parts[1], isNewFormat: false };
  }
  
  return null;
}

/**
 * Verify API key CRC (only for new format)
 * @param {string} apiKey
 * @returns {boolean}
 */
export function verifyApiKeyCrc(apiKey) {
  const parsed = parseApiKey(apiKey);
  if (!parsed) return false;
  
  // Old format doesn't have CRC, always valid if parsed
  if (!parsed.isNewFormat) return true;
  
  // New format already verified in parseApiKey
  return true;
}

/**
 * Check if API key is new format (contains machineId)
 * @param {string} apiKey
 * @returns {boolean}
 */
export function isNewFormatKey(apiKey) {
  const parsed = parseApiKey(apiKey);
  return parsed?.isNewFormat === true;
}

