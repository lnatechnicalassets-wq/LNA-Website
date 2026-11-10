import React, { Suspense } from "react";
import type { Metadata } from "next";
import { getEnrollmentConfig } from "@/lib/enrollment/config";
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
  const [resolvedParams, { courses, batches }] = await Promise.all([
    searchParams,
    getPublicCatalogFromSupabase().catch(() => ({ courses: [], batches: [] })),
  ]);

  const runtime = getEnrollmentRuntimeConfig();
  const baseConfig = getEnrollmentConfig();
  const effectiveConfig = {
    ...baseConfig,
    payment: {
      ...baseConfig.payment,
      submissionEnabled: runtime.submissionEnabled,
      bankTransfer: {
        ...baseConfig.payment.bankTransfer,
        enabled: false,
      },
    },
  };

  const outcomeParam = singleQueryParam(resolvedParams.outcome);
  const refParam = singleQueryParam(resolvedParams.ref);
  const tokenParam = singleQueryParam(resolvedParams.token);

  const initialOutcome = await getEnrollmentOutcomeSummaryByToken(
    outcomeParam,
    refParam,
    tokenParam
  );
  const invalidOutcomeNotice = outcomeParam === "invalid" && !initialOutcome;

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
        initialOutcome={initialOutcome}
        invalidOutcomeNotice={invalidOutcomeNotice}
      />
    </Suspense>
  );
}
