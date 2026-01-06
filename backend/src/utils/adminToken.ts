import crypto from "crypto";

/**
 * Admin tokens are high-entropy secrets that grant edit permissions to a calculation.
 *
 * We store ONLY sha256(token) in MongoDB.
 */

export function generateAdminToken(): string {
  // 32 bytes => 256 bits of entropy
  return crypto.randomBytes(32).toString("base64url");
}

export function hashAdminToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function safeEqualHash(a: string, b: string): boolean {
  // constant-time compare for same-length buffers
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
