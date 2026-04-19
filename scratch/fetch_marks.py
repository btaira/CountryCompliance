import urllib.request
import os
from pathlib import Path

marks = {
    "anatel": "d/dd/Anatel_Logo.svg",
    "ul": "4/41/Underwriters_Laboratories_logo.svg",
    "csa": "3/30/CSA_Group_Logo.svg",
    "ce": "1/15/Conformit%C3%A9_Europ%C3%A9enne_%28logo%29.svg",
    "fcc": "7/77/FCC_logo.svg",
    "ccc": "7/70/CCC_logo.svg",
    "kc": "e/ea/KC_mark_%28Korea_Certification_mark%29.svg",
    "nom": "3/3d/NOM_logo.svg",
    "rcm": "b/b3/Regulatory_Compliance_Mark.svg",
    "ukca": "3/36/UKCA_mark.svg",
    "pse": "5/5e/PSE_mark_logo.svg",
    "giteki": "3/3b/Giteki_mark.svg"
}

import time
import subprocess

def main():
    root = Path(__file__).parent.parent
    marks_dir = root / "docs" / "assets" / "marks"
    marks_dir.mkdir(parents=True, exist_ok=True)
    
    for name, path in marks.items():
        url = f"https://upload.wikimedia.org/wikipedia/commons/{path}"
        out_path = marks_dir / f"{name}.svg"
        print(f"Downloading {name} from {url}...")
        try:
            cmd = ["curl.exe", "-sL", "-A", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36", url, "-o", str(out_path)]
            subprocess.run(cmd, check=True)
            time.sleep(1)
        except Exception as e:
            print(f"Failed to download {name}: {e}")

if __name__ == "__main__":
    main()
