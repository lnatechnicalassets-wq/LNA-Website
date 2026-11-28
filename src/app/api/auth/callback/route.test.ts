import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  createSupabaseServerClient,
  hasConfiguredSupabaseServerEnv,
} from "@/server/supabase/clients";
import { GET } from "./route";

vi.mock("@/server/supabase/clients", () => ({
  createSupabaseServerClient: vi.fn(),
  hasConfiguredSupabaseServerEnv: vi.fn(),
}));

const exchangeCodeForSession = vi.fn();
const verifyOtp = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hasConfiguredSupabaseServerEnv).mockReturnValue(true);
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: { exchangeCodeForSession, verifyOtp },
  } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
});

describe("GET /api/auth/callback", () => {
  it("exchanges PKCE code and redirects invite flows to /admin/set-password", async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ error: null });
    const req = new NextRequest(
      "https://www.lnabd.org/api/auth/callback?code=pkce-123&type=invite"
    );

    const res = await GET(req);
    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-123");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://www.lnabd.org/admin/set-password");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("verifies token_hash invite links and blocks external open redirects", async () => {
    verifyOtp.mockResolvedValueOnce({ error: null });
    const req = new NextRequest(
      "https://www.lnabd.org/api/auth/callback?token_hash=th-123&type=invite&next=https://evil.example"
    );

    const res = await GET(req);
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "th-123", type: "invite" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://www.lnabd.org/admin/set-password");
  });

  it("redirects to /admin/login?error=auth_callback when verification fails or params are missing", async () => {
    verifyOtp.mockResolvedValueOnce({ error: { message: "Token expired" } });
    const failed = await GET(
      new NextRequest("https://www.lnabd.org/api/auth/callback?token_hash=bad&type=invite")
    );
    expect(failed.headers.get("location")).toBe(
      "https://www.lnabd.org/admin/login?error=auth_callback"
    );

    const missing = await GET(new NextRequest("https://www.lnabd.org/api/auth/callback"));
    expect(missing.headers.get("location")).toBe(
      "https://www.lnabd.org/admin/login?error=auth_callback"
    );
  });
});
