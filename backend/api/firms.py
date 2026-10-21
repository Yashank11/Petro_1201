"""
NASA FIRMS VIIRS data fetcher.
Queries the free FIRMS Area API — no license required, just a MAP_KEY.
Returns a pandas DataFrame of thermal anomaly detections.
"""
import os
import asyncio
import httpx
import pandas as pd
from io import StringIO
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

FIRMS_KEY = os.getenv("FIRMS_MAP_KEY", "")
FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"

# Major gas-flaring regions worldwide: (west, south, east, north, label, country)
REGIONS = [
    # ── North America ──────────────────────────────────────────────────────────
    (-104.5, 28.0,  -99.0, 34.0,  "Permian Basin",        "USA"),
    (-104.0, 47.0, -100.0, 49.0,  "Bakken / Williston",   "USA"),
    ( -99.5, 27.0,  -96.0, 30.5,  "Eagle Ford",           "USA"),
    ( -95.5, 25.0,  -87.5, 30.0,  "Gulf of Mexico",       "USA"),
    ( -80.5, 39.5,  -74.0, 43.0,  "Marcellus",            "USA"),
    (-115.5, 55.5, -110.0, 58.5,  "Alberta Oil Sands",    "Canada"),

    # ── South America ──────────────────────────────────────────────────────────
    ( -73.5,  8.5,  -69.0, 12.0,  "Maracaibo Basin",      "Venezuela"),
    ( -64.5,  7.0,  -59.5,  9.5,  "Orinoco Belt",         "Venezuela"),

    # ── Africa ─────────────────────────────────────────────────────────────────
    (   4.5,  3.5,    9.5,  6.5,  "Niger Delta",          "Nigeria"),
    (   4.0, 28.0,   10.5, 34.0,  "Hassi Messaoud",       "Algeria"),
    (  13.0, 26.0,   22.0, 32.0,  "Sirte Basin",          "Libya"),
    (  25.5, 27.0,   33.0, 31.0,  "Western Desert",       "Egypt"),
    (  13.0, -6.0,   18.0, -2.0,  "Congo Basin",          "DRC"),
    (   8.0, -2.0,   14.5,  4.0,  "Gulf of Guinea",       "Equatorial Guinea"),

    # ── Middle East ────────────────────────────────────────────────────────────
    (  44.0, 28.0,   50.5, 34.0,  "Middle East",          "Iraq/Kuwait"),
    (  46.0, 22.0,   57.0, 28.0,  "Saudi Arabia",         "Saudi Arabia"),
    (  47.0, 29.5,   52.5, 34.0,  "Khuzestan",            "Iran"),
    (  50.0, 25.5,   57.0, 28.5,  "Southern Iran",        "Iran"),
    (  54.0, 17.5,   60.0, 24.5,  "Oman",                 "Oman"),

    # ── Caspian / Central Asia ─────────────────────────────────────────────────
    (  50.0, 43.5,   56.0, 48.5,  "Tengiz / Kashagan",    "Kazakhstan"),
    (  48.0, 38.0,   51.5, 42.0,  "Baku Offshore",        "Azerbaijan"),
    (  52.0, 36.0,   63.0, 43.0,  "Turkmenistan",         "Turkmenistan"),

    # ── Russia ─────────────────────────────────────────────────────────────────
    (  59.0, 56.0,   82.0, 72.0,  "West Siberia",         "Russia"),
    ( 140.5, 49.5,  145.0, 54.0,  "Sakhalin",             "Russia"),

    # ── Europe ─────────────────────────────────────────────────────────────────
    (   1.0, 56.0,    8.0, 62.0,  "North Sea",            "Norway/UK"),

    # ── South Asia ─────────────────────────────────────────────────────────────
    (  68.0, 22.0,   78.0, 28.0,  "Rajasthan",            "India"),

    # ── East / South-East Asia ─────────────────────────────────────────────────
    (  82.0, 37.5,   92.0, 44.0,  "Xinjiang Basin",       "China"),
    ( 102.0, 28.0,  108.0, 32.0,  "Sichuan Basin",        "China"),
    ( 104.0, -4.0,  117.5,  2.5,  "Kalimantan",           "Indonesia"),
    (  99.0, -2.5,  106.0,  4.5,  "Sumatra",              "Indonesia"),
]


async def _fetch_region(
    client: httpx.AsyncClient,
    key: str,
    source: str,
    days: int,
    west: float,
    south: float,
    east: float,
    north: float,
    basin: str,
    country: str,
) -> pd.DataFrame | None:
    """Fetch VIIRS data for a single bounding-box region."""
    area = f"{west},{south},{east},{north}"
    url = f"{FIRMS_BASE}/{key}/{source}/{area}/{days}"
    try:
        resp = await client.get(url)
        if resp.status_code == 200 and resp.text.strip():
            df = pd.read_csv(StringIO(resp.text))
            df["basin"] = basin
            df["country"] = country
            return df
    except Exception as e:
        print(f"[FIRMS] Error fetching {basin}: {e}")
    return None


async def fetch_viirs_data(days: int = 7) -> pd.DataFrame:
    """
    Fetch VIIRS SNPP NRT thermal anomalies for all major flaring regions.
    days: 1–5 (FIRMS NRT limit is 5 days for the Area API).
    All regions are fetched concurrently to avoid timeouts.
    """
    days = min(days, 5)
    source = "VIIRS_SNPP_NRT"

    async with httpx.AsyncClient(timeout=45.0) as client:
        tasks = [
            _fetch_region(client, FIRMS_KEY, source, days, w, s, e, n, b, c)
            for w, s, e, n, b, c in REGIONS
        ]
        results = await asyncio.gather(*tasks)

    all_frames = [r for r in results if r is not None]

    if not all_frames:
        print("[FIRMS] No data returned — using synthetic fallback.")
        return _synthetic_fallback()

    combined = pd.concat(all_frames, ignore_index=True)

    # Normalise column names (FIRMS sometimes ships mixed case)
    combined.columns = [c.lower().strip() for c in combined.columns]

    # Ensure required columns exist
    for col, default in [("bright_ti4", 1700.0), ("frp", 5.0),
                         ("type", 2), ("confidence", "n"),
                         ("daynight", "N"), ("acq_date", "")]:
        if col not in combined.columns:
            combined[col] = default

    # Parse date
    combined["acq_date"] = pd.to_datetime(combined["acq_date"], errors="coerce")

    return combined


def _synthetic_fallback() -> pd.DataFrame:
    """
    Realistic synthetic VIIRS data for demo when FIRMS is unavailable.
    Automatically covers all regions defined in REGIONS above.
    """
    import numpy as np
    from datetime import datetime, timedelta

    rng = np.random.default_rng(42)
    records = []
    today = datetime.utcnow().date()

    for west, south, east, north, basin, country in REGIONS:
        n = rng.integers(40, 120)
        for _ in range(n):
            day_offset = rng.integers(0, 7)
            records.append({
                "latitude":   rng.uniform(south, north),
                "longitude":  rng.uniform(west, east),
                "bright_ti4": rng.uniform(1550, 2100),
                "bright_ti5": rng.uniform(300, 340),
                "frp":        float(rng.exponential(8)),
                "type":       rng.choice([2, 3]),
                "confidence": rng.choice(["n", "h"], p=[0.6, 0.4]),
                "daynight":   "N",
                "acq_date":   today - timedelta(days=int(day_offset)),
                "basin":      basin,
                "country":    country,
            })

    return pd.DataFrame(records)
