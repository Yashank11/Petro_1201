# Petro — Carbon Emissions Intelligence Platform

Near-real-time global monitoring of carbon emissions from oil & gas drilling
using NASA FIRMS VIIRS satellite data.

## Architecture

```
NASA FIRMS API (real VIIRS data) ─┐
Climate TRACE API                 ├──► Python FastAPI backend (port 8000)
                                  │       └── DBSCAN clustering
                                  │       └── Elvidge emission factors
                                  │       └── Anomaly detection (2σ)
                                  └──► React + Mapbox GL JS dashboard (port 5173)
```

## Quick Start

### 1. Python Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 2. React Frontend

> Requires Node.js 20+ → https://nodejs.org

```bash
cd frontend
npm install
npm run dev
```

Dashboard: http://localhost:5173

## API Keys (already in .env)

| Key | Source |
|---|---|
| `FIRMS_MAP_KEY` | NASA FIRMS — https://firms.modaps.eosdis.nasa.gov/api/map_key/ |
| `VITE_MAPBOX_TOKEN` | Mapbox — https://account.mapbox.com |

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/flares?days=7` | GeoJSON of clustered flare sites |
| `GET /api/top_emitters?days=7&limit=20` | Ranked company emitters |
| `GET /api/alerts?days=7` | Anomaly spike alerts |
| `GET /api/trends?days=7` | Daily CO₂ time-series |
| `GET /api/summary?days=7` | KPI summary |
| `GET /api/country_emissions` | Country-level Climate TRACE data |

## Processing Pipeline

1. **Fetch** — NASA FIRMS VIIRS NRT (8 major oil basins)
2. **Filter** — brightness > 1600 K, FRP > 1 MW, industrial type (2/3)
3. **Cluster** — DBSCAN (eps=1 km, haversine metric)
4. **Attribute** — Basin bounding box → operator lookup
5. **Emit** — Elvidge 2016: `log₁₀(V_gas) = 1.40 + 1.55 × log₁₀(FRP_MW)`
6. **CO₂** — `CO₂_eq = V_gas × 0.8 kg/m³ × 2.86 kg/kg × regional_factor`
7. **Anomaly** — 7-day rolling 2σ spike detection

## Data Sources

- **NASA FIRMS VIIRS** — Free, daily, 375 m resolution
- **Climate TRACE v6** — Country sector emissions, no auth required
- **Elvidge et al. 2016** — FRP→gas volume calibration (Remote Sensing)
- **IPCC AR6** — EF = 2.86 kg CO₂ / kg natural gas
