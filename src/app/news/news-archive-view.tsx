"use client";

import React, { useState, useMemo, useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import type { NewsArticle, NewsCategory } from "@/lib/content/news";
import { NEWS_CATEGORIES } from "@/lib/content/news";
import { NewsLeadCard } from "@/components/news/news-lead-card";
import { NewsCard } from "@/components/news/news-card";

export interface NewsArchiveViewProps {
  initialArticles: NewsArticle[];
}

const ITEMS_PER_PAGE_FILTERED = 6;
const LATEST_PER_PAGE_UNFILTERED = 3;

export function NewsArchiveView({ initialArticles }: NewsArchiveViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Read state from URL search params, falling back if a removed category is passed
  const rawCategoryParam = searchParams.get("category");
  const activeCategory: NewsCategory =
    rawCategoryParam && NEWS_CATEGORIES.includes(rawCategoryParam as NewsCategory)
      ? (rawCategoryParam as NewsCategory)
      : "All updates";
  const searchQueryParam = searchParams.get("search") || "";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  // Local search input state for responsive typing
  const [searchInput, setSearchInput] = useState(searchQueryParam);

  // Sync local input with search param changes (e.g. browser back/forward)
  useEffect(() => {
    setSearchInput(searchQueryParam);
  }, [searchQueryParam]);

  // Update URL helper
  const updateParams = (newCategory?: string, newSearch?: string, newPage?: number) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newCategory !== undefined) {
      if (newCategory === "All updates") {
        params.delete("category");
      } else {
        params.set("category", newCategory);
      }
    }

    if (newSearch !== undefined) {
      if (!newSearch.trim()) {
        params.delete("search");
      } else {
        params.set("search", newSearch.trim());
      }
    }

    if (newPage !== undefined) {
      if (newPage <= 1) {
        params.delete("page");
      } else {
        params.set("page", newPage.toString());
      }
    }

    const query = params.toString();
    const targetUrl = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      router.push(targetUrl, { scroll: false });
    });
  };

  const handleCategorySelect = (category: NewsCategory) => {
    updateParams(category, undefined, 1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams(undefined, searchInput, 1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    updateParams(undefined, "", 1);
  };

  const handleResetAll = () => {
    setSearchInput("");
    startTransition(() => {
      router.push(pathname);
    });
  };

  // Filtered dataset
  const filteredArticles = useMemo(() => {
    return initialArticles.filter((article) => {
      // 1. Category filter
      if (activeCategory !== "All updates" && article.category !== activeCategory) {
        return false;
      }

      // 2. Search query filter
      if (searchQueryParam.trim()) {
        const query = searchQueryParam.toLowerCase().trim();
        const inTitle = article.title.toLowerCase().includes(query);
        const inExcerpt = article.excerpt.toLowerCase().includes(query);
        const inBlocks = article.blocks.some((b) => {
          if (b.type === "paragraph" || b.type === "quote") {
            return b.text.toLowerCase().includes(query);
          }
          if (b.type === "heading") {
            return b.text.toLowerCase().includes(query);
          }
          if (b.type === "list") {
            return b.items.some((item) => item.toLowerCase().includes(query));
          }
          return false;
        });

        if (!inTitle && !inExcerpt && !inBlocks) {
          return false;
        }
      }

      return true;
    });
  }, [initialArticles, activeCategory, searchQueryParam]);

  const isUnfilteredDefault = activeCategory === "All updates" && !searchQueryParam.trim();

  // Featured partition (unfiltered mode only)
  const { featuredLead, featuredSide, latestUpdates, totalPages, paginatedLatest, paginatedGrid } =
    useMemo(() => {
      if (isUnfilteredDefault) {
        // Featured lead: explicit featured or newest
        const lead = filteredArticles.find((a) => a.featured) || filteredArticles[0] || null;

        // Side stories: up to 2 other stories
        const remainingAfterLead = filteredArticles.filter((a) => a.id !== lead?.id);
        const side = remainingAfterLead.slice(0, 2);

        // Latest updates: rest of articles
        const remainingLatest = remainingAfterLead.slice(2);

        const pages = Math.max(1, Math.ceil(remainingLatest.length / LATEST_PER_PAGE_UNFILTERED));
        const safePage = Math.min(currentPage, pages);
        const startIndex = (safePage - 1) * LATEST_PER_PAGE_UNFILTERED;
        const pagedLatest = remainingLatest.slice(
          startIndex,
          startIndex + LATEST_PER_PAGE_UNFILTERED
        );

        return {
          featuredLead: lead,
          featuredSide: side,
          latestUpdates: remainingLatest,
          totalPages: pages,
          paginatedLatest: pagedLatest,
          paginatedGrid: [],
        };
      } else {
        // Filtered straightforward grid
        const pages = Math.max(1, Math.ceil(filteredArticles.length / ITEMS_PER_PAGE_FILTERED));
        const safePage = Math.min(currentPage, pages);
        const startIndex = (safePage - 1) * ITEMS_PER_PAGE_FILTERED;
        const paged = filteredArticles.slice(startIndex, startIndex + ITEMS_PER_PAGE_FILTERED);

        return {
          featuredLead: null,
          featuredSide: [],
          latestUpdates: [],
          totalPages: pages,
          paginatedLatest: [],
          paginatedGrid: paged,
        };
      }
    }, [filteredArticles, isUnfilteredDefault, currentPage]);

  return (
    <div className="w-full bg-[#F6FAFA] text-[#172E35] min-h-screen py-8 sm:py-10 lg:py-12">
      <div className="max-w-7xl xl:max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* ============================================================ */}
        {/* 1. HEADER: Title & Supporting Text                           */}
        {/* ============================================================ */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-serif font-bold text-[#172E35] tracking-tight leading-none mb-2.5">
            News &amp; Updates
          </h1>
          <p className="text-base sm:text-lg text-[#526E77] max-w-2xl">
            Partnerships, program updates, and moments from LNA.
          </p>
        </div>

        {/* ============================================================ */}
        {/* 2. CATEGORY FILTERS & SEARCH ROW                             */}
        {/* ============================================================ */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 sm:gap-6 mb-10 sm:mb-12">
          {/* Categories Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NEWS_CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleCategorySelect(cat)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-[13px] font-semibold whitespace-nowrap transition-all cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-[#086477] ${
                    isSelected
                      ? "bg-[#086477] text-white hover:bg-[#06505F]"
                      : "bg-white border border-[#D5E2E5] text-[#172E35] hover:border-[#086477] hover:text-[#086477] hover:bg-[#F6FAFA]"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Labeled Search Field */}
          <div className="w-full md:w-72 lg:w-80 shrink-0">
            <form onSubmit={handleSearchSubmit} className="relative">
              <label
                htmlFor="news-search"
                className="block text-xs font-semibold text-[#526E77] mb-1.5"
              >
                Search news
              </label>
              <div className="relative">
                <Search
                  className="w-4 h-4 text-[#526E77] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="news-search"
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search news"
                  className="w-full pl-9 pr-9 py-2 rounded-full bg-white border border-[#D5E2E5] text-xs sm:text-sm text-[#172E35] placeholder:text-[#8AA4AB] shadow-2xs focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] transition-all"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    aria-label="Clear search query"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#526E77] hover:text-[#172E35] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. CONTENT AREA: Featured Composition OR Filtered Results    */}
        {/* ============================================================ */}
        {filteredArticles.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 sm:py-20 px-4 rounded-2xl bg-white border border-[#E5ECEE] shadow-2xs max-w-2xl mx-auto">
            <h3 className="font-serif font-bold text-2xl text-[#172E35] mb-2">No updates found</h3>
            <p className="text-sm text-[#526E77] mb-6 max-w-md mx-auto">
              We couldn&apos;t find any stories matching your current search or category filter.
            </p>
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#086477] hover:bg-[#06505F] text-white shadow-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset search and filters</span>
            </button>
          </div>
        ) : isUnfilteredDefault ? (
          /* Unfiltered Approved Featured Layout */
          <div className="space-y-12 sm:space-y-16">
            {/* Featured Composition: Lead (Left) + 2 Side Cards (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
              {featuredLead && (
                <div className="lg:col-span-7 xl:col-span-7 flex flex-col">
                  <NewsLeadCard article={featuredLead} priority={true} />
                </div>
              )}

              {featuredSide.length > 0 && (
                <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-6 sm:gap-8 justify-between">
                  {featuredSide.map((side) => (
                    <div key={side.id} className="flex-1 flex flex-col">
                      <NewsCard article={side} variant="compact" priority={true} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Latest Updates Section */}
            {latestUpdates.length > 0 && (
              <section aria-labelledby="latest-updates-heading" className="pt-4">
                {/* Centered Heading with fine horizontal accent lines */}
                <div className="flex items-center justify-center gap-4 mb-8 sm:mb-10">
                  <div className="w-12 sm:w-20 h-px bg-[#BCE1E5]" aria-hidden="true" />
                  <h2
                    id="latest-updates-heading"
                    className="text-xs sm:text-[13px] font-bold tracking-widest uppercase text-[#086477] text-center"
                  >
                    Latest Updates
                  </h2>
                  <div className="w-12 sm:w-20 h-px bg-[#BCE1E5]" aria-hidden="true" />
                </div>

                {/* 3-Column Story Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {paginatedLatest.map((article) => (
                    <NewsCard key={article.id} article={article} />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          /* Filtered or Searched Straightforward Results Grid */
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-[#E5ECEE] pb-3">
              <span className="text-xs sm:text-sm font-semibold text-[#526E77]">
                Showing {filteredArticles.length}{" "}
                {filteredArticles.length === 1 ? "story" : "stories"}
                {activeCategory !== "All updates" && ` in ${activeCategory}`}
                {searchQueryParam && ` matching “${searchQueryParam}”`}
              </span>
              <button
                type="button"
                onClick={handleResetAll}
                className="text-xs font-semibold text-[#086477] hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {paginatedGrid.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 4. PAGINATION                                                */}
        {/* ============================================================ */}
        {totalPages > 1 && (
          <nav
            aria-label="News pagination"
            className="flex items-center justify-center gap-2 mt-12 sm:mt-16 pt-8 border-t border-[#E5ECEE]"
          >
            {/* Previous Page Button */}
            {currentPage > 1 && (
              <button
                type="button"
                onClick={() => updateParams(undefined, undefined, currentPage - 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D5E2E5] bg-white text-xs sm:text-sm font-semibold text-[#172E35] hover:border-[#086477] hover:text-[#086477] transition-colors cursor-pointer shadow-2xs mr-2"
                aria-label="Previous page"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
            )}

            {/* Page Number Buttons */}
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNumber = idx + 1;
              const isCurrent = pageNumber === currentPage;

              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => updateParams(undefined, undefined, pageNumber)}
                  aria-current={isCurrent ? "page" : undefined}
                  aria-label={`Page ${pageNumber}`}
                  className={`w-9 h-9 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center transition-colors cursor-pointer shadow-2xs ${
                    isCurrent
                      ? "bg-[#086477] text-white"
                      : "bg-white border border-[#D5E2E5] text-[#172E35] hover:border-[#086477] hover:text-[#086477]"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}

            {/* Next Page Button */}
            {currentPage < totalPages && (
              <button
                type="button"
                onClick={() => updateParams(undefined, undefined, currentPage + 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D5E2E5] bg-white text-xs sm:text-sm font-semibold text-[#172E35] hover:border-[#086477] hover:text-[#086477] transition-colors cursor-pointer shadow-2xs ml-2"
                aria-label="Next page"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
