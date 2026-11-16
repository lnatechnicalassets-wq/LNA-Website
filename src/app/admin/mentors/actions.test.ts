import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { saveMentor } from "./actions";

const { rpc, requireStaff } = vi.hoisted(() => ({ rpc: vi.fn(), requireStaff: vi.fn() }));
vi.mock("@/server/auth/require-staff", () => ({ requireStaff }));
vi.mock("@/server/supabase/clients", () => ({ createSupabaseAdminClient: () => ({ rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function mentorForm() {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    name: "Test Mentor",
    role: "Instructor",
    company: "LNA",
    bio: "A fixture mentor biography.",
    photo: "",
    logo: "",
    linkedIn: "https://www.linkedin.com/in/test-mentor/",
    expertise: "Coaching\nInstruction, Coaching",
    published: "on",
  }))
    form.set(key, value);
  return form;
}

describe("Saving the live mentor profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireStaff.mockResolvedValue({ userId: "fixture-actor" });
    rpc.mockResolvedValue({ data: "OK", error: null });
  });

  it("saves normalized expertise and publishes, then refreshes both public routes", async () => {
    expect(await saveMentor({ operation: "create" }, {}, mentorForm())).toEqual({ success: true });
    expect(rpc).toHaveBeenCalledWith(
      "save_staff_mentor_profile",
      expect.objectContaining({
        p_expertise: ["Coaching", "Instruction"],
        p_linkedin: "https://www.linkedin.com/in/test-mentor/",
        p_published: true,
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/courses/[slug]", "page");
  });

  it("explains an unavailable database save function without exposing database details", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "private database metadata" },
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await saveMentor({ operation: "create" }, {}, mentorForm());
      expect(result.message).toContain("latest Supabase migrations");
      expect(result.message).not.toContain("private");
      expect(log).toHaveBeenCalledWith("Mentor save failed", {
        operation: "create",
        code: "PGRST202",
      });
      expect(revalidatePath).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it("rejects untrusted profile links before saving", async () => {
    const form = mentorForm();
    form.set("linkedIn", "https://linkedin.com.invalid/in/test-mentor/");
    expect((await saveMentor({ operation: "create" }, {}, form)).message).toMatch(/LinkedIn/);
    expect(rpc).not.toHaveBeenCalled();
  });
});
