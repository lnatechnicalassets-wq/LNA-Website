import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const contentDir = path.join(rootDir, "content");

// Recreate or import Zod schemas for standalone runner
const ProvenanceSchema = z
  .object({
    class: z.enum(["A", "B"]),
    verified: z.boolean(),
    source: z.string().min(5),
    verifiedBy: z.string().nullable(),
    verifiedOn: z.string().nullable(),
  })
  .refine(
    (p) => p.class === "B" || (p.verified && p.verifiedBy !== null && p.verifiedOn !== null),
    {
      message: "Class A content must be verified with verifiedBy and verifiedOn populated.",
    }
  );

const BrandConfigSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
  tagline: z.string().min(1),
  provenance: ProvenanceSchema,
  logo: z.object({
    alt: z.string().min(1),
    monogram: z.string().min(1),
    crestSubtitle: z.string().min(1),
    badgeText: z.string().min(1),
  }),
  colors: z.record(z.any()),
  typography: z.record(z.any()),
  radii: z.record(z.any()),
  shadows: z.record(z.any()),
});

const NavItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  description: z.string().optional(),
});

const NavigationConfigSchema = z.object({
  provenance: ProvenanceSchema,
  header: z.object({
    navItems: z.array(NavItemSchema),
    cta: NavItemSchema,
  }),
  footer: z.object({
    columns: z.array(
      z.object({
        title: z.string().min(1),
        links: z.array(NavItemSchema),
      })
    ),
    bottomNote: z.string().min(1),
    demoNotice: z.string().min(1),
  }),
});

const OrganizationSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
  domain: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(1),
  }),
  businessHours: z.string().min(1),
  provenance: ProvenanceSchema,
});

const CourseModuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3),
  duration: z.string().min(1),
  topics: z.array(z.string().min(1)),
});

const CourseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(3),
  subtitle: z.string().min(5),
  category: z.string().min(3),
  summary: z.string().min(10),
  description: z.string().min(20),
  learningOutcomes: z.array(z.string().min(3)).min(1),
  targetAudience: z.array(z.string().min(3)).min(1),
  prerequisites: z.array(z.string()).default([]),
  modules: z.array(CourseModuleSchema).min(1),
  deliveryMode: z.literal("offline"),
  venue: z.string().min(3),
  status: z.enum(["draft", "published", "archived"]),
  featured: z.boolean(),
  mentorIds: z
    .array(z.string().min(1))
    .default([])
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "mentorIds must not contain duplicate mentor IDs",
    }),
  provenance: ProvenanceSchema,
});

const BatchSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    courseId: z.string().regex(/^[a-z0-9-]+$/),
    batchNumber: z.number().int().positive(),
    name: z.string().min(3),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    scheduleDescription: z.string().min(5),
    capacity: z.number().int().positive(),
    enrolledCount: z.number().int().nonnegative(),
    seatHoldDurationMinutes: z.literal(30),
    feePoisha: z.number().int().nonnegative(),
    discountFeePoisha: z.number().int().nonnegative().optional(),
    status: z.enum(["upcoming", "open_for_enrollment", "in_progress", "completed", "cancelled"]),
    venue: z.string().min(3),
    provenance: ProvenanceSchema,
  })
  .refine((b) => !b.discountFeePoisha || b.discountFeePoisha <= b.feePoisha, {
    message: "discountFeePoisha cannot exceed feePoisha",
  });

const ProgramHighlightSchema = z.object({
  label: z.string().min(1),
  sublabel: z.string().min(1),
  icon: z.string().optional(),
});

const HeroSlideSchema = z.object({
  id: z.string().min(1),
  programType: z.enum(["mto", "irgp"]).optional(),
  courseId: z.string().optional(),
  title: z.string().min(2),
  subtitle: z.string().optional(),
  headline: z.string().min(2).optional(),
  description: z.string().min(10),
  eyebrow: z.string().optional(),
  highlights: z.array(ProgramHighlightSchema).optional(),
  mentorHeading: z.string().optional(),
  mentorEyebrow: z.string().optional(),
  mentorIds: z.array(z.string()).optional(),
  ctaText: z.string().min(2),
  ctaHref: z.string().min(1),
  secondaryCtaText: z.string().optional(),
  secondaryCtaHref: z.string().optional(),
  badgeText: z.string().optional(),
  startDate: z.string().optional(),
  classStartLabel: z.string().optional(),
  classStartDate: z.string().optional(),
  duration: z.string().optional(),
  venue: z.string().optional(),
  imageObjectPosition: z.string().optional(),
  imagePlaceholder: z.string().optional(),
  order: z.number().int().nonnegative(),
  provenance: ProvenanceSchema,
});

const HomeSectionsSchema = z.object({
  sections: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(2),
      enabled: z.boolean(),
      order: z.number().int().nonnegative(),
    })
  ),
  provenance: ProvenanceSchema,
});

const ImpactFigureSchema = z.object({
  id: z.string().min(1),
  metric: z.string().min(1),
  label: z.string().min(2),
  description: z.string().min(5),
  order: z.number().int().nonnegative(),
  isPlaceholder: z.boolean().optional(),
  provenance: ProvenanceSchema,
});

const PartnerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  sector: z.string().min(2),
  badgeText: z.string().optional(),
  isPlaceholder: z.boolean().optional(),
  order: z.number().int().nonnegative(),
  provenance: ProvenanceSchema,
});

const EventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3),
  subtitle: z.string().min(3),
  date: z.string().min(4),
  time: z.string().min(2),
  venue: z.string().min(3),
  deliveryMode: z.literal("offline"),
  featured: z.boolean().optional(),
  order: z.number().int().nonnegative(),
  isPlaceholder: z.boolean().optional(),
  provenance: ProvenanceSchema,
});

const CareerHistoryItemSchema = z.object({
  company: z.string().min(1),
  role: z.string().optional(),
  logoIcon: z.string().optional(),
  logoSrc: z.string().optional(),
});

const MentorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  role: z.string().min(2),
  organization: z.string().min(2),
  bio: z.string().min(10),
  courseId: z.string().optional(),
  courseIds: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  order: z.number().int().nonnegative(),
  isPlaceholder: z.boolean().optional(),
  published: z.boolean().optional(),
  linkedInUrl: z.string().url().optional(),
  portraitSrc: z.string().optional(),
  expertise: z.array(z.string()).optional(),
  careerHistory: z.array(CareerHistoryItemSchema).optional(),
  provenance: ProvenanceSchema,
});

const ReviewSchema = z.object({
  id: z.string().min(1),
  quote: z.string().min(10),
  author: z.string().min(2),
  designation: z.string().min(2),
  company: z.string().optional().default(""),
  cohort: z.string().optional().default(""),
  program: z.string().optional(),
  portraitSrc: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  reviewDate: z.string().optional(),
  verifiedReview: z.boolean().optional(),
  videoUrl: z.string().url().optional(),
  order: z.number().int().nonnegative(),
  isPlaceholder: z.boolean().optional(),
  published: z.boolean().optional(),
  provenance: ProvenanceSchema,
});

const FaqItemSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(5),
  answer: z.string().min(10),
  category: z.string().min(2),
  icon: z
    .enum([
      "book",
      "users",
      "calendar",
      "map-pin",
      "pointer",
      "credit-card",
      "award",
      "layers",
      "help",
    ])
    .default("help"),
  order: z.number().int().nonnegative(),
  published: z.boolean().default(true),
  courseId: z.string().optional(),
  courseHref: z.string().optional(),
  provenance: ProvenanceSchema,
});

const ContactShortcutSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2),
  icon: z.enum(["register", "schedule", "fee", "support"]),
  categoryValue: z.string().min(1),
});

const ContactConfigSchema = z.object({
  eyebrow: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(5),
  email: z.string().email(),
  phone: z.string().min(1),
  phoneDisplay: z.string().min(1),
  whatsapp: z.string().optional(),
  officeAddress: z.object({
    line1: z.string().min(1),
    line2: z.string().min(1),
    city: z.string().min(1),
    country: z.string().min(1),
  }),
  officeHours: z.string().min(1),
  mapUrl: z.string().url().optional(),
  shortcuts: z.array(ContactShortcutSchema),
  categories: z.array(z.object({ value: z.string().min(1), label: z.string().min(1) })),
  visibility: z.object({
    showEmail: z.boolean(),
    showPhone: z.boolean(),
    showAddress: z.boolean(),
    showHours: z.boolean(),
    showOfficeVisual: z.boolean(),
  }),
  provenance: ProvenanceSchema,
});

const IrgpActivitySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2),
  description: z.string().min(5),
  icon: z.string().optional(),
});

const IrgpStorySchema = z.object({
  id: z.string().min(1),
  badge: z.string().min(1),
  status: z.string().min(1),
  title: z.string().min(3),
  cohort: z.string().min(1),
  period: z.string().min(1),
  description: z.string().min(10),
  ctaText: z.string().min(2),
  modalOverview: z.string().min(20),
  objectives: z.array(z.string()).min(1),
  activities: z.array(IrgpActivitySchema).min(1),
  provenance: ProvenanceSchema,
});

const IrgpGalleryItemSchema = z.object({
  id: z.string().min(1),
  src: z.string().min(1),
  category: z.string().min(2),
  icon: z.string().min(1),
  title: z.string().min(2),
  caption: z.string().min(5),
  alt: z.string().min(5),
  order: z.number().int().nonnegative(),
  provenance: ProvenanceSchema,
});

const IrgpOutcomeMetricSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(2),
  metric: z.string().optional(),
  statusText: z.string().optional(),
  statusType: z.enum(["verified", "pending_audit", "informational"]).default("pending_audit"),
  tooltip: z.string().min(5),
  icon: z.string().min(1),
  isVerified: z.boolean().default(false),
  published: z.boolean().default(true),
  provenance: ProvenanceSchema,
});

const IrgpOutcomesSchema = z.object({
  heading: z.string().min(2),
  subheading: z.string().min(2),
  disclaimer: z.string().optional(),
  metrics: z.array(IrgpOutcomeMetricSchema).min(1),
  provenance: ProvenanceSchema,
});

const IrgpDataSchema = z.object({
  story: IrgpStorySchema,
  gallery: z.array(IrgpGalleryItemSchema).min(4),
  outcomes: IrgpOutcomesSchema,
});

const InternshipAllowanceSchema = z.object({
  minPoisha: z.number().int().nonnegative().optional(),
  maxPoisha: z.number().int().nonnegative().optional(),
  period: z.enum(["month", "session", "fixed"]).default("month"),
  displayText: z.string().min(1),
});

const InternshipSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  roleTitle: z.string().min(2),
  companyName: z.string().min(2),
  companyLogo: z.string().optional(),
  workplace: z.string().min(2),
  schedule: z.string().min(2),
  duration: z.string().min(2),
  shortDescription: z.string().min(5),
  fullDescription: z.string().min(10),
  allowance: InternshipAllowanceSchema.optional(),
  applicationUrl: z.string().url().optional(),
  published: z.boolean().default(true),
  order: z.number().int().nonnegative().default(1),
  provenance: ProvenanceSchema,
});

const ArticleBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("paragraph"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("heading"),
    level: z.union([z.literal(2), z.literal(3)]).default(2),
    text: z.string(),
    id: z.string().optional(),
  }),
  z.object({
    type: z.literal("list"),
    ordered: z.boolean().default(false),
    items: z.array(z.string()),
  }),
  z.object({
    type: z.literal("image"),
    src: z.string(),
    alt: z.string(),
    caption: z.string().optional(),
  }),
  z.object({
    type: z.literal("quote"),
    text: z.string(),
    author: z.string().optional(),
  }),
]);

const NewsArticleSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().min(1),
  category: z.enum(["Partnerships", "Invitations", "Program updates", "Community"]),
  publishedAt: z.string(),
  updatedAt: z.string().optional(),
  author: z.string().default("LNA Team"),
  readTime: z.string().optional(),
  coverImage: z.string().min(1),
  coverImageAlt: z.string().min(1),
  featured: z.boolean().default(false),
  status: z.enum(["published", "draft"]).default("published"),
  blocks: z.array(ArticleBlockSchema),
  seo: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      ogImage: z.string().optional(),
    })
    .optional(),
  provenance: ProvenanceSchema,
});

const ProgramQuestionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "select", "textarea"]),
  placeholder: z.string().optional(),
  options: z.array(z.string().min(1)).optional(),
  required: z.boolean(),
});

const EnrollmentConfigSchema = z.object({
  programQuestions: z.record(z.array(ProgramQuestionSchema)),
  payment: z.object({
    submissionEnabled: z.boolean().default(false),
    bkash: z.object({
      enabled: z.boolean(),
      merchantName: z.string().min(1),
      merchantNumber: z.string().min(1),
      qrImageSrc: z.string().min(1),
      qrImageAlt: z.string().min(1),
      instruction: z.string().min(1),
    }),
    bankTransfer: z.object({
      enabled: z.boolean(),
      instruction: z.string().min(1),
      bankDetails: z
        .object({
          bankName: z.string().min(1),
          accountName: z.string().min(1),
          accountNumber: z.string().min(1),
          branch: z.string().min(1).optional(),
          routingNumber: z.string().min(1).optional(),
        })
        .nullable(),
    }),
  }),
});

function readJson(relPath) {
  const fullPath = path.join(contentDir, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Content file missing: ${relPath}`);
  }
  const raw = fs.readFileSync(fullPath, "utf-8");
  return { raw, data: JSON.parse(raw) };
}

function scanForSecrets(raw, fileName) {
  const forbiddenPatterns = [
    /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/, // JWT token
    /AIza[0-9A-Za-z-_]{35}/, // Google API key
    /bkash_app_[a-z0-9_]{16,}/i, // bKash test app key
    /re_[a-zA-Z0-9]{20,}/, // Resend API key
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(raw)) {
      throw new Error(
        `CRITICAL SECURITY FAILURE: Potential API key or secret token detected in ${fileName}`
      );
    }
  }
}

export function validateAllContent() {
  console.log("Starting Content Architecture Validation (Phase 4)...");

  // 1. Site configuration files
  console.log("  → Validating content/site/brand.json...");
  const brand = readJson("site/brand.json");
  scanForSecrets(brand.raw, "site/brand.json");
  BrandConfigSchema.parse(brand.data);

  console.log("  → Validating content/site/navigation.json...");
  const nav = readJson("site/navigation.json");
  scanForSecrets(nav.raw, "site/navigation.json");
  NavigationConfigSchema.parse(nav.data);

  console.log("  → Validating content/site/organization.json...");
  const org = readJson("site/organization.json");
  scanForSecrets(org.raw, "site/organization.json");
  OrganizationSchema.parse(org.data);

  // 2. Catalog files
  console.log("  → Validating content/catalog/courses.json...");
  const courses = readJson("catalog/courses.json");
  scanForSecrets(courses.raw, "catalog/courses.json");
  const parsedCourses = z.array(CourseSchema).parse(courses.data);
  const courseIds = new Set(parsedCourses.map((c) => c.id));

  console.log("  → Validating content/catalog/batches.json...");
  const batches = readJson("catalog/batches.json");
  scanForSecrets(batches.raw, "catalog/batches.json");
  const parsedBatches = z.array(BatchSchema).parse(batches.data);

  // Referential Integrity: Every batch.courseId must match an existing course.id
  for (const batch of parsedBatches) {
    if (!courseIds.has(batch.courseId)) {
      throw new Error(
        `Referential Integrity Error: Batch ${batch.id} references non-existent courseId "${batch.courseId}"`
      );
    }
  }

  // 3. Homepage files
  console.log("  → Validating content/home/hero-slides.json...");
  const hero = readJson("home/hero-slides.json");
  scanForSecrets(hero.raw, "home/hero-slides.json");
  const parsedHero = z.array(HeroSlideSchema).parse(hero.data);
  for (const slide of parsedHero) {
    if (slide.courseId && !courseIds.has(slide.courseId)) {
      throw new Error(
        `Referential Integrity Error: Hero slide ${slide.id} references non-existent courseId "${slide.courseId}"`
      );
    }
  }

  console.log("  → Validating content/home/sections.json...");
  const sections = readJson("home/sections.json");
  scanForSecrets(sections.raw, "home/sections.json");
  HomeSectionsSchema.parse(sections.data);

  console.log("  → Validating content/home/impact-figures.json...");
  const impact = readJson("home/impact-figures.json");
  scanForSecrets(impact.raw, "home/impact-figures.json");
  z.array(ImpactFigureSchema).parse(impact.data);

  console.log("  → Validating content/home/partners.json...");
  const partners = readJson("home/partners.json");
  scanForSecrets(partners.raw, "home/partners.json");
  z.array(PartnerSchema).parse(partners.data);

  console.log("  → Validating content/home/events.json...");
  const events = readJson("home/events.json");
  scanForSecrets(events.raw, "home/events.json");
  z.array(EventSchema).parse(events.data);

  console.log("  → Validating content/home/mentors.json...");
  const mentors = readJson("home/mentors.json");
  scanForSecrets(mentors.raw, "home/mentors.json");
  const parsedMentors = z.array(MentorSchema).parse(mentors.data);
  const mentorIdsSet = new Set(parsedMentors.map((m) => m.id));

  // Referential Integrity: Every course.mentorIds must match an existing mentor.id and contain no duplicates
  for (const course of parsedCourses) {
    if (course.mentorIds && Array.isArray(course.mentorIds)) {
      const seen = new Set();
      for (const mId of course.mentorIds) {
        if (seen.has(mId)) {
          throw new Error(
            `Duplicate Mentor Error: Course ${course.id} contains duplicate mentorId "${mId}"`
          );
        }
        seen.add(mId);
        if (!mentorIdsSet.has(mId)) {
          throw new Error(
            `Referential Integrity Error: Course ${course.id} references non-existent mentorId "${mId}"`
          );
        }
      }
    }
  }

  for (const mentor of parsedMentors) {
    if (mentor.courseId && !courseIds.has(mentor.courseId)) {
      throw new Error(
        `Referential Integrity Error: Mentor ${mentor.id} references non-existent courseId "${mentor.courseId}"`
      );
    }
  }

  console.log("  → Validating content/home/reviews.json...");
  const reviews = readJson("home/reviews.json");
  scanForSecrets(reviews.raw, "home/reviews.json");
  z.array(ReviewSchema).parse(reviews.data);

  console.log("  → Validating content/home/irgp.json...");
  const irgp = readJson("home/irgp.json");
  scanForSecrets(irgp.raw, "home/irgp.json");
  IrgpDataSchema.parse(irgp.data);

  console.log("  → Validating content/home/faqs.json...");
  const faqs = readJson("home/faqs.json");
  scanForSecrets(faqs.raw, "home/faqs.json");
  z.array(FaqItemSchema).parse(faqs.data);

  console.log("  → Validating content/home/contact.json...");
  const contact = readJson("home/contact.json");
  scanForSecrets(contact.raw, "home/contact.json");
  ContactConfigSchema.parse(contact.data);

  console.log("  → Validating content/home/internships.json...");
  const internships = readJson("home/internships.json");
  scanForSecrets(internships.raw, "home/internships.json");
  z.array(InternshipSchema).parse(internships.data);

  // 4. News files
  const newsPath = path.join(contentDir, "news", "articles.json");
  if (fs.existsSync(newsPath)) {
    console.log("  → Validating content/news/articles.json...");
    const news = readJson("news/articles.json");
    scanForSecrets(news.raw, "news/articles.json");
    z.array(NewsArticleSchema).parse(news.data);
  }

  // 5. Enrollment configuration
  console.log("  → Validating content/enrollment/config.json...");
  const enrollmentConfig = readJson("enrollment/config.json");
  scanForSecrets(enrollmentConfig.raw, "enrollment/config.json");
  const parsedEnrollmentConfig = EnrollmentConfigSchema.parse(enrollmentConfig.data);
  if (parsedEnrollmentConfig.payment.bkash.qrImageSrc.startsWith("/")) {
    const qrAssetPath = path.join(
      rootDir,
      "public",
      parsedEnrollmentConfig.payment.bkash.qrImageSrc.slice(1)
    );
    if (!fs.existsSync(qrAssetPath)) {
      throw new Error(
        `Missing bKash QR asset referenced by content/enrollment/config.json: ${parsedEnrollmentConfig.payment.bkash.qrImageSrc}`
      );
    }
  }

  console.log(
    "✅ CONTENT VALIDATION SUCCESSFUL: All content schemas, referential integrity, and security checks passed!"
  );
}

// Run if directly executed
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    validateAllContent();
  } catch (err) {
    console.error("❌ Content Validation Failed:", err.message);
    process.exit(1);
  }
}
