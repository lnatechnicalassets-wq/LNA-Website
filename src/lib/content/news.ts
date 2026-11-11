import { z } from "zod";
import { ProvenanceSchema } from "./provenance";

export const NEWS_CATEGORIES = ["All updates", "Partnerships", "Program updates"] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const ArticleBlockSchema = z.discriminatedUnion("type", [
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

export type ArticleBlock = z.infer<typeof ArticleBlockSchema>;

export const NewsArticleSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().min(1),
  category: z.enum(["Partnerships", "Program updates"]),
  publishedAt: z.string(), // ISO date "2026-11-04"
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

export type NewsArticle = z.infer<typeof NewsArticleSchema>;

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function calculateReadingTime(article: NewsArticle): string {
  if (article.readTime) return article.readTime;
  let words = article.excerpt ? article.excerpt.split(/\s+/).length : 0;
  for (const block of article.blocks) {
    if (block.type === "paragraph" || block.type === "quote") {
      words += block.text.split(/\s+/).length;
    } else if (block.type === "heading") {
      words += block.text.split(/\s+/).length;
    } else if (block.type === "list") {
      words += block.items.join(" ").split(/\s+/).length;
    }
  }
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} min read`;
}

export function formatNewsDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return isoDate;
  }
}
