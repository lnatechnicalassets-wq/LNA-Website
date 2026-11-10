import "server-only";
import crypto from "node:crypto";
import { parseCurrentServerEnv } from "@/server/env";

interface ExpirablePayload {
  exp: number;
}

function getSigningSecret(): string {
  return parseCurrentServerEnv().APP_SECRET;
}

function encodeBase64Url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64url");
}

function decodeBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

/**
 * Signs an arbitrary JSON object with HMAC-SHA256 and an expiration timestamp.
 */
export function signHmacToken<T extends Record<string, unknown>>(
  payload: T,
  ttlSeconds: number,
  secretOverride?: string
): string {
  const secret = secretOverride ?? getSigningSecret();
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const envelope: T & ExpirablePayload = {
    ...payload,
    exp,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(envelope));
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 token using constant-time comparison and checks expiration.
 */
export function verifyHmacToken<T extends Record<string, unknown>>(
  token: string,
  secretOverride?: string
): (T & ExpirablePayload) | null {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, receivedSig] = parts;
  if (!encodedPayload || !receivedSig) {
    return null;
  }

  const secret = secretOverride ?? getSigningSecret();
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  const receivedBuf = Buffer.from(receivedSig);
  const expectedBuf = Buffer.from(expectedSig);
  if (receivedBuf.length !== expectedBuf.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(receivedBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(encodedPayload)) as Partial<T & ExpirablePayload>;
    if (typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp)) {
      return null;
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (parsed.exp < nowSeconds) {
      return null;
    }
    return parsed as T & ExpirablePayload;
  } catch {
    return null;
  }
}

/**
 * Hashes an identifier (such as IP address or email) with APP_SECRET for non-PII rate-limit keys.
 */
export function hmacDigestForKey(value: string): string {
  return crypto.createHmac("sha256", getSigningSecret()).update(value).digest("hex").slice(0, 24);
}
