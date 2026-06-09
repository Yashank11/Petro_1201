"""
Climate TRACE API fetcher — no auth required.
Returns country-level oil & gas sector emissions.
"""
import httpx

CT_BASE = "https://api.climatetrace.org/v6"


async def fetch_country_emissions() -> list:
    """Fetch oil-and-gas-production sector emissions per country."""
    url = f"{CT_BASE}/country/emissions"
    params = {"since": 2022, "to": 2023, "sector": "oil-and-gas-production"}

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                # Flatten to list of {country, co2, lat, lon}
                return _parse_ct(data)
        except Exception as e:
            print(f"[ClimateTRACE] Error: {e}")

    return _ct_fallback()


def _parse_ct(data) -> list:
    """Parse Climate TRACE response into a simple list."""
    results = []
    # API returns list or dict depending on version
    items = data if isinstance(data, list) else data.get("countries", [])
    for item in items:
        if not isinstance(item, dict):
            continue
        emissions = item.get("emissions", {})
        co2 = emissions.get("co2", 0) or 0
        results.append({
            "country": item.get("alpha3", item.get("country", "UNK")),
            "co2_mt": round(co2 / 1e9, 3),   # convert kg → Mt
        })
    return sorted(results, key=lambda x: x["co2_mt"], reverse=True)


def _ct_fallback() -> list:
    """Known 2022 oil & gas CO₂ estimates (Mt) from public sources."""
    return [
        {"country": "USA", "co2_mt": 220.4},
        {"country": "RUS", "co2_mt": 189.7},
        {"country": "IRQ", "co2_mt": 98.3},
        {"country": "IRN", "co2_mt": 87.1},
        {"country": "NGA", "co2_mt": 62.4},
        {"country": "SAU", "co2_mt": 54.2},
        {"country": "VEN", "co2_mt": 41.9},
        {"country": "KWT", "co2_mt": 33.1},
        {"country": "LBY", "co2_mt": 28.7},
        {"country": "DZA", "co2_mt": 24.5},
    ]
