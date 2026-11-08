"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { NewsArticle } from "@/lib/content/news";
import { formatNewsDate } from "@/lib/content/news";

export interface NewsLeadCardProps {
  article: NewsArticle;
  priority?: boolean;
}

export function NewsLeadCard({ article, priority = true }: NewsLeadCardProps) {
  return (
    <article className="group relative flex flex-col h-full bg-white rounded-2xl border border-[#E5ECEE] hover:border-[#BCE1E5] shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Cover Image Container */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-[16/10] overflow-hidden bg-[#EBF3F5]">
        <Image
          src={article.coverImage}
          alt={article.coverImageAlt || article.title}
          fill
          priority={priority}
          sizes="(max-width: 1024px) 100vw, 720px"
          className="object-cover group-hover:scale-[1.02] transition-transform duration-300 motion-reduce:transition-none"
        />
      </div>

      {/* Editorial Content */}
      <div className="flex flex-col flex-1 p-6 sm:p-8 justify-between">
        <div className="space-y-3">
          {/* Category & Date */}
          <div className="flex items-center gap-2 text-xs sm:text-[13px] font-bold tracking-wider uppercase text-[#086477]">
            <span>{article.category}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#526E77] font-semibold">
              {formatNewsDate(article.publishedAt)}
            </span>
          </div>

          {/* Title */}
          <h2 className="font-serif font-bold text-2xl sm:text-3xl lg:text-[32px] text-[#172E35] group-hover:text-[#086477] transition-colors leading-tight">
            {article.title}
          </h2>

          {/* Excerpt */}
          <p className="text-sm sm:text-base text-[#526E77] leading-relaxed max-w-2xl">
            {article.excerpt}
          </p>
        </div>

        {/* Read story action link */}
        <div className="pt-6 mt-4 flex items-center gap-2 text-sm sm:text-base font-semibold text-[#086477] group-hover:text-[#06505F] transition-colors">
          <span>Read story</span>
          <ArrowRight
            className="w-4 h-4 transition-transform group-hover:translate-x-1.5 motion-reduce:transition-none"
            strokeWidth={2}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Accessible Hit Area */}
      <Link
        href={`/news/${article.slug}`}
        className="absolute inset-0 z-10"
        aria-label={`Read featured story: ${article.title}`}
      >
        <span className="sr-only">Read featured story: {article.title}</span>
      </Link>
    </article>
  );
}

