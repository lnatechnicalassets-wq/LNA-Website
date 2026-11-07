import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContactSection } from "./contact-section";
import { ContactConfig } from "@/lib/content";

const mockContactConfig: ContactConfig = {
  eyebrow: "CONTACT US",
  title: "Get in Touch",
  description:
    "Send questions about registration, class schedule, program details, fees, and general support.",
  email: "info@lnabd.org",
  phone: "+8801700000000",
  phoneDisplay: "+880 1700-000000",
  officeAddress: {
    line1: "Road 27, Dhanmondi",
    line2: "Dhaka-1209",
    city: "Dhaka",
    country: "Bangladesh",
  },
  officeHours: "Saturday – Thursday: 9:00 AM – 6:00 PM",
  shortcuts: [
    {
      id: "shortcut-register",
      title: "How to Register",
      icon: "register",
      categoryValue: "registration",
    },
    {
      id: "shortcut-schedule",
      title: "Class Schedule",
      icon: "schedule",
      categoryValue: "schedule",
    },
    { id: "shortcut-fee", title: "Program Fee", icon: "fee", categoryValue: "fees" },
    { id: "shortcut-support", title: "General Support", icon: "support", categoryValue: "support" },
  ],
  categories: [
    { value: "registration", label: "How to Register / Application" },
    { value: "schedule", label: "Class Schedule & Batches" },
    { value: "fees", label: "Program Fee & Payment" },
    { value: "support", label: "General Support & Advisory" },
    { value: "other", label: "Other Enquiry" },
  ],
  visibility: {
    showEmail: true,
    showPhone: false, // Verified: Placeholder phone numbers omitted by default
    showAddress: true,
    showHours: true,
    showOfficeVisual: true,
  },
  provenance: {
    class: "B",
    verified: false,
    source: "Coordinates",
    verifiedBy: null,
    verifiedOn: null,
  },
};

describe("ContactSection (Section 7: Contact Us)", () => {
  it("renders 3 distinct zones: intro & shortcuts, contact form, and contact info panel", () => {
    render(<ContactSection config={mockContactConfig} />);

    // Section landmark
    const section = screen.getByRole("region", { name: /contact us/i });
    expect(section).toBeDefined();
    expect(section.getAttribute("id")).toBe("contact");

    // Left Column: Eyebrow, Heading & Shortcuts
    expect(screen.getByText("CONTACT US")).toBeDefined();
    expect(screen.getByRole("heading", { name: /get in touch/i, level: 2 })).toBeDefined();
    expect(screen.getByRole("button", { name: /how to register/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /class schedule/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /program fee/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /general support/i })).toBeDefined();

    // Center Column: Contact Form
    expect(screen.getByRole("heading", { name: /send us a message/i, level: 3 })).toBeDefined();
    expect(screen.getByPlaceholderText(/enter your full name/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/enter your email address/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/enter your phone number/i)).toBeDefined();
    expect(screen.getByRole("combobox", { name: /subject \/ inquiry category/i })).toBeDefined();
    expect(screen.getByPlaceholderText(/write your message here/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /send message/i })).toBeDefined();

    // Right Column: Coordinates
    expect(screen.getByText("info@lnabd.org")).toBeDefined();
    expect(screen.getByText(/road 27, dhanmondi/i)).toBeDefined();
    expect(screen.getByText("Saturday – Thursday: 9:00 AM – 6:00 PM")).toBeDefined();
    // Unverified phone should not be rendered when showPhone is false
    expect(screen.queryByText("+880 1700-000000")).toBeNull();
    // Representative image with disclosure alt
    expect(
      screen.getByAltText(/representative executive learning facility \(illustration\)/i)
    ).toBeDefined();
  });

  it("updates category dropdown when an enquiry shortcut card is clicked", () => {
    render(<ContactSection config={mockContactConfig} />);

    const select = screen.getByRole("combobox", {
      name: /subject \/ inquiry category/i,
    }) as HTMLSelectElement;
    expect(select.value).toBe("registration");

    // Click Class Schedule shortcut
    const scheduleBtn = screen.getByRole("button", { name: /class schedule/i });
    fireEvent.click(scheduleBtn);
    expect(select.value).toBe("schedule");

    // Click Program Fee shortcut
    const feeBtn = screen.getByRole("button", { name: /program fee/i });
    fireEvent.click(feeBtn);
    expect(select.value).toBe("fees");
  });

  it("does not render forbidden features (Book a Call, appointment picker, or duplicate FAQ links)", () => {
    render(<ContactSection config={mockContactConfig} />);

    expect(screen.queryByText(/book a call/i)).toBeNull();
    expect(screen.queryByText(/schedule an appointment/i)).toBeNull();
    expect(screen.queryByText(/frequently asked questions/i)).toBeNull();
  });
});
