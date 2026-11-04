import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";

describe("Card Primitive", () => {
  it("renders card with header, title, description, content, and footer", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Course Title</CardTitle>
          <CardDescription>Comprehensive curriculum.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Batch details and fee schedule.</p>
        </CardContent>
        <CardFooter>
          <button type="button">Enroll</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByRole("heading", { level: 3, name: "Course Title" })).toBeDefined();
    expect(screen.getByText("Comprehensive curriculum.")).toBeDefined();
    expect(screen.getByText("Batch details and fee schedule.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Enroll" })).toBeDefined();
  });

  it("applies interactive hover styles when variant is interactive", () => {
    const { container } = render(<Card variant="interactive">Interactive Content</Card>);
    expect(container.firstChild).toBeDefined();
    const cardEl = container.firstChild as HTMLElement;
    expect(cardEl.className).toContain("hover:shadow-md");
    expect(cardEl.className).toContain("cursor-pointer");
  });
});

