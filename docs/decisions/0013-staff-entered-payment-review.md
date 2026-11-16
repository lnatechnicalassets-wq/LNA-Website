# 0013. Staff-entered payment review

**Status:** Accepted for staff-entered admissions

**Date:** 16 November 2026

**Related:** ADR 0009, FR-ADM-002, FR-CRS-006, FR-PAY-005, FR-PAY-006, BR-02

## Decision

Paid applications created through **Add student** can record an external bKash transaction ID or bank transfer reference. A recorded reference leaves the application in process. It carries no seat hold and queues no confirmation.

The existing active Super Admin and TOTP assurance requirement applies to recording and review. A Super Admin compares the reference and received amount with LNA’s merchant history or bank statement. Approval requires the exact saved BDT fee. The review transaction locks the batch, checks remaining capacity and replayed references, records the reviewer and timestamp, confirms the seat, and queues one confirmation. A rejected reference cancels the application and retains the review history.

ADR 0009 governs public hosted checkout. Its server-side execute and query requirements apply to every hosted gateway payment. Staff review only accepts records created for this purpose. It cannot approve a hosted checkout or change its verification outcome. Both paths share the seat count and treat a bKash reference claimed by either as unavailable to the other. Free registration continues to use the free-admission flow.
