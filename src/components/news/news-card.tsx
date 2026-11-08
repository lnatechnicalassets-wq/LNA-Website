"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { NewsArticle } from "@/lib/content/news";
import { formatNewsDate } from "@/lib/content/news";

export interface NewsCardProps {
  article: NewsArticle;
  variant?: "standard" | "compact";
  priority?: boolean;
}

export function NewsCard({
  article,
  variant = "standard",
  priority = false,
}: NewsCardProps) {
  const isCompact = variant === "compact";

  return (
    <article className="group relative flex flex-col h-full bg-white rounded-2xl border border-[#E5ECEE] hover:border-[#BCE1E5] shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Cover Image Container */}
      <div
        className={`relative w-full overflow-hidden bg-[#EBF3F5] ${
          isCompact ? "aspect-[16/9]" : "aspect-[16/10]"
        }`}
      >
        <Image
          src={article.coverImage}
          alt={article.coverImageAlt || article.title}
          fill
          priority={priority}
          sizes={
            isCompact
              ? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 380px"
              : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 420px"
          }
          className="object-cover group-hover:scale-[1.03] transition-transform duration-300 motion-reduce:transition-none"
        />
      </div>

      {/* Card Content */}
      <div className="flex flex-col flex-1 p-5 sm:p-6 justify-between">
        <div className="space-y-2.5">
          {/* Category & Date */}
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold tracking-wider uppercase text-[#086477]">
            <span>{article.category}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#526E77] font-semibold">
              {formatNewsDate(article.publishedAt)}
            </span>
          </div>

          {/* Title */}
          <h3
            className={`font-serif font-bold text-[#172E35] group-hover:text-[#086477] transition-colors line-clamp-2 ${
              isCompact
                ? "text-lg sm:text-xl leading-snug"
                : "text-xl sm:text-2xl leading-snug"
            }`}
          >
            {article.title}
          </h3>

          {/* Excerpt */}
          <p className="text-xs sm:text-sm text-[#526E77] leading-relaxed line-clamp-3">
            {article.excerpt}
          </p>
        </div>

        {/* Read story action link */}
        <div className="pt-4 mt-2 flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#086477] group-hover:text-[#06505F] transition-colors">
          <span>Read story</span>
          <ArrowRight
            className="w-4 h-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
            strokeWidth={2}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Accessible Hit Area covering whole card */}
      <Link
        href={`/news/${article.slug}`}
        className="absolute inset-0 z-10"
        aria-label={`Read story: ${article.title}`}
      >
        <span className="sr-only">Read story: {article.title}</span>
      </Link>
    </article>
  );
}

