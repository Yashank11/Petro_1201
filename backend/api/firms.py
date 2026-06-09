"""
NASA FIRMS VIIRS data fetcher.
Queries the free FIRMS Area API — no license required, just a MAP_KEY.
Returns a pandas DataFrame of thermal anomaly detections.
"""
import os
import httpx
import pandas as pd
from io import StringIO
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

FIRMS_KEY = os.getenv("FIRMS_MAP_KEY", "")
FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"

# Major gas-flaring regions: (west, south, east, north, label, country)
REGIONS = [
    (-104.5, 28.0, -99.0, 34.0,  "Permian Basin",    "USA"),
    (4.5,    3.5,  9.5,   6.5,   "Niger Delta",       "Nigeria"),
    (59.0,   56.0, 82.0,  72.0,  "West Siberia",      "Russia"),
    (44.0,   28.0, 50.5,  34.0,  "Middle East",       "Iraq/Kuwait"),
    (46.0,   22.0, 57.0,  28.0,  "Saudi Arabia",      "Saudi Arabia"),
    (-80.5,  39.5, -74.0, 43.0,  "Marcellus",         "USA"),
    (68.0,   22.0, 78.0,  28.0,  "Rajasthan",         "India"),
    (13.0,   -6.0, 18.0,  -2.0,  "Congo Basin",       "DRC"),
]


async def fetch_viirs_data(days: int = 7) -> pd.DataFrame:
    """
    Fetch VIIRS SNPP NRT thermal anomalies for all major flaring regions.
    days: 1–5 (FIRMS NRT limit is 5 days for the Area API).
    """
    days = min(days, 5)
    source = "VIIRS_SNPP_NRT"
    all_frames = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        for west, south, east, north, basin, country in REGIONS:
            area = f"{west},{south},{east},{north}"
            url = f"{FIRMS_BASE}/{FIRMS_KEY}/{source}/{area}/{days}"
            try:
                resp = await client.get(url)
                if resp.status_code == 200 and resp.text.strip():
                    df = pd.read_csv(StringIO(resp.text))
                    df["basin"] = basin
                    df["country"] = country
                    all_frames.append(df)
            except Exception as e:
                print(f"[FIRMS] Error fetching {basin}: {e}")

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
    Covers the same 8 regions with plausible coordinates and FRP values.
    """
    import numpy as np
    from datetime import datetime, timedelta

    rng = np.random.default_rng(42)
    records = []
    today = datetime.utcnow().date()

    for west, south, east, north, basin, country in REGIONS:
        n = rng.integers(40, 120)
        for i in range(n):
            day_offset = rng.integers(0, 7)
            records.append({
                "latitude":    rng.uniform(south, north),
                "longitude":   rng.uniform(west, east),
                "bright_ti4":  rng.uniform(1550, 2100),
                "bright_ti5":  rng.uniform(300, 340),
                "frp":         float(rng.exponential(8)),
                "type":        rng.choice([2, 3]),
                "confidence":  rng.choice(["n", "h"], p=[0.6, 0.4]),
                "daynight":    "N",
                "acq_date":    today - timedelta(days=int(day_offset)),
                "basin":       basin,
                "country":     country,
            })

    return pd.DataFrame(records)
