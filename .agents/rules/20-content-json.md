# 20. Content Architecture & JSON Rules

**Authority:** Blueprint Part 5; SRS Section 4.1, 4.3, 5.2, 8.4  
**Scope:** Applies to all static content, mock data, schemas, and content repository consumers.

---

## 1. Core Content Principles
1. **Separation of Presentation and Code:** No visible copy, headings, partner logos, statistics, or contact details may be hardcoded into React components. All text comes from `@/lib/content` repositories or `next-intl` message keys via `t()`.
2. **Direct Imports Banned:** Components may never import files from `/content/` directly. All access must be routed through `@/lib/content` repository interfaces.
3. **Operational Records Excluded:** Learner profiles, transaction records, seat holds, receipts, and certificates are **Class C (Operational)** data and must **never** exist in JSON.

---

## 2. Directory Tree
```
content/
├── site/
│   ├── organization.json      # Address, email, phone, business hours
│   ├── brand.json             # Brand colors, typography, logos, favicon
│   ├── navigation.json        # Header navigation, footer columns
│   ├── social.json            # Social media URLs
│   └── seo.json               # Default metadata and JSON-LD schemas
├── home/
│   ├── hero-slides.json       # 3 slides: course, assessment, event
│   ├── sections.json          # Section order and toggle states (SRS 4.1)
│   └── impact-figures.json    # Verified statistics (SRS FR-PUB-005)
├── catalog/
│   ├── courses/               # Reusable course records
│   ├── batches/               # Dated course batches
│   └── discounts.json         # Demo discount structures
├── mentors/                   # Mentor profiles with consent records
├── events/                    # Event details and schedules
├── social-proof/
│   └── reviews.json           # Approved reviews with consent documentation
├── assessment/
│   └── questions.v1.json      # 15 questions with 0-4 scores (SRS 5.10)
├── messages/
│   ├── en.json                # English interface strings
│   └── bn.json                # Bangla interface strings (SRS BR-17)
├── policies/
│   ├── privacy.en.md          # Privacy policy markdown
│   ├── terms.en.md            # Terms and conditions markdown
│   └── refund.en.md           # Refund policy markdown
└── schema/                    # Zod validation schemas
```

---

## 3. Provenance & Classification Rule
Every content record in JSON must carry a valid `provenance` block:
```typescript
export const Provenance = z.object({
  class: z.enum(["A", "B"]),
  verified: z.boolean(),
  source: z.string().min(5),
  verifiedBy: z.string().nullable(),
  verifiedOn: z.string().date().nullable(),
}).refine(p => p.class === "B" || (p.verified && p.verifiedBy && p.verifiedOn));
```

- **Class A (Verified):** Verified factual claims with documented source, staff email, and date.
- **Class B (Demo / Unconfirmed):** Development and placeholder content. Rendered with a visible "Demo content" ribbon.
- **Production Build Gate:** In production (`NODE_ENV=production` and `CONTENT_STRICT=true`), the loader throws if any rendered record is Class B.

---

## 4. Repository Abstraction & Database Migration
- All consumers call repository interfaces: `CourseRepository`, `BatchRepository`, `EventRepository`, etc.
- In development, `JsonContentRepository` loads and validates JSON data using Zod.
- In production, `SupabaseContentRepository` fetches data from PostgreSQL tables.
- The environment variable `CONTENT_SOURCE_<DOMAIN>=json|supabase` selects the implementation per domain without component edits.

---

## 5. Validation Commands
Run content verification before building or committing:
```bash
pnpm content:validate
```
Validation checks:
- Strict Zod schema compliance on every file in `content/`.
- Referential integrity (batch course exists, mentor slug exists, slide link target exists).
- Secret scanning (no API keys, tokens, or passwords in JSON).
- Parity between English and Bangla message keys in `messages/`.
