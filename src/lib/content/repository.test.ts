// @vitest-environment node
import { describe, it, expect } from "vitest";
import { getCourseRepository, getBatchRepository, getHomeRepository } from "./repository";

describe("Content Repository Abstraction (Phase 3)", () => {
  describe("CourseRepository", () => {
    it("retrieves all courses with validated schema and offline delivery mode", async () => {
      const repo = getCourseRepository();
      const courses = await repo.getAllCourses();

      expect(courses.length).toBe(2);
      expect(courses.map((c) => c.id)).toEqual(expect.arrayContaining(["mto-readiness", "irgp"]));
      for (const course of courses) {
        expect(course.deliveryMode).toBe("offline");
        expect(course.modules.length).toBeGreaterThan(0);
        expect(course.mentorIds.length).toBeGreaterThan(0);
        expect(["A", "B"]).toContain(course.provenance.class);
      }
    });

    it("retrieves specific course by slug", async () => {
      const repo = getCourseRepository();
      const mtoCourse = await repo.getCourseById("mto-readiness");

      expect(mtoCourse).not.toBeNull();
      expect(mtoCourse?.title).toContain("MTO Readiness");
      expect(mtoCourse?.category).toBe("Career Readiness");

      const irgpCourse = await repo.getCourseById("irgp");

      expect(irgpCourse).not.toBeNull();
      expect(irgpCourse?.title).toContain("Industry Readiness Graduate Program");
      expect(irgpCourse?.category).toBe("Industry Readiness");
    });

    it("returns null for non-existent course slug", async () => {
      const repo = getCourseRepository();
      const course = await repo.getCourseById("non-existent-course");
      expect(course).toBeNull();
    });

    it("retrieves featured published courses", async () => {
      const repo = getCourseRepository();
      const featured = await repo.getFeaturedCourses();

      expect(featured.length).toBeGreaterThan(0);
      for (const course of featured) {
        expect(course.featured).toBe(true);
        expect(course.status).toBe("published");
      }
    });
  });

  describe("BatchRepository", () => {
    it("retrieves all batches with valid integer poisha fees and 30-min seat holds", async () => {
      const repo = getBatchRepository();
      const batches = await repo.getAllBatches();

      expect(batches.length).toBe(2);
      expect(batches.map((b) => b.id)).toEqual(
        expect.arrayContaining(["batch-mto-2026-01", "batch-irgp-cohort-1"])
      );
      for (const batch of batches) {
        expect(batch.seatHoldDurationMinutes).toBe(30);
        expect(Number.isInteger(batch.feePoisha)).toBe(true);
        expect(batch.feePoisha).toBeGreaterThanOrEqual(0);
        expect(batch.capacity).toBeGreaterThan(0);
        expect(["A", "B"]).toContain(batch.provenance.class);
      }
    });

    it("filters batches by courseId", async () => {
      const repo = getBatchRepository();
      const mtoBatches = await repo.getBatchesByCourseId("mto-readiness");

      expect(mtoBatches.length).toBe(1);
      expect(mtoBatches[0].courseId).toBe("mto-readiness");
      expect(mtoBatches[0].feePoisha).toBe(750000);

      const irgpBatches = await repo.getBatchesByCourseId("irgp");

      expect(irgpBatches.length).toBe(1);
      expect(irgpBatches[0].courseId).toBe("irgp");
    });

    it("retrieves open batches for enrollment", async () => {
      const repo = getBatchRepository();
      const openBatches = await repo.getOpenBatches();

      expect(openBatches.length).toBeGreaterThan(0);
      for (const batch of openBatches) {
        expect(batch.status).toBe("open_for_enrollment");
      }
    });
  });

  describe("HomeRepository", () => {
    it("retrieves hero slides in sorted order", async () => {
      const repo = getHomeRepository();
      const slides = await repo.getHeroSlides();

      expect(slides.length).toBe(2);
      expect(slides[0].order).toBeLessThanOrEqual(slides[1].order);
      for (const slide of slides) {
        expect(slide.ctaHref).toBeDefined();
        expect(slide.provenance.class).toBe("B");
      }
    });

    it("retrieves homepage section toggles and ordering", async () => {
      const repo = getHomeRepository();
      const sections = await repo.getSections();

      expect(sections.length).toBe(7);
      expect(sections.some((s) => s.id === "hero-slider")).toBe(true);
      expect(sections.some((s) => s.id === "courses")).toBe(true);
      expect(sections.some((s) => s.id === "partners")).toBe(true);
      expect(sections.some((s) => s.id === "events")).toBe(true);
      expect(sections.some((s) => s.id === "mentors")).toBe(true);
      expect(sections.some((s) => s.id === "reviews")).toBe(true);
    });

    it("retrieves impact figures in development demo mode with placeholder indicators", async () => {
      const repo = getHomeRepository();
      const figures = await repo.getImpactFigures();

      expect(figures.length).toBeGreaterThanOrEqual(4);
      for (const figure of figures) {
        expect(figure.metric).toBeDefined();
        expect(figure.label).toBeDefined();
        expect(figure.provenance.class).toBe("B");
        expect(figure.provenance.verified).toBe(false);
        expect(figure.isPlaceholder).toBe(true);
      }
    });

    it("prevents unverified placeholder figures from leaking when verifiedOnly is requested", async () => {
      const repo = getHomeRepository();
      // When requesting verifiedOnly, unverified Class B placeholder figures must not appear
      const verifiedFigures = await repo.getImpactFigures({ verifiedOnly: true });
      expect(verifiedFigures).toEqual([]);
    });

    it("retrieves corporate partners, events, mentors, and reviews from home repository", async () => {
      const repo = getHomeRepository();

      const partners = await repo.getPartners();
      expect(partners.length).toBeGreaterThanOrEqual(4);
      expect(partners[0].name).toBeDefined();
      expect(typeof partners[0].isPlaceholder).toBe("boolean");

      const events = await repo.getEvents();
      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events[0].deliveryMode).toBe("offline");

      const mentors = await repo.getMentors();
      expect(mentors.length).toBeGreaterThanOrEqual(3);
      expect(mentors[0].role).toBeDefined();

      const reviews = await repo.getReviews();
      expect(reviews.length).toBeGreaterThanOrEqual(3);
      expect(reviews[0].quote).toBeDefined();
      expect(reviews[0].author).toBeDefined();
    });
  });
});
