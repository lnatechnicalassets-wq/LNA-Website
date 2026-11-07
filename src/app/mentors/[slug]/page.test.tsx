import { describe, it, expect, vi } from "vitest";
import MentorProfilePage, { generateStaticParams } from "./page";
import { redirect } from "next/navigation";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

describe("MentorProfilePage - Retired Route Redirection", () => {
  it("redirects legacy mentor profile URLs to homepage mentors section", async () => {
    await MentorProfilePage();
    expect(redirect).toHaveBeenCalledWith("/#mentors");
  });

  it("generates static params for all mentors to preserve routing integrity", async () => {
    const params = await generateStaticParams();
    expect(params.length).toBeGreaterThan(0);
  });
});
