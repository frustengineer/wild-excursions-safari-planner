# Tadoba Safari Planner (Project 3)

A recommend-only safari zone planner for Wild Excursions: a customer
picks dates and trip length, the tool recommends the best-available
zones (ranked by Wild Excursions' own sighting-quality knowledge, not
just raw availability), and captures interest as a lead. It never
books — a human confirms and books manually on the government portal.

Full architecture, decisions, and rationale: see the spec doc ("Tadoba
Safari Planner — Architecture Spec (Project 3)", 2026-09-17). This repo
is a working implementation of that spec, in phases.

Standalone for now — will be linked into `WE_website` (the main Wild
Excursions Astro site) once validated.

## Structure

```
web/       Next.js front-end + recommendation engine + backend API routes
db/        Postgres schema (jungle content, zones, rankings, availability, enquiries) — live on Supabase
scraper/   Python + Playwright availability ingestion — verified live, writes to the real DB
```

## Where things stand (2026-09-17)

The full pipeline is wired end to end and running against **real data**:

```
scraper/scrape.py  --writes-->  availability_snapshot (Supabase Postgres)
                                        |
web/src/app/api/availability/route.ts <-- reads latest snapshot per zone/date/session
                                        |
web/src/lib/engine.ts  <-- pure ranking/recommendation logic, no knowledge of the DB
                                        |
Step 2 UI  --polls every 20s + manual "Refresh now"-->  live grid + plan
```

- `web/` is a fully clickable customer journey — Home/Jungles → Jungle
  detail → 3-step booking (trip basics → build your safari → review &
  enquire) → Confirmation — reading real availability for all 4 Tadoba
  ranges and both Buffer/Core booking types.
- Jungle descriptions, ranges, animals, seasons, publishing state, and
  image URLs come from the `jungle` table through `web/src/lib/jungles.ts`
  and `/api/jungles`. Zone/ranking configuration and placeholder resort
  rates remain in `web/src/lib/mockData.ts`; live numbers come from the DB.
- `web/src/lib/engine.ts`'s `recommendSafaris`/`rankZonesForRange` are
  pure functions over an already-fetched `AvailabilitySnapshot[]` — they
  don't know or care whether that came from a test fixture or the real
  API, which is what made wiring real data a data-source swap rather
  than a logic rewrite.
- Only Kolara's Buffer zones have Hardik's real ranking. Every other
  range/type combination is ranked live by demand (how much of a zone's
  availability is booked out right now) — clearly marked in the UI
  (outlined badges, "by demand" labels) so it's never confused with
  real sighting-quality curation.
- Buffer and Core are treated as separate bookings throughout (different
  vehicle, different session count) — selectable in Step 1, never mixed
  into one plan.
- Portal availability numbers represent open gypsy vehicles, not passenger
  seats. One gypsy carries up to 6 adults/travellers aged 7+ plus 2 children
  under 7. The planner collects child ages, calculates the required vehicle
  count automatically, and only recommends slots with enough open gypsies.
- The preferred mix grows diagonally with trip length: 2N/3D recommends
  3 Buffer + 1 Core, 3N/4D recommends 4 Buffer + 2 Core, 4N/5D recommends
  5 Buffer + 3 Core, and so on. The fallback then removes one Buffer safari,
  tries the maximum Buffer-only plan, and finally one fewer Buffer safari,
  always using zone priority rankings.
  If all three fail on the requested dates, the planner searches start dates
  up to 5 days before and after, nearest first. Customers can add, replace,
  or remove individual safaris from the live availability grids.
- Recommendations are suggestions only, not automatic selections. Customers
  must explicitly add safari slots to a live cart. Safari slots, resort, and
  transfers appear as removable cart items with a running quote, and only
  those cart selections continue to the final enquiry step.

## Running it

```
cd web
npm install
npm run dev
```

Needs `web/.env.local` with `DATABASE_URL` pointing at the Supabase
project (not committed — ask whoever set it up, or create a fresh
Supabase project and re-run `scraper/apply_schema.py` +
`scraper/scrape.py` against it).

## Refreshing the availability data

The scraper is a manual one-shot right now (Phase 1 will add
scheduling — see `scraper/README.md`):

```
cd scraper
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
python -m playwright install chromium
export DATABASE_URL=...   # same value as web/.env.local
python scrape.py
```

## Guardrail to remember

Aadhaar/ID must never land in the plain shared leads sheet — mask to
last 4 digits, store the real value in a restricted, access-controlled
place, and delete once a booking resolves. The mock `/api/enquiry`
route already masks before logging; keep that boundary when this is
wired to the real Make.com webhook.

## Next steps (roughly the spec's phased plan)

1. Get Hardik's ranking for Moharli, Navegaon, Pangadi & Zari, and every
   Core zone (only Kolara buffer is ranked in `db/seed.sql`).
2. Schedule the scraper (cron/worker) instead of running it by hand, and
   add alerting for when the portal's HTML shape changes — see
   `scraper/README.md`.
3. Wire `/api/enquiry` to the real Make.com webhook with the `source`
   column, and split off the ID field to its restricted store.
4. Verify Core's terms-of-use/legal sign-off before any public launch
   (spec's own explicit pre-launch item).
