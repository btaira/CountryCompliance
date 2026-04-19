import json
import urllib.request
from pathlib import Path

def fetch_wb(indicator):
    url = f"https://api.worldbank.org/v2/country/all/indicator/{indicator}?format=json&per_page=300&date=2022"
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read())[1]
    res = {}
    for item in data:
        country_name = item['country']['value']
        val = item['value']
        if val is not None:
            res[country_name] = val
    return res

def main():
    root = Path(__file__).parent.parent
    countries_file = root / "scripts" / "country_links.json"
    target_countries = list(json.loads(countries_file.read_text()).keys())
    
    wb_gdp = fetch_wb("NY.GDP.MKTP.CD")
    wb_pop = fetch_wb("SP.POP.TOTL")
    
    alias_map = {
        "USA": "United States",
        "USA/Canada": "United States", 
        "China Mainland": "China",
        "South Korea": "Korea, Rep.",
        "Korea": "Korea, Rep.",
        "Russian Federation": "Russian Federation",
        "Russia": "Russian Federation",
        "EU/EEA": "European Union",
        "Europe": "European Union",
        "Europe (CE Countries)": "European Union",
        "Hong Kong": "Hong Kong SAR, China",
        "Egypt": "Egypt, Arab Rep.",
        "Venezuela": "Venezuela, RB",
        "Kyrgyzstan": "Kyrgyz Republic",
        "Turkey": "Turkiye",
        "UAE": "United Arab Emirates"
    }
    
    # Overrides from IMF / National DBs for 2022 since WB excludes them or maps them poorly
    overrides = {
        "Taiwan": { "gdp": 762600000000, "pop": 23890000 }
    }
    
    final_macro = {}
    
    for c in target_countries:
        if c in overrides:
            o_gdp = overrides[c]["gdp"]
            o_pop = overrides[c]["pop"]
            final_macro[c] = {
                "gdp": o_gdp,
                "gdp_per_capita": o_gdp / o_pop if o_pop else None
            }
            continue
            
        lookup = alias_map.get(c, c)
        
        gdp_val = wb_gdp.get(lookup)
        pop_val = wb_pop.get(lookup)
        
        # Substring search if missed but restrict it to avoid Taiwan->China bleed
        if not gdp_val:
            for k in wb_gdp.keys():
                if lookup.lower() == k.lower():
                    gdp_val = wb_gdp[k]
                    pop_val = wb_pop.get(k)
                    break
        
        per_capita = None
        if gdp_val and pop_val:
            per_capita = gdp_val / pop_val
            
        final_macro[c] = {
            "gdp": gdp_val,
            "gdp_per_capita": per_capita
        }
        
    out_file = root / "scripts" / "country_macro.json"
    out_file.write_text(json.dumps(final_macro, indent=2))
    found = len([x for x in final_macro.values() if x["gdp"] is not None])
    print(f"Wrote Macro Data for {found} out of {len(target_countries)} countries.")

if __name__ == "__main__":
    main()
