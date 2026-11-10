"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, ChevronDown, Copy, AlertCircle, Search, ZoomIn } from "lucide-react";
import type { Course, Batch } from "@/lib/content";
import { formatPoishaToBDT } from "@/lib/money";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  EnrollmentConfig,
  EnrollmentStep,
  EnrollmentState,
  PaymentMethod,
} from "@/lib/enrollment/types";
import {
  formatPaymentMethodLabel,
  isValidBdPhone,
  type ApplicationStatusValue,
} from "@/lib/enrollment/status";

export interface EnrollmentSubmissionPayload {
  courseId: string;
  batchId: string;
  fullName: string;
  email: string;
  whatsapp: string;
  answers: Record<string, string>;
  paymentMethod: PaymentMethod | "free";
  transactionReference?: string;
}

export interface EnrollmentSubmissionResponse {
  applicationReference: string;
  status: ApplicationStatusValue;
}

export interface EnrollmentViewProps {
  courses: Course[];
  batches: Batch[];
  config: EnrollmentConfig;
  onSubmitApplication?: (
    payload: EnrollmentSubmissionPayload
  ) => EnrollmentSubmissionResponse | Promise<EnrollmentSubmissionResponse>;
}

export function EnrollmentView({
  courses,
  batches,
  config,
  onSubmitApplication,
}: EnrollmentViewProps) {
  const searchParams = useSearchParams();

  const initialCourseId = searchParams.get("course") || searchParams.get("program") || "";
  const initialBatchId = searchParams.get("batch") || "";
  const defaultPaymentMethod: PaymentMethod = config.payment.bkash.enabled
    ? "bkash"
    : "bank_transfer";

  const canSubmitOnline = Boolean(config.payment.submissionEnabled && onSubmitApplication);

  const publishedCourses = useMemo(
    () => courses.filter((c) => c.status === "published"),
    [courses]
  );

  const [state, setState] = useState<EnrollmentState>({
    courseId: initialCourseId,
    batchId: initialBatchId,
    fullName: "",
    email: "",
    whatsapp: "",
    answers: {},
    paymentMethod: defaultPaymentMethod,
    bkashTransactionId: "",
    bankTransactionReference: "",
    applicationReference: "",
    isFree: false,
  });

  const [step, setStep] = useState<EnrollmentStep>("program");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showAnswersExpanded, setShowAnswersExpanded] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

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

  const selectedBatch = useMemo(() => {
    return availableBatches.find((b) => b.id === state.batchId) || null;
  }, [availableBatches, state.batchId]);

  useEffect(() => {
    if (initialCourseId && availableBatches.length > 0 && !state.batchId) {
      if (initialBatchId && availableBatches.some((b) => b.id === initialBatchId)) {
        setState((prev) => ({ ...prev, batchId: initialBatchId }));
      } else if (availableBatches.length === 1) {
        setState((prev) => ({ ...prev, batchId: availableBatches[0].id }));
      }
    }
  }, [initialCourseId, initialBatchId, availableBatches, state.batchId]);

  // Rule R5: All price math uses integer poisha; zero float arithmetic.
  const feeDetails = useMemo(() => {
    if (!selectedBatch) {
      return {
        basePoisha: 0,
        payablePoisha: 0,
        hasDiscount: false,
        isFree: false,
        formattedBase: "BDT 0",
        formattedPayable: "BDT 0",
      };
    }

    const basePoisha = selectedBatch.feePoisha;
    const payablePoisha = selectedBatch.discountFeePoisha ?? selectedBatch.feePoisha;
    const hasDiscount =
      selectedBatch.discountFeePoisha !== undefined &&
      selectedBatch.discountFeePoisha < selectedBatch.feePoisha;
    const isFreeBatch = payablePoisha === 0;

    const formatBdt = (poisha: number) =>
      poisha === 0 ? "Free" : formatPoishaToBDT(poisha).replace("৳", "BDT ");

    return {
      basePoisha,
      payablePoisha,
      hasDiscount,
      isFree: isFreeBatch,
      formattedBase: formatBdt(basePoisha),
      formattedPayable: formatBdt(payablePoisha),
    };
  }, [selectedBatch]);

  const isFree = feeDetails.isFree;

  const programQuestions = useMemo(() => {
    if (!state.courseId) return [];
    return config.programQuestions[state.courseId] || [];
  }, [config.programQuestions, state.courseId]);

  const handleProgramChange = (newCourseId: string) => {
    setErrors({});
    setSubmitError("");
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
      newErrors.whatsapp = "Please enter your phone / WhatsApp number.";
    } else if (!isValidBdPhone(state.whatsapp)) {
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

  const handleContinueFromQuestions = () => {
    const newErrors: Record<string, string> = {};
    programQuestions.forEach((q) => {
      if (q.required && (!state.answers[q.id] || !state.answers[q.id].trim())) {
        newErrors[q.id] = "Please answer this question.";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setStep("review");
  };

  const handleContinueFromReview = async () => {
    setErrors({});
    setSubmitError("");

    if (!isFree) {
      setStep("payment");
      return;
    }

    if (!canSubmitOnline || !onSubmitApplication || !selectedCourse || !selectedBatch) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await onSubmitApplication({
        courseId: selectedCourse.id,
        batchId: selectedBatch.id,
        fullName: state.fullName.trim(),
        email: state.email.trim(),
        whatsapp: state.whatsapp.trim(),
        answers: state.answers,
        paymentMethod: "free",
      });
      setCopiedRef(false);
      setState((prev) => ({
        ...prev,
        applicationReference: response.applicationReference,
        isFree: true,
      }));
      setStep(response.status === "Enrollment confirmed" ? "confirmed" : "pending_verification");
    } catch {
      setSubmitError("Unable to submit your application right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    setErrors({});
    setSubmitError("");
    if (method !== "bkash") {
      setIsQrModalOpen(false);
    }
    setState((prev) => ({ ...prev, paymentMethod: method }));
  };

  const handleSubmitPaymentApplication = async () => {
    if (!canSubmitOnline || !onSubmitApplication || !selectedCourse || !selectedBatch) {
      return;
    }

    const newErrors: Record<string, string> = {};
    const submittedRef =
      state.paymentMethod === "bkash"
        ? state.bkashTransactionId.trim()
        : state.bankTransactionReference.trim();

    if (state.paymentMethod === "bkash") {
      if (!submittedRef) {
        newErrors.bkashTransactionId = "Please enter your bKash Transaction ID.";
      } else if (submittedRef.length < 4) {
        newErrors.bkashTransactionId =
          "Please enter a valid bKash Transaction ID (at least 4 characters).";
      }
    } else {
      if (!submittedRef) {
        newErrors.bankTransactionReference = "Please enter your bank transaction reference.";
      } else if (submittedRef.length < 4) {
        newErrors.bankTransactionReference =
          "Please enter a valid bank transaction reference (at least 4 characters).";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSubmitError("");
    setIsSubmitting(true);
    try {
      const response = await onSubmitApplication({
        courseId: selectedCourse.id,
        batchId: selectedBatch.id,
        fullName: state.fullName.trim(),
        email: state.email.trim(),
        whatsapp: state.whatsapp.trim(),
        answers: state.answers,
        paymentMethod: state.paymentMethod,
        transactionReference: submittedRef,
      });

      setIsQrModalOpen(false);
      setCopiedRef(false);
      setState((prev) => ({
        ...prev,
        applicationReference: response.applicationReference,
        isFree: false,
      }));
      setStep(response.status === "Enrollment confirmed" ? "confirmed" : "pending_verification");
    } catch {
      setSubmitError("Unable to submit your application right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyApplicationId = async () => {
    if (!state.applicationReference) {
      return;
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(state.applicationReference);
        setCopiedRef(true);
      } else {
        setCopiedRef(true);
      }
    } catch {
      setCopiedRef(true);
    }

    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopiedRef(false);
    }, 2500);
  };

  const isPaymentStep = step === "payment";
  const isCompletedStep = step === "confirmed" || step === "pending_verification";
  const isConfirmationPhoto = isCompletedStep;
  const showDesktopBkashRightPanel =
    isPaymentStep && state.paymentMethod === "bkash" && config.payment.bkash.enabled;

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

  const statusHref = state.applicationReference
    ? `/status?ref=${encodeURIComponent(state.applicationReference)}`
    : "/status";

  const bankDetails = config.payment.bankTransfer.bankDetails;

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
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-start min-w-0">
            <span className="text-xs font-bold uppercase tracking-widest text-[#086477] mb-2">
              PROGRAM ENROLLMENT
            </span>

            {/* Dynamic Headline & Subtitle */}
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

              {step === "payment" && (
                <>
                  <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-serif font-bold text-[#172E35] leading-tight tracking-tight mb-2">
                    Complete your payment.
                  </h1>
                  <p className="text-sm sm:text-base text-[#526E77]">
                    Review the payable amount and payment details for bKash or Bank Transfer.
                  </p>
                </>
              )}

              {step === "pending_verification" && (
                <>
                  <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-serif font-bold text-[#172E35] leading-tight tracking-tight mb-2">
                    Application in process.
                  </h1>
                  <p className="text-sm sm:text-base text-[#526E77]">
                    We received your payment details. Save your separate LNA Application ID below to
                    track your verification progress.
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

            {/* Online enrollment coming soon notice when submission is disabled */}
            {!canSubmitOnline && !isCompletedStep && (
              <div
                role="status"
                data-testid="online-enrollment-coming-soon"
                className="mb-6 p-4 rounded-xl bg-[#FEF3C7]/70 border border-[#FDE68A] text-xs sm:text-sm text-[#78350F] flex items-start gap-2.5"
              >
                <AlertCircle
                  className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <div className="font-bold text-[#92400E]">Online enrollment is coming soon</div>
                  <p className="text-xs text-[#78350F] mt-0.5 leading-relaxed">
                    Online payment instructions and application submission are disabled until
                    backend verification opens.
                  </p>
                </div>
              </div>
            )}

            {/* Returning Applicant Link (Entry Screen) */}
            {step === "program" && (
              <div className="mb-6 p-3.5 sm:p-4 rounded-xl bg-[#EBF5F6] border border-[#C5E2E5] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#172E35]">
                  <Search className="w-4 h-4 text-[#086477] shrink-0" aria-hidden="true" />
                  <span>Already submitted an application?</span>
                </div>
                <Link
                  href="/status"
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold text-[#086477] hover:bg-white/70 underline underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
                >
                  <span>Check application status</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            )}

            {/* Progress Step Indicator (Form stages) */}
            {!isCompletedStep && (
              <div className="mb-8">
                {isPaymentStep ? (
                  <div className="grid grid-cols-4 gap-2 sm:gap-3">
                    <div>
                      <div className="h-1 rounded-full bg-[#086477] mb-2" />
                      <span className="text-[11px] sm:text-xs text-[#526E77]">01 Program</span>
                    </div>
                    <div>
                      <div className="h-1 rounded-full bg-[#086477] mb-2" />
                      <span className="text-[11px] sm:text-xs text-[#526E77]">02 Details</span>
                    </div>
                    <div>
                      <div className="h-1 rounded-full bg-[#086477] mb-2" />
                      <span className="text-[11px] sm:text-xs text-[#526E77]">03 Review</span>
                    </div>
                    <div>
                      <div className="h-1 rounded-full bg-[#086477] mb-2" />
                      <span className="text-[11px] sm:text-xs font-bold text-[#172E35]">
                        04 Payment
                      </span>
                    </div>
                  </div>
                ) : (
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

                {step === "questions" && (
                  <div className="mt-3 text-[11px] font-bold tracking-wider uppercase text-[#086477]">
                    DETAILS / PROGRAM QUESTIONS
                  </div>
                )}
              </div>
            )}

            {/* Selected Program Summary Card */}
            {selectedCourse && selectedBatch && step !== "program" && !isCompletedStep && (
              <div className="mb-6 p-4 rounded-xl bg-[#EBF5F6] border border-[#C5E2E5] flex items-center justify-between gap-3 shadow-2xs">
                <div className="min-w-0">
                  <h2 className="font-semibold text-sm sm:text-base text-[#172E35] truncate">
                    {selectedCourse.title}
                  </h2>
                  <p className="text-xs text-[#526E77] mt-0.5">{selectedBatch.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setErrors({});
                    setSubmitError("");
                    setIsQrModalOpen(false);
                    setStep("program");
                  }}
                  className="shrink-0 min-h-[44px] px-2 text-xs sm:text-sm font-semibold text-[#086477] underline hover:text-[#06505F] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#086477]"
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
                      aria-invalid={Boolean(errors.courseId)}
                      aria-describedby={errors.courseId ? "program-select-error" : undefined}
                      className="w-full min-h-[44px] appearance-none px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm text-[#172E35] focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs cursor-pointer pr-10"
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
                    <p
                      id="program-select-error"
                      role="alert"
                      className="mt-1.5 text-xs text-rose-700 font-medium"
                    >
                      {errors.courseId}
                    </p>
                  )}
                </div>

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
                      aria-invalid={Boolean(errors.batchId)}
                      aria-describedby={errors.batchId ? "batch-select-error" : undefined}
                      className={`w-full min-h-[44px] appearance-none px-4 py-3 rounded-xl border text-sm focus:outline-none shadow-2xs pr-10 transition-colors ${
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

                  {selectedBatch && (
                    <p className="mt-2 text-xs font-medium text-[#526E77]">
                      Starts {formatStartDate(selectedBatch.startDate)} |{" "}
                      {feeDetails.hasDiscount && (
                        <span className="line-through mr-1.5 text-[#8AA4AB]">
                          {feeDetails.formattedBase}
                        </span>
                      )}
                      <span className="font-semibold text-[#172E35]">
                        {feeDetails.formattedPayable}
                      </span>
                    </p>
                  )}

                  {state.courseId && availableBatches.length === 0 && (
                    <div className="mt-4 p-4 rounded-xl bg-[#EBF5F6] border border-[#C5E2E5] shadow-2xs">
                      <h3 className="font-semibold text-xs sm:text-sm text-[#086477]">
                        No open batches
                      </h3>
                      <p className="text-xs text-[#526E77] mt-1">
                        Choose another program to view its available batches.
                      </p>
                      <div className="mt-3">
                        <Link
                          href="/#courses"
                          className="inline-flex items-center min-h-[44px] text-xs font-semibold text-[#086477] underline hover:text-[#06505F]"
                        >
                          Explore programs
                        </Link>
                      </div>
                    </div>
                  )}

                  {errors.batchId && (
                    <p
                      id="batch-select-error"
                      role="alert"
                      className="mt-1.5 text-xs text-rose-700 font-medium"
                    >
                      {errors.batchId}
                    </p>
                  )}
                </div>

                {(!state.courseId || availableBatches.length > 0) && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleContinueFromProgram}
                      className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white font-semibold text-sm transition-all duration-200 cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
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
                    placeholder="Enter your full name"
                    aria-invalid={Boolean(errors.fullName)}
                    aria-describedby={errors.fullName ? "fullName-error" : undefined}
                    className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm text-[#172E35] placeholder:text-[#8AA4AB] focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs"
                  />
                  {errors.fullName && (
                    <p
                      id="fullName-error"
                      role="alert"
                      className="mt-1.5 text-xs text-rose-700 font-medium"
                    >
                      {errors.fullName}
                    </p>
                  )}
                </div>

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
                      placeholder="name@example.com"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "email-error" : undefined}
                      className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm text-[#172E35] placeholder:text-[#8AA4AB] focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs"
                    />
                    {errors.email && (
                      <p
                        id="email-error"
                        role="alert"
                        className="mt-1.5 text-xs text-rose-700 font-medium"
                      >
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="whatsapp"
                      className="block text-sm font-semibold text-[#172E35] mb-1.5"
                    >
                      WhatsApp / Phone number
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
                      aria-invalid={Boolean(errors.whatsapp)}
                      aria-describedby={errors.whatsapp ? "whatsapp-error" : undefined}
                      className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm text-[#172E35] placeholder:text-[#8AA4AB] focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs"
                    />
                    {errors.whatsapp && (
                      <p
                        id="whatsapp-error"
                        role="alert"
                        className="mt-1.5 text-xs text-rose-700 font-medium"
                      >
                        {errors.whatsapp}
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#526E77] pt-1">
                  We&apos;ll use your email or phone number to verify your application status later.
                </p>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setErrors({});
                      setStep("program");
                    }}
                    className="min-h-[44px] px-2 text-sm font-semibold text-[#086477] hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-[#086477]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueFromDetails}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white font-semibold text-sm transition-all duration-200 cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
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
                  const errId = `${q.id}-error`;
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
                            aria-invalid={Boolean(errors[q.id])}
                            aria-describedby={errors[q.id] ? errId : undefined}
                            className="w-full min-h-[44px] appearance-none px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm text-[#172E35] focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs cursor-pointer pr-10"
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
                          <p
                            id={errId}
                            role="alert"
                            className="mt-1.5 text-xs text-rose-700 font-medium"
                          >
                            {errors[q.id]}
                          </p>
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
                          aria-invalid={Boolean(errors[q.id])}
                          aria-describedby={errors[q.id] ? errId : undefined}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm text-[#172E35] placeholder:text-[#8AA4AB] focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs resize-none"
                        />
                        {errors[q.id] && (
                          <p
                            id={errId}
                            role="alert"
                            className="mt-1.5 text-xs text-rose-700 font-medium"
                          >
                            {errors[q.id]}
                          </p>
                        )}
                      </div>
                    );
                  }

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
                        aria-invalid={Boolean(errors[q.id])}
                        aria-describedby={errors[q.id] ? errId : undefined}
                        className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm text-[#172E35] placeholder:text-[#8AA4AB] focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs"
                      />
                      {errors[q.id] && (
                        <p
                          id={errId}
                          role="alert"
                          className="mt-1.5 text-xs text-rose-700 font-medium"
                        >
                          {errors[q.id]}
                        </p>
                      )}
                    </div>
                  );
                })}

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setErrors({});
                      setStep("details");
                    }}
                    className="min-h-[44px] px-2 text-sm font-semibold text-[#086477] hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-[#086477]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueFromQuestions}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white font-semibold text-sm transition-all duration-200 cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 3: REVIEW APPLICATION                               */}
            {/* ======================================================== */}
            {step === "review" && (
              <div className="space-y-6">
                <div className="border border-[#E5ECEE] bg-white rounded-xl p-5 shadow-2xs">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5ECEE]">
                    <h3 className="font-serif font-bold text-lg text-[#172E35]">
                      Applicant details
                    </h3>
                    <button
                      type="button"
                      onClick={() => setStep("details")}
                      className="min-h-[44px] px-2 text-xs sm:text-sm font-semibold text-[#086477] underline hover:text-[#06505F] cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>

                  <dl className="divide-y divide-[#E5ECEE] text-xs sm:text-sm">
                    <div className="py-2.5 flex items-center justify-between gap-4">
                      <dt className="text-[#526E77]">Name</dt>
                      <dd className="font-semibold text-[#172E35] text-right">{state.fullName}</dd>
                    </div>
                    <div className="py-2.5 flex items-center justify-between gap-4">
                      <dt className="text-[#526E77]">Email</dt>
                      <dd className="font-semibold text-[#172E35] text-right break-all">
                        {state.email}
                      </dd>
                    </div>
                    <div className="py-2.5 flex items-center justify-between gap-4">
                      <dt className="text-[#526E77]">Phone / WhatsApp</dt>
                      <dd className="font-semibold text-[#172E35] text-right">{state.whatsapp}</dd>
                    </div>

                    {programQuestions.length > 0 && (
                      <div className="py-2.5 flex items-center justify-between gap-4">
                        <dt className="text-[#526E77]">Program questions</dt>
                        <dd>
                          <button
                            type="button"
                            onClick={() => setShowAnswersExpanded(!showAnswersExpanded)}
                            className="min-h-[44px] px-1 font-semibold text-[#086477] underline hover:text-[#06505F] cursor-pointer"
                          >
                            {showAnswersExpanded ? "Hide answers" : "View answers"}
                          </button>
                        </dd>
                      </div>
                    )}
                  </dl>

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
                <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white border border-[#E5ECEE]">
                  <span className="text-sm font-semibold text-[#172E35]">Amount due</span>
                  <div className="text-right">
                    {feeDetails.hasDiscount && (
                      <span className="text-xs line-through text-[#8AA4AB] mr-2">
                        {feeDetails.formattedBase}
                      </span>
                    )}
                    <span className="font-bold text-lg text-[#086477]">
                      {feeDetails.formattedPayable}
                    </span>
                  </div>
                </div>

                {submitError && (
                  <p role="alert" className="text-xs text-rose-700 font-medium">
                    {submitError}
                  </p>
                )}

                <p className="text-xs text-[#526E77]">
                  By continuing, you agree to the enrollment terms.
                </p>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setErrors({});
                      setSubmitError("");
                      if (programQuestions.length > 0) {
                        setStep("questions");
                      } else {
                        setStep("details");
                      }
                    }}
                    className="min-h-[44px] px-2 text-sm font-semibold text-[#086477] hover:underline cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting || (isFree && !canSubmitOnline)}
                    aria-disabled={isSubmitting || (isFree && !canSubmitOnline)}
                    onClick={handleContinueFromReview}
                    className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477] ${
                      isSubmitting || (isFree && !canSubmitOnline)
                        ? "bg-[#9BB7BE] text-white cursor-not-allowed"
                        : "bg-[#086477] hover:bg-[#06505F] text-white cursor-pointer"
                    }`}
                  >
                    <span>
                      {isFree
                        ? canSubmitOnline
                          ? "Confirm registration"
                          : "Online enrollment is coming soon"
                        : "Continue to payment"}
                    </span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 4: PAYMENT METHOD, DETAILS & REFERENCE (Paid)       */}
            {/* ======================================================== */}
            {step === "payment" && (
              <div className="space-y-6">
                {/* Amount Due Card (Always visible regardless of selected payment method) */}
                <div className="p-4 rounded-xl bg-white border border-[#C5E2E5] shadow-2xs flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold tracking-wider uppercase text-[#086477] block">
                      Amount due
                    </span>
                    <span className="text-xs text-[#526E77]">
                      {feeDetails.hasDiscount
                        ? "Discounted cohort fee applied"
                        : "Payable course fee"}
                    </span>
                  </div>
                  <div className="text-right">
                    {feeDetails.hasDiscount && (
                      <span className="text-xs line-through text-[#8AA4AB] block">
                        {feeDetails.formattedBase}
                      </span>
                    )}
                    <span
                      data-testid="payment-amount-due"
                      className="font-bold text-xl text-[#172E35]"
                    >
                      {feeDetails.formattedPayable}
                    </span>
                  </div>
                </div>

                {/* Method Selection */}
                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold text-[#172E35] mb-1">
                    Choose payment method
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {config.payment.bkash.enabled && (
                      <label
                        htmlFor="method-bkash"
                        className={`flex items-start gap-3 p-4 min-h-[44px] rounded-xl border transition-all cursor-pointer ${
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
                          onChange={() => handleSelectPaymentMethod("bkash")}
                          className="mt-1 h-4 w-4 text-[#086477] focus:ring-[#086477] cursor-pointer"
                        />
                        <div>
                          <div className="font-bold text-sm text-[#172E35]">bKash</div>
                          <div className="text-xs text-[#526E77] mt-0.5">
                            Pay using bKash Merchant QR
                          </div>
                        </div>
                      </label>
                    )}

                    {config.payment.bankTransfer.enabled && (
                      <label
                        htmlFor="method-bank"
                        className={`flex items-start gap-3 p-4 min-h-[44px] rounded-xl border transition-all cursor-pointer ${
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
                          onChange={() => handleSelectPaymentMethod("bank_transfer")}
                          className="mt-1 h-4 w-4 text-[#086477] focus:ring-[#086477] cursor-pointer"
                        />
                        <div>
                          <div className="font-bold text-sm text-[#172E35]">Bank Transfer</div>
                          <div className="text-xs text-[#526E77] mt-0.5">
                            Transfer to LNA receiving bank account
                          </div>
                        </div>
                      </label>
                    )}
                  </div>
                </fieldset>

                {/* Active Payment Panel & Reference Input */}
                {state.paymentMethod === "bkash" && config.payment.bkash.enabled && (
                  <div className="border border-[#C5E2E5] bg-[#EBF5F6] rounded-xl p-4 sm:p-5 space-y-5 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-[#086477]">
                        BKASH MERCHANT QR
                      </span>
                      <button
                        type="button"
                        data-testid="bkash-qr-enlarge-button"
                        onClick={() => setIsQrModalOpen(true)}
                        className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-lg bg-white border border-[#C5E2E5] hover:border-[#086477] text-xs font-semibold text-[#086477] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
                      >
                        <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Enlarge QR</span>
                      </button>
                    </div>

                    {/* Mobile / Tablet generous scannable QR trigger (hidden on lg where dedicated right panel is shown) */}
                    <div className="lg:hidden flex flex-col items-center">
                      <button
                        type="button"
                        data-testid="bkash-qr-inline-trigger"
                        onClick={() => setIsQrModalOpen(true)}
                        aria-label="Enlarge bKash Merchant QR code"
                        className="w-full max-w-[270px] sm:max-w-[300px] bg-white p-2 sm:p-2.5 rounded-2xl border border-[#C5E2E5] hover:border-[#086477] shadow-2xs flex flex-col items-center justify-center transition-all cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
                      >
                        <img
                          src={config.payment.bkash.qrImageSrc}
                          alt={config.payment.bkash.qrImageAlt}
                          width={612}
                          height={780}
                          className="w-full h-auto rounded-xl"
                        />
                        <span className="mt-2.5 mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[#086477] group-hover:underline">
                          <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Tap QR to open full size</span>
                        </span>
                      </button>
                    </div>

                    <div className="space-y-3 min-w-0">
                      <dl className="space-y-1.5 text-xs sm:text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <dt className="text-[#526E77]">Merchant</dt>
                          <dd className="font-semibold text-[#172E35]">
                            {config.payment.bkash.merchantName}
                          </dd>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <dt className="text-[#526E77]">Merchant number</dt>
                          <dd className="font-semibold font-mono text-[#172E35]">
                            {config.payment.bkash.merchantNumber}
                          </dd>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#C5E2E5]">
                          <dt className="text-[#526E77]">Amount due</dt>
                          <dd className="font-bold text-[#086477]">
                            {feeDetails.formattedPayable}
                          </dd>
                        </div>
                      </dl>
                      {canSubmitOnline ? (
                        <p className="text-xs text-[#526E77] leading-relaxed">
                          {config.payment.bkash.instruction}
                        </p>
                      ) : (
                        <p className="text-xs text-[#92400E] font-medium leading-relaxed">
                          Online enrollment is coming soon. Payment instructions and submission will
                          activate once backend verification is live.
                        </p>
                      )}
                      <p className="hidden lg:block text-xs text-[#526E77]">
                        Scan the large QR displayed on the right panel, or click{" "}
                        <button
                          type="button"
                          onClick={() => setIsQrModalOpen(true)}
                          className="font-semibold text-[#086477] underline hover:text-[#06505F] cursor-pointer"
                        >
                          Enlarge QR
                        </button>{" "}
                        to open it in a popup.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="bkashTransactionId"
                        className="block text-sm font-semibold text-[#172E35] mb-1.5"
                      >
                        bKash Transaction ID{" "}
                        <span className="text-rose-700" aria-hidden="true">
                          *
                        </span>
                      </label>
                      <input
                        id="bkashTransactionId"
                        type="text"
                        required
                        value={state.bkashTransactionId}
                        onChange={(e) => {
                          setErrors({});
                          setState((prev) => ({ ...prev, bkashTransactionId: e.target.value }));
                        }}
                        placeholder="Enter your bKash Transaction ID"
                        aria-invalid={Boolean(errors.bkashTransactionId)}
                        aria-describedby={
                          errors.bkashTransactionId
                            ? "bkashTransactionId-error"
                            : "bkashTransactionId-hint"
                        }
                        className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm font-mono text-[#172E35] placeholder:text-[#8AA4AB] placeholder:font-sans focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs"
                      />
                      <p id="bkashTransactionId-hint" className="mt-1.5 text-xs text-[#526E77]">
                        Enter the bKash Transaction ID (TrxID) shown after payment.
                      </p>
                      {errors.bkashTransactionId && (
                        <p
                          id="bkashTransactionId-error"
                          role="alert"
                          className="mt-1.5 text-xs text-rose-700 font-medium"
                        >
                          {errors.bkashTransactionId}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {state.paymentMethod === "bank_transfer" && config.payment.bankTransfer.enabled && (
                  <div className="border border-[#C5E2E5] bg-[#EBF5F6] rounded-xl p-5 space-y-5 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-[#086477]">
                        BANK ACCOUNT DETAILS
                      </span>
                    </div>

                    {bankDetails ? (
                      <dl className="space-y-2 text-xs sm:text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <dt className="text-[#526E77]">Bank name</dt>
                          <dd className="font-semibold text-[#172E35]">{bankDetails.bankName}</dd>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <dt className="text-[#526E77]">Account name</dt>
                          <dd className="font-semibold text-[#172E35]">
                            {bankDetails.accountName}
                          </dd>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <dt className="text-[#526E77]">Account number</dt>
                          <dd className="font-semibold font-mono text-[#172E35]">
                            {bankDetails.accountNumber}
                          </dd>
                        </div>
                        {bankDetails.branch && (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <dt className="text-[#526E77]">Branch</dt>
                            <dd className="font-semibold text-[#172E35]">{bankDetails.branch}</dd>
                          </div>
                        )}
                        {bankDetails.routingNumber && (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <dt className="text-[#526E77]">Routing number</dt>
                            <dd className="font-semibold font-mono text-[#172E35]">
                              {bankDetails.routingNumber}
                            </dd>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#C5E2E5]">
                          <dt className="text-[#526E77]">Amount due</dt>
                          <dd className="font-bold text-[#086477] text-base">
                            {feeDetails.formattedPayable}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                        <span className="text-[#526E77]">Amount due</span>
                        <span className="font-bold text-[#086477] text-base">
                          {feeDetails.formattedPayable}
                        </span>
                      </div>
                    )}

                    {canSubmitOnline ? (
                      <p className="text-xs text-[#526E77] leading-relaxed">
                        {config.payment.bankTransfer.instruction}
                      </p>
                    ) : (
                      <p className="text-xs text-[#92400E] font-medium leading-relaxed">
                        Online enrollment is coming soon. Payment instructions and submission will
                        activate once backend verification is live.
                      </p>
                    )}

                    <div>
                      <label
                        htmlFor="bankTransactionReference"
                        className="block text-sm font-semibold text-[#172E35] mb-1.5"
                      >
                        Bank Transaction Reference{" "}
                        <span className="text-rose-700" aria-hidden="true">
                          *
                        </span>
                      </label>
                      <input
                        id="bankTransactionReference"
                        type="text"
                        required
                        value={state.bankTransactionReference}
                        onChange={(e) => {
                          setErrors({});
                          setState((prev) => ({
                            ...prev,
                            bankTransactionReference: e.target.value,
                          }));
                        }}
                        placeholder="Enter your bank transaction reference"
                        aria-invalid={Boolean(errors.bankTransactionReference)}
                        aria-describedby={
                          errors.bankTransactionReference
                            ? "bankTransactionReference-error"
                            : "bankTransactionReference-hint"
                        }
                        className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-white border border-[#D5E2E5] text-sm font-mono text-[#172E35] placeholder:text-[#8AA4AB] placeholder:font-sans focus:outline-none focus:border-[#086477] focus:ring-1 focus:ring-[#086477] shadow-2xs"
                      />
                      <p
                        id="bankTransactionReference-hint"
                        className="mt-1.5 text-xs text-[#526E77]"
                      >
                        Enter the reference or receipt number issued by your bank.
                      </p>
                      {errors.bankTransactionReference && (
                        <p
                          id="bankTransactionReference-error"
                          role="alert"
                          className="mt-1.5 text-xs text-rose-700 font-medium"
                        >
                          {errors.bankTransactionReference}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {submitError && (
                  <p role="alert" className="text-xs text-rose-700 font-medium">
                    {submitError}
                  </p>
                )}

                <div className="flex items-center justify-between gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setErrors({});
                      setSubmitError("");
                      setIsQrModalOpen(false);
                      setStep("review");
                    }}
                    className="min-h-[44px] px-2 text-sm font-semibold text-[#086477] hover:underline cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting || !canSubmitOnline}
                    aria-disabled={isSubmitting || !canSubmitOnline}
                    onClick={handleSubmitPaymentApplication}
                    className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477] ${
                      isSubmitting || !canSubmitOnline
                        ? "bg-[#9BB7BE] text-white cursor-not-allowed"
                        : "bg-[#086477] hover:bg-[#06505F] text-white cursor-pointer"
                    }`}
                  >
                    <span>
                      {canSubmitOnline ? "Submit application" : "Submission disabled (coming soon)"}
                    </span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* OUTCOME: APPLICATION IN PROCESS                          */}
            {/* ======================================================== */}
            {step === "pending_verification" && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" aria-hidden="true" />
                    Application in process
                  </span>
                </div>

                {/* LNA Application ID & Copy Card */}
                <div className="border border-[#C5E2E5] bg-[#EBF5F6] rounded-xl p-5 shadow-2xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-[#086477]">
                      LNA Application ID
                    </span>
                    <span className="text-[11px] text-[#526E77]">
                      Separate from your payment reference
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#C5E2E5] rounded-xl px-4 py-3">
                    <span
                      data-testid="application-id-value"
                      className="font-mono font-bold text-lg sm:text-xl text-[#086477] tracking-wide break-all"
                    >
                      {state.applicationReference}
                    </span>

                    <button
                      type="button"
                      onClick={handleCopyApplicationId}
                      aria-label={
                        copiedRef ? "Copied LNA Application ID" : "Copy LNA Application ID"
                      }
                      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
                    >
                      {copiedRef ? (
                        <>
                          <Check className="w-4 h-4" aria-hidden="true" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" aria-hidden="true" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div role="status" aria-live="polite" className="sr-only">
                    {copiedRef ? `Copied ${state.applicationReference}` : ""}
                  </div>
                </div>

                {/* Application Summary Card */}
                <div className="border border-[#E5ECEE] bg-white rounded-xl p-5 shadow-2xs">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-[#086477] block mb-3">
                    YOUR APPLICATION
                  </span>
                  <dl className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[#526E77]">Applicant</dt>
                      <dd className="font-semibold text-[#172E35] text-right">{state.fullName}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[#526E77]">Program</dt>
                      <dd className="font-semibold text-[#172E35] text-right">
                        {selectedCourse?.title}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[#526E77]">Batch</dt>
                      <dd className="font-semibold text-[#172E35] text-right">
                        {selectedBatch?.name}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[#526E77]">Payment method</dt>
                      <dd className="font-semibold text-[#172E35] text-right">
                        {formatPaymentMethodLabel(state.paymentMethod)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#E5ECEE]">
                      <dt className="text-[#526E77]">Amount due</dt>
                      <dd className="font-bold text-[#172E35] text-right">
                        {feeDetails.formattedPayable}
                      </dd>
                    </div>
                  </dl>
                </div>

                <p className="text-xs sm:text-sm text-[#526E77] leading-relaxed">
                  Enrollment is confirmed after staff verify the payment. Use your LNA Application
                  ID and the email or phone number from this form on the status page anytime.
                </p>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
                  <Link
                    href={statusHref}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white font-semibold text-sm transition-all duration-200 cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
                  >
                    <span>Check application status</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/#courses"
                    className="inline-flex items-center min-h-[44px] px-3 py-2 text-xs sm:text-sm font-semibold text-[#086477] hover:underline"
                  >
                    Back to programs
                  </Link>
                  <a
                    href="mailto:admissions@lnabd.org"
                    className="inline-flex items-center min-h-[44px] px-2 py-2 text-xs sm:text-sm font-semibold text-[#526E77] hover:text-[#086477] hover:underline"
                  >
                    Contact admissions
                  </a>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* OUTCOME: CONFIRMED                                       */}
            {/* ======================================================== */}
            {step === "confirmed" && (
              <div className="space-y-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" aria-hidden="true" />
                    Enrollment confirmed
                  </span>
                </div>

                <div className="border border-[#C5E2E5] bg-[#EBF5F6] rounded-xl p-5 shadow-2xs space-y-3">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-[#086477] block">
                    LNA Application ID
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#C5E2E5] rounded-xl px-4 py-3">
                    <span
                      data-testid="application-id-value"
                      className="font-mono font-bold text-lg sm:text-xl text-[#086477] tracking-wide break-all"
                    >
                      {state.applicationReference}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyApplicationId}
                      aria-label={
                        copiedRef ? "Copied LNA Application ID" : "Copy LNA Application ID"
                      }
                      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                    >
                      {copiedRef ? (
                        <>
                          <Check className="w-4 h-4" aria-hidden="true" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" aria-hidden="true" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="border border-[#E5ECEE] bg-white rounded-xl p-5 shadow-2xs">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-[#086477] block mb-3">
                    YOUR ENROLLMENT
                  </span>
                  <dl className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[#526E77]">Program</dt>
                      <dd className="font-semibold text-[#172E35] text-right">
                        {selectedCourse?.title}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[#526E77]">Batch</dt>
                      <dd className="font-semibold text-[#172E35] text-right">
                        {selectedBatch?.name}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#E5ECEE]">
                      <dt className="text-[#526E77]">Fee</dt>
                      <dd className="font-bold text-[#086477]">{feeDetails.formattedPayable}</dd>
                    </div>
                  </dl>
                </div>

                <p className="text-xs sm:text-sm text-[#526E77]">
                  Your seat in this cohort is confirmed.
                </p>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
                  <Link
                    href={statusHref}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white font-semibold text-sm transition-all duration-200 cursor-pointer shadow-xs"
                  >
                    <span>Check application status</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/#courses"
                    className="inline-flex items-center min-h-[44px] px-3 py-2 text-xs sm:text-sm font-semibold text-[#086477] hover:underline"
                  >
                    Back to programs
                  </Link>
                  <a
                    href="mailto:admissions@lnabd.org"
                    className="inline-flex items-center min-h-[44px] px-2 py-2 text-xs sm:text-sm font-semibold text-[#526E77] hover:text-[#086477] hover:underline"
                  >
                    Contact admissions
                  </a>
                </div>

                {/* Mobile Bottom Photo Crop */}
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
          {/* RIGHT COLUMN: Dedicated bKash QR Showcase or Photo Panel   */}
          {/* ========================================================== */}
          <div className="hidden lg:block lg:col-span-6 xl:col-span-6 sticky top-28">
            {showDesktopBkashRightPanel ? (
              <div
                data-testid="desktop-bkash-qr-panel"
                className="w-full min-h-[580px] xl:min-h-[620px] rounded-2xl border border-[#C5E2E5] bg-white shadow-md p-6 xl:p-8 flex flex-col justify-between gap-5"
              >
                <div className="flex items-start justify-between gap-4 border-b border-[#E5ECEE] pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#086477] block">
                      OFFICIAL PAYMENT QR
                    </span>
                    <h2 className="font-serif font-bold text-xl text-[#172E35] mt-0.5">
                      {config.payment.bkash.merchantName}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#526E77] block">
                      Amount due
                    </span>
                    <span className="font-bold text-lg text-[#086477]">
                      {feeDetails.formattedPayable}
                    </span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center">
                  <button
                    type="button"
                    data-testid="bkash-qr-desktop-trigger"
                    onClick={() => setIsQrModalOpen(true)}
                    aria-label="Open enlarged bKash Merchant QR popup"
                    className="rounded-2xl border border-[#D5E2E5] bg-[#FAFDFE] hover:border-[#086477] hover:bg-[#F3F9FA] p-4 xl:p-5 transition-all cursor-pointer flex flex-col items-center justify-center group shadow-2xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
                  >
                    <img
                      src={config.payment.bkash.qrImageSrc}
                      alt={`${config.payment.bkash.qrImageAlt} (desktop view)`}
                      width={612}
                      height={780}
                      className="w-[300px] xl:w-[350px] h-auto rounded-xl"
                    />
                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#086477] group-hover:underline">
                      <ZoomIn className="w-4 h-4" aria-hidden="true" />
                      <span>Click QR to enlarge</span>
                    </span>
                  </button>
                </div>

                <div className="rounded-xl bg-[#EBF5F6] border border-[#C5E2E5] px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                  <span className="text-[#526E77]">Merchant number</span>
                  <span className="font-mono font-bold text-[#172E35]">
                    {config.payment.bkash.merchantNumber}
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-[580px] xl:h-[620px] rounded-2xl overflow-hidden shadow-md bg-[#0F2930]">
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

                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none"
                  aria-hidden="true"
                />

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
            )}
          </div>
        </div>
      </div>

      {/* Enlarged Official bKash Merchant QR Popup */}
      {isPaymentStep && state.paymentMethod === "bkash" && config.payment.bkash.enabled && (
        <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
          <DialogContent
            data-testid="bkash-qr-popup-dialog"
            className="w-[calc(100vw-2rem)] max-w-[440px] bg-white border-[#C5E2E5] p-5 sm:p-6"
          >
            <DialogHeader className="pr-8">
              <DialogTitle className="font-serif text-lg sm:text-xl text-[#172E35]">
                bKash Merchant QR
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-[#526E77]">
                {config.payment.bkash.merchantName} ·{" "}
                <span className="font-mono font-semibold text-[#172E35]">
                  {config.payment.bkash.merchantNumber}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="bg-white rounded-2xl border border-[#D5E2E5] p-2 sm:p-3 flex items-center justify-center">
              <img
                src={config.payment.bkash.qrImageSrc}
                alt={`${config.payment.bkash.qrImageAlt} (enlarged popup)`}
                width={612}
                height={780}
                className="w-full max-w-[360px] sm:max-w-[390px] max-h-[60vh] object-contain mx-auto rounded-lg"
              />
            </div>

            <div className="rounded-xl bg-[#EBF5F6] border border-[#C5E2E5] px-4 py-3 flex items-center justify-between gap-4 text-xs sm:text-sm">
              <span className="text-[#526E77]">Amount due</span>
              <span className="font-bold text-[#086477]">{feeDetails.formattedPayable}</span>
            </div>

            {!canSubmitOnline && (
              <p className="text-xs text-[#92400E] font-medium">
                Online enrollment is coming soon. Payment instructions and submission will activate
                once backend verification is live.
              </p>
            )}

            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
            >
              Close
            </button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
