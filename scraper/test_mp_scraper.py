"""Fast parser/window tests for the Pench MP Forest scraper."""

from datetime import date

from scrape_mp import parse_mp_cell, search_anchors


def test_status_parser() -> None:
    assert parse_mp_cell("17") == ("available", 17)
    assert parse_mp_cell("", "background-image: url(images/Booked.png)") == (
        "full",
        None,
    )
    assert parse_mp_cell("", "images/Bookingclose_btn.png") == (
        "window-closed",
        None,
    )
    assert parse_mp_cell("", "images/close_btn.png") == ("gate-closed", None)
    assert parse_mp_cell("unexpected") == ("NA", None)


def test_search_anchors_cover_four_day_windows() -> None:
    anchors = list(search_anchors(date(2026, 10, 8), date(2026, 10, 18)))
    assert anchors == [date(2026, 10, 9), date(2026, 10, 13), date(2026, 10, 17)]


if __name__ == "__main__":
    test_status_parser()
    test_search_anchors_cover_four_day_windows()
    print("Pench scraper unit tests passed.")
