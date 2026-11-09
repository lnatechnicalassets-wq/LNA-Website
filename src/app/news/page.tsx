import React, { Suspense } from "react";
import type { Metadata } from "next";
import { getNewsRepository } from "@/lib/content";
import { NewsArchiveView } from "./news-archive-view";

export const metadata: Metadata = {
  title: "News & Updates — Lead Nation Academy",
  description: "Invitations, partnerships, and moments from Lead Nation Academy.",
  openGraph: {
    title: "News & Updates — Lead Nation Academy",
    description: "Invitations, partnerships, and moments from Lead Nation Academy.",
  },
};

export default async function NewsArchivePage() {
  const newsRepo = getNewsRepository();
  const articles = await newsRepo.getPublishedArticles();

  return (
    <Suspense
      fallback={
        <div className="w-full bg-[#F6FAFA] min-h-screen py-16 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#086477] border-t-transparent animate-spin" />
        </div>
      }
    >
      <NewsArchiveView initialArticles={articles} />
    </Suspense>
  );
}
