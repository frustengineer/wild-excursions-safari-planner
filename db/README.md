# Database

Postgres, intended to run on Supabase (per the spec's recommended stack —
gives an instant API and auth for free, less to build for a small team).

- `schema.sql` — the five core tables (`jungle`, `zone`, `ranking`, `availability_snapshot`, `enquiry`).
- `seed.sql` — jungle content plus the zone and ranking data required by the planner.
- `migrations/` — idempotent production corrections that can be applied
  individually with `scraper/apply_schema.py <migration-file>`.

## Not yet built

- The Aadhaar/ID restricted store (separate table or separate service — DPDP guardrail from the spec). Do not add an ID column to `enquiry` or any shared table without that access-control layer in place first.
- A Google Sheet → `ranking` sync job (Phase 0/1 — "editable by a non-developer").
- Row-level security policies if/when this moves to Supabase (the anon key must not be able to read `enquiry` or anything ID-adjacent).

## Applying locally

```
psql <connection-string> -f schema.sql
psql <connection-string> -f seed.sql
```

Or, from `scraper/` with its `.env` configured:

```
python apply_schema.py migrations/2026-09-18_add_moharli_core.sql
```

To add the database-backed jungle catalogue to an existing database:

```
python apply_schema.py migrations/2026-09-28_add_jungle_content.sql
```
