import "server-only";
import type { NextRequest } from "next/server";
import { parseCurrentServerEnv } from "@/server/env";

/**
 * Validates same-origin CSRF protection for state-mutating route handlers (Rule 10 T12).
 * Rejects cross-origin browser submissions while permitting same-host local/test calls.
 */
export function verifySameOriginRequest(request: NextRequest | Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    // Same-origin non-browser/server-to-server calls or older clients omit Origin;
    // when Sec-Fetch-Site is present, reject explicit cross-site requests.
    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite && fetchSite.toLowerCase() === "cross-site") {
      return false;
    }
    return true;
  }

  try {
    const originHost = new URL(origin).host.toLowerCase();
    const requestUrlHost = new URL(request.url).host.toLowerCase();
    const appUrlHost = new URL(parseCurrentServerEnv().APP_URL).host.toLowerCase();
    const forwardedHost = request.headers
      .get("x-forwarded-host")
      ?.split(",")[0]
      ?.trim()
      .toLowerCase();

    return (
      originHost === requestUrlHost ||
      originHost === appUrlHost ||
      (forwardedHost !== undefined && originHost === forwardedHost)
    );
  } catch {
    return false;
  }
}

/**
 * Resolves a trusted server origin for payment callback URLs without trusting arbitrary Host headers.
 * When request host matches configured APP_URL host, configuredOrigin is preserved so an internal
 * reverse-proxy HTTP request never downgrades an HTTPS callback URL sent to bKash.
 */
export function resolveSafeAppOrigin(request: NextRequest | Request): string {
  const configured = new URL(parseCurrentServerEnv().APP_URL);
  const configuredOrigin = configured.origin;
  try {
    const reqUrl = new URL(request.url);
    const configuredHost = configured.host.toLowerCase();
    if (reqUrl.host.toLowerCase() === configuredHost) {
      return configuredOrigin;
    }
    if (reqUrl.hostname === "localhost" || reqUrl.hostname === "127.0.0.1") {
      return reqUrl.origin;
    }
    return configuredOrigin;
  } catch {
    return configuredOrigin;
  }
}
