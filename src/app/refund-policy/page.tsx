import React from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Refund & Cancellation Policy | Lead Nation Academy",
  description:
    "Refund, seat hold, and cancellation terms for Lead Nation Academy programs and workshops.",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F6FAFA] text-[#172E35] py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-10">
        <div>
          <Link href="/" className="inline-block mb-6">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Back to Home</span>
            </Button>
          </Link>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E0F3F5] text-[#086477] text-xs font-semibold tracking-wide uppercase mb-4">
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Admissions &amp; Finance</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#172E35] tracking-tight">
            Refund &amp; Cancellation Policy
          </h1>
          <p className="mt-3 text-sm text-[#526E77]">
            Last updated: November 2026 · Lead Nation Academy (lnabd.org)
          </p>
        </div>

        <div className="prose prose-slate max-w-none text-sm sm:text-base text-[#3D5A62] space-y-6 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              1. Seat Holds &amp; Capacity
            </h2>
            <p>
              Due to limited cohort capacity for our in-person executive sessions in Dhaka, seat
              allocations are reserved strictly upon confirmed fee payment.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              2. Cancellation Before Cohort Commencement
            </h2>
            <p>
              Applicants may request a full refund or cohort transfer up to 7 calendar days prior to
              the first scheduled offline session. Cancellations requested between 3 to 6 days prior
              to commencement are eligible for a 75% refund or a one-time fee credit toward the
              subsequent cohort.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              3. Non-Refundable Period
            </h2>
            <p>
              Once cohort classes begin and session materials are distributed, tuition fees become
              non-refundable to maintain mentor and cohort scheduling integrity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              4. Refund Processing
            </h2>
            <p>
              Approved refunds are credited directly back to the original bKash account or bank
              transfer account within 5 to 7 business days following formal administrative approval.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
