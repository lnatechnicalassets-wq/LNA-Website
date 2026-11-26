# 0013. Staff-entered payment review

**Status:** Superseded in part by LNA Rev3.0 (`ADM-04`, `PAY-03`–`PAY-08`, `PAY-11`, `PAY-13`, `C-01`–`C-05`, `C-11`–`C-16`, `D07`, `D14`–`D24`)  
**Date:** 16 November 2026 (Amended 26 November 2026)  
**Related:** ADR 0009, FR-ADM-002, FR-CRS-006, FR-PAY-005, FR-PAY-006, BR-02

## Decision

Paid applications created through **Add student** can record an external bKash transaction ID or bank transfer reference. A recorded reference leaves the application in process. It carries no seat hold and queues no confirmation.

The existing active Super Admin and TOTP assurance requirement applies to recording and review. A Super Admin compares the reference and received amount with LNA’s merchant history or bank statement. Approval requires the exact saved BDT fee. The review transaction locks the batch, checks remaining capacity and replayed references, records the reviewer and timestamp, confirms the seat, and queues one confirmation. A rejected reference cancels the application and retains the review history.

ADR 0009 governs public hosted checkout. Its server-side execute and query requirements apply to every hosted gateway payment. Staff review only accepts records created for this purpose. It cannot approve a hosted checkout or change its verification outcome. Both paths share the seat count and treat a bKash reference claimed by either as unavailable to the other. Free registration continues to use the free-admission flow.

---

## Rev3.0 Amendment Note (`W0-E01`)
- **Superseded Workflow (`ADM-04`, `PAY-03`–`PAY-05`, `C-01`–`C-05`, `C-14`–`C-16`):** Target `W4-T05` replaces pending two-step self-review with a single-step direct **Add Student** commit using identical shared application fields (`C-01`), **both** `Admin` and `Super Admin` roles (`SEC-02`/`D64`), and **five paid-batch payment options** (`Cash`, `Full Fee Waiver`, `Partial Fee Waiver`, `Bank Transfer`, `bKash Transfer` — Sponsor Payment removed; free batches require no payment/reference).
- **Retained / Refined Invariants:** Paid-batch manual options require a mandatory trimmed reference (`>=1` char); `bKash Transfer` still blocks collisions against canonical gateway TrxIDs (`D20`); individual fees are editable without changing batch fees (`C-15`); verified online gateway receipts cannot be edited (`PAY-08`); `PAY-11`/`C-11` allows associating verified unallocated receipts atomically; `PAY-13`/`C-16` issues branded PDF payment receipts for actual positive collections.
