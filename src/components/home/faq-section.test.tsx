import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FaqSection } from "./faq-section";
import { FaqItem } from "@/lib/content";

const mockFaqs: FaqItem[] = [
  {
    id: "faq-01",
    question: "What will be covered in the MTO Readiness Program?",
    answer:
      "The program covers essential knowledge and practical skills for the Management Trainee Officer track.",
    category: "program",
    icon: "book",
    order: 1,
    published: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Curriculum",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "faq-02",
    question: "Who can apply for LNA programs and masterclasses?",
    answer: "Eligibility depends on the specific course track.",
    category: "eligibility",
    icon: "users",
    order: 2,
    published: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Candidate guidelines",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "faq-03",
    question: "How are classes conducted, and what is the schedule?",
    answer: "The program comprises 16 in-person sessions, with 1.5 hours per session.",
    category: "schedule",
    icon: "calendar",
    order: 3,
    published: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Delivery structure",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "faq-04",
    question: "Where will the classes be held?",
    answer: "Classes are conducted offline at our dedicated executive learning facility in Dhaka.",
    category: "venue",
    icon: "map-pin",
    order: 4,
    published: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Campus policy",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "faq-05",
    question: "How do I register or apply for a course?",
    answer:
      "To register, choose your course track on our Courses section and submit the online application.",
    category: "registration",
    icon: "pointer",
    order: 5,
    published: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Admissions",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "faq-06",
    question: "What are the program fees, and how can I make the payment?",
    answer:
      "For the MTO Readiness Program, the fee is BDT 7,500. Payments can be completed through bKash.",
    category: "fees",
    icon: "credit-card",
    order: 6,
    published: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Fee schedule",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "faq-07",
    question: "Will I receive a certificate after completing a program?",
    answer:
      "Yes. Learners who meet attendance and practical assessment criteria receive an official Certificate.",
    category: "certification",
    icon: "award",
    order: 7,
    published: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Academic policy",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "faq-08",
    question: "Can I contact LNA before registering or choosing a course?",
    answer:
      "Absolutely. Prospective learners can reach out to our academic counsellors for syllabus guidance.",
    category: "support",
    icon: "help",
    order: 8,
    published: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Advising policy",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
];

describe("FaqSection (Section 6: Frequently Asked Questions)", () => {
  it("renders editorial heading, academic illustration, and all eight questions", () => {
    render(<FaqSection faqs={mockFaqs} />);

    // Eyebrow and Heading
    expect(screen.getByText("FAQ")).toBeDefined();
    expect(
      screen.getByRole("heading", { name: /frequently asked questions/i, level: 2 })
    ).toBeDefined();

    // Academic illustration
    const img = screen.getByAltText(/lead nation academy academic resources/i);
    expect(img).toBeDefined();

    // 8 questions rendered in the accordion
    mockFaqs.forEach((faq) => {
      expect(screen.getByText(faq.question)).toBeDefined();
    });
  });

  it("contains exactly one Contact Us CTA navigating to #contact", () => {
    render(<FaqSection faqs={mockFaqs} />);

    // Search for all anchor elements labeled Contact Us inside the FAQ section
    const contactLinks = screen.getAllByRole("link", { name: /contact us/i });
    expect(contactLinks).toHaveLength(1);
    expect(contactLinks[0].getAttribute("href")).toBe("#contact");
  });

  it("has first question expanded by default and toggles correctly when another question is clicked", () => {
    render(<FaqSection faqs={mockFaqs} />);

    const firstButton = screen.getByRole("button", {
      name: new RegExp(mockFaqs[0].question, "i"),
    });
    const secondButton = screen.getByRole("button", {
      name: new RegExp(mockFaqs[1].question, "i"),
    });

    // Initially first item is expanded
    expect(firstButton.getAttribute("aria-expanded")).toBe("true");
    expect(secondButton.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText(mockFaqs[0].answer)).toBeDefined();

    // Click second question
    fireEvent.click(secondButton);

    // Now second is expanded and first is closed
    expect(secondButton.getAttribute("aria-expanded")).toBe("true");
    expect(firstButton.getAttribute("aria-expanded")).toBe("false");

    // Click second question again (collapsing it)
    fireEvent.click(secondButton);
    expect(secondButton.getAttribute("aria-expanded")).toBe("false");
  });
});
