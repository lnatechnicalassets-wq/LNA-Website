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
  Partner,
  PartnerSchema,
  Event,
  EventSchema,
  Mentor,
  MentorSchema,
  Review,
  ReviewSchema,
} from "./home";
import { FaqItem, FaqItemSchema } from "./faq";
import { ContactConfig, ContactConfigSchema } from "./contact";
import { IrgpData, IrgpDataSchema } from "./irgp";
import { Internship, InternshipSchema } from "./internship";

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
  getPartners(): Promise<Partner[]>;
  getEvents(): Promise<Event[]>;
  getMentors(): Promise<Mentor[]>;
  getMentorById(id: string): Promise<Mentor | null>;
  getReviews(): Promise<Review[]>;
  getIrgpData(): Promise<IrgpData>;
  getFaqs(): Promise<FaqItem[]>;
  getContactConfig(): Promise<ContactConfig>;
  getInternships(): Promise<Internship[]>;
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
  private cachedPartners: Partner[] | null = null;
  private cachedEvents: Event[] | null = null;
  private cachedMentors: Mentor[] | null = null;
  private cachedReviews: Review[] | null = null;
  private cachedIrgpData: IrgpData | null = null;
  private cachedFaqs: FaqItem[] | null = null;
  private cachedContactConfig: ContactConfig | null = null;
  private cachedInternships: Internship[] | null = null;

  constructor(contentDir = path.join(process.cwd(), "content")) {
    this.contentDir = contentDir;
  }

  // --- Courses ---
  async getAllCourses(): Promise<Course[]> {
    if (this.cachedCourses) return this.cachedCourses;

    const coursesFile = path.join(this.contentDir, "catalog", "courses.json");
    if (!fs.existsSync(coursesFile)) return [];

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
    if (!fs.existsSync(batchesFile)) return [];

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

  async getPartners(): Promise<Partner[]> {
    if (this.cachedPartners) return this.cachedPartners;

    const file = path.join(this.contentDir, "home", "partners.json");
    if (!fs.existsSync(file)) return [];

    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = z.array(PartnerSchema).parse(parsed);
    const sorted = validated.sort((a, b) => a.order - b.order);

    this.cachedPartners = sorted;
    return sorted;
  }

  async getEvents(): Promise<Event[]> {
    if (this.cachedEvents) return this.cachedEvents;

    const file = path.join(this.contentDir, "home", "events.json");
    if (!fs.existsSync(file)) return [];

    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = z.array(EventSchema).parse(parsed);
    const sorted = validated.sort((a, b) => a.order - b.order);

    this.cachedEvents = sorted;
    return sorted;
  }

  async getMentors(): Promise<Mentor[]> {
    if (this.cachedMentors) return this.cachedMentors;

    const file = path.join(this.contentDir, "home", "mentors.json");
    if (!fs.existsSync(file)) return [];

    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = z.array(MentorSchema).parse(parsed);
    const sorted = validated.sort((a, b) => a.order - b.order);

    this.cachedMentors = sorted;
    return sorted;
  }

  async getMentorById(id: string): Promise<Mentor | null> {
    const mentors = await this.getMentors();
    return mentors.find((m) => m.id === id) || null;
  }

  async getReviews(): Promise<Review[]> {
    if (this.cachedReviews) return this.cachedReviews;

    const file = path.join(this.contentDir, "home", "reviews.json");
    if (!fs.existsSync(file)) return [];

    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = z.array(ReviewSchema).parse(parsed);
    const sorted = validated.sort((a, b) => a.order - b.order);

    this.cachedReviews = sorted;
    return sorted;
  }

  async getIrgpData(): Promise<IrgpData> {
    if (this.cachedIrgpData) return this.cachedIrgpData;

    const file = path.join(this.contentDir, "home", "irgp.json");
    if (!fs.existsSync(file)) {
      throw new Error(`IRGP content file not found at ${file}`);
    }

    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = IrgpDataSchema.parse(parsed);

    this.cachedIrgpData = validated;
    return validated;
  }

  async getFaqs(): Promise<FaqItem[]> {
    if (this.cachedFaqs) return this.cachedFaqs;

    const file = path.join(this.contentDir, "home", "faqs.json");
    if (!fs.existsSync(file)) return [];

    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = z.array(FaqItemSchema).parse(parsed);
    const sorted = validated.filter((item) => item.published).sort((a, b) => a.order - b.order);

    this.cachedFaqs = sorted;
    return sorted;
  }

  async getContactConfig(): Promise<ContactConfig> {
    if (this.cachedContactConfig) return this.cachedContactConfig;

    const file = path.join(this.contentDir, "home", "contact.json");
    if (!fs.existsSync(file)) {
      throw new Error(`Contact config file not found at ${file}`);
    }

    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = ContactConfigSchema.parse(parsed);

    this.cachedContactConfig = validated;
    return validated;
  }

  async getInternships(): Promise<Internship[]> {
    if (this.cachedInternships) return this.cachedInternships;

    const file = path.join(this.contentDir, "home", "internships.json");
    if (!fs.existsSync(file)) return [];

    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = z.array(InternshipSchema).parse(parsed);
    const sorted = validated.filter((item) => item.published).sort((a, b) => a.order - b.order);

    this.cachedInternships = sorted;
    return sorted;
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

export async function getMentorById(id: string): Promise<Mentor | null> {
  return defaultRepo.getMentorById(id);
}
