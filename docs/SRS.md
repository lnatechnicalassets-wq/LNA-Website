# LNA Website Software Requirements Specification

**Document ID:** LNA-SRS-001  
**Version:** 1.0 (Page headers/footers note Version 2.0; see G11)  
**Date:** 28 October 2026  
**Prepared for:** Lead Nation Academy  
**System:** Public website, learner portal and administration portal  
**Status:** Draft for stakeholder review and sign off  
**Confidentiality:** Internal project and vendor use  

---

## Document purpose
This specification defines the approved scope, system behaviour, data, interfaces, quality targets and acceptance conditions for rebuilding lnabd.org. It is intended for stakeholder approval, design, estimation, implementation and testing.

## Release decision
The initial release supports public information, a basic readiness assessment, offline course enrollment and payment, free event registration, learner self service, certificates and staff administration. The system does not deliver online classes.

---

## Document control

| Field | Value |
| :--- | :--- |
| Document title | LNA Website Software Requirements Specification |
| Document ID | LNA-SRS-001 |
| Version | 1.0 |
| Date | 28 October 2026 |
| Prepared for | Lead Nation Academy |
| System | Public website, learner portal and administration portal |
| Status | Draft for stakeholder review and sign off |
| Confidentiality | Internal project and vendor use |

### Revision history
| Version | Date | Change | Owner |
| :--- | :--- | :--- | :--- |
| 1.0 | 28 Oct 2026 | Expanded requirements, workflows, data, traceability and page concepts | Project team |

### Approval record
| Role | Name | Decision | Date |
| :--- | :--- | :--- | :--- |
| Business owner | To be completed | Pending | — |
| Technical lead | To be completed | Pending | — |

### Change control
After approval, each scope change shall identify the affected requirement IDs, page designs, data entities, integrations, tests, delivery estimate and operating cost. The approved change shall receive a new document version before implementation.

---

## Executive summary
LNA needs a website that can publish course and event information, accept payments, maintain learner records and support routine administration without requiring technical staff. Public traffic may reach 100,000 visitors in a month, with short bursts near 500 simultaneous readers. The proposed system therefore keeps public pages cacheable and limits database and authentication work to transactions and protected portals.

Applicants submit one common enrollment form. Paid batches use SSLCOMMERZ hosted checkout, server-side payment validation, an emailed receipt and account activation. Free batches skip payment. Pending applicants remain database records and do not receive authentication accounts. Learners use a small portal for offline course logistics, announcements, receipts, refund requests and certificates.

The administration portal uses structured forms for courses, batches, events, mentors, reviews and homepage content. Admins can draft, preview, publish and archive. Super Admins control staff access, sensitive settings and financial corrections. Staff authentication uses email and password plus an authenticator app or an email verification code.

### Business outcomes
- Visitors can understand LNA, find an open course, view an event or take the optional readiness assessment without creating an account.
- A validated payment creates one enrollment, one receipt and one active learner account without duplicate records.
- Staff can manage routine content and operations through plain forms, filters and exports.
- Management can review enrollment, revenue, discount, refund, event, survey and certificate data for planning.

### Primary constraints
- Courses are delivered offline. The release excludes online lessons, attendance, assignments and discussion forums.
- Event entry and attendance are handled manually. The website sends a pass but does not scan QR codes.
- Refund requests are managed online, while the authority transfers the money manually.
- English is the editorial language. A switch translates interface labels and system messages into Bangla.

---

## Contents
1. Introduction
2. Product scope
3. Stakeholders and access
4. Information architecture
5. Functional requirements
6. Use cases and workflows
7. Business rules
8. Data requirements
9. Integration requirements
10. Quality requirements
11. User experience requirements
12. Testing and acceptance
13. Deployment and operations
14. Risks and open implementation inputs
15. Requirement traceability
- Appendix A: Page design concepts
- Appendix B: Glossary and references

### Requirement conventions
| Term | Meaning |
| :--- | :--- |
| Shall | Mandatory for acceptance of the initial release. |
| Should | Recommended implementation behaviour that may be adjusted with documented reason. |
| May | Permitted option or future extension. |
| Priority M | Must be delivered in the initial release. |
| Priority G | Good to have; deliver when approved content or schedule permits. |
| Priority F | Future option outside the initial release. |

---

## 1 Introduction

### 1.1 Purpose
This document gives the business owner, designer, developer, tester and operating team one approved definition of the LNA website. It records what the system shall do, who may use each function, how information moves between services, and how the release will be tested.

### 1.2 Intended audience
| Audience | Use of this document |
| :--- | :--- |
| LNA management | Approve scope, priorities, policy and operating responsibility. |
| Design team | Create final responsive interfaces from the page concepts and interaction rules. |
| Development team | Estimate and implement modules, data, integrations and access controls. |
| Quality assurance | Create requirement-based test cases and evidence. |
| Operations team | Prepare content, services, credentials, support and launch procedures. |

### 1.3 Product name and domain
The product is the LNA public website and its protected portals. The current public domain is `lnabd.org`. The final deployment may retain this domain or use a controlled subdomain during staging.

### 1.4 Definitions
| Term | Definition |
| :--- | :--- |
| Course | Reusable description of a training offer. |
| Batch | A dated delivery of a course with its own schedule, venue, fee, capacity and enrollment period. |
| Applicant | A person with an enrollment record who has not yet received an active account. |
| Learner | A person with at least one confirmed enrollment and an active account. |
| MAU | A distinct authenticated user active during a billing period. Public visitors and database records are not Auth MAU. |
| IPN | Server-to-server Instant Payment Notification from SSLCOMMERZ. |
| Second factor | Authenticator app code or short-lived code sent to a verified staff email. |

---

## 2 Product scope

### 2.1 System boundary
The website owns presentation, workflow and records. External providers supply authentication, payment and email delivery.
- Public visitor / Applicant / Event attendee interacts with public site and forms.
- Learner interacts with Learner portal.
- Admin and Super Admin interact with Admin portal.
- Platform integrates with Supabase (Data, Auth, Storage), SSLCOMMERZ (Hosted payment), Email provider (Transactional email).
- Public reads are cached. Authentication, payment validation and protected writes run on the server.

### 2.2 Initial release
| Area | Included capability |
| :--- | :--- |
| Public website | Homepage, About, courses, batches, events, mentors, reviews, contact and policy pages. |
| Assessment | Fifteen-question optional readiness assessment with weighted score, readiness label and email result. |
| Enrollment | Universal form, application reference, capacity, payment, free enrollment and status lookup. |
| Learner portal | Course logistics, announcements, profile, receipts, refund requests and certificates. |
| Administration | Structured content and operational management, reports, exports, roles and audit history. |
| Communication | Transactional email and dashboard announcements. |
| Measurement | Operational reports, privacy-friendly traffic analytics and consent-aware GA4. |

### 2.3 Future options
- Mentor accounts and mentor dashboard.
- WhatsApp transactional alerts and campaigns after consent and provider approval.
- Public certificate verification using the certificate number or a QR link.
- News or Resources publishing and advanced public search.
- More detailed assessment reports and additional assessment types.

### 2.4 Exclusions
- Google OAuth, social login and public account registration.
- Online lessons, video library, assignments, quizzes, attendance and discussion forums.
- Applicant CV or supporting-document upload.
- Promo codes, coupon codes and automatic refunds.
- QR event check-in and online attendance.
- Public review submission and unmoderated publishing.

### 2.5 Assumptions and dependencies
- LNA supplies approved content, verified impact figures, policies, images, certificate artwork and staff access decisions.
- LNA obtains production service accounts for hosting, Supabase, SSLCOMMERZ, email and analytics.
- The final question bank and option scores are reviewed during development without changing the approved assessment structure.
- The chosen service plans provide enough database capacity, email allowance, backup and support for production use.

---

## 3 Stakeholders and access

### 3.1 User roles
| Role | Description | Account |
| :--- | :--- | :--- |
| Visitor | Reads public content, takes the assessment, sends an inquiry or registers for a free event. | None |
| Applicant | Submits an enrollment, pays, retries payment or checks status. | None before activation |
| Learner | Views personal course and transaction records. | Email and password |
| Admin | Manages routine content and operations. | Email, password and second factor |
| Super Admin | Manages staff access and sensitive settings. | Email, password and second factor |

### 3.2 Permission matrix
| Capability | Visitor | Learner | Admin | Super Admin |
| :--- | :--- | :--- | :--- | :--- |
| Read published public content | Yes | Yes | Yes | Yes |
| Submit assessment, event or contact form | Yes | Yes | Yes | Yes |
| Submit enrollment and payment | Yes | Yes | Yes | Yes |
| View own receipt, refund and certificate | No | Own only | Assigned operations | All |
| Edit public content | No | No | Yes | Yes |
| Manage courses, batches and events | No | No | Yes | Yes |
| Review payments and refunds | No | No | Yes | Yes |
| Correct financial records | No | No | No | Yes |
| Manage staff accounts and service settings | No | No | No | Yes |
| View audit and system-wide reports | No | No | Limited | Yes |

### 3.3 Access principles
- Every protected request checks authentication, role and record ownership on the server.
- Learners can access only their own profile, enrollments, payments, refunds and certificates.
- Pending and unpaid applicants remain outside Auth until the approved activation condition is met.
- Operational records are archived or disabled when deletion would damage payment, certificate or audit history.

---

## 4 Information architecture

### 4.1 Homepage composition
| Order | Section | Content and behaviour |
| :--- | :--- | :--- |
| 1 | Hero slider | Three managed slides for course, assessment and event messages. Swipe, arrows, indicators and pause control. |
| 2 | Assessment | Short explanation, supporting visual and Start Assessment button. |
| 3 | About and Impact | Short summary and verified figures. |
| 4 | Courses | Open batches; upcoming batches replace the section when none are open. |
| 5 | Events | Upcoming events; recent events replace the section when none are upcoming. |
| 6 | Learner reviews | Admin-approved carousel with manual movement. |
| 7 | Mentors | Featured profiles with links to full profile pages. |
| 8 | Footer | Contact, quick links, policies, social links and language control. |

### 4.2 Page inventory
| Area | Pages |
| :--- | :--- |
| Public | Home; About; Courses; Course details; Events; Event details; Mentors; Mentor profile; Assessment; Contact; Privacy; Terms; Refund Policy. |
| Enrollment | Application form; order review; payment redirect; success; failure; cancellation; free confirmation; status lookup. |
| Account | Login; setup password; reset password; staff verification; access denied. |
| Learner | Overview; My Courses; course detail; announcements; receipts; refund request; certificates; profile. |
| Administration | Overview; Courses; Batches; Enrollments; Payments; Discounts; Refunds; Events; Registrations; Survey; Certificates; Mentors; Reviews; Homepage; Contact; Reports; Staff; Settings. |
| System | 404; service failure; maintenance; delivery warning; expired link. |

### 4.3 Shared page behaviour
- Every page has a clear title, current navigation state and one primary action where an action is expected.
- Forms preserve valid entries after a recoverable error and place an error message beside the affected field.
- Publishing changes invalidate the relevant public cache without requiring a full site deployment.
- Expired, full or closed items remain understandable and do not show an active Apply or Register button.

---

## 5 Functional requirements

### 5.1 Public website and homepage
| ID | Requirement | Priority | Verification |
| :--- | :--- | :---: | :--- |
| FR-PUB-001 | The primary navigation shall include Home, About, Courses, Events, Mentors, Contact and Login. | M | Inspection |
| FR-PUB-002 | The homepage shall display the approved eight sections in the approved order. | M | Test |
| FR-PUB-003 | Staff shall manage each hero slide image, title, text, action, order, start date, end date and publish state. | M | Test |
| FR-PUB-004 | The hero shall support keyboard controls, swipe, arrows, position indicators and pause or reduced motion. | M | Test |
| FR-PUB-005 | The About block shall publish only verified impact figures supplied or approved by LNA. | M | Inspection |
| FR-PUB-006 | The review section shall display approved records only and shall not autoplay. | G | Test |
| FR-PUB-007 | The website shall provide Privacy, Terms and Refund Policy pages linked from relevant forms and the footer. | M | Inspection |

### 5.2 Content management
| ID | Requirement | Priority | Verification |
| :--- | :--- | :---: | :--- |
| FR-CMS-001 | Admins shall use structured forms for homepage, About, courses, batches, events, mentors, reviews and contact settings. | M | Test |
| FR-CMS-002 | Admins shall save a draft, preview it, publish it and archive it without a Super Admin approval step. | M | Test |
| FR-CMS-003 | The system shall prevent permanent deletion of content that is referenced by an enrollment, payment, refund or certificate. | M | Test |
| FR-CMS-004 | The system shall record the author, last editor, publish time and archive time for managed content. | M | Test |
| FR-CMS-005 | Staff shall upload optimized public images with validation for type, size and alternative text. | M | Test |

### 5.3 Courses and batches
| ID | Requirement | Priority | Verification |
| :--- | :--- | :---: | :--- |
| FR-CRS-001 | Admins shall create a reusable course with title, cover, summary, overview, eligibility, outcomes, topic outline, mentors, FAQ and refund policy. | M | Test |
| FR-CRS-002 | A course shall have one or more batches with separate dates, schedule, venue, capacity, fee, enrollment window and status. | M | Test |
| FR-CRS-003 | The course catalogue shall group items by Open, Upcoming and Closed without public text search in the initial release. | M | Test |
| FR-CRS-004 | The homepage shall show open batches and shall show upcoming batches when no open batch exists. | M | Test |
| FR-CRS-005 | The course details page shall show available batches and the correct final fee before the learner starts enrollment. | M | Test |
| FR-CRS-006 | A limited batch shall reserve a seat during checkout, release an expired hold and prevent confirmed enrollment beyond capacity. | M | Test |
| FR-CRS-007 | The system shall archive completed batches and retain their schedule, fee, enrollment and certificate history. | M | Test |

### 5.4 Enrollment and application status
| ID | Requirement | Priority | Verification |
| :--- | :--- | :---: | :--- |
| FR-ENR-001 | Every batch shall use the approved universal application form and shall not request a CV or document upload. | M | Inspection |
| FR-ENR-002 | A valid submission shall create one unique application reference and a pending enrollment without creating an Auth account. | M | Test |
| FR-ENR-003 | The system shall prevent or reconcile a duplicate application for the same email and batch. | M | Test |
| FR-ENR-004 | The status page shall require the application reference and email, apply rate limits and return only status and next step. | M | Test |
| FR-ENR-005 | A free batch shall confirm after form and capacity validation and shall skip SSLCOMMERZ. | M | Test |
| FR-ENR-006 | A confirmed enrollment shall create or link one learner profile and send an account setup message when needed. | M | Test |

### 5.5 Discounts and payment
| ID | Requirement | Priority | Verification |
| :--- | :--- | :---: | :--- |
| FR-PAY-001 | Staff shall configure a dated universal discount and a dated batch discount as a percentage or fixed amount. | M | Test |
| FR-PAY-002 | A batch discount shall override a universal discount. Discounts shall not stack or reduce the final fee below zero. | M | Test |
| FR-PAY-003 | The server shall store original fee, discount source, discount amount and final payable amount with the enrollment. | M | Test |
| FR-PAY-004 | The server shall create an SSLCOMMERZ hosted checkout session for a paid batch and keep credentials outside the browser. | M | Test |
| FR-PAY-005 | The server shall validate the gateway notification, transaction identity, status and amount before marking payment paid. | M | Test |
| FR-PAY-006 | Payment processing shall be idempotent so repeated or delayed callbacks do not duplicate payment, enrollment, receipt, account or seat allocation. | M | Test |
| FR-PAY-007 | Failed, cancelled and expired attempts shall remain recorded and may be retried while the batch remains available. | M | Test |
| FR-PAY-008 | A risk-flagged transaction shall remain on hold until staff review and shall not activate an account automatically. | M | Test |
| FR-PAY-009 | A validated payment shall produce an emailed receipt and account activation action. Email failure shall not reverse the payment. | M | Test |

### 5.6 Authentication and profiles
| ID | Requirement | Priority | Verification |
| :--- | :--- | :---: | :--- |
| FR-AUT-001 | Public signup and Google OAuth shall be disabled. | M | Inspection |
| FR-AUT-002 | Learners and staff shall sign in with verified email and website password. | M | Test |
| FR-AUT-003 | Pending or inactive records shall not receive dashboard access or a valid learner session. | M | Test |
| FR-AUT-004 | Admin and Super Admin sessions shall require an authenticator app code or an email verification code after the password step. | M | Test |
| FR-AUT-005 | Email verification codes shall be single use, short lived, rate limited and stored in non-reversible form. | M | Inspection |
| FR-AUT-006 | Learners may edit noncritical profile details. Email and certificate name changes shall require an admin-reviewed correction. | M | Test |
| FR-AUT-007 | The system shall provide password setup, reset, session expiry, logout and staff factor recovery procedures. | M | Test |

### 5.7 Learner portal and announcements
| ID | Requirement | Priority | Verification |
| :--- | :--- | :---: | :--- |
| FR-LRN-001 | The learner overview shall show active and completed batches, payment state, certificate state and latest announcement. | M | Test |
| FR-LRN-002 | A learner shall view the schedule, venue, directions, support contact and announcements for each enrolled batch. | M | Test |
| FR-LRN-003 | A learner shall download an authorized receipt and issued certificate and view the state of a refund request. | M | Test |
| FR-LRN-004 | Admins shall publish an announcement to a course or batch and send the same operational message by email. | M | Test |
| FR-LRN-005 | The system shall record delivery outcome and prevent accidental duplicate sending of the same announcement. | M | Test |
| FR-LRN-006 | The portal shall not include lessons, attendance, assignments, quizzes, progress percentages or discussion forums. | M | Inspection |

### 5.8 Refunds and certificates
| ID | Requirement | Priority | Verification |
| :--- | :--- | :---: | :--- |
| FR-RFC-001 | An eligible learner shall submit a refund request with a reason within the displayed policy period. | M | Test |
| FR-RFC-002 | Staff shall manage Requested, Under Review, Approved, Rejected and Processed states. | M | Test |
| FR-RFC-003 | A refund shall become Processed only after staff record the manual transfer amount, date and reference. | M | Test |
| FR-RFC-004 | Refund state changes shall appear in the learner portal and trigger an email. | M | Test |
| FR-RFC-005 | An admin shall mark an enrollment completed before certificate generation becomes available. | M | Test |
| FR-RFC-006 | The system shall generate a PDF from the certificate template attached to the course or batch. | M | Test |
| FR-RFC-007 | The PDF shall insert verified learner name, course, batch, date and a unique certificate number in fixed fields. | M | Test |
| FR-RFC-008 | Certificate issue, reissue and revocation shall be recorded and limited to authorized staff. | M | Test |

### 5.9 Events mentors and reviews
| ID | Requirement | Priority | Verification |
| :--- | :--- | :---: | :--- |
| FR-EVT-001 | Admins shall manage event information, date, time, venue, cover, capacity, registration period and status. | M | Test |
| FR-EVT-002 | The event listing shall show Upcoming and Previous views and shall keep past event pages available. | M | Test |
| FR-EVT-003 | Free registration shall prevent duplicate email registration, enforce capacity and create a unique pass number. | G | Test |
| FR-EVT-004 | The system shall email the event pass and logistics. Event entry and attendance shall remain manual. | G | Test |
| FR-EVT-005 | A previous event may publish a short outcome summary and optimized photo gallery. | G | Inspection |
| FR-MEN-001 | Admins shall manage mentor photo, designation, biography, expertise, links and related courses or events. | G | Test |
| FR-REV-001 | Admins shall publish reviews only after recording consent. The system shall not provide a public review form. | G | Inspection |

### 5.10 Assessment contact language and analytics
| ID | Requirement | Priority | Verification |
| :--- | :--- | :---: | :--- |
| FR-OTH-001 | The initial assessment shall contain 15 questions across industry awareness, internship preparation and workplace readiness. | M | Inspection |
| FR-OTH-002 | Each option shall have a configurable score from 0 to 4. The server shall calculate an overall percentage. | M | Test |
| FR-OTH-003 | The result label shall be Needs Improvement for 0 to 39, Fair for 40 to 59, Good for 60 to 79 and Excellent for 80 to 100. | M | Test |
| FR-OTH-004 | The final step shall collect name, email and data consent, store the response and email the score and label. | M | Test |
| FR-OTH-005 | The assessment shall not affect enrollment, membership or certificate eligibility. | M | Inspection |
| FR-OTH-006 | The contact page shall publish official contact details and store a protected inquiry before notifying staff by email. | M | Test |
| FR-OTH-007 | The public interface shall switch system labels between English and Bangla while editorial content remains English. | M | Test |
| FR-OTH-008 | Operational reports shall include enrollment, revenue, discount, payment, refund, event, assessment, certificate and active learner data with CSV export. | M | Test |
| FR-OTH-009 | Traffic analytics shall exclude names, email, phone, application reference, payment reference and assessment answers. | M | Inspection |

### 5.11 Administration and operational records
| ID | Requirement | Priority | Verification |
| :--- | :--- | :---: | :--- |
| FR-ADM-001 | The administration portal shall provide record search, filters, pagination and clear empty states for staff lists. | M | Test |
| FR-ADM-002 | Admin and Super Admin permissions shall follow the approved permission matrix on every protected action. | M | Test |
| FR-ADM-003 | Staff shall export authorized enrollment, payment, refund, event, survey and certificate records as CSV. | M | Test |
| FR-ADM-004 | The system shall record who generated each export and when it was generated. | M | Test |
| FR-ADM-005 | Staff shall view contact inquiries, assign a handling status and record internal resolution notes. | M | Test |
| FR-ADM-006 | Super Admin shall manage staff account state, role, factor recovery and service settings. | M | Test |

---

## 6 Use cases and workflows

### UC-01 Enroll in a paid batch
- **Primary actor:** Visitor or existing learner
- **Precondition:** The batch is published, enrollment is open and a seat is available or not limited.
- **Trigger:** The user selects Enroll on a batch.
- **Main flow:**
  1. The system displays the universal form and the selected batch summary.
  2. The user submits valid details and accepts the privacy and refund notices.
  3. The system creates a reference, pending enrollment and temporary seat hold.
  4. The server calculates the final fee and opens SSLCOMMERZ hosted checkout.
  5. SSLCOMMERZ sends the notification and the server validates the transaction.
  6. The system marks payment paid, confirms enrollment, emails the receipt and activates or links the account.
- **Alternate flow:**
  1. If payment fails or is cancelled, the system records the attempt and offers retry while the batch is available.
  2. If the callback is repeated, the system returns the existing confirmed result.
  3. If the transaction is risky or the amount differs, the system holds the enrollment for review.
- **Result:** One paid enrollment and one learner account exist. The receipt and transaction are auditable.

### UC-02 Register for a free event
- **Primary actor:** Visitor
- **Precondition:** The event is published, registration is open and capacity is available.
- **Trigger:** The visitor selects Register Free.
- **Main flow:**
  1. The visitor submits name, email, phone when required and consent.
  2. The system checks duplicate email and available capacity.
  3. The system stores the registration and unique pass number.
  4. The system emails the event pass and shows confirmation.
- **Alternate flow:**
  1. A duplicate receives the existing registration message.
  2. A full or closed event does not accept the form.
  3. Email failure is logged and may be resent by staff.
- **Result:** The registration is available to staff. Entry remains manual.

### UC-03 Issue a certificate
- **Primary actor:** Admin
- **Precondition:** The learner has a confirmed enrollment, the batch is complete and a valid certificate template exists.
- **Trigger:** The admin marks the learner successfully completed and selects Generate Certificate.
- **Main flow:**
  1. The system checks role, completion state and certificate name.
  2. The server generates a PDF using the course or batch template.
  3. The system assigns a unique certificate number and saves the issue record.
  4. The learner receives an email and may download the PDF from the portal.
- **Alternate flow:**
  1. A name correction requires admin review and reissue.
  2. A revoked certificate remains in audit history but is unavailable to the learner.
- **Result:** The issued PDF is tied to the learner enrollment and can be reissued or revoked by staff.

### UC-04 Request and process a refund
- **Primary actor:** Learner and Admin
- **Precondition:** The learner has an eligible paid enrollment within the policy period.
- **Trigger:** The learner opens the enrollment and selects Request Refund.
- **Main flow:**
  1. The learner submits the reason.
  2. The system creates a Requested record and notifies staff.
  3. Staff reviews and records Approved or Rejected.
  4. If approved, the authority transfers the money manually.
  5. Staff records the amount, date and reference and sets Processed.
  6. The learner receives the updated status and email.
- **Alternate flow:**
  1. An ineligible or late request is blocked with the policy explanation.
  2. A rejected request closes with a reason.
- **Result:** The refund workflow is auditable. The website never transfers refund money automatically.

### 6.1 Workflow diagrams
- **Figure 3:** Paid and free enrollment paths: Choose course and batch -> Submit universal enrollment -> Create pending enrollment and seat hold -> (If paid: Open hosted payment checkout -> Payment validated -> Receipt and account; or Failed/cancelled/expired -> Retry or release seat; If free: Free batch skips payment and activates after validation).
- **Figure 4:** Payment validation sequence: Applicant browser -> Next.js server -> SSLCOMMERZ -> Database and email. (Rule: the success redirect can display a pending result, but only the validated gateway notification may mark payment as paid).
- **Figure 5:** Refund request states: Requested -> Under review -> (Approved -> Manual transfer -> Processed) OR (Rejected -> Closed with reason).

---

## 7 Business rules

| ID | Rule |
| :--- | :--- |
| BR-01 | A person does not become an active learner until a paid transaction is validated or a free enrollment is confirmed. |
| BR-02 | A browser return from SSLCOMMERZ cannot confirm payment without server validation. |
| BR-03 | One email may enroll in multiple courses and batches, but cannot hold duplicate confirmed enrollment in the same batch. |
| BR-04 | A batch-specific discount replaces a universal discount. Discount values never stack. |
| BR-05 | A seat is counted as sold only after confirmation. A temporary hold expires after the configured checkout period. |
| BR-06 | A closed or full batch cannot start a new paid checkout. |
| BR-07 | An applicant record does not count as an authenticated user until Auth access is created and used. |
| BR-08 | Pending applicants use status lookup and do not receive a learner session. |
| BR-09 | Only a Super Admin may manage staff accounts, service settings, universal discounts and financial corrections. |
| BR-10 | Admin publishing does not require Super Admin approval, but every publish and archive action is recorded. |
| BR-11 | A refund may be approved in the website, but becomes Processed only after manual transfer details are recorded. |
| BR-12 | A certificate requires an admin-recorded successful completion and a certificate template. |
| BR-13 | The certificate name comes from the verified certificate-name field, not an editable display name. |
| BR-14 | Event registration is free and creates no learner account. |
| BR-15 | Assessment participation creates no learner account and has no effect on admission, payment or certification. |
| BR-16 | Public reviews require recorded consent and staff approval. |
| BR-17 | Editorial content remains English. The language switch translates interface labels and system messages only. |
| BR-18 | Financial, enrollment, refund and certificate records are archived or disabled, not erased through the normal interface. |

---

## 8 Data requirements

### Core data relationships (Figure 6)
- Course (`course_id`) -> Batch (`batch_id`, fee, capacity) -> Enrollment (`status`, reference) <-> Payment (`transaction`, amount)
- Batch -> Discount (`scope`, value, dates)
- Profile (`auth_user_id`, role) -> Announcement (`batch_id`)
- Enrollment -> Certificate (`enrollment_id`, number)
- Enrollment -> Refund request (`enrollment_id`, status)
- Protected actions -> Audit event (`actor`, action, time)
- Event and registration (`event_id`, attendee, pass)
- Assessment response (`answers`, score, label)
- Content and media (`content`, media, draft, publish state)

### 8.1 Entity catalogue
| Entity | Purpose | Minimum data |
| :--- | :--- | :--- |
| Course | Reusable course content and publication state. | Course ID, title, slug, summary, outcomes, topics, mentors, FAQ, refund policy, status. |
| Batch | Dated course offering. | Batch ID, course ID, dates, schedule, venue, capacity, fee, enrollment window, status. |
| Enrollment | Application and learner relationship to a batch. | Reference, batch, identity data, consent, status, account link, timestamps. |
| Payment attempt | One interaction with the payment gateway. | Transaction IDs, requested and validated amounts, status, risk data, raw reference, timestamps. |
| Discount | Universal or batch fee adjustment. | Scope, type, value, start, end, status, creator. |
| Profile | Activated learner or staff record. | Auth user ID, verified email, certificate name, role, account state, contact data. |
| Refund request | Manual refund approval and transfer record. | Enrollment, reason, status, decision, amount, transfer reference, timestamps. |
| Certificate | Issued certificate and lifecycle. | Enrollment, number, template, file, issued, reissued, revoked, actor. |
| Event | Public event content and registration settings. | Event ID, dates, venue, capacity, registration window, status, gallery. |
| Event registration | Free attendee record and pass. | Event, attendee, pass number, consent, email state, timestamps. |
| Assessment response | Answers and result for one participant. | Question version, answers, total, percentage, label, participant, consent, email state. |
| Content record | Managed public content. | Type, locale label, content, media, draft, publish state, editor, timestamps. |
| Audit event | Protected action history. | Actor, action, target, before and after reference, IP context, time. |

### 8.2 Data validation and integrity
- Use stable internal IDs and unique public references that do not expose sequential database IDs.
- Validate and normalize email and phone values before duplicate checks.
- Store money in the smallest currency unit or a precise decimal type. Never use floating point for payment totals.
- Store payment and discount snapshots so later fee changes do not alter historical receipts.
- Use database constraints or transactions for capacity, duplicate enrollment and idempotent payment confirmation.
- Do not store card number, CVV, mobile wallet credential or other payment authentication data.

### 8.3 Data retention and deletion
| Data | Minimum treatment |
| :--- | :--- |
| Payment, receipt and refund | Retain according to LNA accounting and legal policy. Restrict access and preserve audit history. |
| Enrollment and certificate | Retain while needed to prove enrollment and certificate issue. Archive inactive accounts. |
| Event registration | Retain only as long as needed for event operations and reporting policy. |
| Assessment response | Retain according to the consent notice; separate marketing consent from result delivery. |
| Contact inquiry | Delete or anonymize after the support and retention period. |
| Logs and audit | Retain long enough for security, payment investigation and operational review. |

### 8.4 Data classification
| Class | Examples | Handling |
| :--- | :--- | :--- |
| Public | Published courses, events, mentors and approved reviews. | Cacheable and indexable when published. |
| Internal | Operational reports, content drafts and staff notes. | Authenticated staff access only. |
| Personal | Applicant, learner, event and assessment identity data. | Purpose-limited access, retention and export controls. |
| Sensitive operational | Payment references, role changes, refund details and audit events. | Restricted access, logging and protected transport. |

---

## 9 Integration requirements

### 9.1 SSLCOMMERZ
- Use hosted checkout. Create the transaction session on the server and pass success, fail, cancel and IPN URLs.
- Validate each successful notification with the Order Validation API and compare transaction ID, status, currency and amount.
- Use separate sandbox and live credentials and endpoints. Sandbox tests must cover success, failure, cancellation, expiry, duplicate notification, delayed notification, amount mismatch and risk flag.
- Log gateway references and validation outcomes without logging credentials or payment authentication data.

### 9.2 Supabase
- Use PostgreSQL for operational data and Supabase Auth for activated learners and staff.
- Keep privileged keys in server-only environment variables. Use Row Level Security for browser-accessible data and enforce ownership on server routes.
- Use connection pooling or supported serverless access for server workloads. Apply versioned migrations for schema changes.

### 9.3 Email
- Use a verified sender domain and templates for assessment result, enrollment, receipt, activation, reset, event pass, announcement, refund, certificate and contact alert.
- Record delivery request, provider message ID, state, retry count and last error. Do not block a validated payment on email delivery.
- Use idempotency keys or message records to prevent duplicate transactional email after repeated gateway callbacks.

### 9.4 Analytics
- Use privacy-friendly traffic analytics for baseline page use and GA4 for campaign attribution and conversion funnels.
- Load consent-dependent analytics according to the approved cookie and privacy settings.
- Never send personal identity, application reference, transaction reference or assessment answers to traffic analytics.

### 9.5 Deployment model
Figure 7 Logical deployment and service boundary:
- Browser Static pages and forms -> Next.js hosting CDN cache / Server routes / Scheduled jobs.
- Server routes communicate with: Supabase PostgreSQL and Auth, SSLCOMMERZ Hosted checkout, Email service (Transactional delivery), Media storage (Public images), Monitoring (Logs and alerts).

---

## 10 Quality requirements

| ID | Quality | Requirement | Verification |
| :--- | :--- | :--- | :--- |
| NFR-PER-01 | Performance | Core public pages should meet 75th percentile LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 under supported mobile conditions after production measurement. | Field measurement and lab test |
| NFR-PER-02 | Capacity | Architecture shall support about 100,000 public visits per month and short bursts near 500 concurrent readers through caching and CDN delivery. | Load analysis and test |
| NFR-PER-03 | Transaction load | Payment, enrollment and event write endpoints shall be tested separately against expected simultaneous submissions and external provider limits. | Load test |
| NFR-AVL-01 | Availability | Public content shall remain available when a nonessential analytics or email provider is unavailable. Transaction errors shall provide a retry or recorded pending state. | Failure test |
| NFR-SEC-01 | Authorization | Every protected page and API shall enforce account state, role and ownership on the server. | Security test |
| NFR-SEC-02 | Secrets | Credentials and service-role keys shall remain in protected environment settings and shall not appear in browser code, logs or exports. | Inspection |
| NFR-SEC-03 | Abuse controls | Login, status lookup, assessment, event, contact and payment initiation shall use suitable rate limits and automated abuse controls. | Security test |
| NFR-SEC-04 | Session security | Cookies and sessions shall use secure settings, reasonable expiry, logout and server revocation after role or account state changes. | Security test |
| NFR-PRI-01 | Privacy | Forms shall collect only required data, show the relevant notice and separate operational consent from optional marketing consent. | Inspection |
| NFR-A11Y-01 | Accessibility | Core journeys shall target WCAG 2.2 AA, including keyboard access, focus, labels, contrast, error identification, text resizing and reduced motion. | Accessibility audit |
| NFR-SEO-01 | Search visibility | Published public pages shall provide stable URLs, metadata, social images, sitemap entries and appropriate structured data. Private and draft pages shall be excluded. | Inspection |
| NFR-CMP-01 | Compatibility | The release shall support current Chrome, Edge, Safari and Firefox and common mobile widths from 320 px. | Cross-browser test |
| NFR-BCK-01 | Backup | Production shall have automated database backup, documented retention, restore testing and an owner for recovery. | Restore demonstration |
| NFR-OBS-01 | Monitoring | Production shall capture application errors, failed jobs, payment validation errors, email failures and service health without recording secrets. | Demonstration |
| NFR-MNT-01 | Maintainability | Schema changes shall use migrations; configuration shall be environment-specific; critical workflows shall have automated tests and documented runbooks. | Inspection |

### 10.1 Security controls
| Control area | Required control |
| :--- | :--- |
| Authentication | Password policy, verified email, staff second factor, factor recovery, session expiry and logout. |
| Authorization | Role and ownership checks on server routes, database policies and export operations. |
| Input | Schema validation, output encoding, upload validation, file type limits and parameterized database access. |
| Payment | Hosted checkout, server validation, amount comparison, idempotency, risk hold and audit history. |
| Audit | Staff role, discount, payment, refund, certificate and publishing actions recorded with actor and time. |
| Operations | Secret rotation, dependency updates, monitoring, backups, incident response and access review. |

### 10.2 Reliability and recovery
| Condition | Required response |
| :--- | :--- |
| Payment provider delay | Keep the enrollment pending, accept delayed notification and allow staff reconciliation. |
| Email provider failure | Keep the completed transaction, log the failure and allow safe resend. |
| Database write conflict | Return one consistent result and prevent duplicate enrollment, seat or receipt. |
| Deployment failure | Stop the release or use the documented rollback without losing committed production data. |
| Backup recovery | Restore to an isolated environment, verify core records and record the recovery test result. |

---

## 11 User experience requirements

### 11.1 Design principles
- Use one primary action per screen and place supporting actions after the main decision.
- Use plain field labels and examples. Avoid technical terms in public and routine admin screens.
- Show status with text and color. Do not depend on color alone.
- Keep course, batch, fee, discount, deadline, schedule and venue visible before payment.
- Keep destructive or financial actions separate and require confirmation with the affected record named.

### 11.2 Responsive behaviour
| Width | Expected behaviour |
| :--- | :--- |
| 320 to 599 px | Single-column layout, compact navigation, stacked cards, full-width form controls and no horizontal table scrolling in core learner flows. |
| 600 to 1023 px | Two-column cards where space permits, collapsible admin menu and readable tables with prioritized columns. |
| 1024 px and above | Full navigation, multi-column public sections, fixed admin menu and detailed operational tables. |

### 11.3 Form states
| State | Behaviour |
| :--- | :--- |
| Default | Clear label, optional explanation, expected format and visible required marker. |
| Validation error | Message beside the field, summary at the top for long forms, valid values preserved. |
| Submitting | Disable duplicate action and show progress without losing entered data. |
| Success | Show reference, status, next step and delivery expectation. |
| Recoverable failure | Keep the record or input, explain the retry and provide support reference. |
| Closed or unavailable | Explain the status and remove actions that cannot succeed. |

### 11.4 Administration usability
- Use consistent Create, Edit, Save Draft, Preview, Publish, Archive and Export actions.
- Provide search, filter, pagination and clear empty states for staff record lists even though the public site has no text search.
- Show dependencies before archive or correction, such as existing paid enrollments or issued certificates.
- Desktop is the primary staff workspace; essential review and status actions remain usable on mobile.

---

## 12 Testing and acceptance

### 12.1 Acceptance environments
Acceptance testing uses a staging environment, SSLCOMMERZ sandbox credentials, test sender identities and representative desktop and mobile browsers. Production credentials and live payment tests are introduced only after staging approval and service onboarding.

### 12.2 Required end-to-end tests
| ID | Journey | Pass condition |
| :--- | :--- | :--- |
| AT-01 | Paid enrollment | Valid form, discount, seat hold, hosted payment, validated notification, receipt, account and learner access complete once. |
| AT-02 | Payment failure | Failure and cancellation remain pending, allow retry and do not activate account or consume a confirmed seat. |
| AT-03 | Duplicate notification | Repeated callback changes no totals and produces no duplicate receipt, account or enrollment. |
| AT-04 | Capacity | Concurrent attempts cannot confirm more learners than configured capacity; expired holds release. |
| AT-05 | Free enrollment | No payment session opens; confirmation and account activation follow validation. |
| AT-06 | Applicant status | Correct reference and email return limited status; invalid attempts are rate limited and reveal no personal record. |
| AT-07 | Learner authorization | A learner cannot access another learner’s receipt, refund, certificate or profile by changing a URL or request. |
| AT-08 | Staff security | Both approved second-factor paths work; role and recovery restrictions are enforced. |
| AT-09 | Refund | Request, decision and manual processing reference appear in staff and learner views with email updates. |
| AT-10 | Certificate | Only completed enrollment generates a correctly filled PDF. Reissue and revocation are logged. |
| AT-11 | Event | Capacity and duplicate rules work; pass delivery is logged and resend works. |
| AT-12 | Assessment | Fifteen responses produce expected score and label; result email sends; no Auth account is created. |
| AT-13 | Publishing | Draft remains private; publish updates public content; archive removes public action without deleting history. |
| AT-14 | Analytics privacy | Consent rules apply and prohibited personal fields do not appear in traffic analytics payloads. |
| AT-15 | Accessibility | Keyboard, focus, labels, errors, contrast, text resize and reduced motion pass the agreed audit. |

### 12.3 Requirement completion
A requirement is complete when implementation, review evidence and its acceptance test have passed in staging; related content and operating procedures are available; no unresolved defect blocks the primary journey; and the business owner approves the result.

---

## 13 Deployment and operations

| Environment | Purpose | Rules |
| :--- | :--- | :--- |
| Development | Local and shared feature development. | Test data only; no production credentials. |
| Staging | Stakeholder review, QA, sandbox payment and migration rehearsal. | Production-like configuration with isolated data and test services. |
| Production | Live public and protected system. | Controlled release, monitoring, backup, least privilege and rollback plan. |

### 13.1 Release process
1. Review code, database migration, configuration and content changes.
2. Deploy to staging and run automated, security, accessibility and end-to-end tests.
3. Rehearse database migration and rollback with a current staging copy.
4. Approve production change window and confirm payment, email, monitoring and backup readiness.
5. Deploy, run smoke tests and monitor payment, enrollment, email and error metrics.
6. Record release version, migration result, incidents and rollback decision.

### 13.2 Operating responsibilities
| Responsibility | Owner to assign |
| :--- | :--- |
| Public content accuracy and impact figures | LNA content owner |
| Course fee, capacity, schedule and refund policy | LNA course operations |
| Payment reconciliation and manual refunds | LNA finance or authorized management |
| Staff accounts and access review | LNA Super Admin |
| Service health, backups, updates and incident response | Technical owner |
| Privacy notices, retention and consent wording | LNA management and legal adviser where required |

---

## 14 Risks and open implementation inputs

| Item | Required decision or input | Effect if missing |
| :--- | :--- | :--- |
| Final brand system | Logo files, colors, typography and photo direction. | Final UI cannot be approved. |
| Survey content | Fifteen approved questions, options and 0 to 4 weights. | Assessment cannot be tested or published. |
| Certificate template | A4 landscape artwork and fixed field positions per course or batch. | Certificate generation cannot be completed. |
| Policies | Privacy, Terms, Refund Policy, retention and consent wording. | Forms and payment cannot launch. |
| Merchant onboarding | Live SSLCOMMERZ account, credentials, callback domain and reconciliation owner. | Paid enrollment remains in sandbox. |
| Email sender | Verified domain, sender identities and approved templates. | Operational messages may be delayed or rejected. |
| Bangla interface copy | Approved translations for navigation, buttons, validation and status messages. | Language switch cannot launch fully. |
| Service plans | Production hosting, database, backup, storage, email and analytics plan. | Capacity, backup and operating cost remain uncertain. |

---

## 15 Requirement traceability

| Business need | Requirements | Acceptance | Design appendix |
| :--- | :--- | :--- | :--- |
| Public information and conversion | FR-PUB, FR-CMS, FR-CRS | AT-13, AT-15 | A01, A02 |
| Course enrollment and payment | FR-ENR, FR-PAY | AT-01 to AT-05 | A03, A04 |
| Account and learner service | FR-AUT, FR-LRN | AT-06 to AT-08 | A08 to A10 |
| Refund and certificate | FR-RFC | AT-09, AT-10 | A10, A13 |
| Events and community content | FR-EVT, FR-MEN, FR-REV | AT-11, AT-13 | A06, A07 |
| Assessment and contact | FR-OTH-001 to 007 | AT-12, AT-15 | A05, A07 |
| Administration and reporting | FR-CMS, FR-OTH-008 to 009 | AT-13, AT-14 | A11 to A14 |
| Quality and operations | NFR series | AT-14, AT-15 and operations tests | Shared patterns |

---

## Appendix A Page design concepts
The page concepts translate the approved requirements into visible layouts. They define information order, actions, states and responsive intent. Final colors, imagery, typography and spacing will be completed during UI design. Data shown in the concepts is sample data.

- **A01 Homepage:** Shows the final homepage order, a three-slide hero, the separate assessment invitation, verified impact, course fallback space, events, reviews and mentors. (Figure 8)
- **A02 Course catalogue and details:** Shows status grouping, course content, batch selection, capacity, fee, discount and enrollment action. (Figure 9)
- **A03 Enrollment and fee review:** Shows the universal form, consent, selected batch and the exact price calculation before checkout. (Figure 10)
- **A04 Payment result and status lookup:** Shows success, cancellation, retry and limited public status lookup. (Figure 11)
- **A05 Assessment:** Shows one question, progress, answer choices and the short email result. (Figure 12)
- **A06 Events and registration:** Shows upcoming and previous navigation, free registration and the email pass. (Figure 13)
- **A07 Mentor profile and contact:** Shows public mentor content and the protected inquiry form. (Figure 14)
- **A08 Login and staff verification:** Shows email and password plus both approved staff second-factor options. (Figure 15)
- **A09 Learner overview:** Shows active course, next class, payment, certificate and announcements. (Figure 16)
- **A10 Learner course and records:** Shows schedule, venue, receipt, refund and certificate controls. (Figure 17)
- **A11 Admin operations overview:** Shows management totals, trend data and work that needs attention. (Figure 18)
- **A12 Admin course and batch editor:** Shows simple structured forms, separate course and batch data, preview and publishing. (Figure 19)
- **A13 Admin operational records:** Shows enrollment, payment, refund and certificate work with clear status. (Figure 20)
- **A14 Admin content and reporting:** Shows homepage content, event and survey totals, analytics and exports. (Figure 21)

---

## Appendix B Glossary and references
| Term | Meaning |
| :--- | :--- |
| AAL | Authenticator Assurance Level used to distinguish password-only and second-factor sessions. |
| CDN | Content delivery network used to cache public assets and pages close to visitors. |
| CLS | Cumulative Layout Shift, a measure of visual movement during page loading. |
| CSV | Comma-separated values file used for staff exports. |
| GA4 | Google Analytics 4. |
| INP | Interaction to Next Paint, a measure of interface responsiveness. |
| LCP | Largest Contentful Paint, a measure of main content loading. |
| RLS | Row Level Security used to enforce database access rules. |
| TOTP | Time-based one-time password generated by an authenticator app. |

