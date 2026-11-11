import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NEWS_CATEGORIES, NewsArticleSchema } from "@/lib/content/news";
import { getNewsRepository } from "@/lib/content/repository";
import { NewsArchiveView } from "./news-archive-view";

const pushMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  usePathname: () => "/news",
  useSearchParams: () => currentSearchParams,
}));

describe("NewsArchiveView and News Content Catalog", () => {
  beforeEach(() => {
    pushMock.mockReset();
    currentSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    cleanup();
  });

  it("removes Community and Invitations from NEWS_CATEGORIES and published articles", async () => {
    expect(NEWS_CATEGORIES).toEqual(["All updates", "Partnerships", "Program updates"]);

    const articles = await getNewsRepository().getPublishedArticles();
    expect(articles.length).toBe(3);
    expect(articles.some((a) => a.slug === "connecting-learning-with-industry")).toBe(false);
    expect(
      articles.some(
        (a) => (a.category as string) === "Community" || (a.category as string) === "Invitations"
      )
    ).toBe(false);

    // Schema rejects removed categories cleanly
    expect(NewsArticleSchema.shape.category.safeParse("Community").success).toBe(false);
    expect(NewsArticleSchema.shape.category.safeParse("Invitations").success).toBe(false);
  });

  it("renders only All updates, Partnerships, and Program updates category filters", async () => {
    const articles = await getNewsRepository().getPublishedArticles();
    render(<NewsArchiveView initialArticles={articles} />);

    expect(screen.getByRole("button", { name: "All updates" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Partnerships" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Program updates" })).toBeDefined();

    expect(screen.queryByRole("button", { name: "Community" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Invitations" })).toBeNull();
    expect(screen.queryByText(/Connecting learning with industry/i)).toBeNull();

    // Selecting Program updates pushes the filtered URL
    fireEvent.click(screen.getByRole("button", { name: "Program updates" }));
    expect(pushMock).toHaveBeenCalledWith("/news?category=Program+updates", { scroll: false });
  });

  it("filters accurately by Partnerships and falls back cleanly for obsolete category query params", async () => {
    const articles = await getNewsRepository().getPublishedArticles();
    currentSearchParams = new URLSearchParams("category=Program+updates");

    const { rerender } = render(<NewsArchiveView initialArticles={articles} />);
    expect(screen.getByText(/Showing 1 story in Program updates/i)).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 3, name: /Industry Readiness Graduate Program/i })
    ).toBeDefined();

    // Obsolete ?category=Community falls back gracefully to All updates
    currentSearchParams = new URLSearchParams("category=Community");
    rerender(<NewsArchiveView initialArticles={articles} />);

    const allUpdatesBtn = screen.getByRole("button", { name: "All updates" });
    expect(allUpdatesBtn.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByRole("heading", { level: 2, name: /LNA Partners with BTRC/i })
    ).toBeDefined();
  });
});
