"""
Petro — Wind Vector API
Fetches real-time 10-metre wind components (u10, v10) from the Open-Meteo
Forecast API (free, no key required) for each active flare cluster.
Returns enriched wind+flare data for the frontend plume simulator.
"""

import asyncio
import math
import logging
from typing import Any

import httpx
from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)

router = APIRouter()

# Open-Meteo Forecast API — free, no key needed
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# Max number of unique coordinate pairs to query (keeps it fast)
MAX_WIND_SITES = 80

# Cache inside the module (TTL = 30 min managed in main.py via _get/_set)
_WIND_CACHE_KEY_PREFIX = "wind_"


async def _fetch_wind_for_site(
    client: httpx.AsyncClient,
    lat: float,
    lon: float,
) -> dict[str, float] | None:
    """
    Fetch current 10-metre wind u/v components from Open-Meteo for one site.
    Uses the 'current' endpoint so we get a single instant value, not a forecast.
    """
    try:
        resp = await client.get(
            OPEN_METEO_URL,
            params={
                "latitude":         round(lat, 4),
                "longitude":        round(lon, 4),
                "current":          "wind_speed_10m,wind_direction_10m,wind_gusts_10m",
                "wind_speed_unit":  "ms",   # metres per second
                "forecast_days":    1,
                "timezone":         "UTC",
            },
            timeout=8.0,
        )
        resp.raise_for_status()
        data   = resp.json()
        curr   = data.get("current", {})
        speed  = float(curr.get("wind_speed_10m",   0) or 0)
        direg  = float(curr.get("wind_direction_10m", 0) or 0)
        gusts  = float(curr.get("wind_gusts_10m",   speed) or speed)

        # Decompose meteorological wind direction into u/v components
        # Met convention: 0° = wind FROM north, 90° = wind FROM east
        # u10 = eastward component, v10 = northward component
        dir_rad = math.radians(direg)
        u10 = -speed * math.sin(dir_rad)   # eastward
        v10 = -speed * math.cos(dir_rad)   # northward

        return {
            "wind_speed_ms":  round(speed, 2),
            "wind_dir_deg":   round(direg, 1),
            "wind_gusts_ms":  round(gusts, 2),
            "u10":            round(u10, 3),
            "v10":            round(v10, 3),
        }
    except Exception as exc:
        logger.debug("Wind fetch failed for (%.3f, %.3f): %s", lat, lon, exc)
        return None


def _wind_fallback() -> dict[str, float]:
    """Return a zero-wind fallback so the plume still renders (dormant state)."""
    return {"wind_speed_ms": 0.0, "wind_dir_deg": 0.0, "wind_gusts_ms": 0.0, "u10": 0.0, "v10": 0.0}


@router.get("/api/wind")
async def get_wind(days: int = Query(5, ge=1, le=5)):
    """
    Wind-enriched flare dataset for the atmospheric plume simulator.

    For each active flare cluster, returns:
      lat, lon, frp, co2_eq_t, basin, company, country,
      u10 (eastward wind m/s), v10 (northward wind m/s),
      wind_speed_ms, wind_dir_deg, wind_gusts_ms

    Wind data sourced from Open-Meteo Forecast API (free, real-time).
    Cached for 30 minutes.
    """
    # Lazy imports to avoid circular dependency at module load time
    from main import _build_df, _get, _set
    from processing.anomaly import detect_anomalies

    cache_key = f"{_WIND_CACHE_KEY_PREFIX}{days}"
    cached = _get(cache_key)
    if cached:
        return cached

    # ── 1. Build flare dataframe ─────────────────────────────────────────────
    df = await _build_df(days)
    if df.empty:
        return []

    df = detect_anomalies(df)

    # ── 2. Sample top flare sites by FRP (keep most active ones) ─────────────
    # Deduplicate by rounding coords to ~10 km grid to reduce API calls
    df = df.copy()
    df["lat_r"] = (df["latitude"]  / 0.1).round() * 0.1
    df["lon_r"] = (df["longitude"] / 0.1).round() * 0.1

    # Take the representative (highest FRP) point from each grid cell
    top = (
        df.sort_values("frp", ascending=False)
          .groupby(["lat_r", "lon_r"], as_index=False)
          .first()
          .sort_values("frp", ascending=False)
          .head(MAX_WIND_SITES)
    )

    rows = top.to_dict("records")

    # ── 3. Fetch wind concurrently for each unique site ──────────────────────
    async with httpx.AsyncClient() as client:
        tasks = [
            _fetch_wind_for_site(client, row["lat_r"], row["lon_r"])
            for row in rows
        ]
        wind_results = await asyncio.gather(*tasks, return_exceptions=True)

    # ── 4. Assemble result ───────────────────────────────────────────────────
    result: list[dict[str, Any]] = []
    for row, wind in zip(rows, wind_results):
        if isinstance(wind, Exception) or wind is None:
            wind = _wind_fallback()

        result.append({
            "lat":           round(float(row["lat_r"]), 4),
            "lon":           round(float(row["lon_r"]), 4),
            "frp":           round(float(row.get("frp", 0)), 2),
            "co2_eq_t":      round(float(row.get("co2_eq_t", 0)), 3),
            "basin":         str(row.get("basin", "Unknown")),
            "company":       str(row.get("company", "Unknown")),
            "country":       str(row.get("country", "Unknown")),
            "is_anomaly":    bool(row.get("is_anomaly", False)),
            "u10":           wind["u10"],
            "v10":           wind["v10"],
            "wind_speed_ms": wind["wind_speed_ms"],
            "wind_dir_deg":  wind["wind_dir_deg"],
            "wind_gusts_ms": wind["wind_gusts_ms"],
        })

    # Sort by FRP descending so the frontend prioritises intense sites
    result.sort(key=lambda x: x["frp"], reverse=True)

    # Cache for 30 minutes using the standard cache helper
    _set(cache_key, result)

    return result
