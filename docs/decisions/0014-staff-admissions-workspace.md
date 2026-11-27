# 0014. Staff admissions workspace

**Status:** Accepted for the staff workflow

**Related:** FR-ENR-003, FR-ADM-002, FR-CMS-002, FR-CMS-003, BR-03, BR-18

An active enrollment occupies its email and normalized phone number within its batch. Expired and cancelled submissions remain historical, and a learner can join more than one batch. Previously active rows sharing a phone stay in place. The migration flags additional records for correction while blocking new duplicates or conflicting confirmations.

Staff may update contact information, subject to the email lock on payment and confirmation records. Archive hides a record from the default staff list and retains enrollment, seat and transaction data. Restore makes it visible in its applicable view. Manual payment confirmation invokes the same Super Admin review checks from a dialog.

Batch mentors use a separate ordered roster of canonical mentor records. A batch with no explicit selection inherits its course roster in the staff catalog. Courses and batches support archive and restore with a recorded previous status. Archived course and batch slugs suppress matching public catalog entries, including entries from the file-based fallback.

---

## Rev3.0 Amendment Note (`W0-E01`)
- **Duplicate & Exception Rules (`ADM-05`, `D13`):** Per-batch duplicate protection checks normalized `email OR phone` across all enrollment types, with explicit audited shared-contact exceptions requiring staff reason (`ADM-05`).
- **Same-Course Moves & No Routine Purge (`ADM-09`, `ADM-12`, `W2A-T06`, `D23`):** Moving students between batches preserves the original `Moved` admission and payment lineage without double counting; routine permanent deletion of enrollments or payment records (`20261116160000`–`180000`) is **prohibited** and retired in `W2A-T06`. Batch mentor inheritance shifts to course default prefill snapshot only (`CAT-07`, `D49`), and production JSON fallback is removed after `W7-T06` cutover.
