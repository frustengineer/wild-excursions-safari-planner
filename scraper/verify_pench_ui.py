"""Headless smoke test for the local Pench customer flow."""

import re

from playwright.sync_api import sync_playwright


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        page.goto(
            "http://localhost:3000/book/step-1?jungle=pench",
            wait_until="networkidle",
            timeout=30_000,
        )
        pench_button = page.get_by_role("button", name=re.compile(r"^Pench\b")).first
        assert "bg-brand" in (pench_button.get_attribute("class") or "")
        page.locator('input[type="date"]').fill("2026-10-08")
        page.get_by_role("button", name="Continue").click()
        page.wait_for_url("**/book/step-2", timeout=15_000)
        page.get_by_text("All core zones in Pench", exact=False).wait_for(timeout=30_000)
        page.get_by_text("All buffer zones in Pench", exact=False).wait_for(timeout=30_000)
        body = page.locator("body").inner_text()
        for zone in (
            "Khawasa",
            "Khumbhpani",
            "Masurnala",
            "Rukhad",
            "Teliya",
            "Jhamtara",
            "Karmajhiri",
            "Touria",
        ):
            assert zone in body, f"Missing Pench zone in Step 2: {zone}"
    finally:
        browser.close()

print("Pench UI smoke test passed: Step 1 selection and Step 2 live tables are visible.")
