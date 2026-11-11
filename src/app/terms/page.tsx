import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrganizationConfig } from "@/lib/content";

export const metadata = {
  title: "Terms & Conditions | Lead Nation Academy",
  description:
    "Official terms and conditions for Lead Nation Academy (LNA) website use, course registrations, and program participation.",
};

export default function TermsPage() {
  const org = getOrganizationConfig();
  const phoneHref = `tel:${org.phone.replace(/[^\d+]/g, "")}`;

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
            Effective Date: 18 July 2025 · Lead Nation Academy (lnabd.org)
          </p>
        </div>

        <div className="prose prose-slate max-w-none text-sm sm:text-base text-[#3D5A62] space-y-8 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              1. Introduction
            </h2>
            <p>
              Welcome to Lead Nation Academy (LNA). By accessing or using our website
              (www.lnabd.org), participating in our programs, or engaging with our content, you
              agree to be bound by the following Terms and Conditions. These terms apply to all
              users, including but not limited to visitors, students, universities, and
              institutional partners.
            </p>
            <p>
              If you do not agree with any part of these terms, please do not use the website or
              participate in our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              2. Use of the Website
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                You agree to use this website only for lawful purposes and in a manner that does not
                infringe the rights of or restrict or inhibit the use of this site by any third
                party.
              </li>
              <li>
                You must not misuse the website by knowingly introducing viruses, trojans, or other
                harmful material.
              </li>
              <li>
                LNA reserves the right to modify, suspend, or discontinue any part of the website at
                any time without prior notice.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              3. Program Participation
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                All training, mentorship, and certificate programs listed on the website are subject
                to availability and eligibility requirements.
              </li>
              <li>
                Registration for any LNA course or program must be done through the proper
                application process, with full or installment payment as specified.
              </li>
              <li>
                LNA reserves the right to cancel, reschedule, or modify any session, module, or
                instructor due to operational needs or emergencies.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              4. Payment Terms
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Payment for any course or program may be collected either directly by LNA or through
                partner universities.
              </li>
              <li>
                Payment structures (full or installment) are clearly outlined during registration.
              </li>
              <li>
                Failure to complete payment within the specified timeline may result in removal from
                the program and forfeiture of participation.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              5. Refund and Cancellation Policy
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Payments are non-refundable unless otherwise stated in a written agreement or
                course-specific policy.
              </li>
              <li>
                Any request for cancellation must be submitted in writing and will be evaluated on a
                case-by-case basis.
              </li>
              <li>
                If a program is canceled by LNA, participants will be eligible for a full or
                proportional refund based on the number of sessions completed.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              6. Intellectual Property
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                All content provided on the website, including but not limited to text, graphics,
                logos, videos, course materials, and certificates, is the intellectual property of
                LNA or its licensors.
              </li>
              <li>
                You may not reproduce, republish, distribute, or exploit any content without prior
                written consent from LNA.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              7. Certification Policy
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Certificates are awarded jointly by LNA and its partner institutions based on
                successful completion of attendance, assignments, and participation requirements.
              </li>
              <li>
                LNA reserves the right to withhold certification in case of non-compliance,
                misconduct, or incomplete performance.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              8. Code of Conduct
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Participants are expected to maintain professional behavior during all LNA sessions,
                online or offline.
              </li>
              <li>
                Disruptive, disrespectful, or unethical conduct may lead to disciplinary action,
                including removal from the program without refund.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              9. Data Protection and Privacy
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                LNA is committed to protecting your personal information. Data submitted through
                forms, registrations, or communications will be handled in accordance with our
                Privacy Policy.
              </li>
              <li>
                By using our services, you consent to the collection and use of your data as
                described.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              10. Third-Party Links
            </h2>
            <p>
              Our website may contain links to third-party websites for reference or convenience.
              LNA is not responsible for the content, availability, or privacy practices of external
              sites.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              11. Limitation of Liability
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                While we strive to provide accurate and timely information, LNA makes no warranties
                or guarantees regarding the completeness, accuracy, or reliability of any content on
                the website.
              </li>
              <li>
                LNA is not liable for any direct, indirect, incidental, or consequential damages
                arising from the use of our services or website.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              12. Modifications to Terms
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                LNA reserves the right to revise or update these Terms and Conditions at any time.
                Changes will be effective immediately upon posting.
              </li>
              <li>
                Continued use of the website or participation in programs following any changes
                indicates your acceptance of the new terms.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              13. Governing Law
            </h2>
            <p>
              These Terms and Conditions are governed by and construed in accordance with the laws
              of the People&apos;s Republic of Bangladesh. Any disputes arising under or in
              connection with these terms shall be subject to the exclusive jurisdiction of the
              courts of Dhaka.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              14. Contact Information
            </h2>
            <p>
              If you have any questions or concerns about these Terms and Conditions, please
              contact:
            </p>
            <div className="bg-white rounded-xl p-5 border border-[#CCECEE] space-y-1 text-sm">
              <p className="font-semibold text-[#172E35]">
                {org.name} ({org.shortName})
              </p>
              <p>
                {org.address.street}, {org.address.city} - {org.address.postalCode},{" "}
                {org.address.country}
              </p>
              <p>
                <strong>Email:</strong>{" "}
                <a href={`mailto:${org.email}`} className="text-[#086477] underline">
                  {org.email}
                </a>
              </p>
              <p>
                <strong>Phone:</strong>{" "}
                <a href={phoneHref} className="text-[#086477] underline">
                  {org.phone}
                </a>
              </p>
              <p>
                <strong>Website:</strong> www.{org.domain}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
