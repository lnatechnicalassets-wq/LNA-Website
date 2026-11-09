import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Privacy Policy | Lead Nation Academy",
  description:
    "Official privacy policy regarding collection, use, protection, and retention of personal data at Lead Nation Academy.",
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
            Effective Date: 18 July 2025 · Lead Nation Academy (lnabd.org)
          </p>
        </div>

        <div className="prose prose-slate max-w-none text-sm sm:text-base text-[#3D5A62] space-y-8 leading-relaxed">
          <p>
            Lead Nation Academy (hereinafter referred to as &ldquo;LNA&rdquo;, &ldquo;we&rdquo;,
            &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to safeguarding the privacy and
            personal information of all users interacting with our website, digital platforms, and
            educational programs. This Privacy Policy outlines how we collect, use, store, disclose,
            and protect your personal data when you visit www.lnabd.org or engage with our services.
          </p>
          <p>
            By using our website or registering for our programs, you consent to the collection and
            use of your information as described in this Privacy Policy.
          </p>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              1. Scope of This Policy
            </h2>
            <p>This Privacy Policy applies to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>All visitors to our website (www.lnabd.org)</li>
              <li>
                Students, applicants, and registered participants of any LNA course, program, or
                initiative
              </li>
              <li>Partner institutions and their students interacting with LNA services</li>
              <li>
                Any individual or entity that shares personal data with LNA for academic, training,
                communication, or collaboration purposes
              </li>
            </ul>
            <p className="text-xs text-[#526E77]">
              This Policy does not apply to third-party platforms that are linked from our website,
              or operated by external organizations outside our control.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              2. What Information We Collect
            </h2>
            <p>
              We collect various types of information to provide our services effectively and
              securely:
            </p>

            <div className="space-y-3 pl-2">
              <div>
                <h3 className="font-semibold text-[#172E35]">
                  a. Personally Identifiable Information (PII):
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Full Name</li>
                  <li>Email Address</li>
                  <li>Phone Number / WhatsApp</li>
                  <li>Date of Birth</li>
                  <li>University/Institution Name</li>
                  <li>Student ID or Registration Number</li>
                  <li>Photo (for certification or ID cards)</li>
                  <li>Academic background</li>
                  <li>CV/Resume (if provided for internships or placements)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-[#172E35]">
                  b. Payment and Billing Information:
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Payment method (e.g., bKash transaction reference, bank transfer reference)
                  </li>
                  <li>Date and amount of payment</li>
                  <li>Invoice or receipt number</li>
                </ul>
                <p className="text-xs text-[#526E77] mt-1">
                  Note: We do not store sensitive financial details such as card numbers, PINs, or
                  passwords.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[#172E35]">c. Usage Information:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>IP address, browser type and version</li>
                  <li>Device and operating system</li>
                  <li>Time spent on site / pages visited</li>
                  <li>Session logs and cookies</li>
                  <li>Referral pages and exit URLs</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-[#172E35]">d. Course Interaction Data:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Attendance records</li>
                  <li>Assignment submissions</li>
                  <li>Evaluation scores</li>
                  <li>Feedback forms and survey responses</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              3. How We Use Your Information
            </h2>
            <p>Your data is collected for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Program Administration &amp; Communication:</strong> Confirm registration,
                deliver schedule updates, assign cohorts, issue certificates.
              </li>
              <li>
                <strong>Academic &amp; Career Support:</strong> Assess performance, facilitate
                internship or job placements, connect with mentors.
              </li>
              <li>
                <strong>Platform Improvement:</strong> Optimize user experience, maintain system
                security, troubleshoot issues.
              </li>
              <li>
                <strong>Legal &amp; Compliance:</strong> Comply with regulatory requirements,
                protect intellectual property, prevent fraud.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              4. How We Store and Protect Your Data
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>All user data is stored in encrypted databases with restricted access.</li>
              <li>Only authorized personnel can access sensitive information.</li>
              <li>Regular system audits and secure backup protocols are maintained.</li>
              <li>Firewalls, anti-malware systems, and role-based access controls are enforced.</li>
              <li>Online communications and submissions are secured using SSL/TLS encryption.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              5. Data Retention
            </h2>
            <p>
              We retain personal data only as long as necessary to fulfill academic, certification,
              and regulatory requirements. When data is no longer required, it is securely archived,
              anonymized, or deleted in accordance with data management policies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              6. Sharing of Information
            </h2>
            <p>
              We do not sell, rent, or lease personal information to third parties. Data is shared
              strictly under the following conditions:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>With partner universities and institutions for academic validation.</li>
              <li>With trainers and corporate mentors to manage cohorts and evaluations.</li>
              <li>
                With placement partners, solely for learners who opt in for internship or job
                opportunities.
              </li>
              <li>
                With legal or governmental authorities when required by applicable laws of
                Bangladesh.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              7. Your Rights
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Right to Access:</strong> Request a copy of your personal data held by LNA.
              </li>
              <li>
                <strong>Right to Correction:</strong> Request correction of inaccurate or outdated
                information.
              </li>
              <li>
                <strong>Right to Withdraw Consent:</strong> Opt out of informational communications
                at any time.
              </li>
              <li>
                <strong>Right to Deletion:</strong> Request data deletion following program
                completion, subject to regulatory retention.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              8. Children&apos;s Privacy
            </h2>
            <p>
              LNA programs are targeted to university students, graduates, and young professionals.
              We do not knowingly collect personal information from individuals under the age of 16
              without parental or institutional consent.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              9. Cookies &amp; Tracking Technologies
            </h2>
            <p>
              Our website uses essential and functional cookies to ensure secure navigation,
              maintain form sessions, and analyze aggregate visitor trends. You may configure your
              browser to disable cookies, though certain interactive features may be limited.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              10. Third-Party Links
            </h2>
            <p>
              Our website may link to partner institutions or external resources. LNA is not
              responsible for the privacy practices or content of third-party websites.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              11. Updates to This Privacy Policy
            </h2>
            <p>
              LNA reserves the right to revise or update this policy at any time. Continued use of
              our website and services following updates constitutes acceptance of the modified
              terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#172E35]">
              12. Contact Information
            </h2>
            <p>
              For any questions, requests, or concerns regarding this Privacy Policy or your
              personal data, please contact:
            </p>
            <div className="bg-white rounded-xl p-5 border border-[#CCECEE] space-y-1 text-sm">
              <p className="font-semibold text-[#172E35]">Lead Nation Academy (LNA)</p>
              <p>Plot 06, Tejgaon Industrial Area, Dhaka - 1208, Bangladesh</p>
              <p>
                <strong>Email:</strong>{" "}
                <a href="mailto:info@lnabd.org" className="text-[#086477] underline">
                  info@lnabd.org
                </a>
              </p>
              <p>
                <strong>Phone:</strong> +880 1581-799666
              </p>
              <p>
                <strong>Website:</strong> www.lnabd.org
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
