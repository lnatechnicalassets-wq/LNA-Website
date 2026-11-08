import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getNewsRepository } from "@/lib/content/repository";
import { NewsArticleView } from "./news-article-view";

interface NewsArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const newsRepo = getNewsRepository();
  const articles = await newsRepo.getPublishedArticles();
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: NewsArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const newsRepo = getNewsRepository();
  const article = await newsRepo.getArticleBySlug(slug);

  if (!article) {
    return {
      title: "Article Not Found — Lead Nation Academy",
    };
  }

  const title = `${article.title} — News & Updates — Lead Nation Academy`;
  const description = article.excerpt;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt || article.publishedAt,
      authors: [article.author || "Lead Nation Academy"],
      images: [
        {
          url: article.coverImage,
          alt: article.coverImageAlt || article.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [article.coverImage],
    },
  };
}

export default async function NewsArticlePage({ params }: NewsArticlePageProps) {
  const { slug } = await params;
  const newsRepo = getNewsRepository();

  const article = await newsRepo.getArticleBySlug(slug);
  if (!article || article.status !== "published") {
    notFound();
  }

  const relatedArticles = await newsRepo.getRelatedArticles(
    article.slug,
    article.category,
    3
  );

  return (
    <NewsArticleView
      article={article}
      relatedArticles={relatedArticles}
    />
  );
}

