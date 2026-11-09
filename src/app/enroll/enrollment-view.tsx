"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, ChevronDown, X, AlertCircle } from "lucide-react";
import type { Course, Batch } from "@/lib/content";
import { formatPoishaToBDT } from "@/lib/money";
import type { EnrollmentConfig, EnrollmentStep, EnrollmentState } from "@/lib/enrollment/types";
import { generateEnrollmentReference } from "@/lib/enrollment/reference";

export interface EnrollmentViewProps {
  courses: Course[];
  batches: Batch[];
  config: EnrollmentConfig;
}

export function EnrollmentView({ courses, batches, config }: EnrollmentViewProps) {
  const searchParams = useSearchParams();

  // Read URL preselection
  const initialCourseId = searchParams.get("course") || searchParams.get("program") || "";
  const initialBatchId = searchParams.get("batch") || "";

  // Filter published courses
  const publishedCourses = useMemo(
    () => courses.filter((c) => c.status === "published"),
    [courses]
  );

  // Enrollment state
  const [state, setState] = useState<EnrollmentState>({
    courseId: initialCourseId,
    batchId: initialBatchId,
    fullName: "",
    email: "",
    whatsapp: "",
    answers: {},
    paymentMethod: "bkash",
    transferReference: "",
    applicationReference: generateEnrollmentReference(),
    isFree: false,
  });

  const [step, setStep] = useState<EnrollmentStep>("program");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showBkashModal, setShowBkashModal] = useState(false);
  const [showAnswersExpanded, setShowAnswersExpanded] = useState(false);

  // Resolve currently selected course & available batches
  const selectedCourse = useMemo(
    () => publishedCourses.find((c) => c.id === state.courseId) || null,
    [publishedCourses, state.courseId]
  );

  const availableBatches = useMemo(() => {
    if (!state.courseId) return [];
    return batches.filter(
      (b) => b.courseId === state.courseId && b.status === "open_for_enrollment"
    );
  }, [batches, state.courseId]);

  const selectedBatch = useMemo(
    () => availableBatches.find((b) => b.id === state.batchId) || null,
    [availableBatches, state.batchId]
  );

  // If initial batch param was passed, validate it matches available batches
  useEffect(() => {
    if (initialCourseId && availableBatches.length > 0 && !state.batchId) {
      if (initialBatchId && availableBatches.some((b) => b.id === initialBatchId)) {
        setState((prev) => ({ ...prev, batchId: initialBatchId }));
      } else if (availableBatches.length === 1) {
        setState((prev) => ({ ...prev, batchId: availableBatches[0].id }));
      }
    }
  }, [initialCourseId, initialBatchId, availableBatches, state.batchId]);

  // Sync fee and free state
  const isFree = useMemo(() => {
    if (!selectedBatch) return false;
    const feePoisha = selectedBatch.discountFeePoisha ?? selectedBatch.feePoisha;
    return feePoisha === 0;
  }, [selectedBatch]);

  const formattedFee = useMemo(() => {
    if (!selectedBatch) return "BDT 0";
    const feePoisha = selectedBatch.discountFeePoisha ?? selectedBatch.feePoisha;
    if (feePoisha === 0) return "Free";
    return formatPoishaToBDT(feePoisha).replace("৳", "BDT ");
  }, [selectedBatch]);

  // Program questions configured for selected course
  const programQuestions = useMemo(() => {
    if (!state.courseId) return [];
    return config.programQuestions[state.courseId] || [];
  }, [config.programQuestions, state.courseId]);

  // Handle program change: clear batch
  const handleProgramChange = (newCourseId: string) => {
    setErrors({});
    const courseBatches = batches.filter(
      (b) => b.courseId === newCourseId && b.status === "open_for_enrollment"
    );
    const defaultBatchId = courseBatches.length === 1 ? courseBatches[0].id : "";

    setState((prev) => ({
      ...prev,
      courseId: newCourseId,
      batchId: defaultBatchId,
    }));
  };

  // Step 1: Validate & Continue to details
  const handleContinueFromProgram = () => {
    const newErrors: Record<string, string> = {};
    if (!state.courseId) {
      newErrors.courseId = "Please select a program.";
    } else if (availableBatches.length === 0) {
      newErrors.batchId = "No open batches are available for this program.";
    } else if (!state.batchId) {
      newErrors.batchId = "Please select an available batch.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setStep("details");
  };

  // Step 2: Validate Contact Details
  const handleContinueFromDetails = () => {
    const newErrors: Record<string, string> = {};
    if (!state.fullName.trim()) {
      newErrors.fullName = "Please enter your full name.";
    }
    if (!state.email.trim()) {
      newErrors.email = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (!state.whatsapp.trim()) {
      newErrors.whatsapp = "Please enter your WhatsApp number.";
    } else if (!/^01[3-9]\d{8}$/.test(state.whatsapp.replace(/\D/g, ""))) {
      newErrors.whatsapp = "Please enter a valid 11-digit Bangladeshi mobile number.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    if (programQuestions.length > 0) {
      setStep("questions");
    } else {
      setStep("review");
    }
  };

  // Step 2b: Validate Program Questions
  const handleContinueFromQuestions = () => {
    const newErrors: Record<string, string> = {};
    programQuestions.forEach((q) => {
      if (q.required && (!state.answers[q.id] || !state.answers[q.id].trim())) {
        newErrors[q.id] = `Please answer this question.`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setStep("review");
  };

  // Step 3: Review -> Submit Free Registration OR Continue to Payment
  const handleContinueFromReview = () => {
    if (isFree) {
      // Free program confirmed immediately
      setStep("confirmed");
    } else {
      setStep("payment_method");
    }
  };

  // Step 4: Continue from Payment Method
  const handleContinueFromPaymentMethod = () => {
    if (state.paymentMethod === "bkash") {
      setShowBkashModal(true);
    } else if (state.paymentMethod === "bank_transfer") {
      setStep("bank_transfer");
    }
  };

  // Step 4b: Submit Bank Transfer Reference
  const handleSubmitBankReference = () => {
    if (!state.transferReference.trim()) {
      setErrors({ transferReference: "Please enter your bank transfer reference." });
      return;
    }
    setErrors({});
    setStep("pending_verification");
  };

  // Simulated bKash handlers
  const handleBkashSimulateSuccess = () => {
    setShowBkashModal(false);
    setStep("confirmed");
  };

  const handleBkashSimulateFailure = () => {
    setShowBkashModal(false);
    setStep("payment_failed");
  };

  // Determine which step bar to render
  const isPostReviewPayment =
    step === "payment_method" || step === "bank_transfer" || step === "payment_failed";

  const isCompletedStep = step === "confirmed" || step === "pending_verification";

  // Check which photo to show
  const isConfirmationPhoto = isCompletedStep;

  // Format start date for display
  const formatStartDate = (dateStr?: string) => {
    if (!dateStr) return "Upcoming";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full bg-[#F6FAFA] text-[#172E35] min-h-screen py-8 sm:py-12 lg:py-16">
      <div className="max-w-7xl xl:max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* ============================================================ */}
        {/* MOBILE TOP SHALLOW PHOTO (Entry Screen only)                 */}
        {/* ============================================================ */}
        {step === "program" && (
          <div className="lg:hidden mb-8 relative w-full aspect-[2/1] rounded-2xl overflow-hidden shadow-xs bg-[#EBF3F5]">
            <Image
              src="/images/enrollment/lna-enrollment-workshop-640.webp"
              alt="Lead Nation Academy workshop learning environment"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 640px"
              className="object-cover object-[center_35%]"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 xl:gap-20 items-start">
          {/* ========================================================== */}
          {/* LEFT COLUMN: Form & Navigation Flow                       */}
          {/* ========================================================== */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-start">
            {/* 1. Eyebrow */}
            <span className="text-xs font-bold uppercase tracking-widest text-[#086477] mb-2">
              PROGRAM ENROLLMENT
            </span>

            {/* 2. Dynamic Headline & Subtitle */}
            <div className="mb-6 sm:mb-8">
              {step === "program" && (
                <>
                  <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-serif font-bold text-[#172E35] leading-[1.08] tracking-tight mb-2">
                    Choose what{" "}
                    <span className="italic font-normal text-[#086477]">comes next.</span>
                  </h1>
                  <p className="text-sm sm:text-base text-[#526E77]">
                    Choose a program and an available batch to get started.
                  </p>
                </>
              )}

              {step === "details" && (
                <>
                  <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-serif font-bold text-[#172E35] leading-tight tracking-tight mb-2">
                    Tell us about yourself.
                  </h1>
                  <p className="text-sm sm:text-base text-[#526E77]">
                    Enter the contact details LNA should use for this application.
                  </p>
                </>
              )}

              {step === "questions" && (
                <>
                  <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-serif font-bold text-[#172E35] leading-tight tracking-tight mb-2">
                    A few more details.
                  </h1>
                  <p className="text-sm sm:text-base text-[#526E77]">
                    These questions are specific to the program you selected.
                  </p>
                </>
              )}

              {step === "review" && (
                <>
                  <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-serif font-bold text-[#172E35] leading-tight tracking-tight mb-2">
                    {isFree ? "Review your registration." : "Review your application."}
                  </h1>
                  <p className="text-sm sm:text-base text-[#526E77]">
                    {isFree
                      ? "Check your details before confirming your free registration."
                      : "Check your details before continuing to payment."}
                  </p>
                </>
              )}

              {step === "payment_method" && (
                <>
                  <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-serif font-bold text-[#172E35] leading-tight tracking-tight mb-2">
                    Choose how to pay.
                  </h1>
                  <p className="text-sm sm:text-base text-[#526E77]">
                    Select a payment method to complete your enrollment.
                  </p>
                </>
              )}

              {step === "bank_transfer" && (
                <>
                  <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-serif font-bold text-[#172E35] leading-tight tracking-tight mb-2">
                    Pay by bank transfer.
                  </h1>
                  <p className="text-sm sm:text-base text-[#526E77]">
                    Use the transfer details below, then enter your reference.
                  </p>
                </>
              )}

              {step === "pending_verification" && (
                <>
                  <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-serif font-bold text-[#172E35] leading-tight tracking-tight mb-2">
                    Transfer under review.
                  </h1>
                  <p className="text-sm sm:text-base text-[#526E77]">
                    We received your reference. LNA will verify the transfer.
                  </p>
                </>
              )}

              {step === "payment_failed" && (
                <>
                  <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-serif font-bold text-[#172E35] leading-tight tracking-tight mb-2">
                    Payment unsuccessful.
                  </h1>
                  <p className="text-sm sm:text-base text-[#526E77]">
                    This payment attempt failed. You can try again or change methods.
                  </p>
                </>
              )}

              {step === "confirmed" && (
                <>
                  <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-serif font-bold text-[#172E35] leading-tight tracking-tight mb-2">
                    {isFree ? "You're registered." : "You're enrolled."}
                  </h1>
                  <p className="text-sm sm:text-base text-[#526E77]">
                    {isFree
                      ? "Your place in the workshop is confirmed."
                      : "Your payment was verified and your place is confirmed."}
                  </p>
                </>
              )}
            </div>

            {/* 3. Progress Step Indicator (Shown on form stages) */}
            {!isCompletedStep && (
              <div className="mb-8">
                {isPostReviewPayment ? (
                  /* 4-Step Progress for Payment */
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <div className="h-1 rounded-full bg-[#086477] mb-2" />
                      <span className="text-xs text-[#526E77]">01 Program</span>
                    </div>
                    <div>
                      <div className="h-1 rounded-full bg-[#086477] mb-2" />
                      <span className="text-xs text-[#526E77]">02 Details</span>
                    </div>
                    <div>
                      <div className="h-1 rounded-full bg-[#086477] mb-2" />
                      <span className="text-xs text-[#526E77]">03 Review</span>
                    </div>
                    <div>
                      <div className="h-1 rounded-full bg-[#086477] mb-2" />
                      <span className="text-xs font-bold text-[#172E35]">04 Payment</span>
                    </div>
                  </div>
                ) : (
                  /* 3-Step Progress for Application */
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <div
                        className={`h-1 rounded-full mb-2 ${
                          step === "program" ||
                          step === "details" ||
                          step === "questions" ||
                          step === "review"
                            ? "bg-[#086477]"
                            : "bg-[#D5E2E5]"
                        }`}
                      />
                      <span
                        className={`text-xs ${
                          step === "program" ? "font-bold text-[#172E35]" : "text-[#526E77]"
                        }`}
                      >
                        01 Program
                      </span>
                    </div>
                    <div>
                      <div
                        className={`h-1 rounded-full mb-2 ${
                          step === "details" || step === "questions" || step === "review"
                            ? "bg-[#086477]"
                            : "bg-[#D5E2E5]"
                        }`}
                      />
                      <span
                        className={`text-xs ${
                          step === "details" || step === "questions"
                            ? "font-bold text-[#172E35]"
                            : "text-[#526E77]"
                        }`}
                      >
                        02 Details
                      </span>
                    </div>
                    <div>
                      <div
                        className={`h-1 rounded-full mb-2 ${
                          step === "review" ? "bg-[#086477]" : "bg-[#D5E2E5]"
                        }`}
                      />
                      <span
                        className={`text-xs ${
                          step === "review" ? "font-bold text-[#172E35]" : "text-[#526E77]"
                        }`}
                      >
                        03 Review
                      </span>
                    </div>
                  </div>
                )}

                {/* Sub-step eyebrow when on program questions */}
                {step === "questions" && (
                  <div className="mt-3 text-[11px] font-bold tracking-wider uppercase text-[#086477]">
                    DETAILS / PROGRAM QUESTIONS
                  </div>
                )}
              </div>
            )}

            {/* 4. Selected Program Summary Card (Steps 2, 2b, 3, 4, 4b, failed) */}
            {selectedCourse && selectedBatch && step !== "program" && !isCompletedStep && (
              <div className="mb-6 p-4 rounded-xl bg-[#EBF5F6] border border-[#C5E2E5] flex items-center justify-between shadow-2xs">
                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-[#172E35]">
                    {selectedCourse.title}
                  </h4>
                  <p className="text-xs text-[#526E77] mt-0.5">{selectedBatch.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("program")}
                  className="text-xs sm:text-sm font-semibold text-[#086477] underline hover:text-[#06505F] cursor-pointer"
                >
                  Change
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 1: PROGRAM & BATCH SELECTION                        */}
            {/* ======================================================== */}
            {step === "program" && (
              <div className="space-y-6">
                {/* Program Select Field */}
                <div>
                  <label
                    htmlFor="program-select"
                    className="block text-sm font-semibold text-[#172E35] mb-2"
                  >
                    Program
                  </label>
                  <div className="relative">
                    <select
                      id="program-select"
                      value={state.courseId}
                      onChange={(e) => handleProgramChange(e.target.value)}
                      className="w-full appearance-none px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm text-[#172E35] focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs cursor-pointer pr-10"
                    >
                      <option value="">Select a program</option>
                      {publishedCourses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="w-4 h-4 text-[#526E77] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                  {errors.courseId && (
                    <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.courseId}</p>
                  )}
                </div>

                {/* Batch Select Field */}
                <div>
                  <label
                    htmlFor="batch-select"
                    className="block text-sm font-semibold text-[#172E35] mb-2"
                  >
                    Batch
                  </label>
                  <div className="relative">
                    <select
                      id="batch-select"
                      disabled={!state.courseId || availableBatches.length === 0}
                      value={state.batchId}
                      onChange={(e) => {
                        setErrors({});
                        setState((prev) => ({ ...prev, batchId: e.target.value }));
                      }}
                      className={`w-full appearance-none px-4 py-3 rounded-xl border text-sm focus:outline-none shadow-2xs pr-10 transition-colors ${
                        !state.courseId || availableBatches.length === 0
                          ? "bg-[#F0F5F6] border-[#D5E2E5] text-[#8AA4AB] cursor-not-allowed"
                          : "bg-white border-[#D5E2E5] text-[#172E35] focus:border-[#086477] focus:ring-1 focus:ring-[#086477] cursor-pointer"
                      }`}
                    >
                      {!state.courseId ? (
                        <option value="">Choose a program first</option>
                      ) : availableBatches.length === 0 ? (
                        <option value="">No batches open</option>
                      ) : (
                        <>
                          <option value="">Select an intake</option>
                          {availableBatches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <ChevronDown
                      className="w-4 h-4 text-[#526E77] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>

                  {/* Batch Details (when open batch is selected) */}
                  {selectedBatch && (
                    <p className="mt-2 text-xs font-medium text-[#526E77]">
                      Starts {formatStartDate(selectedBatch.startDate)} | {formattedFee}
                    </p>
                  )}

                  {/* No Open Batches Info Box */}
                  {state.courseId && availableBatches.length === 0 && (
                    <div className="mt-4 p-4 rounded-xl bg-[#EBF5F6] border border-[#C5E2E5] shadow-2xs">
                      <h4 className="font-semibold text-xs sm:text-sm text-[#086477]">
                        No open batches
                      </h4>
                      <p className="text-xs text-[#526E77] mt-1">
                        Choose another program to view its available batches.
                      </p>
                      <div className="mt-3">
                        <Link
                          href="/#courses"
                          className="text-xs font-semibold text-[#086477] underline hover:text-[#06505F]"
                        >
                          Explore programs
                        </Link>
                      </div>
                    </div>
                  )}

                  {errors.batchId && (
                    <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.batchId}</p>
                  )}
                </div>

                {/* Continue Action */}
                {(!state.courseId || availableBatches.length > 0) && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleContinueFromProgram}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white font-semibold text-sm transition-all duration-200 cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-[#086477]"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 2: APPLICANT DETAILS                                */}
            {/* ======================================================== */}
            {step === "details" && (
              <div className="space-y-5">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-semibold text-[#172E35] mb-1.5"
                  >
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={state.fullName}
                    onChange={(e) => {
                      setErrors((prev) => ({ ...prev, fullName: "" }));
                      setState((prev) => ({ ...prev, fullName: e.target.value }));
                    }}
                    placeholder="Samira Rahman"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm text-[#172E35] placeholder:text-[#8AA4AB] focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs"
                  />
                  {errors.fullName && (
                    <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.fullName}</p>
                  )}
                </div>

                {/* Email & WhatsApp Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-semibold text-[#172E35] mb-1.5"
                    >
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={state.email}
                      onChange={(e) => {
                        setErrors((prev) => ({ ...prev, email: "" }));
                        setState((prev) => ({ ...prev, email: e.target.value }));
                      }}
                      placeholder="samira@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm text-[#172E35] placeholder:text-[#8AA4AB] focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs"
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="whatsapp"
                      className="block text-sm font-semibold text-[#172E35] mb-1.5"
                    >
                      WhatsApp number
                    </label>
                    <input
                      id="whatsapp"
                      type="tel"
                      value={state.whatsapp}
                      onChange={(e) => {
                        setErrors((prev) => ({ ...prev, whatsapp: "" }));
                        setState((prev) => ({ ...prev, whatsapp: e.target.value }));
                      }}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm text-[#172E35] placeholder:text-[#8AA4AB] focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs"
                    />
                    {errors.whatsapp && (
                      <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.whatsapp}</p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#526E77] pt-1">
                  We&apos;ll use these details to contact you about your application.
                </p>

                {/* Action Row */}
                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep("program")}
                    className="text-sm font-semibold text-[#086477] hover:underline cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueFromDetails}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white font-semibold text-sm transition-all duration-200 cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-[#086477]"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 2b: PROGRAM-SPECIFIC QUESTIONS                      */}
            {/* ======================================================== */}
            {step === "questions" && (
              <div className="space-y-5">
                {programQuestions.map((q) => {
                  if (q.type === "select") {
                    return (
                      <div key={q.id}>
                        <label
                          htmlFor={q.id}
                          className="block text-sm font-semibold text-[#172E35] mb-1.5"
                        >
                          {q.label}
                        </label>
                        <div className="relative">
                          <select
                            id={q.id}
                            value={state.answers[q.id] || ""}
                            onChange={(e) => {
                              setErrors((prev) => ({ ...prev, [q.id]: "" }));
                              setState((prev) => ({
                                ...prev,
                                answers: { ...prev.answers, [q.id]: e.target.value },
                              }));
                            }}
                            className="w-full appearance-none px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm text-[#172E35] focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs cursor-pointer pr-10"
                          >
                            <option value="">{q.placeholder || "Select an option"}</option>
                            {q.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="w-4 h-4 text-[#526E77] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                            aria-hidden="true"
                          />
                        </div>
                        {errors[q.id] && (
                          <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors[q.id]}</p>
                        )}
                      </div>
                    );
                  }

                  if (q.type === "textarea") {
                    return (
                      <div key={q.id}>
                        <label
                          htmlFor={q.id}
                          className="block text-sm font-semibold text-[#172E35] mb-1.5"
                        >
                          {q.label}
                        </label>
                        <textarea
                          id={q.id}
                          rows={3}
                          value={state.answers[q.id] || ""}
                          onChange={(e) => {
                            setErrors((prev) => ({ ...prev, [q.id]: "" }));
                            setState((prev) => ({
                              ...prev,
                              answers: { ...prev.answers, [q.id]: e.target.value },
                            }));
                          }}
                          placeholder={q.placeholder || "Share a short answer"}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm text-[#172E35] placeholder:text-[#8AA4AB] focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs resize-none"
                        />
                        {errors[q.id] && (
                          <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors[q.id]}</p>
                        )}
                      </div>
                    );
                  }

                  // Standard text field
                  return (
                    <div key={q.id}>
                      <label
                        htmlFor={q.id}
                        className="block text-sm font-semibold text-[#172E35] mb-1.5"
                      >
                        {q.label}
                      </label>
                      <input
                        id={q.id}
                        type="text"
                        value={state.answers[q.id] || ""}
                        onChange={(e) => {
                          setErrors((prev) => ({ ...prev, [q.id]: "" }));
                          setState((prev) => ({
                            ...prev,
                            answers: { ...prev.answers, [q.id]: e.target.value },
                          }));
                        }}
                        placeholder={q.placeholder || ""}
                        className="w-full px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm text-[#172E35] placeholder:text-[#8AA4AB] focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs"
                      />
                      {errors[q.id] && (
                        <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors[q.id]}</p>
                      )}
                    </div>
                  );
                })}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep("details")}
                    className="text-sm font-semibold text-[#086477] hover:underline cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueFromQuestions}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white font-semibold text-sm transition-all duration-200 cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-[#086477]"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 3: REVIEW APPLICATION                               */}
            {/* ======================================================== */}
            {step === "review" && (
              <div className="space-y-6">
                {/* Applicant Details Table */}
                <div className="border border-[#E5ECEE] bg-white rounded-xl p-5 shadow-2xs">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5ECEE]">
                    <h3 className="font-serif font-bold text-lg text-[#172E35]">
                      Applicant details
                    </h3>
                    <button
                      type="button"
                      onClick={() => setStep("details")}
                      className="text-xs sm:text-sm font-semibold text-[#086477] underline hover:text-[#06505F] cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>

                  <dl className="divide-y divide-[#E5ECEE] text-xs sm:text-sm">
                    <div className="py-2.5 flex items-center justify-between">
                      <dt className="text-[#526E77]">Name</dt>
                      <dd className="font-semibold text-[#172E35]">{state.fullName}</dd>
                    </div>
                    <div className="py-2.5 flex items-center justify-between">
                      <dt className="text-[#526E77]">Email</dt>
                      <dd className="font-semibold text-[#172E35]">{state.email}</dd>
                    </div>
                    <div className="py-2.5 flex items-center justify-between">
                      <dt className="text-[#526E77]">WhatsApp</dt>
                      <dd className="font-semibold text-[#172E35]">{state.whatsapp}</dd>
                    </div>

                    {/* Program Questions Summary */}
                    {programQuestions.length > 0 && (
                      <div className="py-2.5 flex items-center justify-between">
                        <dt className="text-[#526E77]">Program questions</dt>
                        <dd>
                          <button
                            type="button"
                            onClick={() => setShowAnswersExpanded(!showAnswersExpanded)}
                            className="font-semibold text-[#086477] underline hover:text-[#06505F] cursor-pointer"
                          >
                            {showAnswersExpanded ? "Hide answers" : "View answers"}
                          </button>
                        </dd>
                      </div>
                    )}
                  </dl>

                  {/* Expandable answers */}
                  {showAnswersExpanded && programQuestions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#E5ECEE] bg-[#F6FAFA] p-3 rounded-lg space-y-2 text-xs">
                      {programQuestions.map((q) => (
                        <div key={q.id}>
                          <span className="font-medium text-[#526E77]">{q.label}:</span>{" "}
                          <span className="font-semibold text-[#172E35]">
                            {state.answers[q.id] || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Amount Due Bar */}
                <div className="flex items-center justify-between py-2 border-t border-b border-[#E5ECEE]">
                  <span className="text-sm font-semibold text-[#172E35]">Amount due</span>
                  <span className="font-bold text-lg text-[#172E35]">{formattedFee}</span>
                </div>

                <p className="text-xs text-[#526E77]">
                  By continuing, you agree to the enrollment terms.
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (programQuestions.length > 0) {
                        setStep("questions");
                      } else {
                        setStep("details");
                      }
                    }}
                    className="text-sm font-semibold text-[#086477] hover:underline cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueFromReview}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white font-semibold text-sm transition-all duration-200 cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-[#086477]"
                  >
                    <span>{isFree ? "Confirm registration" : "Continue to payment"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 4: CHOOSE HOW TO PAY (Paid Programs)                 */}
            {/* ======================================================== */}
            {step === "payment_method" && (
              <div className="space-y-6">
                <div className="space-y-3">
                  {/* bKash Payment Method Option */}
                  {config.payment.bkash.enabled && (
                    <label
                      htmlFor="method-bkash"
                      className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                        state.paymentMethod === "bkash"
                          ? "bg-[#EBF5F6] border-[#086477] shadow-xs"
                          : "bg-white border-[#D5E2E5] hover:border-[#BCE1E5]"
                      }`}
                    >
                      <input
                        id="method-bkash"
                        type="radio"
                        name="paymentMethod"
                        value="bkash"
                        checked={state.paymentMethod === "bkash"}
                        onChange={() => setState((prev) => ({ ...prev, paymentMethod: "bkash" }))}
                        className="mt-1 h-4 w-4 text-[#086477] focus:ring-[#086477] cursor-pointer"
                      />
                      <div>
                        <div className="font-bold text-sm sm:text-base text-[#172E35]">bKash</div>
                        <div className="text-xs text-[#526E77] mt-0.5">
                          Continue to bKash checkout.
                        </div>
                      </div>
                    </label>
                  )}

                  {/* Bank Transfer Option */}
                  {config.payment.bankTransfer.enabled && (
                    <label
                      htmlFor="method-bank"
                      className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                        state.paymentMethod === "bank_transfer"
                          ? "bg-[#EBF5F6] border-[#086477] shadow-xs"
                          : "bg-white border-[#D5E2E5] hover:border-[#BCE1E5]"
                      }`}
                    >
                      <input
                        id="method-bank"
                        type="radio"
                        name="paymentMethod"
                        value="bank_transfer"
                        checked={state.paymentMethod === "bank_transfer"}
                        onChange={() =>
                          setState((prev) => ({ ...prev, paymentMethod: "bank_transfer" }))
                        }
                        className="mt-1 h-4 w-4 text-[#086477] focus:ring-[#086477] cursor-pointer"
                      />
                      <div>
                        <div className="font-bold text-sm sm:text-base text-[#172E35]">
                          Bank transfer
                        </div>
                        <div className="text-xs text-[#526E77] mt-0.5">
                          Submit your transfer reference for verification.
                        </div>
                      </div>
                    </label>
                  )}
                </div>

                {/* Total Due */}
                <div className="flex items-center justify-between py-3 border-t border-b border-[#E5ECEE]">
                  <span className="text-sm font-semibold text-[#172E35]">Total due</span>
                  <span className="font-bold text-lg text-[#172E35]">{formattedFee}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep("review")}
                    className="text-sm font-semibold text-[#086477] hover:underline cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueFromPaymentMethod}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white font-semibold text-sm transition-all duration-200 cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-[#086477]"
                  >
                    <span>
                      {state.paymentMethod === "bkash"
                        ? "Continue to bKash"
                        : "Continue to bank details"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 4b: BANK TRANSFER DETAILS & REFERENCE                */}
            {/* ======================================================== */}
            {step === "bank_transfer" && (
              <div className="space-y-6">
                {/* Configured Bank Details Card */}
                <div className="border border-[#C5E2E5] bg-[#EBF5F6] rounded-xl p-5 shadow-2xs">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-[#086477] block mb-3">
                    BANK TRANSFER DETAILS
                  </span>
                  <dl className="space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-[#526E77]">Bank</dt>
                      <dd className="font-semibold text-[#172E35]">
                        {config.payment.bankTransfer.bankDetails.bankName}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-[#526E77]">Account name</dt>
                      <dd className="font-semibold text-[#172E35]">
                        {config.payment.bankTransfer.bankDetails.accountName}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-[#526E77]">Account number</dt>
                      <dd className="font-semibold font-mono text-[#172E35]">
                        {config.payment.bankTransfer.bankDetails.accountNumber}
                      </dd>
                    </div>
                    {config.payment.bankTransfer.bankDetails.branch && (
                      <div className="flex items-center justify-between">
                        <dt className="text-[#526E77]">Branch</dt>
                        <dd className="font-semibold text-[#172E35]">
                          {config.payment.bankTransfer.bankDetails.branch}
                        </dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-[#C5E2E5]">
                      <dt className="text-[#526E77]">Amount</dt>
                      <dd className="font-bold text-[#086477] text-base">{formattedFee}</dd>
                    </div>
                  </dl>
                </div>

                {/* Transfer Reference Input */}
                <div>
                  <label
                    htmlFor="transferReference"
                    className="block text-sm font-semibold text-[#172E35] mb-1.5"
                  >
                    Transfer reference
                  </label>
                  <input
                    id="transferReference"
                    type="text"
                    value={state.transferReference}
                    onChange={(e) => {
                      setErrors({});
                      setState((prev) => ({ ...prev, transferReference: e.target.value }));
                    }}
                    placeholder="Enter the reference from your bank"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm text-[#172E35] placeholder:text-[#8AA4AB] focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs"
                  />
                  {errors.transferReference && (
                    <p className="mt-1.5 text-xs text-rose-600 font-medium">
                      {errors.transferReference}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep("payment_method")}
                    className="text-sm font-semibold text-[#086477] hover:underline cursor-pointer"
                  >
                    Change method
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitBankReference}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white font-semibold text-sm transition-all duration-200 cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-[#086477]"
                  >
                    <span>Submit reference</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* OUTCOME: PENDING VERIFICATION (Bank Transfer)             */}
            {/* ======================================================== */}
            {step === "pending_verification" && (
              <div className="space-y-6">
                {/* Pending Verification Badge */}
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" aria-hidden="true" />
                    Pending verification
                  </span>
                </div>

                {/* Application Card */}
                <div className="border border-[#E5ECEE] bg-white rounded-xl p-5 shadow-2xs">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-[#086477] block mb-3">
                    YOUR APPLICATION
                  </span>
                  <dl className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-[#526E77]">Program</dt>
                      <dd className="font-semibold text-[#172E35]">{selectedCourse?.title}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-[#526E77]">Batch</dt>
                      <dd className="font-semibold text-[#172E35]">{selectedBatch?.name}</dd>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#E5ECEE]">
                      <dt className="text-[#526E77]">Reference</dt>
                      <dd className="font-bold font-mono text-[#086477]">
                        {state.applicationReference}
                      </dd>
                    </div>
                  </dl>
                </div>

                <p className="text-xs sm:text-sm text-[#526E77]">
                  You&apos;ll receive an update when the transfer has been reviewed.
                </p>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-2">
                  <Link
                    href="/#courses"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white font-semibold text-sm transition-all duration-200 cursor-pointer shadow-xs"
                  >
                    <span>Back to programs</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <a
                    href="mailto:admissions@lnabd.org"
                    className="text-xs sm:text-sm font-semibold text-[#086477] hover:underline"
                  >
                    Contact admissions
                  </a>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* OUTCOME: PAYMENT FAILED (Retry / Change Method)          */}
            {/* ======================================================== */}
            {step === "payment_failed" && (
              <div className="space-y-6">
                {/* Alert Box */}
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 shadow-2xs">
                  <h4 className="font-semibold text-sm text-rose-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Payment failed
                  </h4>
                  <p className="text-xs text-rose-700 mt-1">
                    Try bKash again or choose another available payment method.
                  </p>
                </div>

                {/* Summary */}
                <dl className="space-y-2 text-xs sm:text-sm border-t border-b border-[#E5ECEE] py-3">
                  <div className="flex items-center justify-between">
                    <dt className="text-[#526E77]">Amount due</dt>
                    <dd className="font-bold text-[#172E35]">{formattedFee}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#526E77]">Application</dt>
                    <dd className="font-mono font-semibold text-[#526E77]">
                      {state.applicationReference}
                    </dd>
                  </div>
                </dl>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBkashModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white font-semibold text-sm transition-all duration-200 cursor-pointer shadow-xs"
                  >
                    <span>Try bKash again</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("payment_method")}
                    className="text-xs sm:text-sm font-semibold text-[#086477] hover:underline cursor-pointer"
                  >
                    Change method
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* OUTCOME: CONFIRMED (Paid or Free Registration)            */}
            {/* ======================================================== */}
            {step === "confirmed" && (
              <div className="space-y-6">
                {/* Confirmed Badge */}
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" aria-hidden="true" />
                    Confirmed
                  </span>
                </div>

                {/* Enrollment Details Card */}
                <div className="border border-[#E5ECEE] bg-white rounded-xl p-5 shadow-2xs">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-[#086477] block mb-3">
                    YOUR ENROLLMENT
                  </span>
                  <dl className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-[#526E77]">Program</dt>
                      <dd className="font-semibold text-[#172E35]">{selectedCourse?.title}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-[#526E77]">Batch</dt>
                      <dd className="font-semibold text-[#172E35]">{selectedBatch?.name}</dd>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#E5ECEE]">
                      <dt className="text-[#526E77]">Reference</dt>
                      <dd className="font-bold font-mono text-[#086477]">
                        {state.applicationReference}
                      </dd>
                    </div>
                  </dl>
                </div>

                <p className="text-xs sm:text-sm text-[#526E77]">
                  Check your email for the program details and what to do next.
                </p>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-2">
                  <Link
                    href="/#courses"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white font-semibold text-sm transition-all duration-200 cursor-pointer shadow-xs"
                  >
                    <span>Back to programs</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <a
                    href="mailto:admissions@lnabd.org"
                    className="text-xs sm:text-sm font-semibold text-[#086477] hover:underline"
                  >
                    Contact admissions
                  </a>
                </div>

                {/* Mobile Bottom Photo Crop on Confirmed Screen */}
                <div className="lg:hidden pt-4">
                  <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-xs bg-[#EBF3F5]">
                    <Image
                      src="/images/enrollment/lna-enrollment-confirmation-640.webp"
                      alt="Confirmed cohort members at Lead Nation Academy"
                      fill
                      sizes="(max-width: 1024px) 100vw, 640px"
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================== */}
          {/* RIGHT COLUMN: Editorial Photo Panel (Desktop)             */}
          {/* ========================================================== */}
          <div className="hidden lg:block lg:col-span-6 xl:col-span-6 sticky top-28">
            <div className="relative w-full h-[580px] xl:h-[620px] rounded-2xl overflow-hidden shadow-md bg-[#0F2930]">
              {/* Photo Asset (switches to confirmation photo on confirmed) */}
              <Image
                src={
                  isConfirmationPhoto
                    ? "/images/enrollment/lna-enrollment-confirmation-1120.webp"
                    : "/images/enrollment/lna-enrollment-workshop-1120.webp"
                }
                alt={
                  isConfirmationPhoto
                    ? "Confirmed cohort members discussing session takeaways"
                    : "Interactive workshop participants engaged in discussion"
                }
                fill
                priority
                sizes="(max-width: 1024px) 50vw, 680px"
                className="object-cover"
              />

              {/* Dark Gradient Overlay at Bottom */}
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none"
                aria-hidden="true"
              />

              {/* Bottom Caption Container */}
              <div className="absolute inset-x-0 bottom-0 p-8 text-white z-10">
                <div className="w-full h-px bg-white/25 mb-3" aria-hidden="true" />
                <span className="text-xs uppercase font-bold tracking-wider text-white/80 block mb-1">
                  LEAD NATION ACADEMY
                </span>
                <p className="text-sm sm:text-base font-medium text-white/95 leading-snug">
                  {isConfirmationPhoto
                    ? "See you in the next session."
                    : "Learn alongside people who share your goals."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SIMULATED BKASH CHECKOUT MODAL                               */}
      {/* ============================================================ */}
      {showBkashModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bkash-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200"
        >
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-[#D5E2E5] animate-in zoom-in-95 duration-200">
            {/* bKash Header Bar */}
            <div className="bg-[#E2136E] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="font-bold tracking-tight text-lg">bKash Payment Gateway</div>
              </div>
              <button
                type="button"
                onClick={() => setShowBkashModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
                aria-label="Close payment dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Merchant Details */}
            <div className="p-6 space-y-4">
              <div className="bg-[#FDF2F7] border border-[#FBCFE8] p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs text-[#526E77]">
                  <span>Merchant</span>
                  <span className="font-semibold text-[#172E35]">Lead Nation Academy Ltd.</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#526E77]">
                  <span>Invoice / Ref</span>
                  <span className="font-mono font-semibold text-[#172E35]">
                    {state.applicationReference}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#FBCFE8] text-sm">
                  <span className="font-semibold text-[#172E35]">Amount</span>
                  <span className="font-bold text-[#E2136E] text-base">{formattedFee}</span>
                </div>
              </div>

              <div className="text-xs text-[#526E77] text-center leading-relaxed">
                Development simulation mode (Rule R8 / ADR 0009). Choose an outcome to verify the
                payment verification and failure retry flow.
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleBkashSimulateSuccess}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Simulate Payment Success (Verify)</span>
                </button>

                <button
                  type="button"
                  onClick={handleBkashSimulateFailure}
                  className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span>Simulate Payment Failure (Retry Flow)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBkashModal(false)}
                  className="w-full py-2.5 text-xs font-semibold text-[#526E77] hover:text-[#172E35] cursor-pointer"
                >
                  Cancel and return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
