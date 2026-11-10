import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockCreateBrowserClient = vi.fn((_url: string, _key: string) => ({ auth: {} }));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: (url: string, key: string) => mockCreateBrowserClient(url, key),
}));

describe("createSupabaseBrowserClient", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws a clear non-secret error when NEXT_PUBLIC_SUPABASE_URL or publishable key is missing", async () => {
    const cleanEnv: NodeJS.ProcessEnv = { ...process.env };
    delete cleanEnv.NEXT_PUBLIC_SUPABASE_URL;
    delete cleanEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env = cleanEnv;

    const [{ AppError }, { createSupabaseBrowserClient }] = await Promise.all([
      import("@/lib/errors"),
      import("./browser"),
    ]);

    expect(() => createSupabaseBrowserClient()).toThrowError(AppError);
    expect(() => createSupabaseBrowserClient()).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(mockCreateBrowserClient).not.toHaveBeenCalled();
  });

  it("throws a clear error and never leaks key values when placeholder config is used", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://dummy.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_secret_never_log_this";

    const [{ AppError }, { createSupabaseBrowserClient }] = await Promise.all([
      import("@/lib/errors"),
      import("./browser"),
    ]);

    let caught: unknown = null;
    try {
      createSupabaseBrowserClient();
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(AppError);
    expect(caught).toMatchObject({ code: "SUPABASE_NOT_CONFIGURED", statusCode: 500 });
    expect((caught as Error).message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect((caught as Error).message).not.toContain("sb_publishable_secret_never_log_this");
    expect(mockCreateBrowserClient).not.toHaveBeenCalled();
  });

  it("initializes browser Supabase client with the configured NEXT_PUBLIC URL and key", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://realdevproject.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_dev_test_key";

    const { createSupabaseBrowserClient } = await import("./browser");
    createSupabaseBrowserClient();

    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      "https://realdevproject.supabase.co",
      "sb_publishable_dev_test_key"
    );
  });
});
