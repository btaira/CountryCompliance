import time
import subprocess
import json
import urllib.request
import urllib.parse
from pathlib import Path

marks = {
    "anatel": "Anatel_Logo.svg",
    "ul": "Underwriters_Laboratories_logo.svg",
    "csa": "CSA_Group_Logo.svg",
    "ce": "Conformité_Européenne_(logo).svg",
    "fcc": "FCC_logo.svg",
    "ccc": "CCC_logo.svg",
    "kc": "KC_mark_(Korea_Certification_mark).svg",
    "nom": "NOM_logo.svg",
    "rcm": "Regulatory_Compliance_Mark.svg",
    "ukca": "UKCA_mark.svg",
    "pse": "PSE_mark_logo.svg",
    "giteki": "Giteki_mark.svg"
}

def get_wikimedia_url(filename):
    encoded = urllib.parse.quote(f"File:{filename}")
    for domain in ["commons.wikimedia.org", "en.wikipedia.org"]:
        api_url = f"https://{domain}/w/api.php?action=query&titles={encoded}&prop=imageinfo&iiprop=url&format=json"
        req = urllib.request.Request(api_url, headers={'User-Agent': 'CountryComplianceBot/1.0'})
        try:
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read())
                pages = data['query']['pages']
                for page_id in pages:
                    if 'imageinfo' in pages[page_id]:
                        return pages[page_id]['imageinfo'][0]['url']
        except Exception as e:
            pass
    return None

def main():
    root = Path(__file__).parent.parent
    marks_dir = root / "docs" / "assets" / "marks"
    marks_dir.mkdir(parents=True, exist_ok=True)
    
    for name, path in marks.items():
        url = get_wikimedia_url(path)
        if not url:
            print(f"Could not resolve URL for {name} ({path})")
            continue
            
        out_path = marks_dir / f"{name}.svg"
        print(f"Downloading {name} from {url}...")
        try:
            cmd = ["curl.exe", "-sL", "-A", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", url, "-o", str(out_path)]
            subprocess.run(cmd, check=True)
            time.sleep(1)
        except Exception as e:
            print(f"Failed to download {name}: {e}")

if __name__ == "__main__":
    main()
