import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { Course, CourseSchema } from "./courses";
import { Batch, BatchSchema } from "./batches";
import {
  HeroSlide,
  HeroSlideSchema,
  HomeSections,
  HomeSectionsSchema,
  HomeSectionItem,
  ImpactFigure,
  ImpactFigureSchema,
} from "./home";

export interface ICourseRepository {
  getAllCourses(): Promise<Course[]>;
  getCourseById(id: string): Promise<Course | null>;
  getFeaturedCourses(): Promise<Course[]>;
}

export interface IBatchRepository {
  getAllBatches(): Promise<Batch[]>;
  getBatchesByCourseId(courseId: string): Promise<Batch[]>;
  getBatchById(id: string): Promise<Batch | null>;
  getOpenBatches(): Promise<Batch[]>;
}

export interface IHomeRepository {
  getHeroSlides(): Promise<HeroSlide[]>;
  getSections(): Promise<HomeSectionItem[]>;
  getImpactFigures(options?: { verifiedOnly?: boolean }): Promise<ImpactFigure[]>;
}

/**
 * JsonContentRepository: Loads and validates JSON content files.
 * Provides early development and static seed capabilities before Supabase DB migrations.
 */
export class JsonContentRepository implements ICourseRepository, IBatchRepository, IHomeRepository {
  private contentDir: string;
  private cachedCourses: Course[] | null = null;
  private cachedBatches: Batch[] | null = null;
  private cachedHeroSlides: HeroSlide[] | null = null;
  private cachedSections: HomeSections | null = null;
  private cachedImpactFigures: ImpactFigure[] | null = null;

  constructor(contentDir = path.join(process.cwd(), "content")) {
    this.contentDir = contentDir;
  }

  // --- Courses ---
  async getAllCourses(): Promise<Course[]> {
    if (this.cachedCourses) return this.cachedCourses;

    const coursesFile = path.join(this.contentDir, "catalog", "courses.json");
    if (!fs.existsSync(coursesFile)) {
      return [];
    }

    const raw = fs.readFileSync(coursesFile, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = z.array(CourseSchema).parse(parsed);

    this.cachedCourses = validated;
    return validated;
  }

  async getCourseById(id: string): Promise<Course | null> {
    const courses = await this.getAllCourses();
    return courses.find((c) => c.id === id) || null;
  }

  async getFeaturedCourses(): Promise<Course[]> {
    const courses = await this.getAllCourses();
    return courses.filter((c) => c.featured && c.status === "published");
  }

  // --- Batches ---
  async getAllBatches(): Promise<Batch[]> {
    if (this.cachedBatches) return this.cachedBatches;

    const batchesFile = path.join(this.contentDir, "catalog", "batches.json");
    if (!fs.existsSync(batchesFile)) {
      return [];
    }

    const raw = fs.readFileSync(batchesFile, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = z.array(BatchSchema).parse(parsed);

    this.cachedBatches = validated;
    return validated;
  }

  async getBatchesByCourseId(courseId: string): Promise<Batch[]> {
    const batches = await this.getAllBatches();
    return batches.filter((b) => b.courseId === courseId);
  }

  async getBatchById(id: string): Promise<Batch | null> {
    const batches = await this.getAllBatches();
    return batches.find((b) => b.id === id) || null;
  }

  async getOpenBatches(): Promise<Batch[]> {
    const batches = await this.getAllBatches();
    return batches.filter((b) => b.status === "open_for_enrollment");
  }

  // --- Home ---
  async getHeroSlides(): Promise<HeroSlide[]> {
    if (this.cachedHeroSlides) return this.cachedHeroSlides;

    const file = path.join(this.contentDir, "home", "hero-slides.json");
    if (!fs.existsSync(file)) return [];

    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = z.array(HeroSlideSchema).parse(parsed);
    const sorted = validated.sort((a, b) => a.order - b.order);

    this.cachedHeroSlides = sorted;
    return sorted;
  }

  async getSections(): Promise<HomeSectionItem[]> {
    if (this.cachedSections) return this.cachedSections.sections;

    const file = path.join(this.contentDir, "home", "sections.json");
    if (!fs.existsSync(file)) return [];

    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = HomeSectionsSchema.parse(parsed);
    const sorted = validated.sections.sort((a, b) => a.order - b.order);

    this.cachedSections = { ...validated, sections: sorted };
    return sorted;
  }

  async getImpactFigures(options?: { verifiedOnly?: boolean }): Promise<ImpactFigure[]> {
    let figures = this.cachedImpactFigures;

    if (!figures) {
      const file = path.join(this.contentDir, "home", "impact-figures.json");
      if (!fs.existsSync(file)) return [];

      const raw = fs.readFileSync(file, "utf-8");
      const parsed = JSON.parse(raw);
      const validated = z.array(ImpactFigureSchema).parse(parsed);
      const sorted = validated.sort((a, b) => a.order - b.order);

      this.cachedImpactFigures = sorted;
      figures = sorted;
    }

    // In production or when verifiedOnly is requested, strictly filter out unverified/placeholder figures (Rule R15 & ADR 0004)
    if (options?.verifiedOnly || process.env.CONTENT_STRICT === "true") {
      return figures.filter(
        (fig) => fig.provenance.class === "A" && fig.provenance.verified && !fig.isPlaceholder
      );
    }

    return figures;
  }
}

// Global singleton instance for JSON content repository
const defaultRepo = new JsonContentRepository();

export function getCourseRepository(): ICourseRepository {
  return defaultRepo;
}

export function getBatchRepository(): IBatchRepository {
  return defaultRepo;
}

export function getHomeRepository(): IHomeRepository {
  return defaultRepo;
}
