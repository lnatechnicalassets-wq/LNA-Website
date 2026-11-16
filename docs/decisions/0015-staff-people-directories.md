# 0015. Staff mentor and student directories

**Status:** Accepted for the staff workflow

**Related:** FR-ADM-002, FR-CRS-001, FR-CMS-002, BR-18

Mentor profiles reuse the existing mentor records. Active mentors can be selected on a batch's mentor cards. Assigning a mentor saves the ordered batch roster after the Super Admin confirms the course and cohort. A batch without its own roster uses the course roster. Archiving keeps existing references and removes the profile from the active directory and roster picker. New mentor profiles start unpublished.

Student profiles sit alongside enrollments and confirmed admissions link to their directory profile. The original enrollment fields stay with the application. A normalized email and phone pair identifies a match. Sharing only an email or phone does not justify combining two profiles. Corrections keep previous pairs as aliases so historical enrollment links remain intact. Staff can record completed courses with an optional past cohort and completion date. A completion entry does not change seat occupancy or payment history.

The two directories are available to active Super Admins with a verified second factor. Browser API roles have no access to private student tables or management functions. The staff RPCs use revision checks and record audit events. Both directories support reversible archiving.
