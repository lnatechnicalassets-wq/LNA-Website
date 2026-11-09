"use client";

import React, { useState } from "react";
import { Link2, Check, Mail } from "lucide-react";

export interface ArticleShareProps {
  url: string;
  title: string;
}

export function ArticleShare({ url, title }: ArticleShareProps) {
  const [copied, setCopied] = useState(false);

  const fullUrl =
    typeof window !== "undefined" && url.startsWith("/") ? `${window.location.origin}${url}` : url;

  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  const shareLinkedIn = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const shareWhatsApp = `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`;
  const shareEmail = `mailto:?subject=${encodedTitle}&body=Read this update from Lead Nation Academy:%0A%0A${encodedUrl}`;

  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <span className="text-xs font-bold tracking-wider uppercase text-[#526E77] mr-1">Share</span>

      {/* Copy Link Button */}
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Link copied to clipboard" : "Copy article link"}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-[#D5E2E5] text-[#172E35] hover:border-[#086477] hover:text-[#086477] hover:bg-[#F6FAFA] transition-all cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-[#086477]"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span className="text-emerald-700 font-bold">Copied!</span>
          </>
        ) : (
          <>
            <Link2 className="w-3.5 h-3.5 text-[#086477]" aria-hidden="true" />
            <span>Copy link</span>
          </>
        )}
      </button>

      {/* LinkedIn Share */}
      <a
        href={shareLinkedIn}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn (opens in new window)"
        className="w-8 h-8 rounded-full bg-white border border-[#D5E2E5] text-[#172E35] hover:border-[#086477] hover:text-[#086477] hover:bg-[#F6FAFA] transition-all flex items-center justify-center cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-[#086477]"
      >
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26Z" />
        </svg>
      </a>

      {/* WhatsApp Share */}
      <a
        href={shareWhatsApp}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp (opens in new window)"
        className="w-8 h-8 rounded-full bg-white border border-[#D5E2E5] text-[#172E35] hover:border-[#086477] hover:text-[#086477] hover:bg-[#F6FAFA] transition-all flex items-center justify-center cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-[#086477]"
      >
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24M8.47 6.96c-.19 0-.42.07-.63.31-.22.25-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.66 2.67 4.1 3.63.58.23 1.03.37 1.38.48.58.18 1.11.16 1.53.1.47-.07 1.45-.59 1.65-1.17.21-.57.21-1.07.15-1.17-.06-.11-.23-.17-.48-.29-.25-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.12-.17.25-.64.8-.78.96-.15.17-.29.19-.54.07-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.41-.41-.56-.42Z" />
        </svg>
      </a>

      {/* Email Share */}
      <a
        href={shareEmail}
        aria-label="Share via Email"
        className="w-8 h-8 rounded-full bg-white border border-[#D5E2E5] text-[#172E35] hover:border-[#086477] hover:text-[#086477] hover:bg-[#F6FAFA] transition-all flex items-center justify-center cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-[#086477]"
      >
        <Mail className="w-3.5 h-3.5 text-[#086477]" aria-hidden="true" />
      </a>
    </div>
  );
}
