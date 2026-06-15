"""Download canonical Wikipedia lead images for each hero into /tmp/herosrc."""
import os, sys, time, requests

OUT = "/tmp/herosrc"
os.makedirs(OUT, exist_ok=True)

# hero id -> Wikipedia page title
TITLES = {
    "warren": "Warren Buffett",
    "munger": "Charlie Munger",
    "graham": "Benjamin Graham",
    "lynch": "Peter Lynch",
    "templeton": "John Templeton",
    "soros": "George Soros",
    "ray": "Ray Dalio",
    "tudorjones": "Paul Tudor Jones",
    "druckenmiller": "Stanley Druckenmiller",
    "tepper": "David Tepper",
    "icahn": "Carl Icahn",
    "ackman": "Bill Ackman",
    "loeb": "Daniel S. Loeb",
    "cathie": "Cathie Wood",
    "chamath": "Chamath Palihapitiya",
    "simons": "Jim Simons",
    "griffin": "Ken Griffin (businessman)",
    "bogle": "John C. Bogle",
    "livermore": "Jesse Lauriston Livermore",
    "burry": "Michael Burry",
}

UA = "simFolio-asset-fetch/1.0 (educational simulation app; quantumsimplx@gmail.com)"
S = requests.Session()
S.headers.update({"User-Agent": UA})

def get(url, **kw):
    """GET with backoff on 429."""
    for attempt in range(6):
        r = S.get(url, timeout=60, **kw)
        if r.status_code == 429:
            wait = 3 * (attempt + 1)
            print(f"    429, backing off {wait}s...")
            time.sleep(wait)
            continue
        r.raise_for_status()
        return r
    r.raise_for_status()
    return r

def original_image_url(title):
    r = get("https://en.wikipedia.org/w/api.php", params={
        "action": "query", "prop": "pageimages", "piprop": "original",
        "titles": title, "format": "json", "redirects": 1,
    })
    pages = r.json()["query"]["pages"]
    page = next(iter(pages.values()))
    return page.get("original", {}).get("source")

# Only fetch ids missing from OUT already (lets us re-run for stragglers)
have = {os.path.splitext(f)[0] for f in os.listdir(OUT)}
todo = {h: t for h, t in TITLES.items() if h not in have}
if len(sys.argv) > 1:  # optional: restrict to ids passed on cmdline
    todo = {h: t for h, t in TITLES.items() if h in sys.argv[1:]}

results = {}
for hid, title in todo.items():
    try:
        url = original_image_url(title)
        if not url:
            print(f"NO IMAGE  {hid:14} ({title})"); results[hid] = None
            time.sleep(1.5); continue
        ext = os.path.splitext(url)[1].split("?")[0] or ".jpg"
        path = os.path.join(OUT, hid + ext)
        img = get(url)
        with open(path, "wb") as f:
            f.write(img.content)
        print(f"OK        {hid:14} {len(img.content)//1024:5}KB  {os.path.basename(url)}")
        results[hid] = path
    except Exception as e:
        print(f"ERROR     {hid:14} {e}")
        results[hid] = None
    time.sleep(1.5)

missing = [h for h,v in results.items() if not v]
print("\nMISSING:", missing or "none")
