"""One-off manual verification: runs the real select_search_window() +
parse_results_table() against the live portal for a single date window,
for BOTH Buffer and Core, and prints what it parsed, WITHOUT writing to
any DB. Not a pytest suite — just a way to confirm the scraper logic
matches the live page before trusting it. Delete or turn into a real
test once DB wiring exists.
"""

from datetime import date, timedelta

from playwright.sync_api import sync_playwright

from scrape import (
    SAFARI_VEHICLE_VALUE,
    parse_results_table,
    run_moharli_zone_check,
    select_search_window,
)

EXPECTED_BUFFER_KEYS = {
    "Belara (Buffer)", "Madnapur(Buffer)", "Alizanza(Buffer)",
    "Shirkheda (Buffer)", "Kolara Chauradeo (Buffer)", "Palasgaon (Buffer)",
    "Agarzari (Buffer)", "Dewada (Buffer)", "Adegaon (Buffer)",
    "Junona(Buffer)", "Mamla (Buffer)",
    "Navegaon Ramdegi(Buffer)", "Nimdhela (Buffer)",
    "Pangadi Aswal Chuha (Buffer)", "Keslaghat (Buffer)", "Zari Peth (Buffer)", "Somnath (Buffer)",
}

EXPECTED_CORE_KEYS = {
    "Moharli Gate (Core)", "Khutwanda Gate (Core)", "Kolara (Core)",
    "Navegaon Gate (Core)", "Pangadi (Core)", "Zari (Core)",
}

target = date.today() + timedelta(days=5)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    all_cells = {}
    for booking_type in ("Buffer", "Core"):
        page = browser.new_page()
        page.goto("https://safaribooking.mahaforest.gov.in/", wait_until="networkidle", timeout=30000)
        select_search_window(page, booking_type, vehicle_value=SAFARI_VEHICLE_VALUE[booking_type], target=target)
        cells = parse_results_table(page, booking_type)
        all_cells[booking_type] = cells
        page.close()
        print(f"{booking_type}: parsed {len(cells)} cells, {len(set(c.portal_key for c in cells))} gates")

    browser.close()

buffer_keys = {c.portal_key for c in all_cells["Buffer"]}
missing = EXPECTED_BUFFER_KEYS - buffer_keys
print("Missing expected Buffer portal_keys:" if missing else "All expected Buffer portal_keys matched.", missing or "")

core_keys = sorted({c.portal_key for c in all_cells["Core"]})
print("Core gates seen:", core_keys)
missing_core = EXPECTED_CORE_KEYS - set(core_keys)
if missing_core:
    print(
        "Missing expected Core portal_keys from this aggregate response ",
        "(check range-specific views):",
        missing_core,
    )
else:
    print("All expected Core portal_keys matched.")

total = sum(len(v) for v in all_cells.values())
print(f"\nTotal cells across all ranges/gates (Buffer + Core, one date window): {total}")

zone_cells = run_moharli_zone_check()
zone_keys = {cell.portal_key for cell in zone_cells}
assert {"Moharli Gate (Core)", "Khutwanda Gate (Core)"} <= zone_keys
print(
    "Moharli zone-level check:",
    len(zone_cells),
    "Morning/Afternoon cells for",
    sorted(zone_keys),
)
