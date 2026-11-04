import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Input } from "./input";

describe("Input Primitive (WCAG 2.2 AA Accessibility)", () => {
  it("renders with label associated via htmlFor", () => {
    render(<Input label="Applicant Name" placeholder="Enter name" />);
    const input = screen.getByLabelText(/Applicant Name/i);
    expect(input).toBeDefined();
    expect(input.getAttribute("placeholder")).toBe("Enter name");
  });

  it("links helper text via aria-describedby", () => {
    render(<Input label="Reference" helperText="Your 12-character ID" />);
    const input = screen.getByLabelText(/Reference/i);
    const helper = screen.getByText("Your 12-character ID");
    expect(input.getAttribute("aria-describedby")).toBe(helper.id);
  });

  it("displays error message and sets aria-invalid when error is provided", () => {
    render(<Input label="Email" error="Invalid email format" defaultValue="bad-email" />);
    const input = screen.getByLabelText(/Email/i);
    const errorMessage = screen.getByRole("alert");

    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(errorMessage.textContent).toBe("Invalid email format");
    expect(input.getAttribute("aria-describedby")).toContain(errorMessage.id);
  });

  it("handles user text input correctly", () => {
    const handleChange = vi.fn();
    render(<Input label="Notes" onChange={handleChange} />);
    const input = screen.getByLabelText(/Notes/i);

    fireEvent.change(input, { target: { value: "Cohort 2026" } });
    expect(handleChange).toHaveBeenCalled();
  });

  it("renders disabled state with disabled attribute", () => {
    render(<Input label="Locked" disabled />);
    const input = screen.getByLabelText(/Locked/i);
    expect(input.hasAttribute("disabled")).toBe(true);
  });
});
