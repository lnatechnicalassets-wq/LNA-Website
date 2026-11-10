import "server-only";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { parseCurrentServerEnv } from "@/server/env";
import { hmacDigestForKey } from "@/server/security/hmac";

export interface RateLimitPolicy {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAtMs: number;
}

const memoryBuckets = new Map<string, number[]>();

function hasUpstashConfig(url: string | undefined, token: string | undefined): boolean {
  if (!url || !token) return false;
  const u = url.toLowerCase();
  const t = token.toLowerCase();
  return (
    !u.includes("your-upstash-redis-url") &&
    !u.includes("dummy") &&
    !t.includes("your_upstash_redis_rest_token") &&
    !t.includes("dummy")
  );
}

/**
 * Extracts client IP safely without trusting multi-hop spoofing suffixes.
 */
export function extractHashedClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const rawIp = forwarded?.split(",")[0]?.trim() || realIp?.trim() || "unknown";
  return hmacDigestForKey(`ip:${rawIp}`);
}

/**
 * Sliding-window rate limiter backed by Upstash Redis in production when configured,
 * with deterministic in-memory fallback in local development and test suites.
 */
export async function consumeRateLimit(
  bucket: string,
  identifier: string,
  policy: RateLimitPolicy
): Promise<RateLimitResult> {
  const env = parseCurrentServerEnv();
  const key = `lna:rl:${bucket}:${hmacDigestForKey(identifier)}`;

  if (hasUpstashConfig(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)) {
    try {
      const redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL!,
        token: env.UPSTASH_REDIS_REST_TOKEN!,
      });
      const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(policy.maxRequests, `${policy.windowSeconds} s`),
        prefix: "lna_ratelimit",
      });
      const res = await limiter.limit(key);
      return {
        allowed: res.success,
        remaining: res.remaining,
        resetAtMs: res.reset,
      };
    } catch {
      // Fail open to bounded local window only if Upstash experiences a network blip
    }
  }

  const now = Date.now();
  const windowMs = policy.windowSeconds * 1000;
  const timestamps = memoryBuckets.get(key) ?? [];
  const valid = timestamps.filter((t) => now - t < windowMs);

  if (valid.length >= policy.maxRequests) {
    const oldest = valid[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      resetAtMs: oldest + windowMs,
    };
  }

  valid.push(now);
  memoryBuckets.set(key, valid);

  return {
    allowed: true,
    remaining: Math.max(0, policy.maxRequests - valid.length),
    resetAtMs: now + windowMs,
  };
}

export function resetMemoryRateLimitsForTest(): void {
  memoryBuckets.clear();
}

