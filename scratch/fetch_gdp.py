import json
import urllib.request
from pathlib import Path

def get_wb_gdp():
    url = "https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?format=json&per_page=300&date=2022"
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read())[1]
        
    gdp_map = {}
    for item in data:
        country_name = item['country']['value']
        value = item['value']
        if value:
            gdp_map[country_name] = value
    return gdp_map

def main():
    root = Path(__file__).parent.parent
    countries_file = root / "scripts" / "country_links.json"
    target_countries = json.loads(countries_file.read_text()).keys()
    
    wb_gdp = get_wb_gdp()
    
    # Simple matching
    final_gdp = {}
    
    alias_map = {
        "USA": "United States",
        "USA/Canada": "United States",  # Just use US as representative or split? They are combined in the source unfortunately.
        "China Mainland": "China",
        "South Korea": "Korea, Rep.",
        "Korea": "Korea, Rep.",
        "Russian Federation": "Russian Federation",
        "Russia": "Russian Federation",
        "Taiwan": "Taiwan, China", # WB might not have Taiwan.
        "EU/EEA": "European Union",
        "Europe": "European Union",
        "Europe (CE Countries)": "European Union",
        "Hong Kong": "Hong Kong SAR, China",
        "Egypt": "Egypt, Arab Rep.",
        "Venezuela": "Venezuela, RB",
        "Kyrgyzstan": "Kyrgyz Republic"
    }
    
    for c in target_countries:
        lookup = alias_map.get(c, c)
        val = wb_gdp.get(lookup)
        
        # If still none, try substring search
        if not val:
            for k, v in wb_gdp.items():
                if lookup.lower() in k.lower() or k.lower() in lookup.lower():
                    val = v
                    break
        
        final_gdp[c] = val
        
    out_file = root / "scripts" / "country_gdp.json"
    out_file.write_text(json.dumps(final_gdp, indent=2))
    print(f"Wrote GDP for {len([x for x in final_gdp.values() if x])} out of {len(target_countries)} countries.")

if __name__ == "__main__":
    main()
