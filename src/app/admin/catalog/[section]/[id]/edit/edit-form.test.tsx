import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditForm } from "./edit-form";

afterEach(cleanup);

describe("catalog form validation on blur", () => {
  it.each([
    ["courses", "create", "Course slug", "Bad Slug", "valid-slug"],
    ["courses", "edit", "Title", "A", "Course title"],
    ["batches", "create", "Batch number", "-1", "2"],
    ["batches", "edit", "Capacity", "-1", "30"],
  ] as const)(
    "validates %s in %s mode only after leaving the field",
    (section, mode, label, invalid, valid) => {
      const save = vi.fn().mockResolvedValue({});
      render(<EditForm section={section} mode={mode} initialValues={{}} save={save} />);

      const field = screen.getByLabelText(label, { exact: true });
      const untouched = screen.getByLabelText("Venue", { exact: true });
      expect(field.closest("form")?.noValidate).toBe(true);
      expect(field.hasAttribute("required")).toBe(false);
      expect(field.getAttribute("aria-required")).toBe("true");
      fireEvent.focus(field);
      fireEvent.change(field, { target: { value: invalid } });
      expect(field.getAttribute("aria-invalid")).toBe("false");
      fireEvent.blur(field);
      expect(field.getAttribute("aria-invalid")).toBe("true");
      expect(untouched.getAttribute("aria-invalid")).toBe("false");

      fireEvent.focus(field);
      fireEvent.change(field, { target: { value: valid } });
      expect(field.getAttribute("aria-invalid")).toBe("true");
      fireEvent.blur(field);
      expect(field.getAttribute("aria-invalid")).toBe("false");
      expect(save).not.toHaveBeenCalled();
    }
  );

  it("updates date and discount errors when either related field loses focus", () => {
    render(<EditForm section="batches" mode="create" initialValues={{}} save={vi.fn()} />);
    const start = screen.getByLabelText("Start date");
    const end = screen.getByLabelText("End date");
    fireEvent.change(start, { target: { value: "2027-02-02" } });
    fireEvent.blur(start);
    expect(end.getAttribute("aria-invalid")).toBe("false");
    fireEvent.change(end, { target: { value: "2027-02-01" } });
    expect(end.getAttribute("aria-invalid")).toBe("false");
    fireEvent.blur(end);
    expect(screen.getByText("Choose a date on or after the start date.")).toBeTruthy();
    fireEvent.change(start, { target: { value: "2027-01-31" } });
    fireEvent.blur(start);
    expect(end.getAttribute("aria-invalid")).toBe("false");

    const fee = screen.getByLabelText("List fee (BDT)");
    const discount = screen.getByLabelText("Discounted fee (BDT, optional)");
    fireEvent.change(fee, { target: { value: "1000.25" } });
    fireEvent.blur(fee);
    fireEvent.change(discount, { target: { value: "1000.26" } });
    expect(discount.getAttribute("aria-invalid")).toBe("false");
    fireEvent.blur(discount);
    expect(screen.getByText("The discounted fee cannot exceed the list fee.")).toBeTruthy();
    fireEvent.change(fee, { target: { value: "1000.26" } });
    fireEvent.blur(fee);
    expect(discount.getAttribute("aria-invalid")).toBe("false");
  });

  it("focuses the first invalid field and blocks the action on an invalid submit", () => {
    const save = vi.fn();
    render(<EditForm section="courses" initialValues={{}} save={save} />);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    const title = screen.getByLabelText("Title", { exact: true });
    expect(document.activeElement).toBe(title);
    expect(title.getAttribute("aria-invalid")).toBe("true");
    expect(save).not.toHaveBeenCalled();
  });

  it("keeps a database error until the affected field changes", async () => {
    const save = vi.fn().mockResolvedValue({
      message: "Check the highlighted fields and try again.",
      fieldErrors: { slug: ["This course slug is already in use."] },
    });
    render(
      <EditForm
        section="courses"
        mode="create"
        initialValues={{
          title: "Course title",
          slug: "existing-course",
          subtitle: "Course subtitle",
          category: "Training",
          summary: "Description of the course.",
          description: "A longer description of the draft course.",
          venue: "Dhaka",
        }}
        save={save}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Create draft" }));
    await screen.findByText("This course slug is already in use.");
    fireEvent.change(screen.getByLabelText("Title", { exact: true }), {
      target: { value: "New course title" },
    });
    expect(screen.getByText("This course slug is already in use.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Course slug"), {
      target: { value: "new-course" },
    });
    await waitFor(() =>
      expect(screen.queryByText("This course slug is already in use.")).toBeNull()
    );
  });
});
