import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Privacy Policy | Lead Nation Academy",
  description:
    "Privacy policy regarding collection, use, and protection of personal data at Lead Nation Academy.",
};

export default function PrivacyPage() {
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
            <Shield className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Privacy &amp; Security</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#172E35] tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-[#526E77]">
            Last updated: November 2026 · Lead Nation Academy (lnabd.org)
          </p>
        </div>

        <div className="prose prose-slate max-w-none text-sm sm:text-base text-[#3D5A62] space-y-6 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              1. Information We Collect
            </h2>
            <p>
              When applying for or enrolling in programs at Lead Nation Academy, we collect your full name, email address, WhatsApp contact number, and program-specific academic or professional details. We do not store sensitive payment credentials (such as bKash PINs or OTPs); transactions are validated directly via encrypted gateway server-to-server channels.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              2. How We Use Your Information
            </h2>
            <p>
              Your personal information is used exclusively to process your cohort enrollment, issue official registration credentials and admission references (e.g. Crockford Base32 references), coordinate offline classroom schedules, and communicate pertinent academic updates.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              3. Data Security &amp; Confidentiality
            </h2>
            <p>
              Lead Nation Academy implements strict role-based access controls, TLS 1.3 encryption, and parameterized query protocols. We never sell, rent, or trade applicant personal data with third-party advertisers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              4. Contacting Our Data Privacy Desk
            </h2>
            <p>
              If you have any questions or requests regarding your personal information, please contact our administrative team at{" "}
              <a href="mailto:info@lnabd.org" className="text-[#086477] font-semibold underline">
                info@lnabd.org
              </a>{" "}
              or visit our campus desk in Dhanmondi, Dhaka.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

