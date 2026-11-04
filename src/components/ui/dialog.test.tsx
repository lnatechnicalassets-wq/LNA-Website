import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./dialog";

describe("Dialog Primitive (Radix Accessible Dialog)", () => {
  it("renders trigger and opens dialog on click", () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <button type="button">Open Modal</button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modal Heading</DialogTitle>
            <DialogDescription>Modal details description.</DialogDescription>
          </DialogHeader>
          <p>Dialog body content.</p>
          <DialogClose asChild>
            <button type="button">Dismiss</button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    );

    const trigger = screen.getByRole("button", { name: /Open Modal/i });
    expect(trigger).toBeDefined();

    // Dialog content should not be visible before clicking trigger
    expect(screen.queryByRole("dialog")).toBeNull();

    // Click to open
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: /Modal Heading/i })).toBeDefined();
    expect(screen.getByText("Modal details description.")).toBeDefined();
    expect(screen.getByText("Dialog body content.")).toBeDefined();

    // Click close button
    const closeBtn = screen.getByRole("button", { name: /Dismiss/i });
    fireEvent.click(closeBtn);

    // Dialog content unmounts
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
