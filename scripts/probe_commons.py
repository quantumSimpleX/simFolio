"""Search Wikimedia Commons for free portrait images of the missing heroes."""
import time, requests

NAMES = {
    "lynch": "Peter Lynch investor",
    "templeton": "John Templeton investor",
    "druckenmiller": "Stanley Druckenmiller",
    "loeb": "Daniel Loeb",
    "griffin": "Ken Griffin Citadel",
    "burry": "Michael Burry",
}
UA = "simFolio-asset-fetch/1.0 (educational simulation app; quantumsimplx@gmail.com)"
S = requests.Session(); S.headers.update({"User-Agent": UA})

for hid, q in NAMES.items():
    r = S.get("https://commons.wikimedia.org/w/api.php", params={
        "action": "query", "generator": "search", "gsrnamespace": 6,
        "gsrsearch": q, "gsrlimit": 6, "prop": "imageinfo",
        "iiprop": "url|size|extmetadata", "format": "json",
    }, timeout=30)
    print(f"\n=== {hid}  ({q}) ===")
    pages = r.json().get("query", {}).get("pages", {})
    if not pages:
        print("  (no results)")
    for p in sorted(pages.values(), key=lambda x: x.get("index", 99)):
        ii = p.get("imageinfo", [{}])[0]
        w, h = ii.get("width"), ii.get("height")
        lic = ii.get("extmetadata", {}).get("LicenseShortName", {}).get("value", "?")
        print(f"  {w}x{h:<5} {lic:18} {p['title']}")
    time.sleep(1.5)
