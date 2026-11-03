# 0003. In-House SSLCOMMERZ Hosted Checkout Client

**Status:** Accepted  
**Date:** 3 November 2026  
**Deciders:** Refat (Owner), Engineering Agent  
**Citations:** Blueprint Part 3.1, 3.2, 7.4; SRS Section 9.1, Business Rule BR-02  

## Context
Payment processing in Bangladesh requires integration with SSLCOMMERZ. Third-party npm packages for SSLCOMMERZ are unmaintained, unaudited, or introduce unnecessary attack surface. Additionally, introducing separate direct integrations (e.g. direct bKash) duplicates reconciliation overhead and security risk for no SRS requirement.

## Decision
1. **In-House Client:** Implement a lightweight, strictly typed in-house client (~150 lines) using standard `fetch` under `src/server/payments/sslcommerz.ts`.
2. **Hosted Checkout:** Direct all payments through SSLCOMMERZ hosted checkout redirect. Card/wallet credentials never touch the application.
3. **Exclusion of Secondary Direct Gateways:** Exclude direct bKash/Nagad APIs. Mobile wallets are surfaced via the SSLCOMMERZ hosted payment gateway.
4. **Mandatory Server Validation:** Browser redirects (`success`, `fail`, `cancel`) are never trusted to mark a payment as paid. Payment is only confirmed upon successful server-to-server Order Validation and hash verification inside `confirm_payment()`.

## Consequences
- Eliminates supply-chain risks from third-party gateway wrappers.
- Minimizes PCI DSS scope to SAQ A.
- Ensures all payment methods (Cards, bKash, Nagad) are processed through a single, audited reconciliation pipeline.

