"""
Attributes each flare cluster to a basin and — preferentially — to a known well
from our Excel database using exact Haversine spatial matching.

Priority:
  1. Exact well match within 5 km   → use real company / well name / landmark
                                      → confidence = 0.95
  2. Basin bounding-box match       → use weighted random from known operators
                                      → confidence = top operator's weight
  3. Fallback                       → "Unknown", confidence = 0.10
"""
import json
import pandas as pd
import numpy as np

from data.wells_database import find_nearest_well

# Basin → list of known operators (weighted by relative production share)
BASIN_OPERATORS = {
    "Permian Basin": [
        ("Pioneer Natural Resources", "USA", 0.22),
        ("ConocoPhillips",            "USA", 0.18),
        ("Occidental Petroleum",      "USA", 0.16),
        ("ExxonMobil",                "USA", 0.15),
        ("Chevron",                   "USA", 0.14),
        ("Devon Energy",              "USA", 0.10),
        ("Unknown Permian Operator",  "USA", 0.05),
    ],
    "Niger Delta": [
        ("Shell Nigeria",             "Nigeria", 0.28),
        ("Chevron Nigeria",           "Nigeria", 0.22),
        ("TotalEnergies Nigeria",     "Nigeria", 0.20),
        ("Eni Nigeria",               "Nigeria", 0.18),
        ("NNPC",                      "Nigeria", 0.12),
    ],
    "West Siberia": [
        ("Gazprom",                   "Russia", 0.35),
        ("Rosneft",                   "Russia", 0.30),
        ("Lukoil",                    "Russia", 0.20),
        ("Surgutneftegas",            "Russia", 0.15),
    ],
    "Middle East": [
        ("Iraq Oil Ministry (Basra)", "Iraq",   0.45),
        ("Kuwait Oil Company",        "Kuwait", 0.35),
        ("BP Iraq",                   "Iraq",   0.20),
    ],
    "Saudi Arabia": [
        ("Saudi Aramco",              "Saudi Arabia", 1.00),
    ],
    "Marcellus": [
        ("EQT Corporation",           "USA", 0.30),
        ("Range Resources",           "USA", 0.25),
        ("Cabot Oil & Gas",           "USA", 0.25),
        ("Chesapeake Energy",         "USA", 0.20),
    ],
    "Rajasthan": [
        ("Cairn India (Vedanta)",     "India", 0.70),
        ("ONGC",                      "India", 0.30),
    ],
    "Congo Basin": [
        ("TotalEnergies DRC",         "DRC",   0.55),
        ("Perenco DRC",               "DRC",   0.45),
    ],
}


def attribute_to_basin(df: pd.DataFrame) -> pd.DataFrame:
    """
    For each flare row:
      1. Try exact spatial match to known Excel well within 5 km
         → Sets company, well_name, landmark, matched_well=True
         → attr_confidence=0.95, attr_alternatives=[]
      2. Fall back to basin-based weighted random operator
         → Sets company, matched_well=False
         → attr_confidence=top_weight, attr_alternatives=[top 2 others]
    """
    if df.empty:
        return df

    rng = np.random.default_rng(99)
    df = df.copy()

    companies     = []
    well_names    = []
    landmarks     = []
    countries_out = []   # authoritative country per row
    matched       = []
    confidences   = []
    alternatives  = []

    for _, row in df.iterrows():
        lat = float(row.get("latitude",  0))
        lon = float(row.get("longitude", 0))

        # ── Attempt exact well match ──────────────────────────────────────
        well = find_nearest_well(lat, lon, radius_km=5.0)
        if well:
            companies.append(well["company"])
            well_names.append(well["name"])
            landmarks.append(well["landmark"])
            # Use the well's own country (from Excel), NOT the FIRMS bounding-box tag
            countries_out.append(well["country"])
            matched.append(True)
            confidences.append(0.95)
            alternatives.append(json.dumps([]))
            continue

        # ── Basin-based fallback ──────────────────────────────────────────
        basin = row.get("basin", "Unknown")
        ops   = BASIN_OPERATORS.get(basin)
        if ops:
            names    = [o[0] for o in ops]
            ctry_map = [o[1] for o in ops]   # per-operator country
            weights  = [o[2] for o in ops]
            total    = sum(weights)
            norm_w   = [w / total for w in weights]

            # Deterministic choice (seed 99 ensures reproducibility)
            chosen_idx = int(rng.choice(len(names), p=norm_w))
            chosen     = names[chosen_idx]
            confidence = round(norm_w[chosen_idx], 3)
            chosen_country = ctry_map[chosen_idx]

            # Top-2 alternatives (excluding chosen)
            alts = []
            ranked = sorted(
                [(names[i], round(norm_w[i], 3)) for i in range(len(names)) if i != chosen_idx],
                key=lambda x: -x[1],
            )[:2]
            alts = [{"operator": n, "confidence": c} for n, c in ranked]
        else:
            chosen         = f"Unknown ({basin})"
            confidence     = 0.10
            alts           = []
            chosen_country = str(row.get("country", "Unknown"))

        companies.append(chosen)
        well_names.append("")
        landmarks.append("")
        countries_out.append(chosen_country)
        matched.append(False)
        confidences.append(confidence)
        alternatives.append(json.dumps(alts))

    df["company"]          = companies
    df["well_name"]        = well_names
    df["landmark"]         = landmarks
    df["country"]          = countries_out   # overwrite bounding-box tag with authoritative country
    df["matched_well"]     = matched
    df["attr_confidence"]  = confidences
    df["attr_alternatives"] = alternatives
    return df
