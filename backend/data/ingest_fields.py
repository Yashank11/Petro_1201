"""
Ingest script to fetch the complete Global Energy Monitor (GOGET) Oil & Gas Fields dataset (7,110 assets)
from the OverWatts open energy atlas API and store it as a clean, local JSON database.
"""
import httpx
import json
import os
import time

TARGET_FILE = os.path.join(os.path.dirname(__file__), "oil_gas_fields.json")
BASE_URL = "https://www.overwatts.com/api/public/assets?kind=oil_gas_field"

def fetch_all_fields():
    print("Fetching Global Oil & Gas Fields from OverWatts API...")
    offset = 0
    limit = 1000
    all_features = []
    
    with httpx.Client(timeout=30.0) as client:
        while True:
            url = f"{BASE_URL}&limit={limit}&offset={offset}"
            print(f"  Fetching offset {offset}...")
            r = client.get(url)
            if r.status_code != 200:
                print(f"Error: API returned status {r.status_code}")
                break
            
            data = r.json()
            features = data.get("features", [])
            if not features:
                break
                
            all_features.extend(features)
            total = data.get("meta", {}).get("total", 0)
            offset += len(features)
            
            print(f"  Retrieved {len(all_features)} / {total} records.")
            if offset >= total:
                break
            time.sleep(0.3)  # Polite pause between requests

    print(f"\nProcessing {len(all_features)} features...")
    records = []
    for f in all_features:
        props = f.get("properties", {})
        geom = f.get("geometry", {})
        coords = geom.get("coordinates", [None, None])
        if coords[0] is None or coords[1] is None:
            continue
            
        records.append({
            "id": props.get("id", ""),
            "name": props.get("name", "Unknown Field"),
            "company": props.get("operator") or props.get("owner") or "Multiple / Unattributed",
            "country": props.get("country", "Unknown"),
            "commodity": props.get("commodity", "mixed"),
            "status": props.get("status", "operating"),
            "onshore": bool(props.get("onshore", True)),
            "production_kboed": props.get("productionKboed"),
            "lon": round(float(coords[0]), 6),
            "lat": round(float(coords[1]), 6),
            "source": props.get("source", "Global Energy Monitor (GEM) - GOGET (CC BY 4.0)")
        })

    with open(TARGET_FILE, "w", encoding="utf-8") as out:
        json.dump(records, out, indent=2, ensure_ascii=False)
        
    print(f"Successfully saved {len(records)} verified fields to {TARGET_FILE}")
    
    # Quick statistics
    countries = set(r["country"] for r in records)
    offshore = sum(1 for r in records if not r["onshore"])
    print(f"  • Total Countries: {len(countries)}")
    print(f"  • Offshore Rigs/Platforms: {offshore}")
    print(f"  • Onshore Fields: {len(records) - offshore}")

if __name__ == "__main__":
    fetch_all_fields()
