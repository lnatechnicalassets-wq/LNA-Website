import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Terms & Conditions | Lead Nation Academy",
  description:
    "Terms and conditions for enrollment, offline programs, and participant conduct at Lead Nation Academy.",
};

export default function TermsPage() {
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
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Legal Documentation</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#172E35] tracking-tight">
            Terms &amp; Conditions
          </h1>
          <p className="mt-3 text-sm text-[#526E77]">
            Last updated: November 2026 · Lead Nation Academy (lnabd.org)
          </p>
        </div>

        <div className="prose prose-slate max-w-none text-sm sm:text-base text-[#3D5A62] space-y-6 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing the Lead Nation Academy website, submitting an application, or enrolling in any offline program or workshop, you agree to comply with and be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              2. Programs &amp; Admission
            </h2>
            <p>
              Lead Nation Academy delivers executive and career development masterclasses conducted offline at physical campus venues in Dhanmondi, Dhaka. Admission into specific cohorts is subject to seat availability, eligibility evaluation, and verified payment confirmation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              3. Participant Conduct &amp; Attendance
            </h2>
            <p>
              Participants are expected to maintain professional decorum, adhere to cohort attendance requirements (minimum 80% attendance required for certificate eligibility), and respect mentor and peer contributions during offline sessions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              4. Intellectual Property
            </h2>
            <p>
              All course curriculum, case studies, slide presentations, and instructional materials provided during programs remain the intellectual property of Lead Nation Academy and its faculty. Redistribution or commercial use without prior written consent is strictly prohibited.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              5. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the People&apos;s Republic of Bangladesh.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

