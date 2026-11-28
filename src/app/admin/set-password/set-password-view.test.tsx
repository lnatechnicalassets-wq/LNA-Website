import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { SetPasswordView } from "./set-password-view";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

const updateUser = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createSupabaseBrowserClient).mockReturnValue({
    auth: { updateUser },
  } as unknown as ReturnType<typeof createSupabaseBrowserClient>);
});

describe("SetPasswordView", () => {
  it("validates minimum length and matching confirmation before calling updateUser", async () => {
    render(<SetPasswordView email="admin@lnabd.org" />);

    fireEvent.change(screen.getByLabelText(/New Password/i), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Password/i }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/at least 8 characters/i);
    expect(updateUser).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/New Password/i), {
      target: { value: "StrongPass123!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: "Different123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Password/i }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/do not match/i);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("calls updateUser({ password }) and redirects to /admin/login for MFA setup", async () => {
    updateUser.mockResolvedValueOnce({ error: null });
    render(<SetPasswordView email="admin@lnabd.org" />);

    fireEvent.change(screen.getByLabelText(/New Password/i), {
      target: { value: "StrongPass123!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: "StrongPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Password/i }));

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith({ password: "StrongPass123!" });
      expect(replace).toHaveBeenCalledWith("/admin/login");
      expect(refresh).toHaveBeenCalled();
    });
  });
});
