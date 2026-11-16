"use client";

import React, { useRef, useState } from "react";
import { MentorImagePicker } from "@/components/admin/mentor-image-picker";
import { MentorDisplayCard } from "@/components/home/mentor-display-card";
import { MentorQuickViewDetails } from "@/components/home/mentor-quick-view-modal";
import { peopleCopy as copy, peopleFieldClass, type StaffMentorCard } from "@/lib/admin-people";
import {
  linkedinProfile,
  mentorPreviewProvenance,
  parseMentorExpertise,
} from "@/lib/mentor-profile";
import type { Mentor } from "@/lib/content";
import { getMentorAvatar, getMentorCompanyLogos } from "@/lib/mentors";

export function MentorFields({
  mentor,
  assets,
}: {
  mentor?: StaffMentorCard & {
    bio: string;
    linkedin_url: string | null;
    expertise: string[];
    career_history: Mentor["careerHistory"];
    published: boolean;
  };
  assets: { portraits: string[]; logos: string[] };
}) {
  const [name, setName] = useState(mentor?.name ?? "");
  const [role, setRole] = useState(mentor?.role ?? "");
  const [company, setCompany] = useState(mentor?.organization ?? "");
  const [photo, setPhoto] = useState(mentor?.portrait_src ?? "");
  const [logo, setLogo] = useState(mentor?.company_logo_src ?? "");
  const [portraitPreview, setPortraitPreview] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [bio, setBio] = useState(mentor?.bio ?? "");
  const [expertise, setExpertise] = useState(mentor?.expertise.join("\n") ?? "");
  const [linkedIn, setLinkedIn] = useState(mentor?.linkedin_url ?? "");
  const [details, setDetails] = useState(false);
  const previewRef = useRef<HTMLElement>(null);
  const expertiseTags = parseMentorExpertise(expertise);

  const preview: Mentor = {
    id: mentor?.slug ?? "",
    name: name.trim() || copy.name,
    role: role.trim() || copy.role,
    organization: company.trim() || copy.company,
    portraitSrc: portraitPreview || photo || undefined,
    companyLogoSrc: logoPreview || logo || undefined,
    linkedInUrl: linkedinProfile.test(linkedIn.trim()) ? linkedIn.trim() : undefined,
    bio,
    expertise: expertiseTags,
    careerHistory: mentor?.career_history,
    order: 0,
    isPlaceholder: false,
    provenance: mentorPreviewProvenance,
  };
  const fields = [
    { name: "name", label: copy.name, value: name, update: setName, max: 120, required: true },
    { name: "role", label: copy.role, value: role, update: setRole, max: 160, required: true },
    {
      name: "company",
      label: copy.company,
      value: company,
      update: setCompany,
      max: 160,
      required: true,
    },
    {
      name: "linkedIn",
      label: copy.linkedIn,
      value: linkedIn,
      update: setLinkedIn,
      max: 240,
      required: false,
    },
  ];

  return (
    <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(15rem,.65fr)] lg:gap-8">
      <div className="min-w-0 space-y-5">
        <section aria-labelledby="mentor-profile-fields">
          <div className="mb-3 flex min-h-7 items-center justify-between gap-2">
            <h3 id="mentor-profile-fields" className="text-sm font-semibold text-primary-900">
              {copy.profileDetails}
            </h3>
            <button
              type="button"
              className="min-h-8 rounded text-xs font-semibold text-primary-900 underline md:hidden"
              onClick={() => previewRef.current?.scrollIntoView({ block: "nearest" })}
            >
              {copy.openPreview}
            </button>
          </div>
          <div className="grid gap-x-3 gap-y-3 sm:grid-cols-2">
            {fields.map((field) => (
              <label key={field.name} className="block min-w-0 space-y-1 text-sm font-medium">
                <span>{field.label}</span>
                <input
                  name={field.name}
                  type={field.name === "linkedIn" ? "url" : "text"}
                  maxLength={field.max}
                  required={field.required}
                  value={field.value}
                  onChange={(event) => field.update(event.currentTarget.value)}
                  className={peopleFieldClass}
                />
              </label>
            ))}
            <label className="block space-y-1 text-sm font-medium sm:col-span-2">
              <span>{copy.bio}</span>
              <textarea
                name="bio"
                minLength={10}
                maxLength={2200}
                rows={4}
                required
                value={bio}
                onChange={(event) => setBio(event.currentTarget.value)}
                className={`${peopleFieldClass} resize-y`}
              />
            </label>
            <label className="block space-y-1 text-sm font-medium sm:col-span-2">
              <span>{copy.expertise}</span>
              <textarea
                name="expertise"
                maxLength={1024}
                rows={3}
                value={expertise}
                onFocus={() => setDetails(true)}
                onChange={(event) => setExpertise(event.currentTarget.value)}
                className={`${peopleFieldClass} resize-y`}
              />
              <span className="block text-xs font-normal text-text-secondary">
                {copy.expertiseHelp}
              </span>
            </label>
          </div>
        </section>

        <section
          aria-labelledby="mentor-images-fields"
          className="border-t border-border-subtle pt-4"
        >
          <h3 id="mentor-images-fields" className="mb-2.5 text-sm font-semibold text-primary-900">
            {copy.mentorImages}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <MentorImagePicker
              name="photo"
              label={copy.photo}
              choices={assets.portraits}
              value={photo}
              source={getMentorAvatar(preview)}
              onChange={setPhoto}
              onPreview={setPortraitPreview}
            />
            <MentorImagePicker
              name="logo"
              label={copy.logo}
              choices={assets.logos}
              value={logo}
              source={getMentorCompanyLogos(preview)[0]?.src}
              onChange={setLogo}
              onPreview={setLogoPreview}
            />
          </div>
        </section>

        <label className="flex min-h-9 items-center gap-2.5 text-sm font-medium">
          <input
            type="checkbox"
            name="published"
            defaultChecked={mentor?.published ?? false}
            className="size-4 accent-primary-600"
          />
          <span>{copy.showMentor}</span>
        </label>
      </div>
      <section
        ref={previewRef}
        aria-label={copy.cardPreview}
        className="min-w-0 space-y-3 rounded-xl border border-primary-100 bg-primary-50 p-3 md:sticky md:top-0"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-primary-800">{copy.cardPreview}</h3>
          <button
            type="button"
            aria-pressed={details}
            onClick={() => setDetails(!details)}
            className="min-h-8 rounded-md bg-surface-card px-2 text-xs font-semibold text-primary-900 hover:bg-primary-100"
          >
            {details ? copy.previewCard : copy.previewDetails}
          </button>
        </div>
        {details ? (
          <div className="rounded-3xl border border-white/80 bg-[#FAF9F6] p-4">
            <MentorQuickViewDetails mentor={preview} />
          </div>
        ) : (
          <div className="mx-auto w-[230px] max-w-full overflow-hidden rounded-3xl border border-white/70 bg-[#FAF9F6] sm:w-[248px] xl:w-[260px]">
            <MentorDisplayCard mentor={preview} onInfo={() => setDetails(true)} />
          </div>
        )}
      </section>
    </div>
  );
}
