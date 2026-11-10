"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, AlertCircle, Search, Mail, Phone } from "lucide-react";
import {
  formatPaymentMethodLabel,
  normalizeApplicationRef,
  type SafeStatusLookupResult,
  type StatusLookupQuery,
  type VerificationContactType,
} from "@/lib/enrollment/status";

export interface StatusLookupViewProps {
  enabled?: boolean;
  onLookup?: (
    query: StatusLookupQuery
  ) => SafeStatusLookupResult | null | Promise<SafeStatusLookupResult | null>;
}

export function StatusLookupView({ enabled = false, onLookup }: StatusLookupViewProps) {
  const searchParams = useSearchParams();
  const refParam = searchParams.get("ref") || "";
  const isLookupAvailable = Boolean(enabled && onLookup);

  const [applicationId, setApplicationId] = useState<string>(() =>
    refParam ? normalizeApplicationRef(refParam) : ""
  );
  const [verificationType, setVerificationType] = useState<VerificationContactType>("email");
  const [contactValue, setContactValue] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<{
    applicationId?: string;
    contactValue?: string;
  }>({});
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string>("");
  const [result, setResult] = useState<SafeStatusLookupResult | null>(null);

  useEffect(() => {
    if (refParam) {
      setApplicationId(normalizeApplicationRef(refParam));
    }
  }, [refParam]);

  const handleVerificationTypeChange = (nextType: VerificationContactType) => {
    setVerificationType(nextType);
    setFieldErrors((prev) => ({ ...prev, contactValue: undefined }));
    setHasSearched(false);
    setLookupError("");
    setResult(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLookupAvailable || !onLookup) {
      return;
    }

    const trimmedRef = applicationId.trim();
    const trimmedContact = contactValue.trim();
    const nextErrors: { applicationId?: string; contactValue?: string } = {};

    if (!trimmedRef) {
      nextErrors.applicationId = "Please enter your LNA Application ID.";
    }
    if (!trimmedContact) {
      nextErrors.contactValue =
        verificationType === "email"
          ? "Please enter the email address from your application."
          : "Please enter the phone number from your application.";
    }

    if (nextErrors.applicationId || nextErrors.contactValue) {
      setFieldErrors(nextErrors);
      setHasSearched(false);
      setLookupError("");
      setResult(null);
      return;
    }

    setFieldErrors({});
    setLookupError("");
    setIsSearching(true);

    try {
      const matched = await onLookup({
        applicationId: trimmedRef,
        verificationType,
        contactValue: trimmedContact,
      });
      setHasSearched(true);
      setResult(matched);
    } catch {
      setHasSearched(false);
      setResult(null);
      setLookupError("Unable to check application status right now. Please try again shortly.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-full bg-[#F6FAFA] text-[#172E35] min-h-screen py-8 sm:py-12 lg:py-16">
      <div className="max-w-7xl xl:max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-8 sm:mb-10">
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#086477]">
              APPLICATION STATUS
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-serif font-bold text-[#172E35] leading-[1.1] tracking-tight mb-3">
            Check your{" "}
            <span className="italic font-normal text-[#086477]">application status.</span>
          </h1>
          <p className="text-sm sm:text-base text-[#526E77] leading-relaxed">
            Enter your LNA Application ID and verify with either the email address or phone number
            used during enrollment.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ========================================================== */}
          {/* LEFT COLUMN: Status Lookup Form & Sanitized Result         */}
          {/* ========================================================== */}
          <div className="lg:col-span-7 space-y-6 min-w-0">
            {!isLookupAvailable && (
              <div
                role="status"
                data-testid="status-coming-soon-notice"
                className="p-4 sm:p-5 rounded-2xl bg-[#FEF3C7]/70 border border-[#FDE68A] text-xs sm:text-sm text-[#78350F] flex items-start gap-3"
              >
                <AlertCircle
                  className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <div className="font-bold text-[#92400E]">Online enrollment is coming soon</div>
                  <p className="text-xs sm:text-sm text-[#78350F] mt-1 leading-relaxed">
                    Application status lookup will be available once online enrollment opens and
                    submitted records are saved for staff verification.
                  </p>
                </div>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              noValidate
              className="bg-white border border-[#E5ECEE] rounded-2xl p-5 sm:p-8 shadow-2xs space-y-6"
            >
              {/* LNA Application ID */}
              <div>
                <label
                  htmlFor="status-application-id"
                  className="block text-sm font-semibold text-[#172E35] mb-1.5"
                >
                  LNA Application ID{" "}
                  <span className="text-rose-700" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id="status-application-id"
                  type="text"
                  required
                  value={applicationId}
                  onChange={(e) => {
                    setFieldErrors((prev) => ({ ...prev, applicationId: undefined }));
                    setApplicationId(e.target.value);
                  }}
                  placeholder="LNA-XXXX-XXXX"
                  aria-invalid={Boolean(fieldErrors.applicationId)}
                  aria-describedby={
                    fieldErrors.applicationId
                      ? "status-application-id-error"
                      : "status-application-id-hint"
                  }
                  className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm font-mono uppercase text-[#172E35] placeholder:text-[#8AA4AB] placeholder:normal-case placeholder:font-sans focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs"
                />
                <p id="status-application-id-hint" className="mt-1.5 text-xs text-[#526E77]">
                  Enter the LNA Application ID issued after submitting your enrollment form.
                </p>
                {fieldErrors.applicationId && (
                  <p
                    id="status-application-id-error"
                    role="alert"
                    className="mt-1.5 text-xs text-rose-700 font-medium"
                  >
                    {fieldErrors.applicationId}
                  </p>
                )}
              </div>

              {/* Verification Method Switch (Email OR Phone number) */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-[#172E35] mb-1">
                  Verify identity using
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    htmlFor="verify-by-email"
                    className={`flex items-center gap-3 p-3.5 min-h-[44px] rounded-xl border transition-all cursor-pointer ${
                      verificationType === "email"
                        ? "bg-[#EBF5F6] border-[#086477] shadow-xs"
                        : "bg-white border-[#D5E2E5] hover:border-[#BCE1E5]"
                    }`}
                  >
                    <input
                      id="verify-by-email"
                      type="radio"
                      name="verificationType"
                      value="email"
                      checked={verificationType === "email"}
                      onChange={() => handleVerificationTypeChange("email")}
                      className="h-4 w-4 text-[#086477] focus:ring-[#086477] cursor-pointer"
                    />
                    <Mail className="w-4 h-4 text-[#086477] shrink-0" aria-hidden="true" />
                    <span className="font-semibold text-sm text-[#172E35]">Use Email</span>
                  </label>

                  <label
                    htmlFor="verify-by-phone"
                    className={`flex items-center gap-3 p-3.5 min-h-[44px] rounded-xl border transition-all cursor-pointer ${
                      verificationType === "phone"
                        ? "bg-[#EBF5F6] border-[#086477] shadow-xs"
                        : "bg-white border-[#D5E2E5] hover:border-[#BCE1E5]"
                    }`}
                  >
                    <input
                      id="verify-by-phone"
                      type="radio"
                      name="verificationType"
                      value="phone"
                      checked={verificationType === "phone"}
                      onChange={() => handleVerificationTypeChange("phone")}
                      className="h-4 w-4 text-[#086477] focus:ring-[#086477] cursor-pointer"
                    />
                    <Phone className="w-4 h-4 text-[#086477] shrink-0" aria-hidden="true" />
                    <span className="font-semibold text-sm text-[#172E35]">Use Phone</span>
                  </label>
                </div>
              </fieldset>

              {/* Contact Value Input */}
              <div>
                <label
                  htmlFor="status-contact-value"
                  className="block text-sm font-semibold text-[#172E35] mb-1.5"
                >
                  {verificationType === "email" ? "Email address" : "Phone number"}{" "}
                  <span className="text-rose-700" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id="status-contact-value"
                  type={verificationType === "email" ? "email" : "tel"}
                  required
                  value={contactValue}
                  onChange={(e) => {
                    setFieldErrors((prev) => ({ ...prev, contactValue: undefined }));
                    setContactValue(e.target.value);
                  }}
                  placeholder={verificationType === "email" ? "name@example.com" : "01XXXXXXXXX"}
                  aria-invalid={Boolean(fieldErrors.contactValue)}
                  aria-describedby={
                    fieldErrors.contactValue ? "status-contact-error" : "status-contact-hint"
                  }
                  className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm text-[#172E35] placeholder:text-[#8AA4AB] focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs"
                />
                <p id="status-contact-hint" className="mt-1.5 text-xs text-[#526E77]">
                  {verificationType === "email"
                    ? "Enter the email address used on your enrollment form."
                    : "Enter the 11-digit phone or WhatsApp number used on your enrollment form."}
                </p>
                {fieldErrors.contactValue && (
                  <p
                    id="status-contact-error"
                    role="alert"
                    className="mt-1.5 text-xs text-rose-700 font-medium"
                  >
                    {fieldErrors.contactValue}
                  </p>
                )}
              </div>

              {lookupError && (
                <p role="alert" className="text-xs text-rose-700 font-medium">
                  {lookupError}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <button
                  type="submit"
                  disabled={!isLookupAvailable || isSearching}
                  aria-disabled={!isLookupAvailable || isSearching}
                  className={`inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px] px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477] ${
                    !isLookupAvailable || isSearching
                      ? "bg-[#9BB7BE] text-white cursor-not-allowed"
                      : "bg-[#086477] hover:bg-[#06505F] text-white cursor-pointer"
                  }`}
                >
                  <Search className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {isLookupAvailable ? "Check application status" : "Status lookup coming soon"}
                  </span>
                </button>

                <Link
                  href="/enroll"
                  className="inline-flex items-center min-h-[44px] text-xs sm:text-sm font-semibold text-[#086477] hover:underline"
                >
                  Back to enrollment →
                </Link>
              </div>
            </form>

            {/* Generic Mismatch Feedback */}
            {isLookupAvailable && hasSearched && !result && (
              <div
                role="alert"
                data-testid="status-mismatch-message"
                className="p-5 sm:p-6 rounded-2xl bg-white border border-[#D5E2E5] shadow-2xs flex items-start gap-3"
              >
                <AlertCircle
                  className="w-5 h-5 text-[#086477] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="font-serif font-bold text-base text-[#172E35] mb-1">
                    No matching application found
                  </h2>
                  <p className="text-xs sm:text-sm text-[#526E77] leading-relaxed">
                    We couldn&apos;t find an application matching those details. Please check your
                    LNA Application ID and your email or phone number, then try again.
                  </p>
                </div>
              </div>
            )}

            {/* Sanitized Status Result Card (Strictly omits tx refs, email, and phone) */}
            {isLookupAvailable && hasSearched && result && (
              <section
                aria-label="Application status summary"
                data-testid="status-result-card"
                className="bg-white border border-[#C5E2E5] rounded-2xl p-5 sm:p-8 shadow-2xs space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E5ECEE]">
                  <div className="flex flex-wrap items-center gap-2">
                    {result.status === "Enrollment confirmed" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"
                          aria-hidden="true"
                        />
                        Enrollment confirmed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#D97706]"
                          aria-hidden="true"
                        />
                        Application in process
                      </span>
                    )}
                  </div>

                  <span className="font-mono text-xs sm:text-sm font-bold text-[#086477]">
                    {result.applicationReference}
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-[#172E35] mb-1.5">
                    {result.status}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#526E77] leading-relaxed">
                    {result.status === "Enrollment confirmed"
                      ? "Your payment has been verified and your seat in this batch is confirmed."
                      : "Your payment reference has been received. Enrollment is confirmed after staff verify the payment."}
                  </p>
                </div>

                <dl className="divide-y divide-[#E5ECEE] text-xs sm:text-sm">
                  <div className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <dt className="text-[#526E77]">Applicant name</dt>
                    <dd className="font-semibold text-[#172E35] text-right">{result.fullName}</dd>
                  </div>

                  {result.university && (
                    <div className="py-3 flex flex-wrap items-center justify-between gap-2">
                      <dt className="text-[#526E77]">University</dt>
                      <dd className="font-semibold text-[#172E35] text-right">
                        {result.university}
                      </dd>
                    </div>
                  )}

                  <div className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <dt className="text-[#526E77]">Course</dt>
                    <dd className="font-semibold text-[#172E35] text-right">
                      {result.courseTitle}
                    </dd>
                  </div>

                  <div className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <dt className="text-[#526E77]">Batch</dt>
                    <dd className="font-semibold text-[#172E35] text-right">{result.batchName}</dd>
                  </div>

                  <div className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <dt className="text-[#526E77]">Payment method</dt>
                    <dd className="font-semibold text-[#172E35] text-right">
                      {formatPaymentMethodLabel(result.paymentMethod)}
                    </dd>
                  </div>

                  <div className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <dt className="text-[#526E77]">Current status</dt>
                    <dd className="font-bold text-[#086477] text-right">{result.status}</dd>
                  </div>
                </dl>
              </section>
            )}
          </div>

          {/* ========================================================== */}
          {/* RIGHT COLUMN: Helpful Admissions & Program Guidance        */}
          {/* ========================================================== */}
          <aside className="lg:col-span-5 space-y-6 min-w-0">
            <div className="bg-[#EBF5F6] border border-[#C5E2E5] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#086477] block">
                STATUS VERIFICATION
              </span>
              <h2 className="font-serif font-bold text-xl text-[#172E35]">
                How verification works
              </h2>
              <p className="text-xs sm:text-sm text-[#526E77] leading-relaxed">
                For privacy, application status checks require both your unique LNA Application ID
                and the matching email address or phone number submitted on your form. Sensitive
                contact and payment transaction references are never shown in status results.
              </p>
            </div>

            <div className="bg-white border border-[#E5ECEE] rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col gap-3">
              <h3 className="font-serif font-bold text-lg text-[#172E35]">
                Need assistance from LNA admissions?
              </h3>
              <p className="text-xs sm:text-sm text-[#526E77] leading-relaxed">
                If you have questions about upcoming cohorts or enrollment opening dates, contact
                our admissions desk or review available programs.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/enroll"
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white text-xs sm:text-sm font-semibold transition-colors"
                >
                  <span>Go to enrollment</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <a
                  href="mailto:admissions@lnabd.org"
                  className="inline-flex items-center min-h-[44px] px-2 text-xs sm:text-sm font-semibold text-[#086477] hover:underline"
                >
                  Contact admissions
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
