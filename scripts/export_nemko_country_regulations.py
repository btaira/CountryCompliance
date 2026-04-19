from __future__ import annotations

import csv
import json
import re
import zipfile
from collections import defaultdict
from datetime import UTC, datetime
from html import unescape
from pathlib import Path
from urllib.request import urlopen
from xml.etree import ElementTree as ET


SOURCE_URL = "https://www.nemko.com/services/global-market-access/select-by-country"
ROOT_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT_DIR / "exports"
DOCS_DATA_DIR = ROOT_DIR / "docs" / "data"
OUTPUT_COUNTRIES_DIR = OUTPUT_DIR / "countries"
DOCS_COUNTRIES_DIR = DOCS_DATA_DIR / "countries"
RAW_HTML_PATH = ROOT_DIR / "nemko_select_by_country.html"
WORKBOOK_PATH = ROOT_DIR / "Country Compliance Requirements.xlsx"
HANDBOOK_PATH = ROOT_DIR / "Compliance Requirements for Hardware.docx"

XLSX_NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
DOCX_NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

# Nemko renders each country as a repeated list of 35 <li> values.
# The list-heading items are section separators, not standalone data fields.
NEMKO_FIELDS = [
    "country",
    "national_language",
    "population",
    "flag_image_url",
    "compliance_requirement_for_telecom_radio",
    "regulatory_authority",
    "mandatory_requirements_telecom_radio_safety_emc",
    "in_country_test",
    "language_requirements_application_manual_report",
    "local_representation_required_for_approval",
    "country_specific_labelling",
    "approval_validity",
    "factory_inspection",
    "other_requirements",
    "radio_telecom_certificate_example_url",
    "radio_telecom_mark_artwork_url",
    "emc_certification_and_test_report_required_for_it_products",
    "emission_and_immunity",
    "safety_certification_required_for_it_products",
    "safety_test_report_requirement",
    "rohs_certification_required_for_it_products",
    "rohs_requirements",
    "sample_required_in_country",
    "language_requirements_user_manual_product_safety_markings",
    "local_representative_applicant_required",
    "mandatory_factory_inspection_requirement",
    "remarks",
    "safety_emc_certificate_example_url",
    "safety_emc_mark_artwork_url",
    "energy_efficiency_requirements",
    "energy_efficiency_certificate_example_url",
    "energy_efficiency_mark_artwork_url",
]

WORKBOOK_FIELDS = [
    "comment",
    "region",
    "country",
    "blank",
    "support_contact",
    "agency",
    "product_type",
    "cost_per_certificate",
    "cost_for_additional_country_of_origin",
    "sample_needed_for_certification",
    "family_approval_accepted_incremental_cost",
    "lead_time_for_certification_months",
    "certificate_validity_years",
    "recertification_cost",
    "lead_time_for_recertification_months",
    "budget_lt_needed_months",
    "sample_needed_for_recertification",
    "lead_time_for_sample_months",
]

HARDWARE_BUSINESS_UNITS = [
    "Ent Access",
    "Ent Routing",
    "Ent DC Servers",
    "Ent DC Switching",
    "SP Core (Routing)",
    "SP Access",
    "Security",
    "Optical",
    "TMG",
    "IOT",
]


def fetch_html(url: str) -> str:
    with urlopen(url, timeout=30) as response:
        return response.read().decode("utf-8", errors="ignore")


def clean_text(value: str) -> str:
    value = re.sub(r"<[^>]+>", "", value)
    value = unescape(value)
    value = value.replace("\xa0", " ").replace("\u200b", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def slugify(value: str) -> str:
    value = clean_text(value).lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def normalize_country_name(value: str) -> str:
    text = clean_text(value)
    if not text:
        return ""

    aliases = {
        "usa": "USA",
        "us": "USA",
        "united-states": "USA",
        "united-states-of-america": "USA",
        "usa-canada": "USA/Canada",
        "canada": "Canada",
        "uk": "United Kingdom",
        "vietnam": "Vietnam",
        "eu-eea": "EU/EEA",
        "europe": "Europe",
        "europe-ce-countries": "Europe (CE Countries)",
        "europe-lot-9": "Europe (Lot 9)",
        "morocco-anrt": "Morocco",
        "brazil-anatel": "Brazil",
        "indonesia-sdppi": "Indonesia",
        "korea-kcc": "Korea",
        "korea-kc-safety": "Korea",
        "japan-vcci": "Japan",
        "japan-jate": "Japan",
        "armenia-kazakhstan-kyrgyzstan-eac": "Armenia",
        "australia-new-zealand": "Australia",
        "usa-canada ": "USA/Canada",
        "hong-kong": "Hong Kong",
        "dominican-republic": "Dominican Republic",
        "new-zealand": "New Zealand",
        "united-kingdom": "United Kingdom",
        "south-africa": "South Africa",
        "saudi-arabia": "Saudi Arabia",
        "china-mainland": "China Mainland",
    }
    slug = slugify(text)
    if slug in aliases:
        return aliases[slug]
    words = re.split(r"\s+", text)
    normalized_words = []
    for word in words:
        if word.isupper() and len(word) <= 4:
            normalized_words.append(word)
        else:
            normalized_words.append(word.capitalize())
    return " ".join(normalized_words).strip()


def extract_image_src(value: str) -> str:
    match = re.search(r'<img[^>]+src="([^"]*)"', value, re.IGNORECASE)
    if not match:
        return ""
    return unescape(match.group(1)).strip()


def parse_nemko_country_cards(html: str) -> list[dict[str, str]]:
    blocks = re.findall(
        r'<div class="resource-card mix all ([^"]+?)\s+">\s*<ul>(.*?)</ul>\s*</div>',
        html,
        re.DOTALL | re.IGNORECASE,
    )
    countries: list[dict[str, str]] = []

    for css_class, block in blocks:
        items = re.findall(r"<li[^>]*>(.*?)</li>", block, re.DOTALL | re.IGNORECASE)
        if len(items) != 35:
            raise ValueError(
                f"Unexpected item count for '{css_class.strip()}': expected 35, got {len(items)}"
            )

        values = [
            clean_text(items[0]),
            clean_text(items[1]),
            clean_text(items[2]),
            extract_image_src(items[3]),
            clean_text(items[5]),
            clean_text(items[6]),
            clean_text(items[7]),
            clean_text(items[8]),
            clean_text(items[9]),
            clean_text(items[10]),
            clean_text(items[11]),
            clean_text(items[12]),
            clean_text(items[13]),
            clean_text(items[14]),
            extract_image_src(items[15]),
            extract_image_src(items[16]),
            clean_text(items[18]),
            clean_text(items[19]),
            clean_text(items[20]),
            clean_text(items[21]),
            clean_text(items[22]),
            clean_text(items[23]),
            clean_text(items[24]),
            clean_text(items[25]),
            clean_text(items[26]),
            clean_text(items[27]),
            clean_text(items[28]),
            extract_image_src(items[29]),
            extract_image_src(items[30]),
            clean_text(items[32]),
            extract_image_src(items[33]),
            extract_image_src(items[34]),
        ]

        row = dict(zip(NEMKO_FIELDS, values, strict=True))
        row["country_css_class"] = css_class.strip()
        countries.append(row)

    return countries


def read_xlsx_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zf.namelist():
        return []
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    return [
        "".join(t.text or "" for t in item.iterfind(".//a:t", XLSX_NS))
        for item in root.findall("a:si", XLSX_NS)
    ]


def read_xlsx_sheet_rows(path: Path, sheet_name: str) -> list[list[str]]:
    with zipfile.ZipFile(path) as zf:
        shared_strings = read_xlsx_shared_strings(zf)
        sheet = ET.fromstring(zf.read(sheet_name))
        rows: list[list[str]] = []
        for row in sheet.findall(".//a:row", XLSX_NS):
            values: list[str] = []
            for cell in row.findall("a:c", XLSX_NS):
                value = cell.find("a:v", XLSX_NS)
                if value is None:
                    values.append("")
                    continue
                if cell.attrib.get("t") == "s":
                    values.append(shared_strings[int(value.text)])
                else:
                    values.append(value.text or "")
            rows.append(values)
        return rows


def parse_workbook() -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    sheet_rows = read_xlsx_sheet_rows(WORKBOOK_PATH, "xl/worksheets/sheet1.xml")
    data_rows: list[dict[str, str]] = []
    for row_index, row in enumerate(sheet_rows[1:], start=2):
        padded = row + [""] * (len(WORKBOOK_FIELDS) - len(row))
        entry = dict(zip(WORKBOOK_FIELDS, padded[: len(WORKBOOK_FIELDS)], strict=True))
        entry = {key: clean_text(value) for key, value in entry.items()}
        entry["row_number"] = str(row_index)
        entry["country"] = normalize_country_name(entry["country"])
        if entry["country"]:
            data_rows.append(entry)

    comments_rows = read_xlsx_sheet_rows(WORKBOOK_PATH, "xl/worksheets/sheet2.xml")
    comments: list[dict[str, str]] = []
    for row in comments_rows:
        padded = row + [""] * (4 - len(row))
        row_ref, comment_text, author, created_at = (clean_text(value) for value in padded[:4])
        match = re.search(r"Row\s+(\d+)", row_ref, re.IGNORECASE)
        comments.append(
            {
                "row_reference": row_ref,
                "row_number": match.group(1) if match else "",
                "comment": comment_text,
                "author": author,
                "created_at": created_at,
            }
        )

    comments_by_row = defaultdict(list)
    for item in comments:
        if item["row_number"]:
            comments_by_row[item["row_number"]].append(item)

    for entry in data_rows:
        entry["comments"] = comments_by_row.get(entry["row_number"], [])

    return data_rows, comments


def extract_docx_tables(path: Path) -> list[list[list[str]]]:
    with zipfile.ZipFile(path) as zf:
        root = ET.fromstring(zf.read("word/document.xml"))
    tables: list[list[list[str]]] = []
    for tbl in root.findall(".//w:tbl", DOCX_NS):
        rows: list[list[str]] = []
        for tr in tbl.findall("w:tr", DOCX_NS):
            cells: list[str] = []
            for tc in tr.findall("w:tc", DOCX_NS):
                parts = []
                for paragraph in tc.findall(".//w:p", DOCX_NS):
                    text = "".join(
                        node.text or "" for node in paragraph.findall(".//w:t", DOCX_NS)
                    )
                    text = clean_text(text)
                    if text:
                        parts.append(text)
                cells.append(" ".join(parts).strip())
            rows.append(cells)
        tables.append(rows)
    return tables


def expand_country_group(value: str) -> list[str]:
    text = clean_text(value)
    if not text:
        return []

    text = text.replace(" and ", ", ")
    text = re.sub(r"\(([^)]*)\)", "", text)
    text = re.sub(r"\s+", " ", text).strip(" ,")
    parts = [part.strip(" ,") for part in text.split(",") if part.strip(" ,")]

    expanded: list[str] = []
    for part in parts:
        normalized = normalize_country_name(part)
        if normalized in {"Europe", "Europe CE Countries"}:
            normalized = "Europe (CE Countries)"
        if normalized in {"Australia New Zealand"}:
            normalized = "Australia"
        expanded.append(normalized)
    return [item for item in expanded if item]


def parse_hardware_handbook() -> dict[str, object]:
    tables = extract_docx_tables(HANDBOOK_PATH)
    metadata = {
        "document_number": tables[0][0][2] if len(tables) > 0 and len(tables[0][0]) > 2 else "",
        "revision": tables[0][1][2] if len(tables) > 0 and len(tables[0][1]) > 2 else "",
        "created_by": tables[0][2][2] if len(tables) > 0 and len(tables[0][2]) > 2 else "",
    }

    sections: list[dict[str, object]] = []
    country_index: dict[str, list[dict[str, object]]] = defaultdict(list)

    for idx, unit in enumerate(HARDWARE_BUSINESS_UNITS):
        standards_table = tables[3 + idx * 2]
        approvals_table = tables[4 + idx * 2]

        standards = []
        for row in standards_table[1:]:
            if len(row) >= 2 and any(row):
                standards.append(
                    {
                        "category": clean_text(row[0]),
                        "standard_specification": clean_text(row[1]),
                    }
                )

        approvals = []
        for row in approvals_table[1:]:
            padded = row + [""] * (3 - len(row))
            country_group = clean_text(padded[0])
            timeline = clean_text(padded[1])
            comments = clean_text(padded[2])
            if not (country_group or timeline or comments):
                continue
            approval = {
                "country_group": country_group,
                "timeline": timeline,
                "comments": comments,
                "countries": expand_country_group(country_group),
            }
            approvals.append(approval)
            for country in approval["countries"]:
                country_index[country].append(
                    {
                        "business_unit": unit,
                        "timeline": timeline,
                        "comments": comments,
                        "country_group": country_group,
                    }
                )

        sections.append(
            {
                "business_unit": unit,
                "standards": standards,
                "approvals": approvals,
            }
        )

    glossary = []
    for row in tables[23]:
        if len(row) >= 2:
            glossary.append({"term": clean_text(row[0]), "definition": clean_text(row[1])})

    return {
        "metadata": metadata,
        "business_units": sections,
        "country_index": dict(country_index),
        "glossary": glossary,
    }


def build_unified_database(
    nemko_rows: list[dict[str, str]],
    workbook_rows: list[dict[str, str]],
    workbook_comments: list[dict[str, str]],
    handbook: dict[str, object],
    country_links: dict[str, str],
    country_macro: dict[str, dict],
) -> dict[str, object]:
    nemko_by_country = {normalize_country_name(item["country"]): item for item in nemko_rows}
    workbook_by_country: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in workbook_rows:
        workbook_by_country[row["country"]].append(row)

    handbook_by_country = handbook["country_index"]
    handbook_units = {
        item["business_unit"]: item["standards"] for item in handbook["business_units"]
    }
    all_countries = sorted(
        {
            *nemko_by_country.keys(),
            *workbook_by_country.keys(),
            *handbook_by_country.keys(),
        }
    )

    unified_countries = []
    for country in all_countries:
        workbook_entries = workbook_by_country.get(country, [])
        country_comments = [
            comment
            for entry in workbook_entries
            for comment in entry.get("comments", [])
        ]

        workbook_summary = {
            "entry_count": len(workbook_entries),
            "product_types": sorted(
                {entry["product_type"] for entry in workbook_entries if entry["product_type"]}
            ),
            "agencies": sorted({entry["agency"] for entry in workbook_entries if entry["agency"]}),
            "support_contacts": sorted(
                {
                    entry["support_contact"]
                    for entry in workbook_entries
                    if entry["support_contact"]
                }
            ),
        }

        handbook_approvals = []
        for approval in handbook_by_country.get(country, []):
            enriched = dict(approval)
            enriched["standards"] = handbook_units.get(approval["business_unit"], [])
            handbook_approvals.append(enriched)

        unified_countries.append(
            {
                "country": country,
                "slug": slugify(country),
                "country_file": f"countries/{slugify(country)}.json",
                "official_regulatory_link": country_links.get(country, ""),
                "gdp": country_macro.get(country, {}).get("gdp"),
                "gdp_per_capita": country_macro.get(country, {}).get("gdp_per_capita"),
                "nemko": nemko_by_country.get(country),
                "workbook": {
                    "summary": workbook_summary,
                    "entries": workbook_entries,
                    "comments": country_comments,
                },
                "hardware_handbook": {
                    "approvals": handbook_approvals,
                },
            }
        )

    return {
        "source_url": SOURCE_URL,
        "fetched_at_utc": datetime.now(UTC).isoformat(),
        "country_count": len(unified_countries),
        "sources": {
            "nemko_html": RAW_HTML_PATH.name,
            "workbook": WORKBOOK_PATH.name,
            "hardware_handbook": HANDBOOK_PATH.name,
        },
        "hardware_handbook": {
            "metadata": handbook["metadata"],
            "business_units": handbook["business_units"],
            "glossary": handbook["glossary"],
        },
        "workbook_comments_total": len(workbook_comments),
        "countries": unified_countries,
    }


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    fieldnames = ["country_css_class", *NEMKO_FIELDS]
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_json(path: Path, payload: dict[str, object] | list[dict[str, str]]) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def write_js_data(path: Path, variable_name: str, payload: dict[str, object]) -> None:
    serialized = json.dumps(payload, ensure_ascii=False)
    path.write_text(f"window.{variable_name} = {serialized};\n", encoding="utf-8")


def write_country_files(path: Path, countries: list[dict[str, object]]) -> None:
    path.mkdir(parents=True, exist_ok=True)
    for country in countries:
        write_json(path / f"{country['slug']}.json", country)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_COUNTRIES_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_COUNTRIES_DIR.mkdir(parents=True, exist_ok=True)

    html = fetch_html(SOURCE_URL)
    RAW_HTML_PATH.write_text(html, encoding="utf-8")

    country_links_path = ROOT_DIR / "scripts" / "country_links.json"
    country_links = json.loads(country_links_path.read_text(encoding="utf-8")) if country_links_path.exists() else {}

    country_macro_path = ROOT_DIR / "scripts" / "country_macro.json"
    country_macro = json.loads(country_macro_path.read_text(encoding="utf-8")) if country_macro_path.exists() else {}

    nemko_rows = parse_nemko_country_cards(html)
    workbook_rows, workbook_comments = parse_workbook()
    handbook = parse_hardware_handbook()
    unified_database = build_unified_database(
        nemko_rows,
        workbook_rows,
        workbook_comments,
        handbook,
        country_links,
        country_macro,
    )

    if not nemko_rows:
        raise ValueError("No country cards were parsed from the source page.")

    write_csv(OUTPUT_DIR / "nemko_country_regulations.csv", nemko_rows)
    write_json(
        OUTPUT_DIR / "nemko_country_regulations.json",
        {
            "source_url": SOURCE_URL,
            "fetched_at_utc": datetime.now(UTC).isoformat(),
            "country_count": len(nemko_rows),
            "countries": nemko_rows,
        },
    )
    write_json(OUTPUT_DIR / "country_compliance_database.json", unified_database)
    write_json(DOCS_DATA_DIR / "country_compliance_database.json", unified_database)
    write_js_data(
        DOCS_DATA_DIR / "country_compliance_database.js",
        "COUNTRY_COMPLIANCE_DATABASE",
        unified_database,
    )
    write_country_files(OUTPUT_COUNTRIES_DIR, unified_database["countries"])
    write_country_files(DOCS_COUNTRIES_DIR, unified_database["countries"])

    print(f"Parsed {len(nemko_rows)} Nemko countries.")
    print(f"Unified countries: {unified_database['country_count']}")
    print(f"CSV: {OUTPUT_DIR / 'nemko_country_regulations.csv'}")
    print(f"Unified DB: {OUTPUT_DIR / 'country_compliance_database.json'}")
    print(f"Site data: {DOCS_DATA_DIR / 'country_compliance_database.json'}")


if __name__ == "__main__":
    main()
