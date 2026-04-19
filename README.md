# Country Compliance Atlas

A premium, data-rich global market access intelligence tool. The Country Compliance Atlas serves as an interactive explorer for browsing a merged regulatory database synthesized from multiple disparate authoritative resources. 

The site utilizes a fast, client-side static architecture, rendered with a modern glassmorphism aesthetic. It correlates standard compliance requirements (Safety, EMC, Radio/Telecom, Energy) alongside market size viability metrics (GDP, GDP per Capita) and dynamic regulatory marks (SVGs).

## Data Sources & Pipeline Architecture

The unified compliance database is dynamically built from the following core inputs:

1. **Nemko's Global Market Compliance Guide** (`raw_nemko_compliance.html`) - The primary regulatory backbone.
2. **Excel Requirements** (`Country Compliance Requirements.xlsx`)
3. **Hardware Handbook** (`Compliance Requirements for Hardware.docx`)
4. **Macroeconomic Cache** (`exports/world_bank_cache.json`) - Live population and GDP tracking fetched automatically via the World Bank API during the build pipeline.
5. **Macroeconomic Overrides** (`scripts/country_macro.json`) - Manual injection for missing territories (e.g., Taiwan, UK/GB variance).
6. **Regulatory Mark Mappings** (`scripts/country_marks.json`) - Defines which compliance logos belong to which jurisdictions.
7. **Official Endpoints** (`scripts/country_links.json`) - Hard links to authoritative government certification pages.

---

## Instructions to Update Output Data

Run the core python pipeline to re-synthesize and build the database anytime one of the source data sets changes:

```powershell
python scripts/export_nemko_country_regulations.py
```

This single command will parse all data inputs, query the World Bank for fresh economic context, and map everything perfectly into the unified database. It outputs to:
- `exports/nemko_country_regulations.csv`
- `docs/data/country_compliance_database.json` (The client-side API).

**Cache Busting:** If you are actively updating data and deploying structural UI changes, navigate to the bottom of `docs/index.html` and `docs/country.html` and bump the static version query string (e.g., `?v=20260419a`) to aggressively force clients to flush cache.

---

## How to Add or Update Agency Logos (SVGs)

We enforce using official Vector Graphic (`.svg`) files to assure resolution parity on the premium glass cards.

1. **Acquire the Logo**: Download the official correct SVG logic (e.g., `bis.svg` for India).
2. **Place Asset**: Add the vector file to the assets directory: `docs/assets/marks/bis.svg`
3. **Map the Country**: Open `scripts/country_marks.json` and append the file string (minus the `.svg` extension) to the country's array block.
   ```json
   "India": ["bis"],
   "Japan": ["giteki", "pse"],
   ```
4. **Rebuild DB**: Rerun `export_nemko_country_regulations.py`. The `app.js` and `country.js` runtime environments handle the dynamic parsing into the UI container automatically.

---

## Local Preview Environment

Since the project operates using relative fetches for the cached `country_compliance_database.json`, you cannot serve the page via the `file:///` protocol. 

Launch a quick local server instead:

```powershell
python -m http.server 8000
```
Then navigate to `http://localhost:8000/docs/index.html`.

---

## Publishing to GitHub Pages

1. Commit and push all file changes directly to the `main` branch.
2. Ensure repository settings > `Pages` is directed to `Deploy from a branch`.
3. Set tracking to the `main` branch and the `/docs` folder.

GitHub will publish natively and bypass the root framework logic immediately.
