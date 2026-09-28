"""
Availability ingestion — the only module that touches the government
booking portal (https://safaribooking.mahaforest.gov.in/), per the
architecture spec's "isolate the scraper" rule: never let this logic mix
with the ranking/recommendation engine.

Portal mechanics below were confirmed by live, manual inspection on
2026-09-17 for BOTH Buffer and Core (see scraper/README.md for exactly
what was checked). Core is structurally different from Buffer, not just
a different sanctuary value:
  - Core has 2 sessions/day (Morning, Afternoon) — no Mid-Day.
  - Core's "Safari Vehicle" option has a different value ("1", not "4").
  - The aggregate Core search currently returns 5 gates, but the portal's
    Moharli-specific Core view also exposes "Moharli Gate (Core)" beside
    Khutwanda. Keep that sixth portal key mapped even when an aggregate
    verification response omits it.

`parse_results_table()` reads session/date counts from the page itself
(via colSpan), so it already handles both shapes without special-casing.

Still open before this can run unattended for real:
  1. DB wiring: DATABASE_URL must point at the real Postgres/Supabase
     instance created from ../db/schema.sql.
  2. Scheduling + alerting (see README).
"""

from __future__ import annotations

import os
import re
import time
from dataclasses import dataclass
from datetime import date, timedelta

from dotenv import load_dotenv
from playwright.sync_api import Page, sync_playwright

# Loads scraper/.env (gitignored) if present — lets the scheduled task in
# run_daily.ps1 pick up DATABASE_URL without hardcoding the password in
# any script file. Falls back to whatever's already in the environment
# (e.g. a manually exported var) if no .env exists. Resolved relative to
# this file, not the CWD, so it works regardless of where it's invoked from.
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

PORTAL_URL = os.environ.get("SAFARI_PORTAL_URL", "https://safaribooking.mahaforest.gov.in/")
TATKAL_PORTAL_URL = os.environ.get(
    "SAFARI_TATKAL_PORTAL_URL",
    "https://safaribooking.mahaforest.gov.in/Tatkal_booking/index/",
)
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# Confirmed live 2026-09-17: value "2" = Tadoba Andhari Tiger Reserve
# (Buffer), value "1" = ...(Core). Both share the site's sanctuary
# dropdown (#cmbSanctuary); other reserves (Bor, Pench, ...) have their
# own values not needed for this project yet.
SANCTUARY_VALUES = {"Buffer": "2", "Core": "1"}
BOOKING_TYPE_VALUE = "R"  # "Regular" — the only option currently offered

# "Safari Vehicle" has a DIFFERENT option value per booking type — confirmed
# live 2026-09-17. Don't reuse one constant for both.
SAFARI_VEHICLE_VALUE = {"Buffer": "4", "Core": "1"}

DAYS_PER_SEARCH = 5  # one search returns a 5-day window already
THROTTLE_SECONDS = 3.0  # be a good citizen — see the spec's risk table

STATUS_MAP = {
    "waitlist booking": "waitlist",
    "gc": "gate-closed",
    "booked": "full",
    "na": "NA",
    "booking closed": "window-closed",
    "gate closed": "gate-closed",
}

MOHARLI_PORTAL_KEY = "Moharli Gate (Core)"
KHUTWANDA_PORTAL_KEY = "Khutwanda Gate (Core)"


@dataclass
class AvailabilityCell:
    portal_key: str
    safari_date: date
    session: str  # morning | afternoon | mid-day
    status: str
    available_count: int | None


def parse_cell(raw_text: str) -> tuple[str, int | None]:
    """Read the cell, not just a number. A cell is either a count of open
    gypsies or one of the portal's status strings (see STATUS_MAP)."""
    text = raw_text.strip()
    if text.isdigit():
        return "available", int(text)
    return STATUS_MAP.get(text.lower(), "NA"), None


def select_search_window(page: Page, booking_type: str, vehicle_value: str, target: date) -> None:
    page.select_option("#cmbSanctuary", SANCTUARY_VALUES[booking_type])
    page.select_option("#booking_type", BOOKING_TYPE_VALUE)
    page.wait_for_timeout(1200)  # #cmbVehicle populates via AJAX after the two selects above
    page.select_option("#cmbVehicle", vehicle_value)

    page.click("#txtDateBooking")
    page.wait_for_timeout(300)
    # The datepick widget's month/year <select>s only ever offer a handful
    # of months ahead of whatever's currently displayed — jumping straight
    # to a far month via select_option() fails once it's out of range
    # (confirmed live: +120 days from a fresh page load isn't selectable
    # this way). Click "Next" instead, the number of months between today
    # and the target — .datepick-cmd-next is re-queried fresh on every
    # click (a CSS selector, not a held handle), so this is naturally
    # immune to the widget redrawing itself on each click.
    today = date.today()
    months_ahead = max(0, (target.year - today.year) * 12 + (target.month - today.month))
    for _ in range(months_ahead):
        page.click(".datepick-cmd-next")
        page.wait_for_timeout(250)
    # Selectable days are <a> tags (unselectable padding days are <span>s).
    page.evaluate(
        """(day) => {
            const link = Array.from(document.querySelectorAll('.datepick-popup a'))
                .find(a => a.textContent.trim() === String(day));
            if (link) link.click();
        }""",
        target.day,
    )
    page.wait_for_timeout(200)

    page.click("#btnSubmit")
    page.wait_for_selector("text=Booking Status for", timeout=15000)
    page.wait_for_timeout(1000)  # let the results table finish rendering


def parse_results_table(page: Page, booking_type: str) -> list[AvailabilityCell]:
    """The results table: row 0 = 'Gate' + 5 date headers (colspan=3 each),
    row 1 = 15 session headers, row 2 = an 'FG' indicator row (skipped),
    rows 3+ = one gate per row, 15 status cells each."""
    table = page.evaluate(
        """() => {
            const table = Array.from(document.querySelectorAll('table'))
                .find(t => t.querySelector('tr')?.textContent.trim().startsWith('Gate'));
            if (!table) return null;
            const rows = Array.from(table.querySelectorAll('tr'));
            return rows.map(row =>
                Array.from(row.querySelectorAll('td, th')).map(cell => ({
                    text: cell.textContent.trim(),
                    colSpan: cell.colSpan || 1,
                }))
            );
        }"""
    )
    if not table or len(table) < 4:
        raise RuntimeError("Results table not found or shorter than expected — portal layout may have changed.")

    date_header, session_header = table[0], table[1]
    dates: list[str] = []
    for cell in date_header[1:]:  # skip the "Gate" label cell
        m = re.search(r"(\d{2}/\d{2}/\d{4})", cell["text"])
        iso = m.group(1) if m else cell["text"]
        d, mo, y = iso.split("/")
        dates.extend([f"{y}-{mo}-{d}"] * cell["colSpan"])
    # Unlike the date row, the session row has no leading "Gate" cell.
    sessions = [c["text"].strip().lower() for c in session_header]

    cells: list[AvailabilityCell] = []
    for row in table[3:]:  # skip Gate header, session header, FG indicator row
        if not row:
            continue
        portal_key = row[0]["text"]
        if not portal_key or portal_key.upper() == "FG":
            continue
        for i, cell in enumerate(row[1:]):
            if i >= len(dates):
                break
            status, count = parse_cell(cell["text"])
            cells.append(
                AvailabilityCell(
                    portal_key=portal_key,
                    safari_date=date.fromisoformat(dates[i]),
                    session=sessions[i] if sessions[i] in ("morning", "afternoon", "mid-day") else "mid-day",
                    status=status,
                    available_count=count,
                )
            )
    return cells


def complete_moharli_regular_rows(cells: list[AvailabilityCell]) -> list[AvailabilityCell]:
    """Represent the regular feed's Moharli omission explicitly as NA.

    The official Moharli zone view lists Moharli Gate beside Khutwanda,
    while the long-range regular response currently omits Moharli Gate.
    """
    result = list(cells)
    existing = {(cell.portal_key, cell.safari_date, cell.session) for cell in cells}
    for cell in cells:
        if cell.portal_key != KHUTWANDA_PORTAL_KEY:
            continue
        key = (MOHARLI_PORTAL_KEY, cell.safari_date, cell.session)
        if key not in existing:
            result.append(
                AvailabilityCell(
                    portal_key=MOHARLI_PORTAL_KEY,
                    safari_date=cell.safari_date,
                    session=cell.session,
                    status="NA",
                    available_count=None,
                )
            )
            existing.add(key)
    return result


def parse_moharli_zone_table(page: Page) -> list[AvailabilityCell]:
    """Parse the short-window zone table, ignoring its Full Day column."""
    table = page.evaluate(
        """() => {
            const table = Array.from(document.querySelectorAll('table'))
                .find(t => t.querySelector('tr')?.textContent.trim().startsWith('Gate'));
            if (!table) return null;
            return Array.from(table.querySelectorAll('tr')).map(row =>
                Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent.trim())
            );
        }"""
    )
    if not table or len(table) < 3:
        raise RuntimeError("Moharli zone results table was not found.")

    date_match = re.search(r"(\d{2}/\d{2}/\d{4})", table[0][1])
    if not date_match:
        raise RuntimeError("Moharli zone result did not include a parseable date.")
    day, month, year = date_match.group(1).split("/")
    safari_date = date.fromisoformat(f"{year}-{month}-{day}")
    sessions = [value.lower() for value in table[1]]

    cells: list[AvailabilityCell] = []
    for row in table[2:]:
        if not row:
            continue
        portal_key = row[0]
        if portal_key not in (MOHARLI_PORTAL_KEY, KHUTWANDA_PORTAL_KEY):
            continue
        for index, raw_cell in enumerate(row[1:]):
            if index >= len(sessions) or sessions[index] not in ("morning", "afternoon"):
                continue
            status, count = parse_cell(raw_cell)
            cells.append(
                AvailabilityCell(
                    portal_key=portal_key,
                    safari_date=safari_date,
                    session=sessions[index],
                    status=status,
                    available_count=count,
                )
            )
    return cells


def run_moharli_zone_check() -> list[AvailabilityCell]:
    """Read the official Moharli-specific Core view once per scraper run."""
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto(TATKAL_PORTAL_URL, wait_until="networkidle", timeout=30_000)
            page.select_option("#cmbSanctuary", SANCTUARY_VALUES["Core"])
            page.wait_for_function(
                "() => Array.from(document.querySelectorAll('#cmbZone option')).some(o => o.textContent.includes('Moharli Zone'))",
                timeout=15_000,
            )
            page.select_option("#cmbZone", label="Moharli Zone (Core)")
            page.select_option("#cmbDate", index=1)
            page.click("#btnSubmit")
            page.wait_for_function(
                "() => Array.from(document.querySelectorAll('table')).some(t => t.textContent.includes('Moharli Gate (Core)'))",
                timeout=15_000,
            )
            return parse_moharli_zone_table(page)
        finally:
            page.close()
            browser.close()


def merge_zone_overrides(
    cells: list[AvailabilityCell], overrides: list[AvailabilityCell]
) -> list[AvailabilityCell]:
    override_keys = {
        (cell.portal_key, cell.safari_date, cell.session) for cell in overrides
    }
    return [
        cell
        for cell in cells
        if (cell.portal_key, cell.safari_date, cell.session) not in override_keys
    ] + overrides


def date_windows(start: date, end: date, step_days: int = DAYS_PER_SEARCH):
    """Window anchors from start to end, step_days apart. Always includes
    `end` itself as a final anchor even if the regular stride overshoots
    it (e.g. start=+85, end=+119, step=5 never lands exactly on 119) —
    otherwise the very last, most valuable window (anchored at the
    portal's actual max valid start date, whose own 5-day table extends
    a few days past `end` as a bonus) never gets searched at all."""
    cursor = start
    last_yielded = None
    while cursor <= end:
        yield cursor
        last_yielded = cursor
        cursor += timedelta(days=step_days)
    if last_yielded is None or last_yielded < end:
        yield end


WINDOW_RETRIES = 3


def run_sweep(booking_type: str, vehicle_value: str, start: date, end: date) -> list[AvailabilityCell]:
    """Sweeps every window from start to end. A single flaky page load on
    this live government site (confirmed to happen occasionally — the
    modal sometimes just doesn't appear within the timeout, no apparent
    pattern) used to kill the whole multi-minute sweep and discard every
    window already scraped, since results were only ever collected in
    memory. Each window now gets its own retries with a fresh page; a
    window that still fails after all retries is skipped (logged, not
    fatal) so one bad window doesn't cost the other ~47.
    """
    results: list[AvailabilityCell] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for window_start in date_windows(start, end):
            for attempt in range(1, WINDOW_RETRIES + 1):
                page = browser.new_page()
                try:
                    page.goto(PORTAL_URL, wait_until="networkidle", timeout=30000)
                    select_search_window(page, booking_type, vehicle_value, window_start)
                    results.extend(parse_results_table(page, booking_type))
                    break
                except Exception as exc:
                    print(
                        f"[warn] window {booking_type} {window_start} attempt "
                        f"{attempt}/{WINDOW_RETRIES} failed: {exc}"
                    )
                    if attempt == WINDOW_RETRIES:
                        print(f"[error] giving up on window {booking_type} {window_start}")
                finally:
                    page.close()
            time.sleep(THROTTLE_SECONDS)
        browser.close()
    return results


def write_snapshot(cells: list[AvailabilityCell]) -> None:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set — point it at the Postgres/Supabase instance from ../db/schema.sql.")
    import psycopg

    with psycopg.connect(DATABASE_URL) as conn, conn.cursor() as cur:
        for cell in cells:
            cur.execute(
                """
                insert into availability_snapshot
                    (zone_id, safari_date, session, status, available_count, vehicle_type, checked_at)
                -- 'gypsy' for both types: live-checked 2026-09-17, Core
                -- currently only offers "Safari Vehicle" too — the spec's
                -- assumption of bus/canter options for Core wasn't borne
                -- out on the actual portal today. Re-check if the portal
                -- adds those vehicle types later.
                select zone_id, %(date)s, %(session)s, %(status)s, %(count)s, 'gypsy', now()
                from zone where portal_key = %(portal_key)s
                """,
                {
                    "date": cell.safari_date,
                    "session": cell.session,
                    "status": cell.status,
                    "count": cell.available_count,
                    "portal_key": cell.portal_key,
                },
            )
        conn.commit()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Sweep the portal and write availability_snapshot. Supports a "
        "start/end offset so a later run can extend coverage incrementally "
        "instead of re-scraping days already covered."
    )
    parser.add_argument("--start-offset", type=int, default=0, help="Days from today to start the sweep")
    parser.add_argument(
        "--horizon-days",
        type=int,
        default=119,
        help="Days from today to end the sweep. 119 is the portal's own real "
        "advance-booking limit, not an estimate: submitting a date past it "
        "returns the portal's own validation error ('The Date field must be "
        "less than <date>'), confirmed live 2026-09-18 (today+119 = the last "
        "day before that error). This is a ROLLING window — the portal's "
        "cutoff moves forward by one day every day, so this value means "
        "\"today's real limit\" and stays correct as long as the scraper is "
        "actually re-run regularly (see the Scheduling item below).",
    )
    args = parser.parse_args()

    today = date.today()
    start = today + timedelta(days=args.start_offset)
    horizon = today + timedelta(days=args.horizon_days)
    snapshot: list[AvailabilityCell] = []
    for booking_type in ("Buffer", "Core"):
        cells = run_sweep(
            booking_type,
            vehicle_value=SAFARI_VEHICLE_VALUE[booking_type],
            start=start,
            end=horizon,
        )
        snapshot.extend(complete_moharli_regular_rows(cells) if booking_type == "Core" else cells)
    try:
        snapshot = merge_zone_overrides(snapshot, run_moharli_zone_check())
    except Exception as exc:
        # Keep the long-range regular snapshot when the short-window zone
        # page is temporarily unavailable. Moharli remains explicit NA.
        print(f"[warn] Moharli zone-level check failed: {exc}")
    write_snapshot(snapshot)
