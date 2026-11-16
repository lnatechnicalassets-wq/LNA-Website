import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MentorFields } from "./mentor-fields";

afterEach(cleanup);

describe("Mentor editor website preview", () => {
  it("loads saved expertise and previews edited name, expertise, and LinkedIn before saving", () => {
    render(
      <MentorFields
        assets={{ portraits: [], logos: [] }}
        mentor={{
          id: "fixture-id",
          slug: "fixture",
          name: "Fixture Mentor",
          role: "Lead Instructor",
          organization: "Lead Nation",
          bio: "Existing mentor biography",
          portrait_src: "/images/mentors/mir-hasib.png",
          company_logo_src: null,
          linkedin_url: null,
          expertise: ["First saved topic"],
          career_history: [],
          published: true,
        }}
      />
    );
    expect(screen.getByLabelText(/Expertise/)).toHaveProperty("value", "First saved topic");
    expect(screen.getByLabelText("Upload portrait")).toHaveProperty("type", "file");
    expect(screen.getByLabelText("Upload company logo")).toHaveProperty("type", "file");
    const preview = screen.getByRole("region", { name: "Website preview" });
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Updated Mentor" } });
    expect(within(preview).getByRole("heading", { name: "Updated Mentor" })).toBeTruthy();
    fireEvent.click(
      within(preview).getByRole("button", { name: "View mentor info for Updated Mentor" })
    );
    fireEvent.change(screen.getByLabelText(/Expertise/), {
      target: { value: "First saved topic\nFacilitation, Coaching" },
    });
    expect(within(preview).getByText("Coaching")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("LinkedIn profile URL"), {
      target: { value: "https://www.linkedin.com/in/updated-mentor/" },
    });
    expect(
      within(preview)
        .getByRole("link", { name: /View on LinkedIn/ })
        .getAttribute("href")
    ).toBe("https://www.linkedin.com/in/updated-mentor/");
  });
});
