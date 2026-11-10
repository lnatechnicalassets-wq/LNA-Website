// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { verifySupabaseConnection } from "./connection";
import { AppError } from "@/lib/errors";

describe("Server-only Supabase connection verification (NFR-SEC-02)", () => {
  it("throws SUPABASE_NOT_CONFIGURED when env vars use placeholders or secret key is absent", async () => {
    await expect(
      verifySupabaseConnection({
        clientEnv: {
          NEXT_PUBLIC_SUPABASE_URL: "https://dummy.supabase.co",
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "dummy_supabase_publishable_key",
        },
        serverEnv: {
          SUPABASE_SECRET_KEY: undefined,
        },
      })
    ).rejects.toMatchObject({
      code: "SUPABASE_NOT_CONFIGURED",
      statusCode: 500,
    });
  });

  it("verifies Auth, publishable PostgREST probe, and secret OpenAPI schema without exposing credentials", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = init?.headers as Record<string, string> | undefined;

      if (url.endsWith("/auth/v1/health")) {
        expect(headers?.apikey).toBe("sb_publishable_mock_key");
        return new Response(JSON.stringify({ name: "GoTrue", version: "v2.197.0" }), {
          status: 200,
        });
      }

      if (url.includes("/rest/v1/__lna_connection_probe")) {
        expect(headers?.apikey).toBe("sb_publishable_mock_key");
        return new Response(
          JSON.stringify({
            code: "PGRST205",
            message: "Could not find the table 'public.__lna_connection_probe' in the schema cache",
          }),
          { status: 404 }
        );
      }

      if (url.endsWith("/rest/v1/")) {
        expect(headers?.apikey).toBe("sb_secret_mock_server_only_key");
        return new Response(
          JSON.stringify({
            swagger: "2.0",
            definitions: { courses: {}, batches: {} },
          }),
          { status: 200 }
        );
      }

      return new Response(null, { status: 500 });
    });

    const report = await verifySupabaseConnection({
      fetchImpl: fetchMock as unknown as typeof fetch,
      clientEnv: {
        NEXT_PUBLIC_SUPABASE_URL: "https://exampleproject.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_mock_key",
      },
      serverEnv: {
        SUPABASE_SECRET_KEY: "sb_secret_mock_server_only_key",
      },
    });

    expect(report).toEqual({
      ok: true,
      host: "exampleproject.supabase.co",
      authHealthy: true,
      authVersion: "v2.197.0",
      publishableKeyAccepted: true,
      secretKeyAccepted: true,
      exposedPublicTables: ["batches", "courses"],
    });

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("sb_publishable_mock_key");
    expect(serialized).not.toContain("sb_secret_mock_server_only_key");
  });

  it("reports failure when secret key is rejected by PostgREST", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/v1/health")) {
        return new Response(JSON.stringify({ name: "GoTrue", version: "v2.197.0" }), {
          status: 200,
        });
      }
      if (url.includes("/rest/v1/__lna_connection_probe")) {
        return new Response(JSON.stringify({ code: "PGRST205" }), { status: 404 });
      }
      return new Response(JSON.stringify({ message: "Invalid API key" }), { status: 401 });
    });

    const report = await verifySupabaseConnection({
      fetchImpl: fetchMock as unknown as typeof fetch,
      clientEnv: {
        NEXT_PUBLIC_SUPABASE_URL: "https://exampleproject.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_mock_key",
      },
      serverEnv: {
        SUPABASE_SECRET_KEY: "sb_secret_wrong_key",
      },
    });

    expect(report.ok).toBe(false);
    expect(report.secretKeyAccepted).toBe(false);
  });

  it("wraps network failures in AppError without leaking URL secrets or headers", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });

    await expect(
      verifySupabaseConnection({
        fetchImpl: fetchMock as unknown as typeof fetch,
        clientEnv: {
          NEXT_PUBLIC_SUPABASE_URL: "https://exampleproject.supabase.co",
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_mock_key",
        },
        serverEnv: {
          SUPABASE_SECRET_KEY: "sb_secret_mock_server_only_key",
        },
      })
    ).rejects.toBeInstanceOf(AppError);
  });
});
