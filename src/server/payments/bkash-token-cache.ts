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

function cacheUnavailable(code?: string): AppError {
  if (code === "PGRST202") {
    return new AppError(
      "The shared bKash token cache is missing. Check the Supabase token cache migration.",
      "BKASH_AUTH_CACHE_MISSING",
      503
    );
  }

  return new AppError(
    "bKash authentication is temporarily unavailable.",
    "BKASH_AUTH_UNAVAILABLE",
    503
  );
}

type AcquireResult = { state: "cached"; token: string } | { state: "grant" | "wait" | "limited" };

export class SupabaseBkashTokenCache implements BkashTokenCache {
  private readonly merchantKey: string;

  constructor(
    private readonly db: Pick<SupabaseClient, "rpc">,
    merchant: string
  ) {
    this.merchantKey = createHash("sha256").update(merchant).digest("hex");
  }

  async getOrGrant(grant: () => Promise<BkashToken>): Promise<string> {
    const lease = { p_merchant_key: this.merchantKey, p_owner: randomUUID() };
    const deadline = performance.now() + 12_000;
    let delay = 100;

    for (;;) {
      const { data, error } = await Promise.resolve(
        this.db.rpc("bkash_acquire_gateway_token", lease).abortSignal(AbortSignal.timeout(5_000))
      ).catch(() => {
        throw cacheUnavailable();
      });

      if (error || !data) throw cacheUnavailable(error?.code);

      const result = data as AcquireResult;
      if (result.state === "cached" && typeof result.token === "string" && result.token) {
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

        const { data: saved, error: saveError } = await Promise.resolve(
          finish(entry.token, entry.validForMs)
        ).catch(() => {
          throw cacheUnavailable();
        });
        if (saveError || saved !== true) throw cacheUnavailable(saveError?.code);
        return entry.token;
      }

      const remaining = deadline - performance.now();
      if (result.state !== "wait" || remaining <= 0) throw cacheUnavailable();
      await sleep(Math.min(delay, remaining));
      delay = Math.min(800, delay * 2);
    }
  }
}
