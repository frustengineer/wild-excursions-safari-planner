"""Pench full-vehicle availability ingestion from MP Forest Online.

This module is deliberately separate from ``scrape.py`` because the
Madhya Pradesh portal has a different form, date picker, result-table
orientation, and status markup from the Maharashtra portal.

Live portal shape verified 2026-09-18 at:
https://forest.mponline.gov.in/Search.aspx?park=4
"""

from __future__ import annotations

import os
import re
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from dotenv import load_dotenv
from playwright.sync_api import Page, sync_playwright

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

PENCH_PORTAL_URL = os.environ.get(
    "PENCH_PORTAL_URL", "https://forest.mponline.gov.in/Search.aspx?park=4"
)
DATABASE_URL = os.environ.get("DATABASE_URL", "")

DAYS_PER_SEARCH = 4
THROTTLE_SECONDS = 3.0
WINDOW_RETRIES = 3

EXPECTED_ZONES = {
    "Khawasa",
    "Khumbhpani",
    "Masurnala",
    "Rukhad",
    "Teliya",
    "Jhamtara",
    "Karmajhiri",
    "Touria",
}


@dataclass(frozen=True)
class AvailabilityCell:
    portal_key: str
    safari_date: date
    session: str  # morning | afternoon (the MP portal calls it Evening)
    status: str
    available_count: int | None


def parse_mp_cell(text: str, marker: str = "") -> tuple[str, int | None]:
    """Normalize one MP portal cell.

    Sold-out and closed states are commonly image backgrounds on empty
    divs, so ``marker`` contains descendant style/src/alt/title values.
    """
    clean_text = " ".join(text.split()).strip()
    if clean_text.isdigit():
        return "available", int(clean_text)

    haystack = f"{clean_text} {marker}".lower()
    if "bookingclose" in haystack or "citizen booking closed" in haystack:
        return "window-closed", None
    if "booked.png" in haystack or clean_text.lower() in {"booked", "full"}:
        return "full", None
    if (
        "close_btn" in haystack
        or "park close" in haystack
        or "parkclose" in haystack
        or "holiday off" in haystack
        or "week off" in haystack
    ):
        return "gate-closed", None
    if "waitlist" in haystack:
        return "waitlist", None
    return "NA", None


def _visible_month_index(page: Page) -> int:
    month_name = page.locator(
        "#ui-datepicker-div .ui-datepicker-group-first .ui-datepicker-month"
    ).inner_text()
    year = int(
        page.locator(
            "#ui-datepicker-div .ui-datepicker-group-first .ui-datepicker-year"
        ).inner_text()
    )
    month = datetime.strptime(month_name.strip(), "%B").month
    return year * 12 + month


def select_search_window(page: Page, target: date) -> None:
    """Choose a full-vehicle date and submit the Pench search form."""
    page.check("#rdFullVehicle")
    page.click("#txtdate")
    page.wait_for_selector("#ui-datepicker-div", state="visible", timeout=10_000)

    target_month_index = target.year * 12 + target.month
    target_selector = (
        f'#ui-datepicker-div td[data-year="{target.year}"]'
        f'[data-month="{target.month - 1}"] a'
    )

    for _ in range(24):
        target_links = page.locator(target_selector).filter(
            has_text=re.compile(rf"^{target.day}$")
        )
        if target_links.count():
            target_links.first.click()
            break

        visible_month_index = _visible_month_index(page)
        if visible_month_index < target_month_index:
            page.click("#ui-datepicker-div .ui-datepicker-next")
        else:
            page.click("#ui-datepicker-div .ui-datepicker-prev")
        page.wait_for_timeout(150)
    else:
        raise RuntimeError(f"Could not select {target.isoformat()} in the MP date picker.")

    with page.expect_navigation(wait_until="domcontentloaded", timeout=30_000):
        page.click("#btnshow")
    page.wait_for_selector("table.Foresttable-srch", timeout=15_000)

    expected_row_date = target.strftime("%d %b %Y")
    page.wait_for_function(
        """expected => Array.from(document.querySelectorAll('table.Foresttable-srch tr'))
            .some(row => row.cells[0]?.textContent.trim() === expected)""",
        arg=expected_row_date,
        timeout=15_000,
    )


def parse_results_table(page: Page) -> list[AvailabilityCell]:
    """Parse the Pench table: zones are columns and dates are rows."""
    payload = page.evaluate(
        """() => {
            const table = Array.from(document.querySelectorAll('table.Foresttable-srch'))
                .find(t => t.rows.length > 1 && t.rows[0]?.cells[0]?.textContent.trim() === 'Date');
            if (!table) return null;

            const columns = [];
            for (const headerCell of Array.from(table.rows[0].cells).slice(1)) {
                const nested = headerCell.querySelector('table');
                const nestedRows = nested ? Array.from(nested.rows) : [];
                const gate = nestedRows[0]?.cells[0]?.textContent.trim() || '';
                const sessions = nestedRows[1]
                    ? Array.from(nestedRows[1].cells).map(c => c.textContent.trim())
                    : [];
                for (const session of sessions) columns.push({ gate, session });
            }

            const rows = Array.from(table.rows).slice(1).map(row => ({
                safariDate: row.cells[0]?.textContent.trim() || '',
                cells: Array.from(row.cells).slice(1).map(cell => ({
                    text: cell.textContent.trim(),
                    marker: Array.from(cell.querySelectorAll('*')).map(element => [
                        element.getAttribute('style') || '',
                        element.getAttribute('src') || '',
                        element.getAttribute('alt') || '',
                        element.getAttribute('title') || '',
                    ].join(' ')).join(' '),
                })),
            }));
            return { columns, rows };
        }"""
    )
    if not payload or not payload["columns"] or not payload["rows"]:
        raise RuntimeError("Pench results table was not found or was empty.")

    columns = payload["columns"]
    gates = {column["gate"] for column in columns}
    if gates != EXPECTED_ZONES:
        raise RuntimeError(
            "Pench zone columns changed. "
            f"Expected {sorted(EXPECTED_ZONES)}, received {sorted(gates)}."
        )

    cells: list[AvailabilityCell] = []
    for row in payload["rows"]:
        try:
            safari_date = datetime.strptime(row["safariDate"], "%d %b %Y").date()
        except ValueError as exc:
            raise RuntimeError(
                f"Unparseable Pench result date: {row['safariDate']!r}"
            ) from exc

        if len(row["cells"]) != len(columns):
            raise RuntimeError(
                f"Pench table column mismatch on {safari_date}: "
                f"{len(row['cells'])} values for {len(columns)} headers."
            )

        for column, raw_cell in zip(columns, row["cells"], strict=True):
            session_label = column["session"].strip().lower()
            if session_label == "morning":
                session = "morning"
            elif session_label in {"evening", "afternoon"}:
                session = "afternoon"
            else:
                raise RuntimeError(f"Unexpected Pench session: {column['session']!r}")
            status, count = parse_mp_cell(raw_cell["text"], raw_cell["marker"])
            cells.append(
                AvailabilityCell(
                    portal_key=column["gate"],
                    safari_date=safari_date,
                    session=session,
                    status=status,
                    available_count=count,
                )
            )
    return cells


def search_anchors(start: date, end: date):
    """Dates to select so four-day responses cover ``start`` through ``end``.

    The portal returns selected-date minus one through selected-date plus two.
    """
    if end < start:
        raise ValueError("end must be on or after start")
    cursor = start
    while cursor <= end:
        yield min(cursor + timedelta(days=1), end)
        cursor += timedelta(days=DAYS_PER_SEARCH)


def deduplicate(cells: list[AvailabilityCell]) -> list[AvailabilityCell]:
    unique: dict[tuple[str, date, str], AvailabilityCell] = {}
    for cell in cells:
        unique[(cell.portal_key, cell.safari_date, cell.session)] = cell
    return sorted(
        unique.values(), key=lambda cell: (cell.safari_date, cell.portal_key, cell.session)
    )


def run_sweep(start: date, end: date) -> list[AvailabilityCell]:
    results: list[AvailabilityCell] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            for target in search_anchors(start, end):
                for attempt in range(1, WINDOW_RETRIES + 1):
                    page = browser.new_page()
                    try:
                        page.goto(
                            PENCH_PORTAL_URL,
                            wait_until="domcontentloaded",
                            timeout=30_000,
                        )
                        select_search_window(page, target)
                        results.extend(parse_results_table(page))
                        break
                    except Exception as exc:
                        print(
                            f"[warn] Pench window {target} attempt "
                            f"{attempt}/{WINDOW_RETRIES} failed: {exc}"
                        )
                        if attempt == WINDOW_RETRIES:
                            print(f"[error] giving up on Pench window {target}")
                    finally:
                        page.close()
                time.sleep(THROTTLE_SECONDS)
        finally:
            browser.close()

    return [cell for cell in deduplicate(results) if start <= cell.safari_date <= end]


def write_snapshot(cells: list[AvailabilityCell]) -> None:
    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL is not set - point it at the Postgres/Supabase "
            "instance created from ../db/schema.sql."
        )
    import psycopg

    with psycopg.connect(DATABASE_URL) as conn, conn.cursor() as cur:
        cur.execute("select portal_key, zone_id from zone where park = 'Pench'")
        zone_ids = dict(cur.fetchall())
        missing = {cell.portal_key for cell in cells} - set(zone_ids)
        if missing:
            raise RuntimeError(
                "Pench zones are missing from the zone table: " + ", ".join(sorted(missing))
            )

        for cell in cells:
            cur.execute(
                """
                insert into availability_snapshot
                    (zone_id, safari_date, session, status, available_count,
                     vehicle_type, checked_at)
                values (%(zone_id)s, %(date)s, %(session)s, %(status)s,
                        %(count)s, 'gypsy', now())
                """,
                {
                    "zone_id": zone_ids[cell.portal_key],
                    "date": cell.safari_date,
                    "session": cell.session,
                    "status": cell.status,
                    "count": cell.available_count,
                },
            )
        conn.commit()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Sweep Pench full-vehicle availability from MP Forest Online."
    )
    parser.add_argument("--start-offset", type=int, default=0)
    parser.add_argument(
        "--horizon-days",
        type=int,
        default=119,
        help="Days from today to the last requested date. MP Forest states that "
        "the 120th booking day opens daily at 11:00 AM.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scrape and print a summary without writing to Postgres.",
    )
    args = parser.parse_args()

    today = date.today()
    start = today + timedelta(days=args.start_offset)
    end = today + timedelta(days=args.horizon_days)
    snapshot = run_sweep(start, end)
    print(
        f"Pench: parsed {len(snapshot)} cells across "
        f"{len({cell.portal_key for cell in snapshot})} zones, {start} through {end}."
    )
    if args.dry_run:
        for cell in snapshot[:20]:
            print(cell)
    else:
        write_snapshot(snapshot)
