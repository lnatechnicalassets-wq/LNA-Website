import { describe, expect, it, vi } from "vitest";

const { range, eq } = vi.hoisted(() => ({ range: vi.fn(), eq: vi.fn() }));
vi.mock("@/server/supabase/clients", () => ({
  hasConfiguredSupabaseServerEnv: () => true,
  createSupabaseAdminClient: () => ({
    from: () => {
      const query = { select: () => query, is: () => query, order: () => query, range, eq };
      eq.mockReturnValue(query);
      return query;
    },
  }),
}));

import { getPublicMentors } from "./mentors";

describe("Public mentors from Supabase", () => {
  it("includes staff-authored profiles without verification metadata and filters the database by publication", async () => {
    range.mockResolvedValue({
      error: null,
      data: [
        {
          slug: "staff-mentor",
          name: "Staff Mentor",
          role: "Instructor",
          organization: "LNA",
          bio: "Staff mentor fixture biography.",
          portrait_src: null,
          company_logo_src: null,
          linkedin_url: "https://linkedin.com/in/staff-mentor/",
          expertise: ["Instruction"],
          categories: [],
          career_history: [],
          display_order: 0,
          featured: false,
          is_placeholder: false,
          provenance: { class: "B", verified: false, source: "Staff mentor directory" },
        },
      ],
    });

    expect(await getPublicMentors()).toEqual([
      expect.objectContaining({
        name: "Staff Mentor",
        linkedInUrl: "https://linkedin.com/in/staff-mentor/",
        expertise: ["Instruction"],
      }),
    ]);
    expect(eq).toHaveBeenCalledWith("published", true);
    expect(eq).toHaveBeenCalledWith("is_dev_fixture", false);
  });
});
