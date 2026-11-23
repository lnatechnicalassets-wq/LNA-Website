import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";

export interface BkashToken {
  token: string;
  expiresAtMs: number;
  validForMs: number;
}

export interface BkashTokenCache {
  getOrGrant(grant: () => Promise<BkashToken>): Promise<string>;
}

function cacheUnavailable(): AppError {
  return new AppError(
    "bKash authentication is temporarily unavailable.",
    "BKASH_AUTH_UNAVAILABLE",
    503
  );
}

type AcquireResult = { state: "cached"; token: string } | { state: "grant" | "wait" | "limited" };

export class SupabaseBkashTokenCache implements BkashTokenCache {
  private readonly merchantKey: string;
  private static readonly memoryCache = new Map<string, BkashToken>();
  private static readonly inFlight = new Map<string, Promise<string>>();

  constructor(
    private readonly db: Pick<SupabaseClient, "rpc">,
    merchant: string
  ) {
    this.merchantKey = createHash("sha256").update(merchant).digest("hex");
  }

  static clearMemoryCacheForTesting(): void {
    SupabaseBkashTokenCache.memoryCache.clear();
    SupabaseBkashTokenCache.inFlight.clear();
  }

  /**
   * Resilient in-memory fallback cache when Supabase RPC is unavailable or unmigrated.
   * Concurrency-safe: parallel requests for the same merchant share the in-flight grant promise.
   */
  private async getOrGrantFallback(grant: () => Promise<BkashToken>): Promise<string> {
    const cached = SupabaseBkashTokenCache.memoryCache.get(this.merchantKey);
    if (cached && Date.now() < cached.expiresAtMs) {
      return cached.token;
    }

    const inFlightPromise = SupabaseBkashTokenCache.inFlight.get(this.merchantKey);
    if (inFlightPromise) {
      return await inFlightPromise;
    }

    const grantPromise = (async () => {
      try {
        const entry = await grant();
        SupabaseBkashTokenCache.memoryCache.set(this.merchantKey, entry);
        return entry.token;
      } finally {
        SupabaseBkashTokenCache.inFlight.delete(this.merchantKey);
      }
    })();

    SupabaseBkashTokenCache.inFlight.set(this.merchantKey, grantPromise);
    return await grantPromise;
  }

  async getOrGrant(grant: () => Promise<BkashToken>): Promise<string> {
    const lease = { p_merchant_key: this.merchantKey, p_owner: randomUUID() };
    const deadline = performance.now() + 12_000;
    let delay = 100;

    for (;;) {
      let rpcResult: { data: unknown; error: { code?: string; message?: string } | null };
      try {
        rpcResult = (await this.db
          .rpc("bkash_acquire_gateway_token", lease)
          .abortSignal(AbortSignal.timeout(5_000))) as typeof rpcResult;
      } catch (callErr) {
        rpcResult = {
          data: null,
          error:
            callErr instanceof Error
              ? { message: callErr.message }
              : { message: String(callErr) },
        };
      }

      const { data, error } = rpcResult;
      if (error || !data) {
        // Fall back gracefully to local memory caching with concurrency protection
        console.warn(
          "[bKash Token Cache] Supabase token cache RPC unavailable, falling back to memory cache",
          { code: error?.code, message: error?.message }
        );
        return await this.getOrGrantFallback(grant);
      }

      const result = data as AcquireResult;
      if (result.state === "cached" && typeof result.token === "string" && result.token) {
        SupabaseBkashTokenCache.memoryCache.set(this.merchantKey, {
          token: result.token,
          expiresAtMs: Date.now() + 1800_000,
          validForMs: 1800_000,
        });
        return result.token;
      }

      if (result.state === "limited") {
        throw new AppError(
          "bKash token grant rate limit reached. Please retry shortly.",
          "BKASH_AUTH_LIMITED",
          429
        );
      }

      if (result.state === "grant") {
        const finish = (token: string | null, validForMs: number) =>
          this.db
            .rpc("bkash_finish_gateway_token", {
              ...lease,
              p_token: token,
              p_valid_for_ms: validForMs,
            })
            .abortSignal(AbortSignal.timeout(5_000));

        let entry: BkashToken;
        try {
          entry = await grant();
        } catch (grantError) {
          try {
            await finish(null, 0);
          } catch {
            // The lease expires by itself if the database is unreachable.
          }
          throw grantError;
        }

        // Cache immediately in local process memory
        SupabaseBkashTokenCache.memoryCache.set(this.merchantKey, entry);

        try {
          const { data: saved, error: saveError } = await finish(entry.token, entry.validForMs);
          if (!saveError && saved === true) return entry.token;
          console.warn(
            "[bKash Token Cache] Failed to persist gateway token in database, utilizing memory token",
            { error: saveError }
          );
        } catch (saveErr) {
          console.warn(
            "[bKash Token Cache] Exception saving token to database, utilizing memory token",
            { error: saveErr instanceof Error ? saveErr.message : String(saveErr) }
          );
        }
        return entry.token;
      }

      const remaining = deadline - performance.now();
      if (result.state !== "wait" || remaining <= 0) {
        const cached = SupabaseBkashTokenCache.memoryCache.get(this.merchantKey);
        if (cached && Date.now() < cached.expiresAtMs) {
          return cached.token;
        }
        throw cacheUnavailable();
      }
      await sleep(Math.min(delay, remaining));
      delay = Math.min(800, delay * 2);
    }
  }
}
