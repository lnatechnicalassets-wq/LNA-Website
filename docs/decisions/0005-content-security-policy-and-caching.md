# 0005. Content Security Policy and CDN Revalidation Strategy (D-CSP)

**Status:** Accepted  
**Date:** 3 November 2026  
**Deciders:** Refat (Owner), Engineering Agent  
**Citations:** Blueprint Part 7.5; SRS Section 10.1, NFR-PER-01, NFR-PER-02  

## Context
The site must support ~100,000 monthly visits and 500-reader concurrent bursts (NFR-PER-02) via edge caching. Strict Content Security Policy (CSP) with dynamic per-request nonces prevents caching on edge CDNs if applied universally across all routes.

## Decision
1. **Dynamic Pages (Strict Nonce CSP):**
   - Pages handling interactive forms, authentication, payment callbacks, learner portals, and administration routes are rendered dynamically with a per-request cryptographically secure nonce.
2. **Static Browsing Pages (Hash/Integrity CSP):**
   - Public browsing pages (Homepage, About, Courses catalogue, Event details) are statically generated and cached on the edge CDN.
   - Script security is enforced via build-time script hashes or subresource integrity (SRI), falling back to evaluated domain restrictions without nonces to maintain cacheability.
3. **On-Demand Tag Revalidation:**
   - Content updates trigger targeted Next.js tag revalidation (`revalidateTag`) through a unified service wrapper (`src/lib/cache/revalidate.ts`), avoiding full-site redeployments (SRS 4.3).

## Consequences
- Protects interactive forms and authenticated sessions from XSS.
- Preserves full CDN edge caching for high-volume public reading traffic.

