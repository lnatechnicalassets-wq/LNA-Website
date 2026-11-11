import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MobileNav } from "./mobile-nav";
import type { NavItem, Organization } from "@/lib/content";

const mockNavItems: NavItem[] = [
  { label: "Courses", href: "/courses" },
  { label: "About", href: "/about" },
];

const mockCta: NavItem = {
  label: "Enroll Now",
  href: "/courses",
};

const mockOrg: Organization = {
  name: "Lead Nation Academy",
  shortName: "LNA",
  domain: "lnabd.org",
  email: "info@lnabd.org",
  phone: "+880 1700-000000",
  address: {
    street: "Road 27",
    city: "Dhaka",
    postalCode: "1209",
    country: "Bangladesh",
  },
  businessHours: "9am - 6pm",
  provenance: {
    class: "B",
    verified: false,
    source: "Test org source",
    verifiedBy: null,
    verifiedOn: null,
  },
};

describe("MobileNav Component", () => {
  it("does not render drawer content when open is false", () => {
    render(
      <MobileNav
        open={false}
        onOpenChange={vi.fn()}
        navItems={mockNavItems}
        cta={mockCta}
        organization={mockOrg}
      />
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders drawer dialog with complete official logo, nav items, and organization details when open is true", () => {
    render(
      <MobileNav
        open={true}
        onOpenChange={vi.fn()}
        navItems={mockNavItems}
        cta={mockCta}
        organization={mockOrg}
      />
    );
    expect(screen.getByRole("dialog")).toBeDefined();
    const logoImg = screen.getByRole("img", { name: "Lead Nation Academy" });
    expect(logoImg.getAttribute("src")).toBe("/images/brand/logo.png");
    expect(logoImg.getAttribute("src")).not.toBe("/images/brand/logo-crest.png");
    expect(screen.getByRole("link", { name: "Courses" })).toBeDefined();
    expect(screen.getByRole("link", { name: "About" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Enroll Now" })).toBeDefined();
    const phoneLink = screen.getByRole("link", { name: "+880 1700-000000" });
    expect(phoneLink.getAttribute("href")).toBe("tel:+8801700000000");
    expect(screen.getByText("Road 27, Dhaka 1209")).toBeDefined();
  });

  it("calls onOpenChange(false) when close button is clicked", () => {
    const handleOpenChange = vi.fn();
    render(
      <MobileNav
        open={true}
        onOpenChange={handleOpenChange}
        navItems={mockNavItems}
        cta={mockCta}
        organization={mockOrg}
      />
    );
    const closeBtn = screen.getByRole("button", { name: /Close navigation menu/i });
    fireEvent.click(closeBtn);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
