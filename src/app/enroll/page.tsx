import React, { Suspense } from "react";
import type { Metadata } from "next";
import { getEnrollmentConfig } from "@/lib/enrollment/config";
import { loadProgramQuestionSets } from "@/server/enrollment/program-questions";
import { getEnrollmentRuntimeConfig } from "@/server/enrollment/config";
import {
  getEnrollmentOutcomeSummaryByToken,
  getPublicCatalogFromSupabase,
} from "@/server/enrollment/service";
import { EnrollmentView } from "./enrollment-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Program Enrollment — Lead Nation Academy",
  description:
    "Choose a program and an available batch to get started with practical, offline executive training at Lead Nation Academy.",
  openGraph: {
    title: "Program Enrollment — Lead Nation Academy",
    description:
      "Choose a program and an available batch to get started with practical, offline executive training at Lead Nation Academy.",
  },
};

function singleQueryParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

export default async function EnrollPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const catalog = getPublicCatalogFromSupabase().catch(() => ({ courses: [], batches: [] }));
  const outcome = searchParams.then(async (params) => {
    const outcomeParam = singleQueryParam(params.outcome);
    const initialOutcome = await getEnrollmentOutcomeSummaryByToken(
      outcomeParam,
      singleQueryParam(params.ref),
      singleQueryParam(params.token)
    );
    return { initialOutcome, invalidOutcomeNotice: outcomeParam === "invalid" && !initialOutcome };
  });
  const catalogWithQuestions = catalog.then(async ({ courses, batches }) => ({
    courses,
    batches,
    questionConfig: await loadProgramQuestionSets(courses.map((course) => course.id)).catch(
      () => null
    ),
  }));
  const [{ courses, batches, questionConfig }, { initialOutcome, invalidOutcomeNotice }] =
    await Promise.all([catalogWithQuestions, outcome]);
  const runtime = getEnrollmentRuntimeConfig();
  const baseConfig = getEnrollmentConfig();
  const effectiveConfig = {
    ...baseConfig,
    ...(questionConfig ?? { programQuestions: {}, programQuestionVersions: {} }),
    payment: {
      ...baseConfig.payment,
      submissionEnabled: runtime.submissionEnabled && questionConfig !== null,
      bankTransfer: {
        ...baseConfig.payment.bankTransfer,
        enabled: false,
      },
    },
  };

  return (
    <Suspense
      fallback={
        <div className="w-full bg-[#F6FAFA] min-h-screen py-16 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#086477] border-t-transparent animate-spin" />
        </div>
      }
    >
      <EnrollmentView
        courses={courses}
        batches={batches}
        config={effectiveConfig}
        checkoutMode={runtime.checkoutMode}
        sandboxPaymentEnabled={runtime.sandboxPaymentEnabled}
        manualPaymentEnabled={runtime.manualPaymentEnabled}
        freeRegistrationEnabled={questionConfig !== null}
        initialOutcome={initialOutcome}
        invalidOutcomeNotice={invalidOutcomeNotice}
      />
    </Suspense>
  );
}
