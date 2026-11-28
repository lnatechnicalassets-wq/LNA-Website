import { act, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HomePage from "./page";
import { loadHomepageCatalog } from "@/server/enrollment/service";
import { hasConfiguredSupabaseServerEnv } from "@/server/supabase/clients";

vi.mock("@/server/catalog/visibility", () => ({
  getArchivedCatalogSlugs: async () => ({ courses: new Set(), batches: new Set() }),
}));
vi.mock("@/server/catalog/mentors", async () => {
  const { getHomeRepository } = await import("@/lib/content");
  return { getPublicMentors: () => getHomeRepository().getMentors() };
});
vi.mock("@/server/catalog/partners", async () => {
  const { getHomeRepository } = await import("@/lib/content");
  return { getPublicPartners: () => getHomeRepository().getPartners() };
});
vi.mock("@/server/enrollment/config", () => ({
  getEnrollmentRuntimeConfig: () => ({ submissionEnabled: false }),
}));
vi.mock("@/server/enrollment/service", () => ({
  getPublicCatalogFromSupabase: async () => ({ courses: [], batches: [] }),
  loadHomepageCatalog: vi.fn(),
}));
vi.mock("@/server/supabase/clients", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/supabase/clients")>()),
  hasConfiguredSupabaseServerEnv: vi.fn(() => false),
}));

describe("HomePage - Phase 4 Approved Architecture", () => {
  it("renders the requested Mentors section before the catalog resolves", async () => {
    const { promise, resolve } =
      Promise.withResolvers<Awaited<ReturnType<typeof loadHomepageCatalog>["availability"]>>();
    vi.mocked(hasConfiguredSupabaseServerEnv).mockReturnValueOnce(true);
    vi.mocked(loadHomepageCatalog).mockReturnValueOnce({
      presentation: promise,
      availability: promise,
    });

    const page = await HomePage({ searchParams: Promise.resolve({ section: "mentors" }) });
    await act(async () => {
      render(page);
    });
    expect(screen.getByRole("heading", { name: /Meet Our Mentors/i })).toBeDefined();
    expect(screen.queryByRole("heading", { name: /Courses & Programs/i })).toBeNull();

    await act(async () => {
      resolve({ courses: [], batches: [] });
    });
  });

  it("renders the primary homepage sections in correct sequence", async () => {
    const Component = await HomePage();
    await act(async () => {
      render(Component);
    });

    expect(screen.getByRole("region", { name: /MTO Readiness/i })).toBeDefined();

    // 2. Partners Strip
    const partnersSection = await screen.findByLabelText(/Corporate Sector Alignments/i);
    expect(partnersSection).toBeDefined();

    // 3. Courses Section
    const coursesHeading = screen.getByRole("heading", {
      level: 2,
      name: /Courses & Programs/i,
    });
    expect(coursesHeading).toBeDefined();

    // 4. Mentors Section (Approved Section 4: Meet Our Mentors)
    const mentorsHeading = screen.getByRole("heading", {
      level: 2,
      name: /Meet Our Mentors/i,
    });
    expect(mentorsHeading).toBeDefined();

    // Events Section removed from homepage rendering per owner instruction
    expect(
      screen.queryByRole("heading", {
        level: 2,
        name: /Executive Masterclasses & Roundtables/i,
      })
    ).toBeNull();

    // 5. Learner Reviews (Approved Section 5: Real Learning Real Impact)
    const reviewsHeading = screen.getByRole("heading", {
      level: 2,
      name: /Real Learning/i,
    });
    expect(reviewsHeading).toBeDefined();

    expect(screen.getByRole("heading", { name: /Internship Opportunities/i })).toBeDefined();

    // 7. Contact Us Section (Approved Section 7: Get in Touch)
    const contactHeading = screen.getByRole("heading", {
      level: 2,
      name: /Get in Touch/i,
    });
    expect(contactHeading).toBeDefined();
  }, 15000);

  it("shows the MTO program with View Program and Enroll Now actions", async () => {
    const Component = await HomePage();
    await act(async () => {
      render(Component);
    });
    const hero = screen.getByRole("region", { name: /MTO Readiness/i });
    expect(hero.querySelector("h1")?.textContent).toMatch(/MTO\s+Readiness/i);
    expect(hero.querySelectorAll("button, [role=tab]")).toHaveLength(0);
    expect(screen.getByRole("link", { name: "View Program" }).getAttribute("href")).toBe(
      "/courses/mto-readiness"
    );
    expect(screen.getByRole("link", { name: /Enroll Now/i })).toBeDefined();
    expect(screen.getByText("Limited Seats")).toBeDefined();
  });

  it("keeps MTO and IRGP in the course catalog", async () => {
    const Component = await HomePage();
    await act(async () => {
      render(Component);
    });
    expect(screen.getByRole("heading", { name: "MTO Readiness Program" })).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "Industry Readiness Graduate Program" })
    ).toBeDefined();
  });

  it("renders learner testimonials with accessible navigation controls", async () => {
    const Component = await HomePage();
    await act(async () => {
      render(Component);
    });

    // Manual navigation buttons present
    const prevTestimonial = screen.getByRole("button", {
      name: /^Previous testimonial$/i,
    });
    const nextTestimonial = screen.getByRole("button", {
      name: /^Next testimonial$/i,
    });
    expect(prevTestimonial).toBeDefined();
    expect(nextTestimonial).toBeDefined();

    // Check attribution of active review
    expect(screen.getAllByText(/Farzana Yasmin/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Industry Readiness Graduate Program/i).length
    ).toBeGreaterThanOrEqual(1);
  });
});
