"""
Petro — FastAPI backend
Fetches real VIIRS data from NASA FIRMS, processes it in-memory, serves JSON.
No database. No Docker. Just: uvicorn main:app --reload
"""
import os
import time
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

from api.firms import fetch_viirs_data
from api.climatetrace import fetch_country_emissions
from api.copilot import router as copilot_router
from api.wind import router as wind_router
from processing.clustering import cluster_flares
from processing.emission_factors import calculate_emissions
from processing.anomaly import detect_anomalies
from processing.attribution import attribute_to_basin
from data.wells_database import KNOWN_WELLS, COORD_WELLS
from data.worldbank_flaring import (
    get_historical_trends,
    get_country_history,
    get_location_data,
    get_all_countries,
)

app = FastAPI(title="Petro API", version="2.2.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount PetroCopilot AI router
app.include_router(copilot_router)

# Mount Wind Vector router
app.include_router(wind_router)

# ── In-memory cache (TTL = 1 hour) ─────────────────────────────────────────
_cache: dict = {}
CACHE_TTL = 3600


def _get(key):
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return data
    return None


def _set(key, data):
    _cache[key] = (data, time.time())


# ── Shared pipeline ─────────────────────────────────────────────────────────
async def _build_df(days: int):
    """Fetch + filter + cluster + attribute + emissions for given day window."""
    df = await fetch_viirs_data(days=days)
    if df.empty:
        return df
    # Industrial flares only (type 2 = static land, 3 = offshore)
    df = df[df["type"].isin([2, 3])]
    # Brightness and FRP thresholds
    df = df[(df["bright_ti4"] > 1600) | (df["frp"] > 1)]
    df = cluster_flares(df)
    df = attribute_to_basin(df)
    df = calculate_emissions(df)
    return df


def _risk_level(co2_kt: float, anomaly_flag: bool) -> str:
    if anomaly_flag or co2_kt > 50:
        return "high"
    elif co2_kt > 10:
        return "medium"
    return "low"


# ── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "cache_keys": list(_cache.keys()),
        "known_wells": len(KNOWN_WELLS),
        "wells_with_coords": len(COORD_WELLS),
    }


@app.get("/api/flares")
async def get_flares(days: int = Query(5, ge=1, le=5)):
    """GeoJSON FeatureCollection of clustered flare sites."""
    key = f"flares_{days}"
    cached = _get(key)
    if cached:
        return cached

    df = await _build_df(days)
    df = detect_anomalies(df)

    features = []
    for _, row in df.iterrows():
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(row["longitude"]), float(row["latitude"])],
            },
            "properties": {
                "id":               str(row.get("cluster_id", row.name)),
                "frp":              round(float(row.get("frp", 0)), 2),
                "bright_ti4":       round(float(row.get("bright_ti4", 0)), 1),
                "co2_eq_t":         round(float(row.get("co2_eq_t", 0)), 3),
                "basin":            str(row.get("basin", "Unknown")),
                "company":          str(row.get("company", "Unknown")),
                "well_name":        str(row.get("well_name", "")),
                "landmark":         str(row.get("landmark", "")),
                "matched_well":     bool(row.get("matched_well", False)),
                "country":          str(row.get("country", "Unknown")),
                "date":             str(row.get("acq_date", ""))[:10],
                "acq_datetime":     str(row.get("acq_date", ""))[:16],
                "confidence":       str(row.get("confidence", "n")),
                "is_anomaly":       bool(row.get("is_anomaly", False)),
                "anomaly_score":    round(float(row.get("anomaly_score", 0)), 2),
                "cluster_size":     int(row.get("cluster_size", 1)),
                "gas_value_usd":    round(float(row.get("gas_value_usd", 0)), 2),
                "attr_confidence":  round(float(row.get("attr_confidence", 0.5)), 3),
                "attr_alternatives": str(row.get("attr_alternatives", "[]")),
                # Explainability fields
                "viirs_source":     "NASA FIRMS VIIRS NRT (375m)",
                "emission_model":   "Elvidge 2016 — log₁₀(V) = 1.40 + 1.55×log₁₀(FRP)",
                "co2_factor":       "IPCC AR6 — 0.8 kg/m³ × 2.86 kg/kg",
                "value_method":     "Elvidge V_gas × 38 MJ/scm ÷ 1055 × $3.5/MMBtu (Henry Hub proxy)",
                "attr_method":      "Exact well match (5km)" if bool(row.get("matched_well", False)) else "Basin weighted probability",
            },
        })

    result = {"type": "FeatureCollection", "features": features}
    _set(key, result)
    return result


@app.get("/api/known_wells")
async def get_known_wells():
    """
    GeoJSON FeatureCollection of all known wells from Excel database.
    Includes wells with and without coordinates (no-coord wells omitted from geometry).
    """
    cached = _get("known_wells")
    if cached:
        return cached

    features = []
    for w in KNOWN_WELLS:
        if not w.get("has_coords"):
            continue
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [w["lon"], w["lat"]],
            },
            "properties": {
                "name":     w["name"],
                "company":  w["company"],
                "country":  w["country"],
                "landmark": w["landmark"],
                "source":   w["source"],
                "detected": False,
            },
        })

    result = {"type": "FeatureCollection", "features": features}
    _set("known_wells", result)
    return result


@app.get("/api/oil_prices")
async def get_oil_prices():
    """
    Live Brent & WTI crude oil prices via Yahoo Finance (no API key required).
    Returns current price + 5-day historical series for correlation analysis.
    Cached for 15 minutes.
    """
    key = "oil_prices"
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < 900:
            return data

    import httpx
    symbols = {"WTI": "CL=F", "Brent": "BZ=F", "NatGas": "NG=F"}
    result = {}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            for name, symbol in symbols.items():
                try:
                    resp = await client.get(
                        f"https://query2.finance.yahoo.com/v8/finance/chart/{symbol}",
                        params={"interval": "1d", "range": "10d"},
                        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
                    )
                    data = resp.json()
                    chart = data["chart"]["result"][0]
                    meta  = chart["meta"]
                    price = meta.get("regularMarketPrice", 0)
                    prev  = meta.get("chartPreviousClose", price)
                    change = price - prev

                    # Build history array aligned to timestamps
                    timestamps = chart.get("timestamp", [])
                    closes     = chart.get("indicators", {}).get("quote", [{}])[0].get("close", [])
                    history    = []
                    for ts_epoch, close_price in zip(timestamps, closes):
                        if close_price is not None:
                            from datetime import datetime, timezone
                            date_str = datetime.fromtimestamp(ts_epoch, tz=timezone.utc).strftime("%Y-%m-%d")
                            history.append({"date": date_str, "price": round(float(close_price), 2)})

                    result[name] = {
                        "price":      round(price, 2),
                        "prev_close": round(prev, 2),
                        "change":     round(change, 2),
                        "change_pct": round((change / prev * 100) if prev else 0, 2),
                        "currency":   meta.get("currency", "USD"),
                        "symbol":     symbol,
                        "history":    history[-10:],  # last 10 trading days
                    }
                except Exception:
                    result[name] = {"price": 0, "change": 0, "change_pct": 0, "symbol": symbol, "history": []}
    except Exception:
        pass

    _set(key, result)
    return result


@app.get("/api/top_emitters")
async def get_top_emitters(
    days: int = Query(5, ge=1, le=5),
    limit: int = Query(20, ge=1, le=50),
):
    """Top emitters ranked by CO₂-equivalent (kt), with risk level, change %, and efficiency score."""
    key = f"emitters_{days}_{limit}"
    cached = _get(key)
    if cached:
        return cached

    df = await _build_df(days)
    if df.empty:
        return []

    df = detect_anomalies(df)

    # Split window in half to compute change_pct
    half = max(1, days // 2)
    df["date_str"] = df["acq_date"].astype(str).str[:10]
    all_dates = sorted(df["date_str"].unique())
    recent_dates = set(all_dates[-half:]) if len(all_dates) >= half else set(all_dates)
    prior_dates  = set(all_dates[:-half]) if len(all_dates) > half else set()

    df_recent = df[df["date_str"].isin(recent_dates)]
    df_prior  = df[df["date_str"].isin(prior_dates)] if prior_dates else df.iloc[0:0]

    grouped = (
        df.groupby(["company", "country", "basin"])
        .agg(
            co2_eq_kt      =("co2_eq_t",      lambda x: round(x.sum() / 1000, 3)),
            flare_count    =("frp",            "count"),
            avg_frp        =("frp",            lambda x: round(x.mean(), 2)),
            gas_value_usd  =("gas_value_usd",  lambda x: round(x.sum(), 0)),
            anomaly_flag   =("is_anomaly",     lambda x: bool(x.any())),
            attr_confidence=("attr_confidence", lambda x: round(x.mean(), 3)),
        )
        .reset_index()
        .sort_values("co2_eq_kt", ascending=False)
        .head(limit)
        .reset_index(drop=True)
    )

    # Recent half totals for change_pct
    recent_totals = (
        df_recent.groupby(["company", "country", "basin"])["co2_eq_t"]
        .sum().reset_index().rename(columns={"co2_eq_t": "co2_recent"})
    )
    prior_totals = (
        df_prior.groupby(["company", "country", "basin"])["co2_eq_t"]
        .sum().reset_index().rename(columns={"co2_eq_t": "co2_prior"})
    ) if not df_prior.empty else None

    grouped = grouped.merge(recent_totals, on=["company", "country", "basin"], how="left")
    if prior_totals is not None:
        grouped = grouped.merge(prior_totals, on=["company", "country", "basin"], how="left")
        grouped["change_pct"] = grouped.apply(
            lambda r: round(
                ((r["co2_recent"] - r.get("co2_prior", 0)) / r["co2_prior"] * 100)
                if r.get("co2_prior", 0) > 0 else 0,
                1
            ), axis=1
        )
    else:
        grouped["change_pct"] = 0.0

    # Efficiency score: CO₂ per flare detection (lower = more efficient)
    grouped["efficiency_score"] = grouped.apply(
        lambda r: round(r["co2_eq_kt"] * 1000 / r["flare_count"], 1) if r["flare_count"] > 0 else 0,
        axis=1
    )

    # Risk level
    grouped["risk_level"] = grouped.apply(
        lambda r: _risk_level(r["co2_eq_kt"], r["anomaly_flag"]), axis=1
    )

    grouped["rank"] = grouped.index + 1
    result = grouped.to_dict("records")
    _set(key, result)
    return result


@app.get("/api/alerts")
async def get_alerts(
    days: int = Query(5, ge=1, le=5),
    limit: int = Query(50, ge=1, le=200),
):
    """Anomaly alerts — flare sites with intensity > 2σ above baseline."""
    key = f"alerts_{days}"
    cached = _get(key)
    if cached:
        return cached[:limit]

    df = await _build_df(days)
    df = detect_anomalies(df)

    alerts_df = df[df["is_anomaly"] == True].copy()
    if alerts_df.empty:
        return []

    alerts_df["severity"] = alerts_df["anomaly_score"].apply(
        lambda s: "critical" if s > 3 else ("high" if s > 2.5 else "medium")
    )

    # Spike % above baseline (anomaly_score is σ units; convert to approximate %)
    alerts_df["co2_spike_pct"] = alerts_df["anomaly_score"].apply(
        lambda s: round(min(s * 75, 999), 0)  # rough: 1σ ≈ 75% above mean
    )

    alerts_df["message"] = alerts_df.apply(
        lambda r: (
            f"Flaring spike at {r.get('well_name') or r['basin']} — "
            f"{r['frp']:.1f} MW ({r.get('anomaly_score', 0):.1f}σ above baseline)"
        ),
        axis=1,
    )

    keep = ["cluster_id", "latitude", "longitude", "basin", "company", "well_name",
            "landmark", "country", "frp", "co2_eq_t", "anomaly_score", "severity",
            "message", "attr_confidence", "attr_alternatives", "co2_spike_pct",
            "acq_date", "matched_well"]
    keep = [c for c in keep if c in alerts_df.columns]

    result = alerts_df[keep].to_dict("records")
    _set(key, result)
    return result[:limit]


@app.get("/api/pulse")
async def get_pulse(days: int = Query(5, ge=1, le=5)):
    """
    Global Emissions Pulse — single headline metric.
    Returns total CO₂ for the observation window vs the window mean as baseline.
    The baseline is dynamically computed from the most recent observation window
    (up to 10 days), enabling responsive short-term anomaly detection rather than
    long-term climatological comparison.
    """
    key = f"pulse_{days}"
    cached = _get(key)
    if cached:
        return cached

    df = await _build_df(days)
    if df.empty:
        return {"total_kt": 0, "avg_daily_kt": 0, "change_pct": 0, "trend": "normal", "label": "NORMAL"}

    df["date_str"] = df["acq_date"].astype(str).str[:10]
    daily = df.groupby("date_str")["co2_eq_t"].sum() / 1000  # kt

    total_kt   = round(float(daily.sum()), 2)
    avg_kt     = round(float(daily.mean()), 3)
    today_kt   = round(float(daily.iloc[-1]), 3) if len(daily) > 0 else 0
    prior_avg  = round(float(daily.iloc[:-1].mean()), 3) if len(daily) > 1 else avg_kt

    change_pct = round(((today_kt - prior_avg) / prior_avg * 100) if prior_avg > 0 else 0, 1)

    if change_pct > 20 or today_kt > avg_kt * 1.5:
        trend = "critical"
        label = "CRITICAL"
    elif change_pct > 8:
        trend = "elevated"
        label = "ELEVATED"
    elif change_pct < -10:
        trend = "declining"
        label = "DECLINING"
    else:
        trend = "normal"
        label = "NORMAL"

    result = {
        "total_kt":    total_kt,
        "avg_daily_kt": avg_kt,
        "today_kt":    today_kt,
        "prior_avg_kt": prior_avg,
        "change_pct":  change_pct,
        "trend":       trend,
        "label":       label,
        "days":        days,
    }
    _set(key, result)
    return result


@app.get("/api/country_emissions")
async def get_country_emissions():
    """Country-level oil & gas emissions from Climate TRACE."""
    cached = _get("country_emissions")
    if cached:
        return cached
    data = await fetch_country_emissions()
    _set("country_emissions", data)
    return data


@app.get("/api/summary")
async def get_summary(days: int = Query(5, ge=1, le=5)):
    """High-level KPI summary."""
    key = f"summary_{days}"
    cached = _get(key)
    if cached:
        return cached

    df = await _build_df(days)
    df = detect_anomalies(df)

    total_wells    = len(KNOWN_WELLS)
    coord_wells    = len(COORD_WELLS)
    matched        = int(df["matched_well"].sum()) if "matched_well" in df.columns else 0
    detection_rate = round((matched / coord_wells * 100), 1) if coord_wells > 0 else 0

    result = {
        "total_detections":    int(len(df)),
        "active_sites":        int(df["cluster_id"].nunique()) if "cluster_id" in df.columns else 0,
        "total_co2_kt":        round(float(df["co2_eq_t"].sum() / 1000), 2) if "co2_eq_t" in df.columns else 0,
        "anomaly_count":       int(df["is_anomaly"].sum()) if "is_anomaly" in df.columns else 0,
        "countries_affected":  int(df["country"].nunique()) if "country" in df.columns else 0,
        "days_covered":        days,
        "known_wells_total":   total_wells,
        "known_wells_tracked": coord_wells,
        "detection_rate":      detection_rate,
        "total_gas_value_usd": round(float(df["gas_value_usd"].sum()), 0) if "gas_value_usd" in df.columns else 0,
        "unattributed_count":  int(((df["matched_well"] == False) & (df["basin"] == "Unknown")).sum()) if "matched_well" in df.columns else 0,
    }
    _set(key, result)
    return result


@app.get("/api/trends")
async def get_trends(days: int = Query(5, ge=1, le=5)):
    """Daily CO₂ totals (kt) for trend charts."""
    key = f"trends_{days}"
    cached = _get(key)
    if cached:
        return cached

    df = await _build_df(days)
    if df.empty:
        return []

    df["date_str"] = df["acq_date"].astype(str).str[:10]
    daily = (
        df.groupby("date_str")
        .agg(
            co2_kt=("co2_eq_t", lambda x: round(x.sum() / 1000, 3)),
            flares=("frp",      "count"),
            gas_usd=("gas_value_usd", lambda x: round(x.sum(), 0)),
        )
        .reset_index()
        .sort_values("date_str")
    )
    result = daily.to_dict("records")
    _set(key, result)
    return result


# ── World Bank Historical Flaring Endpoints ─────────────────────────────────

@app.get("/api/wb_trends")
async def get_wb_trends(top_n: int = Query(10, ge=1, le=30)):
    """
    World Bank annual global flaring trends (2012–2024).
    Source: NOAA / Payne Institute / World Bank GFMR — offline Excel dataset.
    Returns: [{year, global_bcm, top_countries: [{country, bcm}]}]
    """
    key = f"wb_trends_{top_n}"
    cached = _get(key)
    if cached:
        return cached
    result = get_historical_trends(top_n=top_n)
    _set(key, result)
    return result


@app.get("/api/wb_country_history")
async def get_wb_country_history(country: str = Query(..., description="Country name, e.g. Iran")):
    """
    World Bank annual flaring for a single country (2012–2024).
    Returns: [{year, bcm}]
    """
    key = f"wb_country_{country.lower()}"
    cached = _get(key)
    if cached:
        return cached
    result = get_country_history(country)
    _set(key, result)
    return result


@app.get("/api/wb_locations")
async def get_wb_locations(
    country: str  = Query(None, description="Filter by country, or omit for all"),
    year:    int  = Query(None, description="Filter by year (2012-2024)"),
):
    """
    World Bank per-flare-site data (156 k records).
    Returns filtered list: [{country, lat, lon, bcm, year, field, operator, type, level}]
    """
    key = f"wb_loc_{country}_{year}"
    cached = _get(key)
    if cached:
        return cached
    result = get_location_data(country=country, year=year)
    _set(key, result)
    return result


@app.get("/api/wb_countries")
async def get_wb_countries():
    """List of all countries available in the World Bank dataset."""
    cached = _get("wb_countries")
    if cached:
        return cached
    result = get_all_countries()
    _set("wb_countries", result)
    return result


# ── Present vs 2024 Baseline Comparison ─────────────────────────────────────

@app.get("/api/compare_2024")
async def compare_2024(days: int = Query(5, ge=1, le=5)):
    """
    Compare current satellite-detected flaring (scaled to annual rate) against
    the 2024 World Bank baseline BCM for each country.

    Returns: [{
        country, live_bcm_annual, wb_2024_bcm, delta_bcm,
        deviation_pct, trend_label, insight, flare_count,
        co2_kt, risk
    }]
    Sorted by absolute deviation (highest divergence first).
    """
    key = f"compare_2024_{days}"
    cached = _get(key)
    if cached:
        return cached

    df = await _build_df(days)
    if df.empty:
        return []

    df = detect_anomalies(df)

    # ── Aggregate live data by country ──────────────────────────────────────
    # co2_eq_t → kt; scale to annual BCM using Elvidge gas-volume relationship
    # 1 BCM ≈ 1e9 m³; Elvidge: ln(V_m3) ≈ 1.40 + 1.55*ln(FRP)
    # We already have gas_volume in m³ embedded via emission_factors; sum it.
    # Proxy: live_co2_kt → gas_m3 via CH4 factor (co2_eq_t / 2.86 / 0.8 = m3)
    import numpy as np

    live_agg = (
        df.groupby("country")
        .agg(
            co2_kt        =("co2_eq_t",     lambda x: round(x.sum() / 1000, 3)),
            flare_count   =("frp",           "count"),
            avg_frp       =("frp",           lambda x: round(float(x.mean()), 2)),
            gas_value_usd =("gas_value_usd", lambda x: round(x.sum(), 0)),
            anomaly_flag  =("is_anomaly",    lambda x: bool(x.any())),
        )
        .reset_index()
    )

    # Convert live CO2-kt to estimated annual BCM
    # reverse Elvidge: V_m3 = co2_eq_t / (0.8 kg/m3 * 2.86 kg/kg)
    # scale from `days` window to 365 days
    scale = 365.0 / days
    live_agg["live_gas_m3"]    = live_agg["co2_kt"] * 1000 / (0.8 * 2.86)
    live_agg["live_bcm_annual"] = live_agg["live_gas_m3"] * scale / 1e9
    live_agg["live_bcm_annual"] = live_agg["live_bcm_annual"].round(4)

    # ── Load 2024 WB baseline ────────────────────────────────────────────────
    from data.worldbank_flaring import _ECONOMY
    wb_2024 = {country: year_data.get(2024, 0.0) for country, year_data in _ECONOMY.items()}

    # ── Country name bridge (live → WB names) ───────────────────────────────
    # The live data uses our normalised names; WB data uses the same normalised
    # names from worldbank_flaring._NAME_MAP, so they should match directly.
    COUNTRY_BRIDGE = {
        "Unknown": None,
        "": None,
    }

    result = []
    for _, row in live_agg.iterrows():
        country = row["country"]
        if country in COUNTRY_BRIDGE:
            continue

        wb_bcm = wb_2024.get(country, None)
        # Try partial case-insensitive match if exact fails
        if wb_bcm is None:
            cl = country.lower()
            for k, v in wb_2024.items():
                if cl == k.lower() or cl in k.lower() or k.lower() in cl:
                    wb_bcm = v
                    break

        if wb_bcm is None or wb_bcm == 0:
            continue  # skip countries with no WB baseline

        live = float(row["live_bcm_annual"])
        wb   = float(wb_bcm)

        delta      = round(live - wb, 4)
        dev_pct    = round((delta / wb) * 100, 1) if wb > 0 else 0

        # ── Human-readable insight ───────────────────────────────────────────
        if dev_pct > 50:
            insight     = f"⚡ Extreme surge — {abs(dev_pct):.0f}% above 2024 annual baseline"
            trend_label = "SURGE"
            risk        = "critical"
        elif dev_pct > 15:
            insight     = f"📈 Above baseline — current rate {abs(dev_pct):.0f}% higher than 2024"
            trend_label = "ELEVATED"
            risk        = "high"
        elif dev_pct > 5:
            insight     = f"↑ Slightly elevated — {abs(dev_pct):.0f}% above 2024 pace"
            trend_label = "ABOVE"
            risk        = "medium"
        elif dev_pct < -50:
            insight     = f"✅ Massive reduction — {abs(dev_pct):.0f}% below 2024 annual rate"
            trend_label = "LOW"
            risk        = "low"
        elif dev_pct < -15:
            insight     = f"📉 Below baseline — current rate {abs(dev_pct):.0f}% lower than 2024"
            trend_label = "DECLINING"
            risk        = "low"
        elif dev_pct < -5:
            insight     = f"↓ Slightly below — {abs(dev_pct):.0f}% below 2024 pace"
            trend_label = "BELOW"
            risk        = "low"
        else:
            insight     = f"≈ On-pace with 2024 baseline (within ±5%)"
            trend_label = "ON PACE"
            risk        = "low"

        result.append({
            "country":         country,
            "live_bcm_annual": live,
            "wb_2024_bcm":     round(wb, 4),
            "delta_bcm":       delta,
            "deviation_pct":   dev_pct,
            "trend_label":     trend_label,
            "insight":         insight,
            "flare_count":     int(row["flare_count"]),
            "co2_kt":          float(row["co2_kt"]),
            "gas_value_usd":   float(row["gas_value_usd"]),
            "anomaly_flag":    bool(row["anomaly_flag"]),
            "risk":            risk,
        })

    # Sort by absolute deviation descending
    result.sort(key=lambda x: abs(x["deviation_pct"]), reverse=True)

    _set(key, result)
    return result
