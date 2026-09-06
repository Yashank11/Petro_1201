"""
Petro — Global Oil & Gas Fields & Wells Database
Sourced from Global Energy Monitor (GEM) Global Oil & Gas Extraction Tracker (GOGET) via OverWatts Atlas.
Contains 7,110 verified oil & gas production fields, offshore rigs/platforms, and extraction sites across 93 countries.
Indexed using a 3D Cartesian cKDTree for sub-millisecond nearest-neighbor spatial lookups.
"""
import os
import json
import math
from typing import Optional, Dict, Any, List

import numpy as np
from scipy.spatial import cKDTree

DATA_FILE = os.path.join(os.path.dirname(__file__), "oil_gas_fields.json")

# Earth radius in kilometers
_EARTH_RADIUS_KM = 6371.0


def _load_fields() -> List[Dict[str, Any]]:
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {DATA_FILE}: {e}")
        return []


# ── Load database ─────────────────────────────────────────────────────────────
KNOWN_WELLS: List[Dict[str, Any]] = _load_fields()

# Normalize fields for compatibility
for w in KNOWN_WELLS:
    w.setdefault("landmark", "")
    w.setdefault("has_coords", True)
    w["is_offshore"] = not w.get("onshore", True)

COORD_WELLS: List[Dict[str, Any]] = [w for w in KNOWN_WELLS if w.get("lat") is not None and w.get("lon") is not None]

# ── Build 3D Cartesian cKDTree for sub-millisecond queries ───────────────────
if COORD_WELLS:
    _coords_rad = np.radians([(w["lat"], w["lon"]) for w in COORD_WELLS])
    _lats = _coords_rad[:, 0]
    _lons = _coords_rad[:, 1]
    _xs = _EARTH_RADIUS_KM * np.cos(_lats) * np.cos(_lons)
    _ys = _EARTH_RADIUS_KM * np.cos(_lats) * np.sin(_lons)
    _zs = _EARTH_RADIUS_KM * np.sin(_lats)
    _TREE = cKDTree(np.column_stack([_xs, _ys, _zs]))
else:
    _TREE = None


def find_nearest_well(lat: float, lon: float, radius_km: float = 15.0) -> Optional[Dict[str, Any]]:
    """
    Finds the closest oil & gas field or platform within radius_km of (lat, lon).
    Uses 3D Cartesian cKDTree for O(log N) sub-millisecond lookup.
    """
    if _TREE is None or not COORD_WELLS:
        return None

    try:
        lat_rad = math.radians(lat)
        lon_rad = math.radians(lon)
        qx = _EARTH_RADIUS_KM * math.cos(lat_rad) * math.cos(lon_rad)
        qy = _EARTH_RADIUS_KM * math.cos(lat_rad) * math.sin(lon_rad)
        qz = _EARTH_RADIUS_KM * math.sin(lat_rad)

        # Chord distance calculation for great-circle radius
        chord_r = 2.0 * _EARTH_RADIUS_KM * math.sin(radius_km / (2.0 * _EARTH_RADIUS_KM))

        dist, idx = _TREE.query([qx, qy, qz], distance_upper_bound=chord_r)
        if idx < len(COORD_WELLS):
            match = dict(COORD_WELLS[idx])
            match["dist_km"] = round(float(dist), 2)
            return match
    except Exception:
        pass

    return None


if __name__ == "__main__":
    print(f"Total known fields: {len(KNOWN_WELLS)}")
    print(f"  With coordinates: {len(COORD_WELLS)}")
    offshore = sum(1 for w in KNOWN_WELLS if w.get("is_offshore"))
    print(f"  Offshore rigs/platforms: {offshore}")
    print(f"  Onshore fields: {len(KNOWN_WELLS) - offshore}")
