import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BatchMentorForm } from "./batch-mentor-form";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
afterEach(() => {
  cleanup();
  refresh.mockClear();
});

const existing = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  slug: "existing",
  name: "Existing Mentor",
  role: "Lead Instructor",
  organization: "Lead Nation Academy",
  portrait_src: null,
  company_logo_src: null,
};
const candidate = {
  ...existing,
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  slug: "candidate",
  name: "Candidate Mentor",
};

describe("Cohort mentor cards", () => {
  it("shows the target cohort, cancels safely, and confirms while keeping the inherited roster", async () => {
    const save = vi.fn().mockResolvedValue({ success: true });
    render(
      <BatchMentorForm
        roster={{ options: [existing, candidate], selectedIds: [], inheritedIds: [existing.id] }}
        courseTitle="Example Course"
        batchName="Cohort Two"
        save={save}
      />
    );

    const add = screen.getByRole("button", { name: "Add to cohort Candidate Mentor" });
    fireEvent.click(add);
    const dialog = screen.getByRole("dialog", { name: "Add to cohort" });
    expect(
      within(dialog).getByText("Add Candidate Mentor as a mentor for Example Course, Cohort Two?")
    ).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(add);
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][1].getAll("mentorId")).toEqual([existing.id, candidate.id]);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
