# Wild Excursions web app

Next.js 16 and React 19 frontend for the jungle safari planner. Next.js route
handlers provide the backend API, and PostgreSQL/Supabase stores jungle content,
image URLs, availability snapshots, and enquiries.

## Run locally

Create `.env.local` with `DATABASE_URL`, then run:

```bash
npm install
npm run dev
```

## Main data paths

- `src/lib/jungles.ts` reads jungle content and image URLs from PostgreSQL.
- `src/app/api/jungles/route.ts` exposes the public jungle catalogue.
- `src/app/api/availability/route.ts` reads scraper-produced availability.
- `src/app/api/enquiry/route.ts` accepts booking enquiries.
- `../db/` contains the schema, seed data, and production migrations.
