from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "Wild_Excursions_Tadoba_Safari_Planner_Current_State.docx"

BLACK = "000000"
FOREST = "174E3B"
FOREST_LIGHT = "EAF3EF"
PALE_BLUE = "EEF4F8"
PALE_GRAY = "F5F6F6"
MID_GRAY = "667085"
GRID = "D9D9D9"
WHITE = "FFFFFF"


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def set_cell_shading(cell, fill: str):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=100, start=120, bottom=100, end=120):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for tag, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{tag}"))
        if node is None:
            node = OxmlElement(f"w:{tag}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_borders(table, color=GRID, size="6"):
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.find(qn("w:tblBorders"))
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = borders.find(qn(f"w:{edge}"))
        if tag is None:
            tag = OxmlElement(f"w:{edge}")
            borders.append(tag)
        tag.set(qn("w:val"), "single")
        tag.set(qn("w:sz"), size)
        tag.set(qn("w:space"), "0")
        tag.set(qn("w:color"), color)


def set_run_font(run, name="Aptos", size=None, bold=None, color=None):
    run.font.name = name
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), name)
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), name)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if color:
        run.font.color.rgb = RGBColor.from_string(color)


def set_paragraph_spacing(paragraph, before=0, after=6, line=1.12):
    fmt = paragraph.paragraph_format
    fmt.space_before = Pt(before)
    fmt.space_after = Pt(after)
    fmt.line_spacing = line


def add_page_field(paragraph):
    run = paragraph.add_run()
    fld_char1 = OxmlElement("w:fldChar")
    fld_char1.set(qn("w:fldCharType"), "begin")
    instr_text = OxmlElement("w:instrText")
    instr_text.set(qn("xml:space"), "preserve")
    instr_text.text = " PAGE "
    fld_char2 = OxmlElement("w:fldChar")
    fld_char2.set(qn("w:fldCharType"), "end")
    run._r.extend([fld_char1, instr_text, fld_char2])
    set_run_font(run, size=8, color=MID_GRAY)


def add_heading(doc, text, level=1):
    p = doc.add_heading(text, level=level)
    p.paragraph_format.keep_with_next = True
    return p


def add_body(doc, text, bold_lead=None):
    p = doc.add_paragraph()
    if bold_lead and text.startswith(bold_lead):
        lead = p.add_run(bold_lead)
        set_run_font(lead, bold=True)
        rest = p.add_run(text[len(bold_lead):])
        set_run_font(rest)
    else:
        run = p.add_run(text)
        set_run_font(run)
    set_paragraph_spacing(p)
    return p


def add_bullets(doc, items, level=0):
    for item in items:
        p = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
        p.add_run(item)
        set_paragraph_spacing(p, after=3)


def add_numbers(doc, items):
    for index, item in enumerate(items, start=1):
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.25)
        p.paragraph_format.first_line_indent = Inches(-0.22)
        p.add_run(f"{index}.\t{item}")
        set_paragraph_spacing(p, after=4)


def add_table(doc, headers, rows, widths=None, font_size=8.5):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_borders(table)
    hdr = table.rows[0]
    set_repeat_table_header(hdr)
    for i, header in enumerate(headers):
        cell = hdr.cells[i]
        set_cell_shading(cell, FOREST)
        set_cell_margins(cell, top=115, bottom=115)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(header)
        set_run_font(r, size=font_size, bold=True, color=WHITE)
        if widths:
            cell.width = Inches(widths[i])
    for row_index, values in enumerate(rows):
        cells = table.add_row().cells
        fill = WHITE if row_index % 2 == 0 else PALE_GRAY
        for i, value in enumerate(values):
            cell = cells[i]
            set_cell_shading(cell, fill)
            set_cell_margins(cell)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT if i > 0 else WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(str(value))
            set_run_font(r, size=font_size)
            set_paragraph_spacing(p, after=0, line=1.05)
            if widths:
                cell.width = Inches(widths[i])
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return table


def add_section_break(doc):
    # Let Word paginate naturally so short sections can share a page and do not
    # leave large blank areas behind.
    return None


doc = Document()
section = doc.sections[0]
section.top_margin = Inches(0.72)
section.bottom_margin = Inches(0.68)
section.left_margin = Inches(0.78)
section.right_margin = Inches(0.78)

styles = doc.styles
normal = styles["Normal"]
normal.font.name = "Aptos"
normal._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")
normal.font.size = Pt(9.5)
normal.font.color.rgb = RGBColor.from_string(BLACK)
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.12

title_style = styles["Title"]
title_style.font.name = "Aptos Display"
title_style._element.rPr.rFonts.set(qn("w:ascii"), "Aptos Display")
title_style._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos Display")
title_style.font.size = Pt(28)
title_style.font.bold = True
title_style.font.color.rgb = RGBColor.from_string(BLACK)
title_ppr = title_style._element.get_or_add_pPr()
title_border = title_ppr.find(qn("w:pBdr"))
if title_border is not None:
    title_ppr.remove(title_border)

for style_name, size in (("Heading 1", 17), ("Heading 2", 12.5), ("Heading 3", 10.5)):
    style = styles[style_name]
    style.font.name = "Aptos Display"
    style._element.rPr.rFonts.set(qn("w:ascii"), "Aptos Display")
    style._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos Display")
    style.font.size = Pt(size)
    style.font.bold = True
    style.font.color.rgb = RGBColor.from_string(BLACK)
    style.paragraph_format.space_before = Pt(12 if style_name == "Heading 1" else 8)
    style.paragraph_format.space_after = Pt(5)
    style.paragraph_format.keep_with_next = True

for list_style in ("List Bullet", "List Bullet 2", "List Number"):
    styles[list_style].font.name = "Aptos"
    styles[list_style].font.size = Pt(9.5)

# Footer on every page.
footer = section.footer
fp = footer.paragraphs[0]
fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
fr = fp.add_run("Wild Excursions  |  Tadoba Safari Planner Current State  |  Page ")
set_run_font(fr, size=8, color=MID_GRAY)
add_page_field(fp)

# Title page.
doc.add_paragraph().paragraph_format.space_after = Pt(40)
title = doc.add_paragraph(style="Title")
title.alignment = WD_ALIGN_PARAGRAPH.LEFT
title.add_run("Wild Excursions Tadoba Safari Planner")
subtitle = doc.add_paragraph()
subtitle.add_run("Current Product Recommendation and Booking Flow").bold = True
set_paragraph_spacing(subtitle, after=10)
meta = doc.add_paragraph()
mr = meta.add_run("Project 3  |  Current working implementation  |  18 September 2026")
set_run_font(mr, size=10, color=MID_GRAY)
set_paragraph_spacing(meta, after=28)

intro = doc.add_paragraph()
ir = intro.add_run(
    "This document explains what the project currently does, how safari recommendations are produced, "
    "how live availability and vehicle capacity are handled, what customers can place in the cart, "
    "and which parts still require production work."
)
set_run_font(ir, size=12)
set_paragraph_spacing(intro, after=16, line=1.25)

scope = doc.add_paragraph()
sr = scope.add_run(
    "Main conclusion  The application is a recommendation and enquiry tool. It does not reserve, pay for, "
    "or confirm a government safari permit. A Wild Excursions specialist must verify and complete the booking."
)
set_run_font(sr, size=11, bold=True, color=FOREST)
set_paragraph_spacing(scope, after=18, line=1.2)

add_body(doc, "Prepared for the Wild Excursions product, operations, sales and development teams.")

doc.add_page_break()

add_heading(doc, "Document Contents", 1)
add_numbers(doc, [
    "Product purpose and current scope",
    "Customer booking journey",
    "Traveller and gypsy capacity rules",
    "Safari sessions and trip length",
    "Recommendation engine",
    "Live availability and date changes",
    "Cart pricing and customer selections",
    "Enquiry handoff and confirmation",
    "System architecture and data model",
    "Gate inventory",
    "Operations safeguards and current limitations",
])

add_heading(doc, "Current Status at a Glance", 1)
add_table(doc, ["Area", "Current state"], [
    ("Customer journey", "Complete clickable flow from jungle selection through enquiry confirmation"),
    ("Availability", "Real government portal snapshots stored in Supabase Postgres"),
    ("Recommendations", "Capacity-aware ranked plans with range and nearby-date fallbacks"),
    ("Customer selection", "Explicit add, replace and remove actions with a cart"),
    ("Booking", "Human-assisted after enquiry; no permit reservation or payment in the app"),
    ("Production gaps", "Ranking coverage, real pricing, enquiry webhook, restricted ID storage, scheduler validation and alerting"),
], widths=[1.55, 5.25], font_size=9)

add_section_break(doc)

add_heading(doc, "1 Product Purpose and Current Scope", 1)
add_body(doc, "The planner helps a customer choose a Tadoba range, dates and party composition, then recommends safari slots that are both highly ranked and available for the required number of gypsies. The customer decides which suggestions to add to the cart and submits an enquiry for manual follow-up.")
add_body(doc, "Currently active:", bold_lead="Currently active:")
add_bullets(doc, [
    "Tadoba Andhari Tiger Reserve with Kolara, Moharli, Navegaon, and Pangadi and Zari ranges.",
    "Buffer and Core safari availability with Morning and Evening customer-facing sessions.",
    "Live availability from the Maharashtra Forest Department portal through an isolated scraper.",
    "Recommendations, manual slot selection, resort selection, optional transfers, quote calculation, traveller details and enquiry confirmation.",
])
add_body(doc, "Not currently offered:", bold_lead="Not currently offered:")
add_bullets(doc, [
    "Direct government permit booking, payment, or a guarantee that a displayed slot is reserved.",
    "Live Pench or Bandhavgarh planning. These jungles are shown as coming soon.",
    "Final production resort inventory or contracted pricing.",
])

add_heading(doc, "2 Customer Booking Journey", 1)
add_table(doc, ["Stage", "Customer action", "System behaviour"], [
    ("Discover", "Views jungle cards and opens Tadoba", "Shows ranges, animals, season and zone information"),
    ("Step 1", "Chooses range, date, nights, adults and children", "Calculates gypsies and validates child ages when needed"),
    ("Step 2", "Reviews recommendations and live tables", "Searches ranked plans, range fallbacks and nearby dates"),
    ("Cart", "Adds safari slots, resort and transfers", "Replaces conflicting sessions, animates additions and updates quote"),
    ("Step 3", "Adds traveller, contact and permit ID details", "Validates required names and contact fields"),
    ("Confirm", "Submits an enquiry", "Returns an enquiry reference and stores the summary in browser session storage"),
    ("Human follow-up", "Speaks with the Wild Excursions team", "Team confirms availability and completes booking outside the app"),
], widths=[0.8, 2.3, 3.7], font_size=8.5)

add_heading(doc, "2.1 Step 1 Trip Basics", 2)
add_bullets(doc, [
    "The jungle is currently fixed to Tadoba because it is the first active product.",
    "The customer selects one starting range from four Tadoba ranges.",
    "The start date cannot be in the past and the current planning horizon ends on 31 December 2027.",
    "Trip length options run from 1 night and 2 days through 5 nights and 6 days.",
    "Adult count supports 0 to 24 and child count supports 0 to 8, with at least one traveller required.",
    "Changing range, date, party size or child age clears the previous recommendation and selected safari plan.",
])

add_heading(doc, "2.2 Step 2 Build Your Safari", 2)
add_bullets(doc, [
    "The recommendation is displayed first, but nothing is added automatically.",
    "Core availability tables are shown above Buffer tables.",
    "The customer can add a green slot, replace another safari in the same date and session, or remove a highlighted slot.",
    "The customer can change the date without reloading the whole page. Only the recommendation and availability area refreshes.",
    "Availability automatically polls every 20 seconds and can also be refreshed manually.",
])

add_heading(doc, "2.3 Step 3 Cart and Enquire", 2)
add_bullets(doc, [
    "Every traveller must have a name. Child ages collected earlier are carried forward and protected from accidental changes.",
    "Name and phone are mandatory contact fields; email is optional.",
    "The customer may enter the lead traveller permit ID or defer it for the follow-up call.",
    "Submission currently reaches a stub API and does not yet send the lead to the production Make.com or CRM workflow.",
])

add_section_break(doc)

add_heading(doc, "3 Traveller and Gypsy Capacity Rules", 1)
add_body(doc, "Availability values are vehicle counts, not passenger seats. The system calculates one vehicle requirement and applies it to every recommended or selected safari.")
add_table(doc, ["Capacity category", "Rule"], [
    ("Adult capacity", "Up to 6 adults or travellers aged 7 and above per gypsy"),
    ("Young child capacity", "Up to 2 children aged 0 to 6 per gypsy"),
    ("Age 7 and above", "Consumes adult capacity"),
    ("Missing child age", "Temporarily counted against adult capacity"),
    ("Groups over 6", "Every child age becomes mandatory before Step 2"),
], widths=[1.8, 5.0], font_size=9)

add_heading(doc, "3.1 Calculation", 2)
add_body(doc, "Required gypsies equal the largest of: one gypsy, adult-capacity travellers divided by 6 and rounded up, or young children divided by 2 and rounded up. A party with no travellers requires zero vehicles and cannot continue.")
add_table(doc, ["Example", "Adult capacity", "Young children", "Gypsies"], [
    ("6 adults", "6", "0", "1"),
    ("7 adults", "7", "0", "2"),
    ("6 adults plus children aged 5 and 8", "7", "1", "2"),
    ("4 adults plus children aged 3 and 6", "4", "2", "1"),
    ("4 adults plus children aged 2, 4 and 6", "4", "3", "2"),
], widths=[3.4, 1.25, 1.25, 0.9], font_size=8.5)

add_heading(doc, "4 Safari Sessions and Trip Length", 1)
add_body(doc, "The system treats one date and one session as a unique safari slot. A customer cannot be assigned to a Core and Buffer safari in the same slot.")
add_bullets(doc, [
    "Arrival day: only the Evening safari is part of the itinerary.",
    "Middle days: Morning and Evening are both available.",
    "Departure day: only the Morning safari is part of the itinerary.",
    "Maximum possible sessions equal twice the number of nights.",
])
add_table(doc, ["Trip", "Trip days", "Maximum sessions", "Primary mix"], [
    ("1N 2D", "2", "2", "2 Buffer"),
    ("2N 3D", "3", "4", "3 Buffer and 1 Core"),
    ("3N 4D", "4", "6", "4 Buffer and 2 Core"),
    ("4N 5D", "5", "8", "5 Buffer and 3 Core"),
    ("5N 6D", "6", "10", "6 Buffer and 4 Core"),
], widths=[1.0, 1.1, 1.4, 3.3], font_size=9)

add_section_break(doc)

add_heading(doc, "5 Recommendation Engine", 1)
add_body(doc, "The engine is a deterministic rules system, not machine learning. It receives availability snapshots, applies capacity and itinerary constraints, ranks eligible gates, and returns the first complete plan that satisfies the configured search order.")

add_heading(doc, "5.1 Eligibility Rules", 2)
add_bullets(doc, [
    "A real slot is eligible only when status is available and the open vehicle count is at least the party's required gypsy count.",
    "The same date and session can appear only once in a plan.",
    "Arrival Morning and departure Evening are never recommended.",
    "Mamla Gate remains visible in live availability but is never used in an automatic recommendation.",
    "A customer may still manually add Mamla when it is open and has enough vehicles.",
    "Dates beyond the real scraper coverage are treated as provisional planning slots and flagged internally for the team.",
])

add_heading(doc, "5.2 Recommendation Mix Ladder", 2)
add_body(doc, "For a trip of N nights, the primary mix is N plus 1 Buffer safaris and N minus 1 Core safaris. The second tier removes one Buffer safari while keeping the same Core target. The third tier keeps the primary Buffer count and removes Core.")
add_table(doc, ["Trip", "Tier 1", "Tier 2", "Tier 3"], [
    ("1N 2D", "2B", "1B", "Duplicate removed"),
    ("2N 3D", "3B and 1C", "2B and 1C", "3B"),
    ("3N 4D", "4B and 2C", "3B and 2C", "4B"),
    ("4N 5D", "5B and 3C", "4B and 3C", "5B"),
    ("5N 6D", "6B and 4C", "5B and 4C", "6B"),
], widths=[1.0, 2.0, 2.0, 1.8], font_size=8.7)

add_heading(doc, "5.3 Range Search Order", 2)
add_body(doc, "The full three-tier ladder is exhausted within one range scope before the system moves to the next scope.")
add_table(doc, ["Customer starts with", "First", "Second", "Third"], [
    ("Kolara", "Kolara", "Moharli", "Kolara plus Navegaon"),
    ("Moharli", "Moharli", "Kolara", "Kolara plus Navegaon"),
    ("Other Tadoba range", "Selected range", "Kolara", "Moharli, then Kolara plus Navegaon"),
], widths=[1.6, 1.45, 1.45, 2.3], font_size=8.7)
add_body(doc, "When an alternate or combined range succeeds, Step 2 displays a clear range-change notice and shows availability tables for the recommended range or ranges.")

add_heading(doc, "5.4 Nearby Date Search", 2)
add_body(doc, "Only after all range scopes and mix tiers fail on the requested start date does the engine try nearby dates. The order is deterministic and nearest-first:")
add_body(doc, "Requested date, 1 day before, 1 day after, 2 days before, 2 days after, continuing through 5 days before and 5 days after.")
add_body(doc, "For every nearby date, the engine repeats the same range search and mix ladder. Dates earlier than today's minimum are skipped. A nearby-date banner explains the direction, distance, new trip dates and recommended range.")

add_heading(doc, "5.5 Zone Ranking", 2)
add_bullets(doc, [
    "Kolara Buffer has a manually curated Dry 2026 ranking: Belara, Madnapur, Alizanza, Shirkheda, Chauradeo and Palasgaon.",
    "Zones with a manual ranking always appear before unreviewed zones in the same recommendation scope.",
    "Unreviewed ranges and Core zones are ordered by live demand. Demand is the share of published rows that are not currently available, excluding gate-closed and NA rows.",
    "The interface uses solid number badges for curated seasonal ranking and outlined badges for demand-based ordering.",
])

add_heading(doc, "5.6 Allocation Details", 2)
add_bullets(doc, [
    "Mixed plans search possible Core slot combinations before filling Buffer slots. This avoids a greedy failure where Core consumes a session needed by Buffer.",
    "Within a zone order, the allocator cycles through ranked zones and available trip slots until the requested count is reached.",
    "Plans are finally sorted chronologically and numbered from Safari 1 onward.",
    "If every requested and nearby option fails, the exact customer message is: Safari is not possible on your dates or within 5 days before or after. Choose another date or contact our team - we'll plan your perfect jungle safari.",
])

add_section_break(doc)

add_heading(doc, "6 Live Availability and Date Changes", 1)
add_heading(doc, "6.1 Availability Display", 2)
add_table(doc, ["Portal or system state", "Customer display", "Selectable"], [
    ("Available and enough gypsies", "Green vehicle count", "Yes"),
    ("Available but not enough gypsies", "Amber count with vehicles needed", "No"),
    ("Full", "Sold out", "No"),
    ("Gate closed", "Gate closed", "No"),
    ("Booking window closed", "Window closed", "No"),
    ("Waitlist", "Waitlist", "No"),
    ("NA from regular feed", "Not listed", "No"),
    ("No snapshot inside coverage", "Dash", "No"),
    ("Beyond coverage", "Provisional open count used for planning", "Yes, flagged internally"),
], widths=[2.25, 3.25, 1.3], font_size=8.3)

add_heading(doc, "6.2 Availability Refresh", 2)
add_bullets(doc, [
    "Step 2 fetches the selected range plus every permitted fallback range for a date window covering 5 days before and after.",
    "Only the latest database snapshot for each zone, date and session is returned.",
    "The UI polls every 20 seconds and includes a Refresh now action.",
    "Changing the date clears selected safaris, updates the requested date, and refreshes the availability area without a full-page reload.",
    "The date picker supports planning through 31 December 2027, while the government portal's current live data window is much shorter.",
])

add_heading(doc, "6.3 Moharli Core Handling", 2)
add_body(doc, "The regular Core response currently lists Khutwanda but omits Moharli Gate. A separate official Moharli zone view lists both gates. The scraper records the regular omission as NA, shown as Not listed, and replaces it with real short-window Moharli data when the zone-level view publishes a count or closed status. No value is fabricated by copying Khutwanda.")

add_heading(doc, "7 Cart Pricing and Customer Selections", 1)
add_heading(doc, "7.1 Selection Behaviour", 2)
add_bullets(doc, [
    "Recommendations are suggestions and are never added to the cart automatically.",
    "Adding a safari replaces any existing selection in the same date and session because the customer cannot attend two safaris simultaneously.",
    "Selected cards and live-grid cells can be removed directly.",
    "Safari, resort and transfer additions animate into the cart. Mobile devices also show a floating cart summary.",
    "The customer must select at least one safari and one resort before continuing.",
    "Before Step 3, every non-provisional safari is checked again against the latest availability held in Step 2.",
])

add_heading(doc, "7.2 Current Quote Calculation", 2)
add_table(doc, ["Line item", "Current value", "Calculation"], [
    ("Safari permit", "INR 1,500", "Per safari per required gypsy"),
    ("Guide and vehicle", "INR 2,500", "Per safari per required gypsy"),
    ("Transfers", "INR 1,500", "Flat optional amount"),
    ("Resort", "INR 4,000 to INR 8,500", "Placeholder nightly rate multiplied by nights"),
], widths=[1.8, 1.65, 3.35], font_size=9)
add_body(doc, "Important: All resort names, partner relationships and resort rates in the current dataset are placeholders for flow testing. Safari pricing is also a configurable project value, not a confirmed live government quotation. The final screen labels the result as a quote.")

add_section_break(doc)

add_heading(doc, "8 Enquiry Handoff and Confirmation", 1)
add_heading(doc, "8.1 Data Collected", 2)
add_bullets(doc, [
    "Trip: jungle, original range, requested date, recommended date when different, nights and selected safari plan.",
    "Party: adults, child ages, traveller names and traveller ages.",
    "Cart: safari vehicle requirement, resort, transfers and calculated quote.",
    "Contact: customer name, phone and optional email.",
    "Permit ID: entered value or a deferred flag for collection on the call.",
])

add_heading(doc, "8.2 Current API Behaviour", 2)
add_body(doc, "The enquiry endpoint is currently a stub. It logs a masked permit ID reference, counts provisional safaris, creates a generated enquiry reference and returns it to the browser. The complete booking state and quote are stored in sessionStorage so the confirmation page can display the reference, range, safari count, nights, gypsies and quote.")

add_heading(doc, "8.3 Privacy Boundary", 2)
add_body(doc, "The real Aadhaar, PAN or passport value must never be written to the normal enquiry table, shared lead sheet or general CRM record. The intended production design is a separate restricted store with only a masked last-four reference attached to the wider lead. That restricted store and its deletion lifecycle are not yet implemented.")

add_heading(doc, "9 System Architecture and Data Flow", 1)
add_table(doc, ["Layer", "Responsibility", "Technology"], [
    ("Portal ingestion", "Reads Buffer, Core and Moharli-specific availability", "Python and Playwright"),
    ("Availability store", "Keeps dated status snapshots and checked times", "Supabase Postgres"),
    ("Availability API", "Returns latest row per zone, date and session", "Next.js route handlers and pg"),
    ("Recommendation", "Ranks zones and builds capacity-aware plans", "Pure TypeScript rules engine"),
    ("Customer UI", "Three-step planner, grids, cart and confirmation", "Next.js App Router and React"),
    ("Enquiry handoff", "Currently returns a fake enquiry reference", "Next.js stub API"),
], widths=[1.4, 3.55, 1.85], font_size=8.5)

add_heading(doc, "9.1 Data Flow", 2)
add_numbers(doc, [
    "The scraper opens the government portal and searches five-day availability windows.",
    "Parsed cells are written to availability_snapshot with zone, date, session, status, count and checked time.",
    "The browser requests required zone IDs and candidate dates from the internal availability API.",
    "The API selects the latest snapshot for each zone, date and session.",
    "The recommendation engine processes the returned array without knowing database or scraper details.",
    "The UI displays recommendations and waits for explicit customer cart selections.",
    "The enquiry route receives the final customer-selected state, not merely the original recommendation.",
])

add_heading(doc, "9.2 Core Database Tables", 2)
add_table(doc, ["Table", "Purpose", "Primary operational note"], [
    ("zone", "Canonical gates and exact portal keys", "Portal labels preserve inconsistent spacing"),
    ("ranking", "Seasonal expert priority and sighting score", "Only Kolara Buffer is populated"),
    ("availability_snapshot", "Append-only availability checks", "Latest checked row is served"),
    ("enquiry", "Intended customer lead record", "No ID field by design"),
], widths=[1.55, 2.4, 2.85], font_size=8.7)

add_section_break(doc)

add_heading(doc, "10 Gate Inventory", 1)
add_body(doc, "The current Tadoba configuration contains 17 Buffer gates and 6 Core gates.")
add_table(doc, ["Range", "Buffer gates", "Core gates"], [
    ("Kolara", "Belara, Madnapur, Alizanza, Shirkheda, Chauradeo, Palasgaon", "Kolara Core"),
    ("Moharli", "Agarzari, Dewada, Adegaon, Junona, Mamla", "Moharli Gate, Khutwanda"),
    ("Navegaon", "Navegaon Ramdegi, Nimdhela", "Navegaon Core"),
    ("Pangadi and Zari", "Pangadi Aswal Chuha, Keslaghat, Zari Peth, Somnath", "Pangadi, Zari"),
], widths=[1.35, 3.85, 1.6], font_size=8.5)
add_body(doc, "Mamla rule: Mamla remains part of the Moharli Buffer live table but is excluded from automatic recommendations.")

add_heading(doc, "11 Scraper Operations", 1)
add_bullets(doc, [
    "Buffer sanctuary value is 2 and Core is 1. Safari Vehicle is value 4 for Buffer and 1 for Core.",
    "A regular search returns a five-day window. The scraper advances through the date picker month by month and processes windows in five-day steps.",
    "Each window receives up to three attempts with a fresh browser page. A repeatedly failing window is logged and skipped so one failure does not discard the whole sweep.",
    "A three-second throttle is applied between regular windows.",
    "The default last valid search anchor is today plus 119 days. The boundary response can contain data through today plus 120 days.",
    "A PowerShell wrapper runs the full sweep, writes timestamped logs and removes logs older than 14 days. Its comments identify an intended Windows Scheduled Task, but deployment registration, monitoring and alert delivery should be verified before launch.",
    "The scraper should run on infrastructure separate from the public site so portal blocking or rate limits do not take down the customer experience.",
])

add_heading(doc, "12 Current Safeguards", 1)
add_table(doc, ["Risk", "Current safeguard"], [
    ("Insufficient vehicles", "Recommendation and manual selection require open count to meet the whole party"),
    ("Double-booked session", "Adding a slot replaces another safari at the same date and session"),
    ("Stale availability", "20-second polling, manual refresh and final Step 2 recheck"),
    ("Portal layout change", "Parser raises errors when expected result tables disappear"),
    ("One failed scrape window", "Three retries and skip-with-log behaviour"),
    ("Moharli missing in regular Core feed", "Explicit NA plus separate zone-level check"),
    ("Sensitive permit ID", "Masked logging and no ID column in the enquiry table"),
    ("Timezone date shift", "Local date formatting instead of UTC ISO slicing"),
], widths=[2.0, 4.8], font_size=8.5)

doc.add_page_break()
add_heading(doc, "13 Current Limitations and Required Production Work", 1)
add_table(doc, ["Priority", "Work required", "Why it matters"], [
    ("High", "Replace enquiry stub with the approved Make.com, CRM or lead workflow", "Current submissions do not reach production operations"),
    ("High", "Build restricted permit ID storage and deletion controls", "Required before collecting real ID data at scale"),
    ("High", "Replace placeholder resorts and pricing with approved commercial data", "Current quote is a demonstration"),
    ("High", "Verify scheduled scraper registration, uptime monitoring and alerts", "Live coverage moves forward daily"),
    ("High", "Complete terms-of-use and legal review for Core availability", "Explicit pre-launch dependency"),
    ("Medium", "Add expert rankings for Moharli, Navegaon, Pangadi and Zari, and all Core gates", "Most zones currently use demand as a proxy"),
    ("Medium", "Add database row-level security and least-privilege access", "Protect enquiry and future restricted data"),
    ("Medium", "Review provisional future-date presentation", "Dates beyond portal coverage are planning assumptions, not confirmations"),
    ("Medium", "Persist selected recommended range explicitly in the enquiry record", "The plan can switch range while the original range remains in state"),
    ("Low", "Synchronize older README statements with the current recommendation ladder", "Avoid internal documentation drift"),
], widths=[0.75, 3.45, 2.6], font_size=8.0)

add_heading(doc, "14 Operational Acceptance Checklist", 1)
add_bullets(doc, [
    "Confirm all range and gate labels against the government portal before each season.",
    "Approve seasonal ranking and validity dates with the Wild Excursions safari expert.",
    "Confirm group occupancy examples and child-age policy with booking operations.",
    "Replace every placeholder resort and price with signed-off data.",
    "Run the live scraper verifier after portal changes and inspect both regular and Moharli-specific Core views.",
    "Test 1 and 2 gypsy parties across primary, alternate-range, combined-range and nearby-date fallbacks.",
    "Verify Mamla never appears in automatic plans but remains manually selectable.",
    "Verify enquiries reach the operations team and sensitive ID data stays outside general lead storage.",
    "Confirm the failure message and contact route with the sales team.",
])

add_heading(doc, "15 Source of Truth", 1)
add_body(doc, "This document describes the working implementation in the web, scraper and database folders as of 18 September 2026. When prose documentation conflicts with executable behaviour, the current code and verified database migrations are the operational source of truth until the documentation is updated.")

# Set core properties and keep headings with following paragraphs.
doc.core_properties.title = "Wild Excursions Tadoba Safari Planner Current Product Recommendation and Booking Flow"
doc.core_properties.subject = "Current-state product and technical handoff"
doc.core_properties.author = "Wild Excursions"
doc.core_properties.keywords = "Tadoba, safari planner, recommendation, availability, booking flow"

for paragraph in doc.paragraphs:
    if paragraph.style.name.startswith("Heading"):
        paragraph.paragraph_format.keep_with_next = True

OUT.parent.mkdir(parents=True, exist_ok=True)
doc.save(OUT)
print(OUT)
