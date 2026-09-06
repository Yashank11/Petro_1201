# 🛢️ PETRO — Carbon Emissions Intelligence Platform

> Near-real-time global monitoring of carbon emissions from oil & gas flaring using NASA VIIRS satellite data, AI-powered analysis, World Bank baselines, and 7,110+ verified global extraction fields & offshore platforms.

🌐 **[Live Dashboard](https://Yashank11.github.io/Petro_1201/)** &nbsp;|&nbsp; 📡 **[Backend API](https://petro-backend.onrender.com/docs)** &nbsp;|&nbsp; 📂 **[Repository](https://github.com/Yashank11/Petro_1201)**

---

## ✨ Key Features

### 🗺️ Global Flare & Infrastructure Map
- Interactive Mapbox GL JS globe with real-time satellite flare detection markers
- Color-coded by emission intensity (green → orange → red)
- Click any flare site for a **Digital Twin Facility Card** with emissions breakdown and matched field metadata
- **Global Asset Overlay**: 7,110 verified oil & gas production fields and offshore platforms across 93 countries (Global Energy Monitor GOGET)
- Distinct visual badges for **⚓ Offshore Drilling Rigs / Platforms** vs. **🏭 Onshore Shale Fields**

### 🧭 Sub-Millisecond 3D KDTree Attribution
- High-performance spatial indexing via spherical 3D Cartesian `cKDTree`
- Snaps satellite flare hotspots to real verified fields within 15 km in **< 0.05 ms**
- Deterministically identifies operating company, asset name, country, and baseline production capacity without expensive LLM guesswork

### 🌬️ Plume Simulator
- Real-time wind vector visualization using Open-Meteo atmospheric data
- Animated smoke plume dispersion modeling per active flare site
- Adjustable opacity and toggle controls

### 🤖 PetroCopilot AI (Multi-Model Resilient)
- Official **`google-genai` SDK** integration with `gemini-2.5-flash`
- **Multi-Provider Fallback Loop**: Automatically cycles through **Groq** (`llama-3.3-70b-versatile`), **Mistral** (`mistral-small-latest`), and **OpenRouter** if the primary model hits quotas or rate limits
- Context-aware tool calling — executes live data queries, calculates carbon tax liabilities (EU CBAM, CORSIA, US EPA), and controls map pan/zoom

### 📊 Analytics Dashboard
- **KPI Cards** — Total detections, active sites, CO₂ (kt), anomaly count, countries affected
- **Emissions Pulse** — Global emissions trend indicator (Normal / Elevated / Critical / Declining)
- **Company Leaderboard** — Top emitters ranked by CO₂ with risk levels and efficiency scores
- **Anomaly Intelligence Chart** — Daily CO₂ trend with anomaly spike overlay
- **ESG Alert Feed** — Real-time anomaly alerts with severity (medium / high / critical)

### 📈 Historical Analysis
- **World Bank Flaring Trends (2012–2024)** — Annual BCM data from NOAA / Payne Institute
- **Country Deep-Dive** — Per-country historical flaring with interactive charts
- **2024 Baseline Comparison** — Live satellite rate vs World Bank annual baseline with deviation analysis

### 💰 Market Correlation
- **Live Oil Prices** — WTI, Brent, Natural Gas from Yahoo Finance (15-min cache)
- **Correlation Chart** — Flaring activity vs crude oil price correlation
- **Gas Value Estimation** — USD value of flared gas per site (Henry Hub proxy)

### 📤 Well & Asset Database Center
- Comprehensive explorer modal for all **7,110 global extraction assets**
- Filter by **All 93 Countries**, **Type** (⚓ Offshore Platforms / 🏭 Onshore Fields), and **Status** (⚡ Active with flares / ◯ Dormant)
- Real-time search by field name, operator, or basin with interactive map fly-to navigation
- One-click **CSV export** of all current flare detections with full metadata

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                              │
│  NASA FIRMS VIIRS NRT (375m) ─── Climate TRACE v6               │
│  Global Energy Monitor (GEM) GOGET (7,110 fields, 93 countries)  │
│  Open-Meteo Wind API ─── Yahoo Finance ─── World Bank GFMR      │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI + Python)                      │
│                                                                   │
│  /api/flares         → VIIRS fetch → filter → DBSCAN cluster     │
│  /api/top_emitters   → 3D KDTree attribution → Elvidge emissions │
│  /api/alerts         → 2σ anomaly detection → severity tagging   │
│  /api/pulse          → Global emissions pulse trend indicator    │
│  /api/chat           → PetroCopilot (Gemini + Groq/Mistral)      │
│  /api/wind           → Open-Meteo wind vectors per flare site    │
│  /api/oil_prices     → Yahoo Finance (WTI, Brent, NatGas)       │
│  /api/wb_trends      → World Bank historical flaring (2012-2024) │
│  /api/compare_2024   → Live vs 2024 WB baseline deviation       │
│  /api/known_wells    → 7,110 verified fields & offshore platforms│
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│               FRONTEND (React + Vite + Mapbox GL JS)             │
│                                                                   │
│  GlobalMap ─── KPICards ─── CompanyLeaderboard ─── AlertFeed     │
│  EmissionsPulse ─── AnomalyIntelligenceChart ─── OilPriceTicker  │
│  HistoricalFlaringChart ─── CompareBaseline2024 ─── FacilityCard │
│  PetroCopilot ─── PlumeLayer ─── PlumeControls ─── WellDatabase │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Python 3.10+** — [python.org](https://python.org)
- **Node.js 20+** — [nodejs.org](https://nodejs.org)

### 1. Clone & Configure

```bash
git clone https://github.com/Yashank11/Petro_1201.git
cd Petro_1201
```

Create a `.env` file in the project root:

```env
FIRMS_MAP_KEY=your_nasa_firms_key
VITE_MAPBOX_TOKEN=your_mapbox_token
VITE_API_BASE=http://localhost:8000
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key_optional
MISTRAL_API_KEY=your_mistral_key_optional
OPENROUTER_API_KEY=your_openrouter_key_optional
```

### 2. Start Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs → [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard → [http://localhost:5173](http://localhost:5173)

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/flares?days=5` | GET | GeoJSON FeatureCollection of clustered flare sites with operator & offshore flags |
| `/api/top_emitters?days=5&limit=20` | GET | Ranked company emitters with risk levels |
| `/api/alerts?days=5` | GET | Anomaly spike alerts (>2σ above baseline) |
| `/api/trends?days=5` | GET | Daily CO₂ time-series (kt) |
| `/api/summary?days=5` | GET | KPI summary statistics |
| `/api/pulse?days=5` | GET | Global emissions pulse indicator (NORMAL / ELEVATED / CRITICAL / DECLINING) |
| `/api/country_emissions` | GET | Country-level Climate TRACE data |
| `/api/known_wells` | GET | GeoJSON of 7,110 verified fields & offshore platforms (GEM GOGET) |
| `/api/oil_prices` | GET | Live WTI, Brent, NatGas prices + 10-day history |
| `/api/wind?days=5` | GET | Wind vectors for plume simulation |
| `/api/wb_trends?top_n=10` | GET | World Bank annual flaring trends (2012–2024) |
| `/api/wb_country_history?country=Iran` | GET | Single country flaring history |
| `/api/wb_locations?country=&year=` | GET | Per-site WB flaring data (156k records) |
| `/api/wb_countries` | GET | All countries in WB dataset |
| `/api/compare_2024?days=5` | GET | Live vs 2024 WB baseline comparison |
| `/api/chat` | POST | PetroCopilot AI conversational endpoint (Gemini with multi-LLM fallbacks) |
| `/health` | GET | Backend health check with asset count breakdown |

---

## ⚙️ Processing Pipeline

```
1. FETCH    → NASA FIRMS VIIRS NRT data (8 major oil basins, configurable 1-5 day window)
2. FILTER   → Industrial flares only (type 2/3), brightness > 1600K, FRP > 1 MW
3. CLUSTER  → DBSCAN (eps = 1 km, haversine metric) to merge co-located detections
4. ATTRIBUTE→ 3D cKDTree spatial matching against 7,110 verified fields (15 km radius)
              Sets exact operator, asset name, offshore platform tag, and production capacity;
              falls back to basin weighted distribution if outside known fields
5. EMIT     → Elvidge 2016: log₁₀(V_gas) = 1.40 + 1.55 × log₁₀(FRP_MW)
6. CO₂      → CO₂_eq = V_gas × 0.8 kg/m³ × 2.86 kg/kg × regional_factor (IPCC AR6)
7. VALUE    → Gas USD = V_gas × 38 MJ/scm ÷ 1055 × $3.5/MMBtu (Henry Hub proxy)
8. ANOMALY  → Rolling 2σ spike detection with severity classification
```

---

## 🌐 Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | GitHub Pages | [Yashank11.github.io/Petro_1201](https://Yashank11.github.io/Petro_1201/) |
| Backend | Render (Free) | [petro-backend.onrender.com](https://petro-backend.onrender.com/docs) |

### Deploy Frontend (GitHub Pages)
```bash
cd frontend
npm run deploy
```

### Deploy Backend (Render)
Render auto-deploys from the `main` branch using the included `render.yaml` blueprint.

---

## 📁 Project Structure

```
petro/
├── backend/
│   ├── main.py                  # FastAPI app with all endpoints
│   ├── requirements.txt         # Python dependencies
│   ├── api/
│   │   ├── firms.py             # NASA FIRMS VIIRS data fetcher
│   │   ├── climatetrace.py      # Climate TRACE country emissions
│   │   ├── copilot.py           # PetroCopilot AI (Gemini + Groq/Mistral fallbacks)
│   │   └── wind.py              # Open-Meteo wind vector API
│   ├── processing/
│   │   ├── clustering.py        # DBSCAN spatial clustering
│   │   ├── emission_factors.py  # Elvidge FRP → gas volume → CO₂
│   │   ├── anomaly.py           # Statistical anomaly detection
│   │   └── attribution.py       # 3D cKDTree asset & operator attribution
│   └── data/
│       ├── wells_database.py    # 3D cKDTree spatial index for 7,110 fields
│       ├── oil_gas_fields.json  # 7,110 GEM GOGET verified assets (93 countries)
│       ├── ingest_fields.py     # GEM GOGET ingestion utility
│       ├── worldbank_flaring.py # WB GFMR data processor
│       └── *.xlsx               # World Bank flaring datasets
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main dashboard layout
│   │   ├── api/client.js        # Axios API client
│   │   ├── index.css            # Full design system
│   │   └── components/          # 17 React components
│   ├── vite.config.js           # Vite + proxy config
│   └── package.json
├── render.yaml                  # Render deployment blueprint
├── .env.example                 # Environment variable template
└── .gitignore
```

---

## 📚 Data Sources & Citations

| Source | Usage | Reference |
|--------|-------|-----------|
| **Global Energy Monitor (GEM)** | Global Oil & Gas Extraction Tracker (GOGET) — 7,110 verified fields & offshore platforms (CC BY 4.0) | [globalenergymonitor.org](https://globalenergymonitor.org/projects/global-oil-gas-extraction-tracker/) |
| **NASA FIRMS VIIRS** | Real-time fire/flare detection (375m) | [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov) |
| **Climate TRACE v6** | Country-level sector emissions | [climatetrace.org](https://climatetrace.org) |
| **World Bank GFMR** | Historical flaring volumes (2012–2024) | [worldbank.org/en/programs/gasflaringreduction](https://www.worldbank.org/en/programs/gasflaringreduction) |
| **Elvidge et al. 2016** | FRP → gas volume calibration | *Remote Sensing of Environment* |
| **IPCC AR6** | CO₂ emission factor (2.86 kg CO₂/kg CH₄) | [ipcc.ch](https://www.ipcc.ch) |
| **Open-Meteo** | Wind speed/direction for plume modeling | [open-meteo.com](https://open-meteo.com) |
| **Yahoo Finance** | Live crude oil & natural gas prices | [finance.yahoo.com](https://finance.yahoo.com) |

---

## 📄 License

MIT

---

Built with 🛰️ satellite data, ⚡ real-time APIs, and 🤖 AI.
