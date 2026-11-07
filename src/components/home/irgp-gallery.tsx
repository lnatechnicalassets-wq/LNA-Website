"use client";

import React from "react";
import Image from "next/image";
import { Monitor, Users, UserCheck, Award } from "lucide-react";
import type { IrgpGalleryItem } from "@/lib/content";

export interface IrgpGalleryProps {
  items: IrgpGalleryItem[];
  onPhotoClick: (index: number) => void;
}

function getGalleryIcon(iconName: string) {
  switch (iconName.toLowerCase()) {
    case "monitor":
    case "laptop":
      return <Monitor className="w-3.5 h-3.5 text-teal-200" />;
    case "users":
    case "team":
      return <Users className="w-3.5 h-3.5 text-teal-200" />;
    case "usercheck":
    case "mentor":
      return <UserCheck className="w-3.5 h-3.5 text-teal-200" />;
    case "award":
    case "completion":
      return <Award className="w-3.5 h-3.5 text-teal-200" />;
    default:
      return <Monitor className="w-3.5 h-3.5 text-teal-200" />;
  }
}

export function IrgpGallery({ items, onPhotoClick }: IrgpGalleryProps) {
  return (
    <div
      role="region"
      aria-label="IRGP Program Photo Gallery"
      className="grid grid-cols-2 grid-rows-2 gap-3 sm:gap-3.5 lg:gap-4 h-full w-full"
    >
      {items.map((item, idx) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onPhotoClick(idx)}
          aria-label={`Open photo ${idx + 1} of ${items.length}: ${item.category}`}
          className="group relative flex flex-col justify-end overflow-hidden rounded-2xl sm:rounded-3xl border border-teal-100/80 bg-teal-900/10 shadow-xs hover:shadow-md transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#086477] focus-visible:ring-offset-2 w-full h-full min-h-[140px] sm:min-h-[165px] lg:min-h-[180px] cursor-pointer text-left"
        >
          {/* Background image */}
          <Image
            src={item.src}
            alt={item.alt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
          />

          {/* Bottom Dark Gradient for Text Contrast */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none transition-opacity duration-300 group-hover:from-black/85"
            aria-hidden="true"
          />

          {/* Category Pill Tag Overlay at Bottom */}
          <div className="relative z-10 p-2.5 sm:p-3 w-full">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] sm:text-xs font-medium border border-white/20 shadow-xs transition-colors duration-200 group-hover:bg-[#086477]/80 group-hover:border-teal-300/40 truncate max-w-full">
              {getGalleryIcon(item.icon)}
              <span className="truncate">{item.category}</span>
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
