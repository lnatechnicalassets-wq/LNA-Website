import { redirect } from "next/navigation";
import { getHomeRepository } from "@/lib/content";

export async function generateStaticParams() {
  const repo = getHomeRepository();
  const mentors = await repo.getMentors();
  return mentors.map((m) => ({ slug: m.id }));
}

export default async function MentorProfilePage() {
  // Retired separate mentor profile pages per Section 6 of specification.
  // Safely redirect any legacy bookmarks/URLs to homepage Mentors section.
  redirect("/#mentors");
}
