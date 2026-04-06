# Country Compliance Atlas

Static GitHub Pages site for browsing country-by-country market access requirements exported from Nemko's Global Market Compliance guide.

## Publish on GitHub Pages

1. Push this repository to GitHub.
2. In the repository settings, open `Pages`.
3. Set the source to `Deploy from a branch`.
4. Select the `main` branch and the `/docs` folder.
5. Save the settings.

GitHub will publish the site from [docs/index.html](/c:/Users/btaira/OneDrive%20-%20Cisco/Documents/GitHub/CountryCompliance/docs/index.html).

## Refresh the data

Run:

```powershell
python scripts/export_nemko_country_regulations.py
```

That updates:

- `exports/nemko_country_regulations.csv`
- `exports/nemko_country_regulations.json`
- `docs/data/nemko_country_regulations.json`

## Local preview

Run:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/docs/`.
