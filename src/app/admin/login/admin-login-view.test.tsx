import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { AppError } from "@/lib/errors";
import { AdminLoginView, type BrowserSupabaseAuthClientLike } from "./admin-login-view";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("AdminLoginView (/admin/login)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("exposes zero public signup or registration links", () => {
    render(<AdminLoginView initialStep="credentials" />);

    expect(screen.queryByRole("link", { name: /sign up|register|create account/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /sign up|register|create account/i })).toBeNull();
    expect(screen.getByText(/Public enrollment and self-registration are disabled/i)).toBeDefined();
  });

  it("enrolls TOTP for first-time superadmin after password sign-in and verifies AAL2", async () => {
    const unenrollSpy = vi.fn().mockResolvedValue({ data: { id: "stale-1" }, error: null });
    const challengeSpy = vi.fn().mockResolvedValue({ data: { id: "chal-1" }, error: null });
    const verifySpy = vi.fn().mockResolvedValue({ data: {}, error: null });
    const navigateSpy = vi.fn();

    const stubClient: BrowserSupabaseAuthClientLike = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: { id: "u-1", email: "admin@lnabd.org" }, session: {} },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        mfa: {
          getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
            data: { currentLevel: "aal1", nextLevel: "aal2" },
            error: null,
          }),
          listFactors: vi.fn().mockResolvedValue({
            data: {
              all: [{ id: "stale-1", factor_type: "totp", status: "unverified" }],
              totp: [],
            },
            error: null,
          }),
          unenroll: unenrollSpy,
          enroll: vi.fn().mockResolvedValue({
            data: {
              id: "factor-new-1",
              type: "totp",
              totp: {
                qr_code: "<svg xmlns='http://www.w3.org/2000/svg'></svg>",
                secret: "JBSWY3DPEHPK3PXP",
                uri: "otpauth://totp/LNA",
              },
            },
            error: null,
          }),
          challenge: challengeSpy,
          verify: verifySpy,
        },
      },
    };

    render(
      <AdminLoginView
        initialStep="credentials"
        supabaseFactory={() => stubClient}
        onNavigateSuccess={navigateSpy}
      />
    );

    fireEvent.change(screen.getByLabelText(/Staff email/i), {
      target: { value: "admin@lnabd.org" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "StrongStaffPass!2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign in cleanly/i }));

    await waitFor(() =>
      expect(screen.getByAltText("Authenticator app TOTP setup QR code")).toBeDefined()
    );

    const qrImg = screen.getByAltText("Authenticator app TOTP setup QR code") as HTMLImageElement;
    expect(qrImg.src).toContain("data:image/svg+xml;utf-8,");
    expect(screen.getByText("JBSWY3DPEHPK3PXP")).toBeDefined();
    expect(unenrollSpy).toHaveBeenCalledWith({ factorId: "stale-1" });

    fireEvent.change(screen.getByLabelText(/6-digit authenticator code/i), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify & open enrollments/i }));

    await waitFor(() => expect(navigateSpy).toHaveBeenCalledTimes(1));
    expect(challengeSpy).toHaveBeenCalledWith({ factorId: "factor-new-1" });
    expect(verifySpy).toHaveBeenCalledWith({
      factorId: "factor-new-1",
      challengeId: "chal-1",
      code: "123456",
    });
  });

  it("challenges an existing verified TOTP factor without showing enrollment QR code", async () => {
    const enrollSpy = vi.fn();
    const verifySpy = vi.fn().mockResolvedValue({ data: {}, error: null });
    const navigateSpy = vi.fn();

    const stubClient: BrowserSupabaseAuthClientLike = {
      auth: {
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        mfa: {
          getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
            data: { currentLevel: "aal1", nextLevel: "aal2" },
            error: null,
          }),
          listFactors: vi.fn().mockResolvedValue({
            data: {
              all: [{ id: "verified-totp-1", factor_type: "totp", status: "verified" }],
              totp: [{ id: "verified-totp-1", factor_type: "totp", status: "verified" }],
            },
            error: null,
          }),
          unenroll: vi.fn(),
          enroll: enrollSpy,
          challenge: vi.fn().mockResolvedValue({ data: { id: "chal-2" }, error: null }),
          verify: verifySpy,
        },
      },
    };

    render(
      <AdminLoginView
        initialStep="mfa"
        initialEmail="admin@lnabd.org"
        initialHasVerifiedTotp
        supabaseFactory={() => stubClient}
        onNavigateSuccess={navigateSpy}
      />
    );

    await waitFor(() =>
      expect(screen.getByText(/Enter the 6-digit code from your authenticator app/i)).toBeDefined()
    );
    expect(enrollSpy).not.toHaveBeenCalled();
    expect(screen.queryByAltText("Authenticator app TOTP setup QR code")).toBeNull();

    // Invalid short TOTP code triggers alert without hitting verify
    fireEvent.change(screen.getByLabelText(/6-digit authenticator code/i), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify & open enrollments/i }));
    expect(screen.getByRole("alert").textContent).toMatch(/Enter the 6-digit code/i);
    expect(verifySpy).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/6-digit authenticator code/i), {
      target: { value: "654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify & open enrollments/i }));
    await waitFor(() => expect(navigateSpy).toHaveBeenCalledTimes(1));
  });

  it("renders denied and not_configured states clearly", () => {
    render(
      <AdminLoginView
        initialStep="denied"
        deniedMessage="Signed-in account is missing an active super_admin role."
      />
    );
    expect(screen.getByRole("heading", { name: /Access Restricted/i })).toBeDefined();
    expect(screen.getByRole("alert").textContent).toContain("active super_admin role");
    expect(screen.getByRole("button", { name: /Sign out & switch account/i })).toBeDefined();

    cleanup();
    render(<AdminLoginView initialStep="not_configured" />);
    expect(screen.getByRole("heading", { name: /Portal Unavailable/i })).toBeDefined();
    expect(screen.getByText(/NEXT_PUBLIC_SUPABASE_URL/i)).toBeDefined();
  });

  it("surfaces SUPABASE_NOT_CONFIGURED errors clearly during sign-in", async () => {
    render(
      <AdminLoginView
        initialStep="credentials"
        supabaseFactory={() => {
          throw new AppError(
            "Supabase browser authentication is not configured: set valid NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in environment variables and restart the dev server.",
            "SUPABASE_NOT_CONFIGURED",
            500
          );
        }}
      />
    );

    fireEvent.change(screen.getByLabelText(/Staff email/i), {
      target: { value: "admin@lnabd.org" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "StrongStaffPass!2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign in cleanly/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("NEXT_PUBLIC_SUPABASE_URL")
    );
  });
});
