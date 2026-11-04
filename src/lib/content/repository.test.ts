// @vitest-environment node
import { describe, it, expect } from "vitest";
import { getCourseRepository, getBatchRepository, getHomeRepository } from "./repository";

describe("Content Repository Abstraction (Phase 3)", () => {
  describe("CourseRepository", () => {
    it("retrieves all courses with validated schema and offline delivery mode", async () => {
      const repo = getCourseRepository();
      const courses = await repo.getAllCourses();

      expect(courses.length).toBeGreaterThanOrEqual(3);
      for (const course of courses) {
        expect(course.deliveryMode).toBe("offline");
        expect(course.modules.length).toBeGreaterThan(0);
        expect(course.provenance.class).toBe("B");
      }
    });

    it("retrieves specific course by slug", async () => {
      const repo = getCourseRepository();
      const course = await repo.getCourseById("executive-leadership");

      expect(course).not.toBeNull();
      expect(course?.title).toContain("Executive Leadership");
      expect(course?.category).toBe("Leadership & Strategy");
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

      expect(batches.length).toBeGreaterThanOrEqual(3);
      for (const batch of batches) {
        expect(batch.seatHoldDurationMinutes).toBe(30);
        expect(Number.isInteger(batch.feePoisha)).toBe(true);
        expect(batch.feePoisha).toBeGreaterThan(0);
        expect(batch.capacity).toBeGreaterThan(0);
        expect(batch.provenance.class).toBe("B");
      }
    });

    it("filters batches by courseId", async () => {
      const repo = getBatchRepository();
      const batches = await repo.getBatchesByCourseId("executive-leadership");

      expect(batches.length).toBeGreaterThan(0);
      for (const batch of batches) {
        expect(batch.courseId).toBe("executive-leadership");
      }
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

      expect(slides.length).toBeGreaterThanOrEqual(3);
      expect(slides[0].order).toBeLessThanOrEqual(slides[1].order);
      for (const slide of slides) {
        expect(slide.ctaHref).toBeDefined();
        expect(slide.provenance.class).toBe("B");
      }
    });

    it("retrieves homepage section toggles and ordering", async () => {
      const repo = getHomeRepository();
      const sections = await repo.getSections();

      expect(sections.length).toBeGreaterThanOrEqual(5);
      expect(sections.some((s) => s.id === "hero-carousel")).toBe(true);
      expect(sections.some((s) => s.id === "course-catalog")).toBe(true);
    });

    it("retrieves verified institutional impact figures", async () => {
      const repo = getHomeRepository();
      const figures = await repo.getImpactFigures();

      expect(figures.length).toBeGreaterThanOrEqual(4);
      for (const figure of figures) {
        expect(figure.metric).toBeDefined();
        expect(figure.label).toBeDefined();
        expect(figure.provenance.class).toBe("B");
      }
    });
  });
});
