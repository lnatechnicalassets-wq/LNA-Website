import React from "react";
import Image from "next/image";
import { Mail, MapPin, Clock, Phone } from "lucide-react";
import { ContactConfig } from "@/lib/content";

interface ContactInfoProps {
  config: ContactConfig;
}

export function ContactInfo({ config }: ContactInfoProps) {
  const { visibility } = config;

  return (
    <div className="w-full bg-white rounded-3xl border border-teal-100/90 shadow-[0_20px_50px_-15px_rgba(8,100,119,0.12)] p-6 sm:p-7 flex flex-col justify-between overflow-hidden">
      {/* Contact Channels List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-5">
        {/* Email Address */}
        {visibility.showEmail && config.email && (
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200/70 flex items-center justify-center text-primary-700 shrink-0 mt-0.5">
              <Mail className="w-4.5 h-4.5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary tracking-wider uppercase">Email</p>
              <a
                href={`mailto:${config.email}`}
                className="text-xs sm:text-sm font-medium text-primary-800 hover:text-primary-950 hover:underline focus-visible:outline-2 focus-visible:outline-primary-600 rounded transition-colors break-all"
              >
                {config.email}
              </a>
            </div>
          </div>
        )}

        {/* Office Address */}
        {visibility.showAddress && config.officeAddress && (
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200/70 flex items-center justify-center text-primary-700 shrink-0 mt-0.5">
              <MapPin className="w-4.5 h-4.5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary tracking-wider uppercase">
                Office Address
              </p>
              <address className="not-italic text-xs sm:text-sm font-normal text-text-secondary leading-snug">
                {config.officeAddress.line1}, {config.officeAddress.line2}
                <br />
                {config.officeAddress.city}, {config.officeAddress.country}
              </address>
            </div>
          </div>
        )}

        {/* Office Hours */}
        {visibility.showHours && config.officeHours && (
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200/70 flex items-center justify-center text-primary-700 shrink-0 mt-0.5">
              <Clock className="w-4.5 h-4.5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary tracking-wider uppercase">
                Office Hours
              </p>
              <p className="text-xs sm:text-sm font-normal text-text-secondary">
                {config.officeHours}
              </p>
            </div>
          </div>
        )}

        {/* Official Phone Number (rendered only when verified and enabled) */}
        {visibility.showPhone && config.phoneDisplay && (
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200/70 flex items-center justify-center text-primary-700 shrink-0 mt-0.5">
              <Phone className="w-4.5 h-4.5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary tracking-wider uppercase">Phone</p>
              <a
                href={`tel:${config.phone}`}
                className="text-xs sm:text-sm font-medium text-primary-800 hover:text-primary-950 hover:underline focus-visible:outline-2 focus-visible:outline-primary-600 rounded transition-colors"
              >
                {config.phoneDisplay}
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Office Architecture Visual at bottom with clear representative illustration label */}
      {visibility.showOfficeVisual && (
        <div className="mt-6 pt-5 border-t border-teal-100/70">
          <div className="relative w-full aspect-[16/10] lg:aspect-[21/9] xl:aspect-[16/10] rounded-2xl overflow-hidden shadow-xs border border-teal-100/60">
            <Image
              src="/images/contact-office.jpg"
              alt="Representative executive learning facility (illustration)"
              fill
              sizes="(max-width: 1024px) 100vw, 320px"
              className="object-cover"
            />
            {/* Visual badge distinguishing illustration from an actual official office photo */}
            <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-slate-900/75 backdrop-blur-xs text-[10px] font-medium text-white select-none">
              Representative Learning Environment
            </div>
          </div>
          <p className="mt-2 text-[11px] text-text-muted text-center sm:text-left leading-tight">
            Illustrative executive learning space • Training venue confirmed upon cohort admission
          </p>
        </div>
      )}
    </div>
  );
}
