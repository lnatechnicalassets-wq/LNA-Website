import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  manualAdmissionCopy as copy,
  type ManualAdmissionBatchOption,
  type ManualAdmissionState,
} from "@/lib/admin-manual-admission";
import { ManualAdmissionForm } from "./manual-admission-form";

const options: ManualAdmissionBatchOption[] = [
  {
    id: "first",
    courseId: "course-1",
    courseTitle: "Industry Readiness",
    name: "Cohort 1",
    startDate: "2026-12-01",
    revision: "2026-11-16T00:00:00Z",
    fee: "৳5,500",
    feePoisha: "550000",
    isFree: false,
    questions: [{ id: "university", label: "University", type: "text", required: true }],
  },
  {
    id: "second",
    courseId: "course-1",
    courseTitle: "Industry Readiness",
    name: "Cohort 2",
    startDate: "2026-12-05",
    revision: "2026-11-16T00:00:00Z",
    fee: "৳7,500",
    feePoisha: "750000",
    isFree: false,
    questions: [{ id: "university", label: "University", type: "text", required: true }],
  },
  {
    id: "third",
    courseId: "course-2",
    courseTitle: "Leadership Readiness",
    name: "Cohort A",
    startDate: "2026-12-08",
    revision: "2026-11-16T01:00:00Z",
    fee: "Free",
    feePoisha: "0",
    isFree: true,
    questions: [],
  },
];

afterEach(cleanup);

describe("Add student batch selection", () => {
  it("shows the selected cohort’s fee and questions and preserves student fields when the course changes", () => {
    render(<ManualAdmissionForm batches={options} save={vi.fn()} />);
    const courses = screen.getByLabelText<HTMLSelectElement>("Course");
    const batches = screen.getByLabelText<HTMLSelectElement>("Batch");
    expect(batches.disabled).toBe(true);
    expect(screen.queryByLabelText("Full name")).toBeNull();

    fireEvent.change(courses, { target: { value: "course-1" } });
    expect([...batches.options].map((option) => option.value)).toEqual(["", "first", "second"]);
    fireEvent.change(batches, { target: { value: "second" } });
    expect(screen.getByText("৳7,500")).toBeDefined();
    expect(screen.getByText(copy.paidDescription)).toBeDefined();
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Fixture Student" } });
    fireEvent.change(screen.getByLabelText("University"), {
      target: { value: "Fixture University" },
    });

    fireEvent.change(courses, { target: { value: "course-2" } });
    expect(batches.value).toBe("third");
    expect(screen.getByText("Free")).toBeDefined();
    expect(screen.queryByLabelText(copy.paymentMethod)).toBeNull();
    expect(screen.queryByLabelText("University")).toBeNull();
    expect(screen.getByLabelText<HTMLInputElement>("Full name").value).toBe("Fixture Student");
  });

  it("prefills a roster batch and submits its ID and revision from the form", async () => {
    const save = vi.fn(async (_state: ManualAdmissionState, data: FormData) => {
      expect(data.get("batchId")).toBe("first");
      expect(data.get("batchRevision")).toBe(options[0].revision);
      expect(data.get("paymentMethod")).toBe("bank_transfer");
      expect(data.get("paymentReference")).toBe("BANK/001");
      return { message: copy.setupRequired };
    });
    render(<ManualAdmissionForm batches={options} initialBatchId="first" save={save} />);

    expect(screen.getByLabelText<HTMLSelectElement>("Course").value).toBe("course-1");
    expect(screen.getByLabelText<HTMLSelectElement>("Batch").value).toBe("first");
    fireEvent.change(screen.getByLabelText(copy.paymentMethod), { target: { value: "bkash" } });
    fireEvent.change(screen.getByLabelText(copy.bkashReference), { target: { value: "BKASH001" } });
    fireEvent.change(screen.getByLabelText(copy.paymentMethod), {
      target: { value: "bank_transfer" },
    });
    const reference = screen.getByLabelText<HTMLInputElement>(copy.bankReference);
    expect(reference.value).toBe("");
    fireEvent.change(reference, { target: { value: "BANK/001" } });
    const form = screen.getByRole("button", { name: copy.saveForReview }).closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(copy.setupRequired));
    expect(save).toHaveBeenCalledTimes(1);
  });
});
