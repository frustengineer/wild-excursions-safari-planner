# Availability scraper

## Pench (Madhya Pradesh) full-vehicle scraper

`scrape_mp.py` reads the public full-vehicle table at
`https://forest.mponline.gov.in/Search.aspx?park=4`. The live page was
inspected on 2026-09-18 and differs substantially from the Maharashtra
portal, so it has its own parser and sweep:

- One search returns four dates: the selected date minus one through the
  selected date plus two.
- The table contains five Buffer/Other zones (`Khawasa`, `Khumbhpani`,
  `Masurnala`, `Rukhad`, `Teliya`) and three Core zones (`Jhamtara`,
  `Karmajhiri`, `Touria`).
- Both Morning and Evening are exposed. Evening is normalized to the
  project's existing `afternoon` database session value.
- Numeric cells are available full vehicles. A sold-out cell is an empty
  `div` whose inline background image is `Booked.png`, so the parser reads
  status assets as well as visible text. Park-close and citizen-booking-
  closed assets map to `gate-closed` and `window-closed` respectively.
- The portal states that the 120th booking day opens daily at 11:00 AM.
  The default sweep therefore uses a rolling 119-day offset horizon.

Run fast local parser tests:

```
cd scraper
.venv/Scripts/python.exe test_mp_scraper.py
```

Run a live scrape without writing to Postgres:

```
.venv/Scripts/python.exe scrape_mp.py --start-offset 20 --horizon-days 23 --dry-run
```

Before the first database write, apply `../db/seed.sql` so all eight Pench
portal keys exist in the `zone` table. Then omit `--dry-run` to append
snapshots through the same `availability_snapshot` table used by Tadoba.

Python + Playwright, per the spec's recommended stack (the govt portal is
form-based with no API — a headless browser handles it reliably). This is
the *only* module allowed to touch the portal; the recommendation engine
and front-end only ever read `availability_snapshot`.

## Status: both Buffer and Core implemented and verified live (2026-09-17)

`scrape.py` drives `https://safaribooking.mahaforest.gov.in/` end to end
for **both** booking types — form fill, date-picker navigation,
results-table parsing — confirmed against the live site with
`test_dry_run.py`:

- **Buffer:** all 17 Tadoba buffer gates parsed correctly (6 Kolara + 5
  Moharli + 2 Navegaon + 4 Pangadi & Zari), 255 cells for a 5-day window
  (17 gates × 5 dates × 3 sessions).
- **Core:** the aggregate search currently parses 5 gates and 50 cells
  for a 5-day window. The separate official Moharli zone view exposes a
  sixth gate, `Moharli Gate (Core)`, alongside `Khutwanda Gate (Core)`.
  `run_moharli_zone_check()` now reads that view on every run and replaces
  the regular feed's explicit `NA` placeholder whenever a real short-window
  count or closed status is published. Core has no Mid-Day session.
- All 6 Kolara `portal_key` values and the Core `portal_key` values in
  `../db/seed.sql` confirmed to match exactly, including the portal's
  inconsistent spacing (e.g. `"Madnapur(Buffer)"` has no space,
  `"Palasgaon (Buffer)"` does).
- Status vocabulary confirmed: numeric = available count, `Waitlist
  Booking`, `GC` (gate closed), `Booked` (full), `NA`. No `Booking
  Closed` (window-closed) cell was observed in the sample window, but
  the legend on the page defines it, so `parse_cell()` still handles it.

**Two real surprises found only by checking live, not assumed from the
spec:**
1. Core's "Safari Vehicle" option has a *different* value than Buffer's
   (`"1"` vs `"4"`) — `SAFARI_VEHICLE_VALUE` in `scrape.py` keys this by
   booking type; don't hardcode one value for both.
2. The aggregate live Core response currently returns 5 gates (Khutwanda,
   Navegaon Gate, Kolara, Pangadi, Zari), while the Moharli-specific view
   shows both Moharli Gate and Khutwanda Gate. The scraper now stores the
   regular omission as `NA` (shown as “Not listed”, never as fake inventory)
   and uses the zone-specific response when it is available. The verifier
   checks both gates. The spec's assumed vehicle types for Core
   (bus/canter) also weren't borne out — only "Safari Vehicle" was offered.

Run the verifier yourself any time the portal might have changed:

```
cd scraper
python -m venv .venv && .venv/Scripts/activate   # or source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium
python test_dry_run.py
```

## Status: DB wired and populated (2026-09-17)

`DATABASE_URL` now points at a real Supabase Postgres instance.
`apply_schema.py` (one-off setup helper, not part of the pipeline)
applied `../db/schema.sql` and `../db/seed.sql`. `scrape.py` has been
run for real against the live portal and successfully wrote 2000+ rows
to `availability_snapshot` for both Buffer and Core, all four ranges.
The Next.js app reads this via `/api/availability` — see
`web/src/lib/liveAvailability.ts`. `web/src/lib/mockData.ts` no longer
has a mock availability generator; it now only holds the static
zone/ranking/resort metadata that mirrors the real `zone`/`ranking`
tables.

**Bug caught only by running the real 30-day sweep, not a spot-check:**
an early version of the date-picker navigation set the datepick widget's
month/year `<select>`s directly. Crossing a month boundary redrew the
whole widget mid-interaction, detaching an already-grabbed element
handle ("stale element" error in Playwright).

**That approach was replaced entirely** once it also turned out the
month/year `<select>`s simply don't offer months more than a few ahead
of whatever's currently displayed — so selecting a far-future month
failed outright, independent of the stale-handle issue.
`select_search_window()` now navigates by clicking `.datepick-cmd-next`
(the "Next" link) the right number of times instead. Because that's a
CSS selector re-queried fresh on every click rather than a held handle,
it's naturally immune to the widget redrawing itself, and it reaches
however far forward is needed.

## Coverage horizon: today+120 is the true last bookable date (2026-09-18)

`scrape.py` takes `--start-offset` and `--horizon-days` (default 119 —
see below for why 119, not 120) so a later run can extend coverage
incrementally instead of re-scraping days already covered — e.g.
`python scrape.py --start-offset 111 --horizon-days 119` only sweeps the
new tail end.

Two separate real limits, confirmed live, not guessed:
1. **today+119 is the last valid *start* date for a search.** Submitting
   a start date past it returns the portal's own validation error,
   *"Alert! The Date field must be less than 16/01/2027"* (checked
   2026-09-18; today+119 = 2027-01-15).
2. **today+120 is the true last date with any data at all**, but you
   only discover this by actually searching from today+119: a normal
   search returns a 5-day table, but anchored at the boundary the
   portal **truncates** the table to just 2 columns (today+119,
   today+120) instead. `date_windows()` was fixed to always include
   `end` as a final window anchor (the plain `start/step/end` stride
   doesn't reliably land on it), which is what actually captures this
   truncated final window and therefore today+120's data — without that
   fix the scraper silently stopped one day short with no error at all.

Earlier attempts at 90 days, and "+120 days fails outright", were both
artifacts of the old select-based month navigation (see above), not
real boundaries — worth remembering if this ever needs re-deriving.

**This is a rolling window, not a fixed date.** The portal's cutoff
moves forward by one day every day (confirmed by inspection of the live
site), so these offsets always mean "today's real limit," not a fixed
calendar date. Keeping the app's coverage matching this requires
actually re-running the scraper regularly — see Scheduling below.
`web/src/app/api/availability/coverage` reports the real `max(safari_date)`
from the DB, and Step 1's date picker caps itself against it live, so a
scraper run extending coverage requires zero front-end changes to take
effect.

## Still open

1. **Scheduling** (Phase 1): this currently runs once via
   `if __name__ == "__main__"`, invoked manually. Needs a cron/worker
   wrapper running roughly daily so the app's coverage actually tracks
   the portal's rolling 119-day window instead of slowly falling behind
   it, plus an alert path for when the portal's HTML changes shape (the
   parser raises `RuntimeError` if the results table isn't found — wire
   that to an actual alert, not just a crash).
2. **Ranking** for anything beyond Kolara's buffer zones — that's
   Hardik's call, not something to derive from availability data.

## Deployment note

Run this on its own host, separate from the customer-facing site (Vercel
or wherever `web/` deploys). If the portal blocks or rate-limits this
scraper's IP, the site and its last-good snapshot keep serving — see the
spec's risk table. `THROTTLE_SECONDS` and per-window fresh page loads in
`run_sweep()` are the current "be a good citizen" measures — reasonable
for occasional runs, but re-check before scheduling frequent sweeps.
