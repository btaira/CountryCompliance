from __future__ import annotations

import csv
import json
import re
from datetime import UTC, datetime
from html import unescape
from pathlib import Path
from urllib.request import urlopen


SOURCE_URL = "https://www.nemko.com/services/global-market-access/select-by-country"
ROOT_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT_DIR / "exports"
DOCS_DATA_DIR = ROOT_DIR / "docs" / "data"
RAW_HTML_PATH = ROOT_DIR / "nemko_select_by_country.html"

# Nemko renders each country as a repeated list of 35 <li> values.
# The list-heading items are section separators, not standalone data fields.
FIELDS = [
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


def fetch_html(url: str) -> str:
    with urlopen(url, timeout=30) as response:
        return response.read().decode("utf-8", errors="ignore")


def clean_text(value: str) -> str:
    value = re.sub(r"<[^>]+>", "", value)
    value = unescape(value)
    value = value.replace("\xa0", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def extract_image_src(value: str) -> str:
    match = re.search(r'<img[^>]+src="([^"]*)"', value, re.IGNORECASE)
    if not match:
        return ""
    return unescape(match.group(1)).strip()


def parse_country_cards(html: str) -> list[dict[str, str]]:
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

        row = dict(zip(FIELDS, values, strict=True))
        row["country_css_class"] = css_class.strip()
        countries.append(row)

    return countries


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    fieldnames = ["country_css_class", *FIELDS]
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_json(path: Path, rows: list[dict[str, str]]) -> None:
    payload = {
        "source_url": SOURCE_URL,
        "fetched_at_utc": datetime.now(UTC).isoformat(),
        "country_count": len(rows),
        "countries": rows,
    }
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_DATA_DIR.mkdir(parents=True, exist_ok=True)
    html = fetch_html(SOURCE_URL)
    RAW_HTML_PATH.write_text(html, encoding="utf-8")

    countries = parse_country_cards(html)
    if not countries:
        raise ValueError("No country cards were parsed from the source page.")

    write_csv(OUTPUT_DIR / "nemko_country_regulations.csv", countries)
    write_json(OUTPUT_DIR / "nemko_country_regulations.json", countries)
    write_json(DOCS_DATA_DIR / "nemko_country_regulations.json", countries)

    print(f"Parsed {len(countries)} countries.")
    print(f"CSV: {OUTPUT_DIR / 'nemko_country_regulations.csv'}")
    print(f"JSON: {OUTPUT_DIR / 'nemko_country_regulations.json'}")
    print(f"Site data: {DOCS_DATA_DIR / 'nemko_country_regulations.json'}")


if __name__ == "__main__":
    main()
