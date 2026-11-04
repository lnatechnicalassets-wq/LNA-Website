import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./button";

describe("Button Primitive (WCAG 2.2 AA)", () => {
  it("renders with default primary styles and button type", () => {
    render(<Button>Click Me</Button>);
    const button = screen.getByRole("button", { name: /Click Me/i });
    expect(button).toBeDefined();
    expect(button.getAttribute("type")).toBe("button");
    expect(button.className).toContain("bg-primary-800");
  });

  it("renders distinct variants correctly", () => {
    const { rerender } = render(<Button variant="accent">Accent</Button>);
    expect(screen.getByRole("button").className).toContain("bg-accent-600");

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole("button").className).toContain("border-border-default");

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole("button").className).toContain("bg-status-danger-solid");
  });

  it("handles click events when enabled", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);
    fireEvent.click(screen.getByRole("button", { name: /Submit/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("prevents clicks and sets disabled state when disabled", () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );
    const button = screen.getByRole("button", { name: /Disabled/i });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("displays loading spinner and sets aria-busy when isLoading is true", () => {
    const handleClick = vi.fn();
    render(
      <Button isLoading onClick={handleClick}>
        Save
      </Button>
    );
    const button = screen.getByRole("button", { name: /Save/i });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});

