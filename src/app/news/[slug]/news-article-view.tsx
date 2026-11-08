"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { NewsArticle } from "@/lib/content/news";
import { formatNewsDate, calculateReadingTime } from "@/lib/content/news";
import { ArticleShare } from "@/components/news/article-share";
import { TableOfContents, HeadingItem } from "@/components/news/table-of-contents";
import { NewsCard } from "@/components/news/news-card";

export interface NewsArticleViewProps {
  article: NewsArticle;
  relatedArticles: NewsArticle[];
}

export function NewsArticleView({ article, relatedArticles }: NewsArticleViewProps) {
  // Extract headings for Table of Contents
  const headings: HeadingItem[] = [];
  article.blocks.forEach((block) => {
    if (block.type === "heading") {
      headings.push({
        id: block.id || block.text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-"),
        text: block.text,
        level: block.level,
      });
    }
  });

  const formattedDate = formatNewsDate(article.publishedAt);
  const readTime = calculateReadingTime(article);
  const authorName = article.author || "LNA Team";
  const articleUrl = `/news/${article.slug}`;

  return (
    <div className="w-full bg-[#F6FAFA] text-[#172E35] min-h-screen py-8 sm:py-10 lg:py-12">
      <div className="max-w-7xl xl:max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* ============================================================ */}
        {/* 1. BREADCRUMBS & BACK TO NEWS                                */}
        {/* ============================================================ */}
        <div className="mb-6 space-y-3">
          <nav aria-label="Breadcrumb" className="text-xs sm:text-sm text-[#526E77] flex items-center gap-2">
            <Link
              href="/news"
              className="hover:text-[#086477] transition-colors"
            >
              News &amp; Updates
            </Link>
            <span aria-hidden="true" className="text-[#A4D1D6]">/</span>
            <span className="text-[#172E35] font-medium">{article.category}</span>
          </nav>

          <div>
            <Link
              href="/news"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#086477] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to news</span>
            </Link>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. SPLIT INTRODUCTION (Title/Meta Left & Image Right)        */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Metadata, Headline, Excerpt, Sharing */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-center space-y-4 sm:space-y-5">
            {/* Category & Demo Badge */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs sm:text-[13px] font-bold tracking-wider uppercase text-[#086477]">
                {article.category}
              </span>
              {article.provenance.class === "B" && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E0F3F5] text-[#086477] border border-[#BCE1E5]">
                  Demo article
                </span>
              )}
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] xl:text-[46px] font-serif font-bold text-[#172E35] leading-[1.12] tracking-tight">
              {article.title}
            </h1>

            {/* Subtitle / Excerpt */}
            <p className="text-base sm:text-lg text-[#526E77] leading-relaxed">
              {article.excerpt}
            </p>

            {/* Author, Date, Read Time */}
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#526E77]">
              <span>{formattedDate}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-[#172E35]">{authorName}</span>
              <span aria-hidden="true">·</span>
              <span>{readTime}</span>
            </div>

            {/* Share Controls */}
            <div className="pt-1 border-t border-[#E5ECEE]">
              <ArticleShare url={articleUrl} title={article.title} />
            </div>
          </div>

          {/* Right Column: Cover Image */}
          <div className="lg:col-span-6 xl:col-span-6">
            <div className="relative w-full aspect-[16/10] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-[#EBF3F5] shadow-xs border border-[#E5ECEE]">
              <Image
                src={article.coverImage}
                alt={article.coverImageAlt || article.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 640px"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* Thin Divider */}
        <div className="w-full h-px bg-[#E5ECEE] my-10 sm:my-12 lg:my-14" />

        {/* ============================================================ */}
        {/* 3. ARTICLE CONTENTS & READING COLUMN                          */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Table of Contents */}
          <div className="lg:col-span-4 xl:col-span-3">
            <TableOfContents headings={headings} />
          </div>

          {/* Right Column: Reading Body */}
          <main className="lg:col-span-8 xl:col-span-9 max-w-3xl">
            <article className="prose-clean space-y-6">
              {article.blocks.map((block, idx) => {
                if (block.type === "paragraph") {
                  return (
                    <p
                      key={idx}
                      className="text-base sm:text-lg text-[#2D4A52] leading-relaxed font-normal"
                    >
                      {block.text}
                    </p>
                  );
                }

                if (block.type === "heading") {
                  const headingId =
                    block.id ||
                    block.text
                      .toLowerCase()
                      .replace(/[^\w\s-]/g, "")
                      .replace(/\s+/g, "-");

                  if (block.level === 3) {
                    return (
                      <h3
                        key={idx}
                        id={headingId}
                        className="font-serif font-bold text-xl sm:text-2xl text-[#172E35] mt-8 mb-3 tracking-tight scroll-mt-28"
                      >
                        {block.text}
                      </h3>
                    );
                  }

                  return (
                    <h2
                      key={idx}
                      id={headingId}
                      className="font-serif font-bold text-2xl sm:text-[28px] text-[#172E35] mt-10 mb-4 tracking-tight scroll-mt-28"
                    >
                      {block.text}
                    </h2>
                  );
                }

                if (block.type === "image") {
                  return (
                    <figure key={idx} className="my-8">
                      <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-[#EBF3F5] shadow-xs border border-[#E5ECEE]">
                        <Image
                          src={block.src}
                          alt={block.alt || "Article illustration"}
                          fill
                          sizes="(max-width: 1024px) 100vw, 768px"
                          className="object-cover"
                        />
                      </div>
                      {block.caption && (
                        <figcaption className="text-xs sm:text-[13px] text-[#526E77] italic text-center mt-2.5">
                          {block.caption}
                        </figcaption>
                      )}
                    </figure>
                  );
                }

                if (block.type === "list") {
                  const ListTag = block.ordered ? "ol" : "ul";
                  return (
                    <ListTag
                      key={idx}
                      className={`my-6 pl-6 space-y-2 text-base sm:text-lg text-[#2D4A52] leading-relaxed ${
                        block.ordered ? "list-decimal" : "list-disc marker:text-[#086477]"
                      }`}
                    >
                      {block.items.map((item, itemIdx) => (
                        <li key={itemIdx}>{item}</li>
                      ))}
                    </ListTag>
                  );
                }

                if (block.type === "quote") {
                  return (
                    <blockquote
                      key={idx}
                      className="my-8 border-l-4 border-[#086477] pl-5 py-3 italic text-lg sm:text-xl text-[#172E35] bg-[#EBF3F5]/60 rounded-r-xl"
                    >
                      <p>“{block.text}”</p>
                      {block.author && (
                        <cite className="block not-italic text-sm font-semibold text-[#086477] mt-2">
                          — {block.author}
                        </cite>
                      )}
                    </blockquote>
                  );
                }

                return null;
              })}
            </article>
          </main>
        </div>

        {/* ============================================================ */}
        {/* 4. RELATED UPDATES (up to 3 cards)                           */}
        {/* ============================================================ */}
        {relatedArticles.length > 0 && (
          <section
            aria-labelledby="related-updates-heading"
            className="mt-16 sm:mt-20 lg:mt-24 pt-10 sm:pt-12 border-t border-[#E5ECEE]"
          >
            {/* Centered Heading with fine horizontal accent lines */}
            <div className="flex items-center justify-center gap-4 mb-8 sm:mb-10">
              <div className="w-12 sm:w-20 h-px bg-[#BCE1E5]" aria-hidden="true" />
              <h2
                id="related-updates-heading"
                className="text-xs sm:text-[13px] font-bold tracking-widest uppercase text-[#086477] text-center"
              >
                Related Updates
              </h2>
              <div className="w-12 sm:w-20 h-px bg-[#BCE1E5]" aria-hidden="true" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {relatedArticles.map((rel) => (
                <NewsCard key={rel.id} article={rel} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

