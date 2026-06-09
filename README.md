# 🛢️ PETRO — Carbon Emissions Intelligence Platform

> Near-real-time global monitoring of carbon emissions from oil & gas flaring using NASA VIIRS satellite data, AI-powered analysis, and World Bank baselines.

🌐 **[Live Dashboard](https://Yashank11.github.io/Petro_1201/)** &nbsp;|&nbsp; 📡 **[Backend API](https://petro-backend.onrender.com/docs)** &nbsp;|&nbsp; 📂 **[Repository](https://github.com/Yashank11/Petro_1201)**

---

## ✨ Key Features

### 🗺️ Global Flare Map
- Interactive Mapbox GL JS globe with real-time flare detection markers
- Color-coded by emission intensity (green → orange → red)
- Click any flare site for a **Digital Twin Facility Card** with full emissions breakdown
- Known well overlay from multi-country Excel database (India, Iran, Iraq, Saudi Arabia, USA)

### 🌬️ Plume Simulator
- Real-time wind vector visualization using Open-Meteo atmospheric data
- Animated smoke plume dispersion modeling per active flare site
- Adjustable opacity and toggle controls

### 🤖 PetroCopilot AI
- Gemini-powered conversational AI agent
- Ask natural language questions about emissions, companies, anomalies
- Auto-generates charts, filters the map, and provides data-driven insights
- Context-aware — knows current dashboard state (summary, alerts, trends)

### 📊 Analytics Dashboard
- **KPI Cards** — Total detections, active sites, CO₂ (kt), anomaly count, countries affected
- **Emissions Pulse** — Global emissions trend indicator (Normal / Elevated / Critical)
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

### 📤 Data Export
- One-click **CSV export** of all current flare detections with full metadata
- Well Database modal with search, country filter, and fly-to-map navigation

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                              │
│  NASA FIRMS VIIRS NRT (375m) ─── Climate TRACE v6               │
│  Open-Meteo Wind API ─── Yahoo Finance ─── World Bank GFMR      │
│  Excel Well Databases (5 countries)                              │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI + Python)                      │
│                                                                   │
│  /api/flares         → VIIRS fetch → filter → DBSCAN cluster     │
│  /api/top_emitters   → Basin attribution → Elvidge emissions     │
│  /api/alerts         → 2σ anomaly detection → severity tagging   │
│  /api/pulse          → Global emissions trend indicator          │
│  /api/chat           → Gemini AI agent (PetroCopilot)            │
│  /api/wind           → Open-Meteo wind vectors per flare site    │
│  /api/oil_prices     → Yahoo Finance (WTI, Brent, NatGas)       │
│  /api/wb_trends      → World Bank historical flaring (2012-2024) │
│  /api/compare_2024   → Live vs 2024 WB baseline deviation       │
│  /api/known_wells    → Excel well database (5 countries)         │
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

## 🔑 API Keys Required

| Key | Source | Free? |
|-----|--------|-------|
| `FIRMS_MAP_KEY` | [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/map_key/) | ✅ Yes |
| `VITE_MAPBOX_TOKEN` | [Mapbox](https://account.mapbox.com) | ✅ Free tier |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) | ✅ Free tier |

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/flares?days=5` | GET | GeoJSON FeatureCollection of clustered flare sites |
| `/api/top_emitters?days=5&limit=20` | GET | Ranked company emitters with risk levels |
| `/api/alerts?days=5` | GET | Anomaly spike alerts (>2σ above baseline) |
| `/api/trends?days=5` | GET | Daily CO₂ time-series (kt) |
| `/api/summary?days=5` | GET | KPI summary statistics |
| `/api/pulse?days=5` | GET | Global emissions pulse indicator |
| `/api/country_emissions` | GET | Country-level Climate TRACE data |
| `/api/known_wells` | GET | GeoJSON of all known wells from Excel DB |
| `/api/oil_prices` | GET | Live WTI, Brent, NatGas prices + 10-day history |
| `/api/wind?days=5` | GET | Wind vectors for plume simulation |
| `/api/wb_trends?top_n=10` | GET | World Bank annual flaring trends (2012–2024) |
| `/api/wb_country_history?country=Iran` | GET | Single country flaring history |
| `/api/wb_locations?country=&year=` | GET | Per-site WB flaring data (156k records) |
| `/api/wb_countries` | GET | All countries in WB dataset |
| `/api/compare_2024?days=5` | GET | Live vs 2024 WB baseline comparison |
| `/api/chat` | POST | PetroCopilot AI (Gemini) conversational endpoint |
| `/health` | GET | Backend health check |

---

## ⚙️ Processing Pipeline

```
1. FETCH    → NASA FIRMS VIIRS NRT data (8 major oil basins, configurable window)
2. FILTER   → Industrial flares only (type 2/3), brightness > 1600K, FRP > 1 MW
3. CLUSTER  → DBSCAN (eps = 1 km, haversine metric) to merge co-located detections
4. ATTRIBUTE→ Match to known wells (5 km radius) or assign basin-level operator
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
Render auto-deploys from `main` branch using the included `render.yaml` blueprint.

> **Note:** Render free tier spins down after 15 min of inactivity. First request after idle takes ~30–60s to cold-start.

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
│   │   ├── copilot.py           # PetroCopilot AI (Gemini agent)
│   │   └── wind.py              # Open-Meteo wind vector API
│   ├── processing/
│   │   ├── clustering.py        # DBSCAN spatial clustering
│   │   ├── emission_factors.py  # Elvidge FRP → gas volume → CO₂
│   │   ├── anomaly.py           # Statistical anomaly detection
│   │   └── attribution.py       # Well/basin operator attribution
│   └── data/
│       ├── wells_database.py    # Excel well loader (5 countries)
│       ├── worldbank_flaring.py # WB GFMR data processor
│       └── *.xlsx               # World Bank + well datasets
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
| **NASA FIRMS VIIRS** | Real-time fire/flare detection (375m) | [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov) |
| **Climate TRACE v6** | Country-level sector emissions | [climatetrace.org](https://climatetrace.org) |
| **World Bank GFMR** | Historical flaring volumes (2012–2024) | [worldbank.org/en/programs/gasflaringreduction](https://www.worldbank.org/en/programs/gasflaringreduction) |
| **Elvidge et al. 2016** | FRP → gas volume calibration | *Remote Sensing of Environment* |
| **IPCC AR6** | CO₂ emission factor (2.86 kg CO₂/kg CH₄) | [ipcc.ch](https://www.ipcc.ch) |
| **Open-Meteo** | Wind speed/direction for plume modeling | [open-meteo.com](https://open-meteo.com) |
| **Yahoo Finance** | Live crude oil & natural gas prices | [finance.yahoo.com](https://finance.yahoo.com) |

---

## ⚠️ Disclaimer

Company names are approximated from publicly available resources and may not reflect actual operational attribution. All emissions estimates are derived from satellite thermal anomaly data using the Elvidge 2016 model and IPCC AR6 conversion factors. This platform is intended for **research and awareness purposes only**.

---

## 📄 License

MIT

---

Built with 🛰️ satellite data, ⚡ real-time APIs, and 🤖 AI.
