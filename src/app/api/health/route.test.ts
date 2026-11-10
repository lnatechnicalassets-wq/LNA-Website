// @vitest-environment node
import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("Health Check API Endpoint (NFR-OBS-01, NFR-SEC-02)", () => {
  it("returns HTTP 200 with healthy telemetry payload", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("healthy");
    expect(body.timestamp).toBeDefined();
    expect(typeof body.uptime).toBe("number");
    expect(body.environment).toBeDefined();
    expect(body.checks.server).toBe("ok");
    expect(body.checks.environment).toBe("ok");
  });

  it("sets strict no-cache headers to prevent proxy / CDN caching of health state", async () => {
    const response = await GET();
    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toContain("no-store");
    expect(cacheControl).toContain("no-cache");
  });

  it("strictly scrubs secrets and PII from the health response body", async () => {
    const response = await GET();
    const rawBody = await response.text();

    // Verify sensitive keys never leak in JSON string representation
    expect(rawBody).not.toContain("SUPABASE_SECRET_KEY");
    expect(rawBody).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(rawBody).not.toContain("BKASH_APP_SECRET");
    expect(rawBody).not.toContain("BKASH_PASSWORD");
    expect(rawBody).not.toContain("APP_SECRET");
    expect(rawBody).not.toContain("RESEND_API_KEY");
    expect(rawBody).not.toContain("UPSTASH_REDIS_REST_TOKEN");
  });
});
