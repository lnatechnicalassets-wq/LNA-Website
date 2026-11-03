import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders the Lead Nation Academy heading", () => {
    render(<HomePage />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeDefined();
    expect(heading.textContent).toContain("Lead Nation Academy");
  });
});
