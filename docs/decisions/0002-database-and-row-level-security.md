# 0002. Database Architecture and Row Level Security (RLS)

**Status:** Accepted  
**Date:** 3 November 2026  
**Deciders:** Refat (Owner), Engineering Agent  
**Citations:** Blueprint Part 3.1, 6.4, 6.5; SRS Section 8.1, 8.2, 9.2, 10.1  

## Context
The system manages financial transactions, course seat capacity, learner personal information, certificates, and administrative audit trails. Client applications and browser connections cannot be trusted with direct table mutation permissions.

## Decision
1. **Engine:** PostgreSQL managed via Supabase.
2. **Schema Control:** Version-controlled SQL migrations in `supabase/migrations/`. Applied migrations are immutable and forward-only.
3. **Data Access & Row Level Security:**
   - Every table has Row Level Security (RLS) enabled.
   - The `anon` role is restricted to published content via read-only views.
   - The `authenticated` role (learners) is restricted to records linked to `auth.uid() = profile.id`.
   - Operational tables have no client insert, update, or delete grants.
   - Critical transactional writes (seat holds, payment confirmation, refund processing) execute via Postgres RPC functions defined with `SECURITY DEFINER` and a fixed `search_path`.
4. **Types & Testing:** TypeScript types are generated using the Supabase CLI. Database policies and RPC functions are tested in CI using pgTAP.

## Consequences
- Prevents IDOR (T5) and privilege escalation at the database layer.
- Ensures concurrency safety and race condition protection (T4) using explicit row-level locks (`SELECT ... FOR UPDATE`).

