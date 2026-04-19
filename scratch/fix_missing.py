import urllib.request
import urllib.error

missing = {
    "csa": "CSA_mark.svg",
    "fcc": "FCC_Logo.svg",
    "ccc": "CCC_logo.svg",
    "kc": "KC_mark.svg",
    "nom": "NOM_logo.svg",
    "ukca": "UKCA_mark.svg",
    "pse": "PSE_mark_logo.svg",
    "giteki": "Giteki_mark.svg"
}

def try_download():
    for name, title in missing.items():
        found = False
        for domain in ["commons.wikimedia.org", "en.wikipedia.org"]:
            url = f"https://{domain}/wiki/Special:FilePath/{title}"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            try:
                data = urllib.request.urlopen(req).read()
                # Check if it's actually SVG
                if b"<svg" in data.lower() or b"<?xml" in data.lower():
                    with open(f"docs/assets/marks/{name}.svg", "wb") as f:
                        f.write(data)
                    print(f"Success {name} from {domain}")
                    found = True
                    break
            except Exception as e:
                pass
        if not found:
            print(f"Failed {name}")

try_download()
