# PETRO — Complete Beginner's Guide
## Carbon Emissions Intelligence Platform

**Last Updated:** May 2026 (v2.2.0)

---

## Quick Start

| What | Where | Command |
|------|-------|---------|
| **Run Backend** | Terminal 1 | `cd backend && uvicorn main:app --reload --port 8000` |
| **Run Frontend** | Terminal 2 | `cd frontend && npm run dev` |
| **Open Dashboard** | Browser | http://localhost:5173 |
| **API Docs** | Browser | http://localhost:8000/docs |
| **Get NASA Key** | Web | https://firms.modaps.eosdis.nasa.gov/api/map_key/ |
| **Get Mapbox Token** | Web | https://account.mapbox.com |
| **Get Gemini Key** | Web | https://ai.google.dev |

---

## Table of Contents
1. [What is Petro? (The Big Picture)](#what-is-petro-the-big-picture)
2. [Why Does This Matter?](#why-does-this-matter)
3. [How Does It Work? (System Architecture)](#how-does-it-work-system-architecture)
4. [The Technology Stack (Every Detail)](#the-technology-stack-every-detail)
5. [Data Flow & Processing Pipeline](#data-flow--processing-pipeline)
6. [All Features & Visualizations Explained](#all-features--visualizations-explained)
7. [AI Assistant & Advanced Features](#ai-assistant--advanced-features)
8. [API Endpoints (Complete Reference)](#api-endpoints-complete-reference)
9. [Advanced Concepts (Math & Algorithms)](#advanced-concepts-math--algorithms)
10. [Getting Started (First Time Users)](#getting-started-first-time-users)
11. [Troubleshooting](#troubleshooting)
12. [Advanced Configuration](#advanced-configuration)

---

## What is Petro? (The Big Picture)

### Simple Explanation
Imagine you could see every instance of **burning natural gas** in oil fields around the world in **real-time**, from satellites in space. Not just see it, but:
- Identify **which company** is responsible
- Calculate **how much carbon dioxide** is being released
- Estimate the **financial value** of the wasted gas
- Flag **unusual spikes** in flaring activity

**Petro** does exactly that. It's a **dashboard + backend intelligence system** that tracks global oil & gas flaring (burning of natural gas during oil extraction) using NASA satellite data.

### What is "Flaring"?
When oil companies drill for oil, they also produce natural gas as a byproduct. Instead of:
- **Capturing** the gas for sale
- **Reinjecting** it into the ground
- **Storing** it for later

...they often **burn it off** in what's called a **"flare stack"**. This happens because:
- Capturing equipment is expensive
- Market prices for gas may be low
- Infrastructure isn't available at remote sites
- Regulations allow it (though this is changing)

The **burning releases massive amounts of CO₂** (greenhouse gas) and wastes valuable gas that could be sold.

### What Petro Does
Petro **detects, tracks, and quantifies** these flaring events by:
1. **Downloading** daily thermal (heat) data from NASA satellites
2. **Identifying** which flares belong to which oil company
3. **Calculating** CO₂ emissions and gas value from the heat signature
4. **Alerting** when flaring spikes unusually
5. **Visualizing** all this on a global interactive map

---

## Why Does This Matter?

### For ESG Analysts (Environmental, Social, Governance)
Companies are increasingly tracked by their environmental footprint. Petro provides **real data** instead of relying on self-reported emissions.

### For Regulatory Bodies
Governments can see actual emissions without needing company reports, enabling better enforcement of climate regulations.

### For Investors
Investors want to know: "Is this company managing its emissions responsibly?" Petro gives them the answer.

### For Environmental Groups
Activists get evidence to make their case for stricter regulations on flaring.

### For Oil Companies
Forward-thinking companies use Petro-like data to identify **operational inefficiencies** and reduce flaring (which also wastes money).

---

## How Does It Work? (System Architecture)

### The Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│                  (What Users See)                           │
│                                                             │
│  React + Mapbox Dashboard (Port 5173)                       │
│  ├─ Interactive Global Map                                 │
│  ├─ Company Leaderboard                                    │
│  ├─ KPI Cards & Alerts                                     │
│  └─ Trend Charts                                           │
└──────────────────────────────────┬──────────────────────────┘
                                   │ (JSON API Calls)
                                   │
┌──────────────────────────────────▼──────────────────────────┐
│                   PROCESSING LAYER                          │
│              (The Brain - FastAPI Backend)                  │
│                  (Port 8000)                                │
│                                                             │
│  ├─ Data Fetching                                          │
│  │  ├─ NASA FIRMS satellite data                           │
│  │  ├─ Climate TRACE country emissions                     │
│  │  ├─ Open-Meteo wind vectors                             │
│  │  └─ World Bank historical flaring                       │
│  │                                                          │
│  ├─ AI Processing                                           │
│  │  ├─ Gemini AI (natural language understanding)          │
│  │  ├─ Function-calling (autonomous tool usage)            │
│  │  └─ Map navigation commands                             │
│  │                                                          │
│  ├─ Processing Pipeline                                    │
│  │  ├─ Filtering industrial flares                         │
│  │  ├─ Clustering nearby detections                        │
│  │  ├─ Attribution to companies                            │
│  │  ├─ Emission calculations                               │
│  │  ├─ Anomaly detection                                   │
│  │  └─ Atmospheric plume modeling                          │
│  │                                                          │
│  ├─ In-Memory Cache (1 hour TTL)                           │
│  └─ REST API Endpoints                                     │
└──────────────────────────────────┬──────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────┐
│                    DATA LAYER                               │
│               (Sources of Truth)                            │
│                                                             │
│  ├─ NASA FIRMS API                                         │
│  │  └─ Daily thermal anomalies (375m resolution)           │
│  │                                                          │
│  ├─ Well Database (Excel Files)                            │
│  │  ├─ Saudi Aramco wells                                  │
│  │  ├─ Indian ONGC wells                                   │
│  │  ├─ Iranian wells                                       │
│  │  ├─ Iraqi wells                                         │
│  │  └─ US wells (Permian, Marcellus)                       │
│  │                                                          │
│  ├─ Climate TRACE API                                      │
│  │  └─ Country-level sector emissions (annual)             │
│  │                                                          │
│  ├─ World Bank Flaring Database                            │
│  │  └─ Historical trends 1990-2024 (location + country)    │
│  │                                                          │
│  └─ Open-Meteo Forecast API                                │
│     └─ Real-time wind vectors (10m elevation)              │
└─────────────────────────────────────────────────────────────┘
```

### Why This Architecture?

**No Database = Simplicity & Speed**
- Traditional systems use expensive databases (PostgreSQL, MongoDB)
- Petro keeps data **in RAM** for **instant access**
- Data is **fetched fresh** every request (within cache TTL)
- Scales without database complexity

---

## The Technology Stack (Every Detail)

### Frontend (What Users See)

#### React 18.3.1
**What it is:** A JavaScript library for building user interfaces

**What it does here:**
- Manages the dashboard state (which data is displayed, which filters are active)
- Handles user interactions (clicking on companies, changing date ranges)
- Updates the UI when data changes without reloading the page

**Key concepts:**
- **Components:** Reusable building blocks (like `KPICards`, `AlertFeed`)
- **Hooks:** Functions that let components "remember" things (`useState`, `useEffect`)
- **Props:** Data passed from parent to child components
- **State:** Data that can change and cause re-renders

#### Vite 5.2.11
**What it is:** A "build tool" — it prepares your code for the browser

**What it does:**
- Takes your `.jsx` files and converts them to `.js` files the browser understands
- **Hot Module Replacement (HMR):** When you edit code, changes appear **instantly** without reloading
- **Code splitting:** Only loads code users need, making the page fast
- Minifies code (makes files smaller) for production

**Why it's better than Webpack:**
- Webpack takes 10+ seconds to rebuild on changes
- Vite takes <100ms — you see changes instantly
- Vite is modern and built for ES6+ JavaScript

#### Mapbox GL JS 3.3.0
**What it is:** A mapping library for interactive, 3D-enabled maps

**What it does:**
- Renders the **global map** with flare locations
- Shows **heatmaps** (intensity visualization using color)
- Adds **layers** (satellite imagery, well markers, flare clusters)
- Enables **zoom/pan/rotate/tilt** with smooth 3D rendering
- Uses **vector tiles** — data downloaded as geometric shapes, not images

**Key features:**
- **Globe projection:** The Earth looks like a sphere when zoomed out
- **Vector tiles:** Lightweight, scalable, zoomable
- **Clustering:** Groups nearby points for performance
- **Custom styling:** Dark theme optimized for night-time viewing

**Note:** Requires a Mapbox **access token** (API key) — free tier has generous limits

#### Recharts 2.12.7
**What it is:** A charting library built on React

**What it does:**
- Renders **line charts** (trend over time)
- **Bar charts** (company rankings)
- **Area charts** (cumulative emissions)
- All **responsive** (scale to screen size)
- Built-in animations and tooltips

**Why Recharts:**
- Lightweight and easy to use
- Composable (build charts from simple components)
- Mobile-friendly

#### Axios 1.7.2
**What it is:** A library for making HTTP requests

**What it does:**
- Sends requests to the backend API
- Example: `axios.get('/api/flares?days=7')` fetches flare data
- Handles errors gracefully
- Converts JSON automatically

#### Lucide React 0.378.0
**What it is:** A collection of simple, customizable SVG icons

**What it does:**
- Provides icons for buttons, alerts, and UI elements
- Examples: alarm icon for alerts, trending icon for growth

---

### Backend (The Brain)

#### Python 3.10+
**What it is:** The programming language for the backend

**Why Python:**
- **Rich ecosystem:** Libraries for data processing, math, APIs
- **Readable:** Code looks almost like English
- **Fast for data:** Python + NumPy/Pandas is very fast for numeric operations

#### FastAPI 0.111.0
**What it is:** A modern web framework for building APIs (like the "conductor" of an orchestra)

**What it does:**
- Listens for incoming requests (e.g., `/api/flares`)
- Routes them to the right function
- Runs that function and returns JSON data
- Validates input (e.g., "days must be between 1-10")
- Automatically generates documentation at `/docs`

**Key advantages:**
- **Fast:** One of the fastest Python frameworks
- **Modern:** Uses async/await for handling many requests simultaneously
- **Auto-validation:** Checks data types automatically
- **Auto-docs:** Creates Swagger documentation automatically

#### Uvicorn 0.29.0
**What it is:** A web server (the program that "listens" on port 8000)

**What it does:**
- Runs the FastAPI application
- Listens for HTTP requests
- Handles CORS (lets frontend on port 5173 talk to backend on port 8000)
- Supports async/await for high concurrency

**Command to run:**
```bash
uvicorn main:app --reload --port 8000
```
- `main:app` = run the FastAPI app from main.py
- `--reload` = restart when you change code
- `--port 8000` = listen on port 8000

#### Pandas 2.2.2
**What it is:** The "Excel on steroids" library for Python

**What it does:**
- Loads CSV data from NASA FIRMS
- Filters rows (e.g., "keep only flares with FRP > 1 MW")
- Groups data (e.g., "sum CO₂ by company")
- Merges datasets (e.g., "match satellite data with well locations")
- Calculates aggregations (sum, mean, count)

**Key concepts:**
- **DataFrame:** A table with rows and columns (like Excel)
- **Series:** A column of data
- **Indexing:** Access rows/columns with `.loc[]` or `.iloc[]`

#### NumPy 1.26.4
**What it is:** Library for numerical and mathematical operations

**What it does:**
- **Vectorized operations:** Do math on entire arrays at once (1000x faster than loops)
- **Haversine distance:** Calculates distance between coordinates on Earth
- **Logarithms:** Used in the Elvidge emission model
- **Statistical functions:** Mean, standard deviation for anomaly detection

**Key feature:**
All operations are in C (compiled language), so they're extremely fast.

#### Scikit-learn 1.4.2
**What it is:** Machine learning library

**What it does here:**
- **DBSCAN clustering:** Groups nearby satellite detections into flare clusters
- **Haversine metric:** Measures distance between geographic points

**DBSCAN Algorithm:**
- Input: Points (latitude, longitude)
- Output: Cluster IDs (which points belong together)
- How: Groups points that are within `eps=1km` of each other

#### OpenPyXL 3.1.2
**What it is:** Library for reading Excel files

**What it does:**
- Reads well data from Excel files (Saudi wells.xlsx, wells_india.xlsx, etc.)
- Extracts company name, well name, coordinates, country
- Loads this into a Python list (`KNOWN_WELLS`)

#### HTTPx 0.27.0
**What it is:** Async HTTP client (like Requests, but faster)

**What it does:**
- Fetches data from external APIs without blocking
- Gets NASA FIRMS satellite data
- Gets oil price data from Yahoo Finance
- Handles timeouts and retries

#### Python-dotenv 1.0.1
**What it is:** Loads environment variables from .env files

**What it does:**
- Reads `.env` file with secrets (API keys)
- Sets them as environment variables
- Keeps secrets out of version control (git)

**Example .env file:**
```
FIRMS_MAP_KEY=your_nasa_key_here
VITE_MAPBOX_TOKEN=your_mapbox_key_here
GEMINI_API_KEY=your_gemini_key_here
```

#### Google Generative AI 0.7.0+
**What it is:** Official Google library for Gemini AI API

**What it does:**
- Provides the PetroCopilot AI assistant
- Enables natural language questions about emissions data
- Uses function-calling to autonomously query backend APIs
- Returns structured responses with map navigation actions

**Key features:**
- **Function calling:** AI can call backend tools autonomously
- **System prompt:** Customizes AI behavior for emissions domain
- **Streaming:** Real-time response generation

**Setup:**
- Get API key from https://ai.google.dev
- Add to .env: `GEMINI_API_KEY=your_key_here`
- Free tier: 50 requests/minute

---

### Data Sources & External APIs

#### NASA FIRMS VIIRS (Free)
- **What:** Visible Infrared Imaging Radiometer Suite thermal anomalies
- **Update frequency:** Daily (NRT = Near Real-Time)
- **Resolution:** 375 metres
- **Coverage:** 8 major oil flaring regions globally
- **Cost:** FREE (requires MAP_KEY registration)
- **API:** https://firms.modaps.eosdis.nasa.gov/api/

#### Climate TRACE v6 (Free)
- **What:** Country-level oil & gas sector emissions
- **Update frequency:** Annual
- **Coverage:** All countries
- **Data type:** Static reference baseline
- **Cost:** FREE (no authentication)
- **API:** https://api.climatetrace.org/

#### Open-Meteo Forecast (Free)
- **What:** Real-time wind vectors (10m elevation)
- **Update frequency:** Hourly
- **Resolution:** 0.25° (~28 km)
- **Coverage:** Global
- **Cost:** FREE (no API key)
- **Use:** Atmospheric plume modeling
- **API:** https://api.open-meteo.com/

#### World Bank Global Gas Flaring Database
- **What:** Historical flaring data (1990-2024)
- **Update frequency:** Annual
- **Resolution:** Country + location level
- **Data type:** Offline Excel files (included in project)
- **Source:** https://www.worldbank.org/en/programs/gasflaringreduction



## Data Flow & Processing Pipeline

### Step-by-Step Journey of Data

```
1. FETCH
   └─> NASA FIRMS API (~8 regions × 7 days)
       └─> Each detection: lat, lon, brightness, FRP, timestamp
           └─> Result: DataFrame with ~10,000 rows

2. FILTER
   └─> Keep only industrial flares (type 2 = static land, type 3 = offshore)
   └─> Brightness > 1600 K OR FRP > 1 MW
       └─> Removes false positives (agricultural fires, volcanoes)
           └─> Result: ~5,000 rows

3. CLUSTER
   └─> DBSCAN with haversine metric (eps = 1 km)
   └─> Groups nearby detections into flare "sites"
       └─> Example: 50 pixels in a 1km area = 1 flare site
           └─> Result: ~500 unique flare sites

4. ATTRIBUTE
   └─> Match each flare to a known well (within 5 km)
   └─> If no exact match, use basin probability
   └─> Extract: company name, country, basin
       └─> Result: Each flare now has owner information

5. CALCULATE EMISSIONS
   ├─ FRP → Gas Volume (Elvidge 2016 polynomial)
   ├─ Gas Volume → CO₂ (IPCC AR6 factor)
   ├─ Gas Volume → USD Value (energy content + market price)
   └─> Result: Each flare has CO2_eq_t and gas_value_usd

6. DETECT ANOMALIES
   └─> For each cluster, compute 7-day baseline
   └─> Flag if today > baseline + 2σ (standard deviations)
       └─> Result: is_anomaly = True/False for each flare

7. CACHE
   └─> Store result in memory for 1 hour
   └─> Next request for same data returns cached copy (fast!)

8. SERVE
   └─> REST API endpoint returns JSON
   └─> Frontend fetches and displays
```

### Example: One Flare's Journey

**Raw satellite detection:**
```
Latitude: 27.1234
Longitude: 49.5678
Brightness (Ti4): 1850 K
FRP: 15.3 MW
Date: 2026-05-05 14:23 UTC
Type: 2 (static land)
```

**After clustering:**
```
cluster_id: 42
cluster_lat: 27.1245 (average of 8 nearby pixels)
cluster_lon: 49.5691
cluster_size: 8 pixels
```

**After attribution:**
```
well_name: "Ghawar Well 12"
company: "Saudi Aramco"
country: "Saudi Arabia"
basin: "Middle East"
matched_well: True (confident match)
attr_confidence: 0.92 (92% confidence)
```

**After emission calculation:**
```
v_gas_scm: 82,150 scm/day (standard cubic meters)
co2_t_day: 187.3 tonnes CO₂/day
co2_eq_t: 187.8 tonnes CO₂-eq (with methane)
gas_value_usd: 2,876 $/day
```

**After anomaly detection:**
```
baseline_frp: 12.1 MW (7-day average)
frp_std: 2.3 MW (volatility)
anomaly_score: 1.4σ (not anomalous)
is_anomaly: False
```

**Served to frontend as:**
```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [49.5691, 27.1245]
  },
  "properties": {
    "well_name": "Ghawar Well 12",
    "company": "Saudi Aramco",
    "frp": 15.3,
    "co2_eq_t": 187.8,
    "gas_value_usd": 2876,
    "is_anomaly": false,
    "cluster_size": 8
  }
}
```

---

## All Features & Visualizations Explained

### 1. Global Map (Interactive 3D Map)

**What it shows:**
- Entire world on a clickable map
- Each flare location marked with a **circle/marker**
- **Heatmap layer:** Colors show intensity (blue = cool, red = hot)
- **Well markers:** All known oil wells (background layer)

**How to use:**
- **Scroll to zoom** in/out
- **Click and drag** to pan (move around)
- **Right-click and drag** to rotate and tilt (3D view)
- **Click on a flare** to see details in a popup

**Map layers:**
1. **Heatmap** (top): Shows FRP (heat) intensity, color-coded
2. **Flare clusters** (circles): Individual flare sites, sized by FRP
3. **Known wells** (small dots): All wells from Excel database
4. **Satellite basemap** (bottom): Mapbox dark theme with satellite imagery

**What the colors mean:**
- **Blue → Green:** Low-intensity (small FRP)
- **Yellow → Orange:** Medium-intensity
- **Red → Bright Red:** High-intensity flares

**Why 3D globe?**
- More intuitive representation of Earth
- Can see curvature at zoom-out level
- Easier to understand global distribution

---

### 2. KPI Cards (Key Performance Indicators)

**Location:** Top of dashboard

**What each card shows:**

#### Card 1: Active Flare Sites
```
┌─────────────────────────────┐
│ Active Flare Sites          │
│ [Big number] 247            │
│ ↓ 3.2% (down from yesterday)│
└─────────────────────────────┘
```
- How many distinct flare locations are currently active
- Trend: going up (↑) or down (↓) vs. yesterday

#### Card 2: Total CO₂ (Daily)
```
┌─────────────────────────────┐
│ Daily CO₂ Emissions         │
│ [Big number] 45.3 kt        │
│ ↑ 8.5% (increasing trend)   │
└─────────────────────────────┘
```
- Total CO₂ released **today** (or selected date range)
- Unit: **kt** = kilotonne = 1000 tonnes
- Trend: whether today is higher or lower than the 7-day average

#### Card 3: Flare Detection Count
```
┌─────────────────────────────┐
│ Total Detections            │
│ [Big number] 1,247          │
│ ↑ 12.1% (more satellites)   │
└─────────────────────────────┘
```
- How many individual satellite detection events (one satellite pixel = one detection)
- Multiple detections can belong to one flare cluster
- Higher count usually means clearer weather (more satellite coverage)

#### Card 4: Active Anomaly Alerts
```
┌─────────────────────────────┐
│ Critical Alerts             │
│ [Big number] 3              │
│ 🔴 Flares spiking above 2σ  │
└─────────────────────────────┘
```
- How many flare sites are currently in "anomaly" state
- 🔴 = immediate attention needed

#### Card 5: Gas Value (Daily)
```
┌─────────────────────────────┐
│ Gas Value (Being Wasted)    │
│ [Big number] $127K          │
│ ↑ Annual: $46.4M            │
└─────────────────────────────┘
```
- Estimated market value of gas being **burned** (not captured)
- Based on: gas volume × energy content × benchmark price
- Annual extrapolation: daily × 365

#### Card 6: Emissions Intensity
```
┌─────────────────────────────┐
│ Emissions per Site          │
│ [Big number] 183.4 t        │
│ (CO₂ per active flare)      │
└─────────────────────────────┘
```
- How much CO₂ on average per flare site
- Formula: total CO₂ ÷ number of sites
- Higher = fewer but more intense flares

---

### 3. Company Leaderboard (Rankings)

**Location:** Left sidebar panel

**What it shows:**
A **ranked list of top 20 emitting companies** sorted by total CO₂

**Columns:**

| # | Rank | What it means |
|---|------|---|
| 1 | Company name + basin + country | Which company and where |
| 2 | CO₂ (kt) | Total emissions (kilotonnes) |
| 3 | Risk badge | 🔴 High, 🟡 Medium, 🟢 Low |
| 4 | Trend % | ↑ or ↓ change vs. week before |
| 5 | Flare count | How many flare sites detected |
| 6 | Avg FRP | Average heat intensity |
| 7 | Confidence bar | % confidence in attribution |

**Risk Level Calculation:**
- 🔴 **High:** CO₂ > 50 kt OR has active anomaly
- 🟡 **Medium:** CO₂ between 10-50 kt
- 🟢 **Low:** CO₂ < 10 kt

**Confidence Bar:**
- Shows how confident the system is in attributing this flare to this company
- 80-100%: Very confident (exact well match)
- 50-80%: Moderate (basin-level probability)
- <50%: Low (unattributed flare)

**How to use:**
- Click on any row to **zoom map to that company's wells**
- Click on company name to filter by that company
- Sort by clicking column headers

---

### 4. Anomaly Intelligence Chart (Time Series)

**Location:** Bottom of main panel

**What it shows:**
A **line chart** of daily CO₂ emissions over the selected time period (7, 10 days, etc.)

**Y-axis (vertical):** CO₂ (kilotonnes)
**X-axis (horizontal):** Date

**Visual elements:**
- **Blue line:** Daily total CO₂
- **Red shaded area:** Days with anomalies detected
- **Dotted line:** 7-day moving average (trend)
- **Dots on line:** Individual data points (one per day)

**What it tells you:**
- **Smooth upward trend:** Flaring increasing (more production or less capture)
- **Sudden spike:** One day had unusual activity (anomaly)
- **Red zones:** Specific days flagged as abnormal

**Interpretation:**
- If today is **above the average:** Emissions elevated
- If today is **below the average:** Emissions are down (good news)
- If **red spike:** Investigate the alert feed for details

**Example reading:**
```
May 1:  30 kt (normal)
May 2:  32 kt (normal, +6%)
May 3:  35 kt (normal)
May 4:  52 kt (🔴 SPIKE - 2σ above baseline)
May 5:  31 kt (back to normal)
```
→ May 4 would show as a red spike that needs investigation

---

### 5. Alert Feed (Real-Time Anomalies)

**Location:** Right sidebar panel

**What it shows:**
A **scrollable list of anomaly alerts**, newest first

**Each alert contains:**

```
┌─────────────────────────────────────────────────┐
│ 🔴 CRITICAL  [3h ago]                           │
│                                                 │
│ Ghawar Well 12 spiked +225%                     │
│ (last 24h vs baseline)                          │
│                                                 │
│ Operator: Saudi Aramco                          │
│ Confidence: 92%                                 │
│ Location: 27.12°N, 49.57°E                      │
│ FRP: 18.5 MW                                    │
│ CO₂ spike: +2.8σ above baseline                 │
└─────────────────────────────────────────────────┘
```

**Severity Levels:**

| Severity | Color | What it means | Sigma |
|----------|-------|---|---|
| 🔴 CRITICAL | Red | Extreme spike, requires investigation | > 3σ |
| 🟠 HIGH | Orange | Significant anomaly | 2.5σ - 3σ |
| 🟡 ALERT | Yellow | Moderate spike above normal | 2σ - 2.5σ |

**Spike % Calculation:**
- System compares today's FRP to the 7-day average
- Formula: `spike_pct ≈ sigma_score × 75`
- Example: 2σ above = ~150% spike

**How to use:**
- Click on an alert to **zoom map to that flare**
- Review the **confidence score** (high = trust it more)
- Check **operator name** to cross-reference with leaderboard

**Why are anomalies important?**
- Could indicate **equipment failure** (flare stacks are broken, gas escaping)
- Could indicate **production surge** (more oil = more gas to burn)
- Could indicate **maintenance** (deliberate flaring during upgrades)
- Could indicate **underreporting** (company claims lower emissions than real)

---

### 6. Weekly Trend Chart (Time Series)

**What it shows:**
Multiple lines on one chart:
- **Blue line:** Daily flare count (number of detections)
- **Green line:** Daily gas value (USD)
- **Orange line:** Daily CO₂ (inverted scale sometimes for correlation)

**Purpose:**
- See if **flaring trends up/down**
- Correlate with **oil price ticker** (if oil prices are high, more production = more flares)
- Identify **seasonal patterns** (some regions have seasonal peaks)

---

### 7. Oil Price Ticker (Market Data)

**Location:** Usually top-right corner

**What it shows:**
Live commodity prices:

| Symbol | What it represents | Why it matters |
|--------|---|---|
| **WTI** | West Texas Intermediate (US light crude) | US oil price |
| **Brent** | Brent crude (European standard) | Global oil price |
| **Natural Gas** | Henry Hub benchmark price | Gas price (what flared gas could sell for) |

**Data shown:**
- Current price (e.g., $87.50/barrel)
- Previous close (yesterday's close)
- Change ($) and change (%)
- 10-day history chart

**Correlation to watch:**
- High oil price → More production → More flaring
- Low gas price → Less incentive to capture gas → More flaring

---

### 8. Well Database Viewer

**Location:** Usually a collapsible panel or tab

**What it shows:**
A **searchable table of all known wells** from Excel files

**Columns:**
- Well name (e.g., "Ghawar Well 12")
- Company (e.g., "Saudi Aramco")
- Country (e.g., "Saudi Arabia")
- Coordinates (lat/lon)
- Landmark region (e.g., "Ghawar field")
- Source (which Excel file)
- Status: Detected? (checkbox if currently showing thermal anomaly)

**How to use:**
- **Search:** Filter by well name or company
- **Sort:** Click column headers
- **Click on well:** Map zooms to that well, shows all related flares
- **Export:** Download filtered list as CSV

---

### 9. CSV Export Feature

**What it does:**
Exports all current flare data to **CSV file** for external analysis

**Columns in export:**
```
Well/Basin | Company | Country | FRP_MW | CO2_t_day | Gas_Value_USD | Anomaly | Confidence | Date | Lat | Lon
```

**Use cases:**
- Import into Excel for further analysis
- Send to colleagues for reporting
- Load into power BI / Tableau for custom charts

---

### 10. Facility Card (Detailed View)

**What it shows:**
When you **click on a flare** on the map, a card pops up with complete details:

```json
{
  "id": "cluster_42",
  "well_name": "Ghawar Well 12",
  "company": "Saudi Aramco",
  "country": "Saudi Arabia",
  "basin": "Middle East",
  "frp": 15.3,                    # Fire Radiative Power (MW)
  "bright_ti4": 1850,             # Brightness (Kelvin)
  "co2_eq_t": 187.8,              # CO₂ equivalent (tonnes/day)
  "gas_value_usd": 2876,          # Market value of gas ($/day)
  "cluster_size": 8,              # Pixels in this cluster
  "is_anomaly": false,
  "anomaly_score": 1.4,           # Sigma above baseline
  "attr_confidence": 0.92,        # 92% confident in attribution
  "matched_well": true,           # Exact well match
  "date": "2026-05-05",
  "acq_datetime": "2026-05-05 14:23",
  
  # Explainability fields:
  "viirs_source": "NASA FIRMS VIIRS NRT (375m)",
  "emission_model": "Elvidge 2016 — log₁₀(V) = 1.40 + 1.55×log₁₀(FRP)",
  "co2_factor": "IPCC AR6 — 0.8 kg/m³ × 2.86 kg/kg",
  "value_method": "Elvidge V_gas × 38 MJ/scm ÷ 1055 × $3.5/MMBtu",
  "attr_method": "Exact well match (5km)" or "Basin weighted probability"
}
```

**Key metrics explained:**
- **FRP (Fire Radiative Power):** How much thermal energy is being released (MW = megawatts)
- **Bright_ti4:** Temperature in Kelvin (higher = hotter, more reliable detection)
- **CO₂_eq_t:** Total CO₂ released in tonnes per day
- **Gas_value_usd:** If this gas were captured and sold at market price, how much would it be worth
- **Cluster_size:** Number of satellite pixels grouped into this single flare
- **Attr_confidence:** How confident we are this flare is from this specific well (not a guess)

---

### 11. Summary Statistics

**What it shows:**
High-level KPIs for the selected time period:

```
{
  "total_detections": 1247,           # Individual satellite pixels
  "active_sites": 247,                # Unique flare locations
  "total_co2_kt": 45.3,               # Total in kilotonnes
  "anomaly_count": 3,                 # Anomalies detected
  "countries_affected": 12,           # How many countries have flares
  "days_covered": 7,                  # Time period
  "known_wells_total": 258,           # All wells in database
  "known_wells_tracked": 189,         # Wells with coordinates
  "detection_rate": 23.4,             # % of wells showing heat
  "total_gas_value_usd": 8750000,     # Total gas value (daily)
  "unattributed_count": 15            # Flares we couldn't match to a company
}
```

**Interpretation:**
- **detection_rate > 20%:** Lots of wells flaring (high activity)
- **unattributed_count > 10%:** Some flares are in unmapped regions (data gaps)
- **anomaly_count > 5:** Unusual activity today

---

### 12. Plume Controls & Atmospheric Simulator

**Location:** Usually a control panel (left sidebar or top-right)

**What it shows:**
Controls for the atmospheric plume dispersion simulator

**Controls:**
- **Enable/disable plume visualization:** Toggle on/off
- **Opacity slider:** Adjust transparency (0-100%)
- **Wind vector display:** Show/hide wind arrows
- **Plume type selector:** Gaussian plume model (standard)

**How it works:**
```
For each flare:
  1. Get current wind (u10, v10) from Open-Meteo
  2. Model Gaussian plume dispersion
  3. Calculate downwind concentration
  4. Render as colored contours on map
```

**Visual representation:**
- **Color gradient:** Concentration intensity (blue = low, red = high)
- **Arrows:** Wind direction and magnitude
- **Contours:** Expected concentration at different distances

**Use cases:**
- Identify affected regions
- Understand dispersion patterns
- Model cumulative air quality impact
- Validate wind patterns with ground observations

**Data source:**
- Open-Meteo Forecast API (real-time, free)
- 10-metre wind height (representative of surface conditions)

---

### 13. Historical Flaring Chart (Time Series)

**Location:** Usually bottom or expandable panel

**What it shows:**
Long-term flaring trends from World Bank database (30+ years)

**Chart types:**
- **Line chart:** Global annual flaring (BCM) from 1990-2024
- **Bar chart:** Top countries comparison year-over-year
- **Stacked area:** Regional breakdown over time

**Key features:**
- **Zoom:** Select date range to analyze
- **Toggle countries:** Show/hide specific countries
- **Annotation:** Major events (regulations, economic shifts)
- **Baseline markers:** Highlight target years (1990, 2000, 2010, 2024)

**Interpretation:**
- **Declining slope:** Global reduction progress
- **Plateaus:** Stalled efforts
- **Spikes:** War, economic expansion, or data revisions
- **Below baseline:** Achievement of reduction targets

**Data source:**
- World Bank Global Gas Flaring Reduction Program
- Annual updates, verified official data
- Location-level resolution available

**Example insights:**
```
1990: 180 BCM global (high flaring)
2000: 160 BCM (10% reduction)
2010: 145 BCM (further progress)
2024: 145 BCM (plateau — no improvement in 14 years)
```

---

### 14. Compare Baseline 2024 (Regulatory Tracking)

**Location:** Usually accessible via menu or dedicated panel

**What it shows:**
Real-time satellite data vs. official 2024 World Bank baseline

**Metrics:**
- **Current CO₂:** Real-time satellites
- **Baseline CO₂:** Official 2024 data
- **Difference:** ↑ above or ↓ below baseline
- **Change %:** Percentage deviation
- **Status badge:** "elevated", "normal", "declining"

**By country/operator:**
```
┌─────────────────────────────────────────┐
│ Saudi Arabia                            │
│ Current: 45.2 kt      Baseline: 42.1 kt │
│ Status: ↑ ELEVATED (+7.4%)               │
└─────────────────────────────────────────┘
```

**Use cases:**
- ESG reporting: "Are we above/below 2024 baseline?"
- Regulatory compliance: Check against commitments
- Bonus/penalty tracking: Emissions-based incentives
- Board reporting: Progress toward reduction targets

---

### 15. Correlation & Comparative Analysis

**What it shows:**
Multi-dimensional analysis comparing emissions with other factors

**Correlations visualized:**
- **Oil price ↔ Flaring:** Does high oil price = more flaring?
- **Wind patterns ↔ Detection:** Does wind affect satellite detection?
- **Seasonal patterns:** Monthly/quarterly trends
- **Company vs. country:** Which dominates emissions?

**Charts:**
- **Scatter plots:** Price vs. emissions correlation
- **Heatmaps:** Country × month matrix
- **Time series alignment:** Overlaid lines for pattern matching

**Insights:**
- Correlations can indicate:
  - Economics (high oil price → more production → more flaring)
  - Technology (better capture → less flaring)
  - Regulation (stricter rules → less flaring)

---

### 16. Risk & Compliance Dashboard (Optional)

**What it shows:**
ESG metrics for compliance and scoring

**Metrics:**
- **Risk level:** 🔴 High, 🟡 Medium, 🟢 Low
- **Trend:** ↑ worsening, → stable, ↓ improving
- **Vs. peer average:** Company vs. basin average
- **Trajectory:** On track for reduction targets?

**Use cases:**
- ESG fund managers: Score companies
- Compliance officers: Track regulatory commitment
- Investors: Benchmark company performance

---

## AI Assistant & Advanced Features

### PetroCopilot — The Intelligent Assistant

**What it is:**
An AI-powered assistant powered by Google's Gemini AI that understands natural language queries about emissions data.

**What it can do:**
- **Answer questions:** "Who are the top 5 CO₂ emitters?" "Show me critical alerts in Iraq."
- **Perform analysis:** "Calculate the annual CO₂ from Saudi Aramco." "Compare 2024 baseline to current emissions."
- **Navigate the map:** "Fly to the Ghawar field." "Zoom to Nigeria."
- **Environmental calculations:** "Calculate EU CBAM carbon tax for 10,000 tonnes CO₂."
- **Correlate data:** "How does oil price correlate with flaring this week?"

**Example interaction:**
```
User: "What's the global emissions pulse today?"

Copilot: [Fetches /api/pulse data]
"🌍 ELEVATED: Global emissions are up 8.5% vs baseline. 
  Total today: 47.2 kt CO₂
  Status: ELEVATED (change: +8.5%)
  Recommendation: Monitor for anomalies in high-producing regions."
```

**How it works behind the scenes:**
1. User sends a message to `/api/chat` endpoint
2. Gemini AI receives the question + available tool definitions
3. AI decides which backend tools to call (getFlares, getAlerts, getSummary, etc.)
4. Results are returned to Gemini
5. Gemini synthesizes a natural language response
6. Optional map navigation commands are executed (fly_to_location)

**Key limitation:**
- Requires GEMINI_API_KEY in .env file (get from https://ai.google.dev)
- Free tier: 50 requests/minute (sufficient for dashboard use)

---

### Wind Vector & Atmospheric Plume Simulator

**What it is:**
A feature that models how emissions disperse in the atmosphere based on real-time wind data.

**What it does:**
- Fetches 10-metre wind vectors from Open-Meteo (free, no API key)
- Calculates dispersion patterns for each detected flare
- Visualizes plume trajectories on the map
- Shows wind direction and speed at each flare location

**How it works:**
```
For each flare site:
  1. Get current wind u10 (eastward) and v10 (northward)
  2. Model Gaussian plume dispersion:
     - Source: flare location + FRP
     - Wind: u10, v10 components
     - Stability: Based on time of day and surface type
  3. Calculate downwind concentration gradient
  4. Render as semi-transparent plume layer on map
```

**Visualization:**
- **Plume opacity slider:** Adjust transparency (0-100%)
- **Wind arrows:** Show direction and magnitude
- **Concentration contours:** Show where emissions concentrate
- **Time of day:** Stability class changes morning/afternoon/night

**Use cases:**
- Identify regions most affected by flare emissions
- Predict air quality impact in downwind areas
- Understand seasonal wind patterns
- Model cumulative exposure

**Data source:**
- Open-Meteo Forecast API (free, real-time, 10m resolution)
- No authentication required
- 80 sites per request (performance-optimized)

**Toggle controls:**
- Button to enable/disable plume visualization
- Opacity slider for transparency
- Wind vector display (on/off)

---

### Historical Flaring & World Bank Data

**What it is:**
Integration with World Bank Global Gas Flaring Database (1990-2024 data).

**What it includes:**
- Annual flaring data by country and location
- Historical trends over 30+ years
- Comparison with 2024 baseline (latest official data)
- Field-level metadata (operator, asset type, capacity)

**Features:**
1. **Historical trends chart:** Shows global flaring from 1990-2024
2. **Country history view:** Per-country trend comparison
3. **Location-level data:** Individual flare site historical records
4. **Baseline comparison:** Real-time satellite vs. 2024 official baseline
5. **2024 baseline report:** Detailed comparison by country/operator

**Data structure:**
```json
{
  "year": 2024,
  "global_bcm": 145.2,  // Billion Cubic Meters
  "top_countries": [
    {"country": "Iraq", "bcm": 18.5},
    {"country": "Russia", "bcm": 15.3},
    {"country": "Nigeria", "bcm": 12.8}
  ]
}
```

**Use cases:**
- Verify long-term trends
- Benchmark against official WB data
- Identify persistent "problem" fields
- Track progress toward global reduction targets

---



### What is an API Endpoint?
An **API endpoint** is a URL you can request to get data. It's like a **menu at a restaurant** — each item (endpoint) returns a specific dish (data).

### Request Format
```
GET http://localhost:8000/api/flares?days=7
     └─ method      └─ host         └─ endpoint └─ parameter
```

- **GET:** The HTTP method (just asking for data, not changing anything)
- **localhost:8000:** The backend server address
- **/api/flares:** The endpoint path
- **?days=7:** Query parameter (optional filters)

### Real-Time Satellite Data Endpoints

#### 1. `/api/flares` — Get All Flares
```
GET /api/flares?days=7
```
**Parameters:**
- `days`: 1-10 (how many days of history to return)

**Returns:** GeoJSON FeatureCollection with all detected flares

**Use cases:**
- Populate the global map
- Export all flares to CSV
- Custom analysis

---

### Classic Fleet Endpoints (Already Documented Above)

#### 1. `/api/flares` — Get All Flares
```
GET /api/flares?days=7
```
**Parameters:**
- `days`: 1-10 (how many days of history to return)

**Returns:** GeoJSON FeatureCollection with all detected flares
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [49.5691, 27.1245]
      },
      "properties": {
        "well_name": "Ghawar Well 12",
        "company": "Saudi Aramco",
        "frp": 15.3,
        "co2_eq_t": 187.8,
        // ... (50+ other properties)
      }
    }
    // ... more flares
  ]
}
```

**Use cases:**
- Populate the global map
- Export all flares to CSV
- Custom analysis

---

#### 2. `/api/top_emitters` — Get Company Rankings
```
GET /api/top_emitters?days=7&limit=20
```
**Parameters:**
- `days`: 1-10 (observation period)
- `limit`: 1-50 (how many companies to return)

**Returns:** Array of companies ranked by CO₂
```json
[
  {
    "rank": 1,
    "company": "Saudi Aramco",
    "country": "Saudi Arabia",
    "basin": "Middle East",
    "co2_eq_kt": 12.5,
    "flare_count": 45,
    "avg_frp": 14.2,
    "gas_value_usd": 185000,
    "anomaly_flag": false,
    "change_pct": 3.2,
    "efficiency_score": 277.8,
    "risk_level": "medium",
    "attr_confidence": 0.89
  },
  // ... more companies
]
```

**Key metrics:**
- **change_pct:** % change in CO₂ vs. week before
- **efficiency_score:** CO₂ per flare (lower = more efficient)
- **risk_level:** Calculated from CO₂ and anomaly status
- **attr_confidence:** Average confidence in well attribution

**Use cases:**
- Populate leaderboard
- Identify top polluters
- Track company progress

---

#### 3. `/api/alerts` — Get Anomaly Alerts
```
GET /api/alerts?days=7&limit=50
```
**Parameters:**
- `days`: 1-10
- `limit`: 1-200 (max alerts to return)

**Returns:** Array of anomalies, newest first
```json
[
  {
    "cluster_id": 42,
    "well_name": "Ghawar Well 12",
    "company": "Saudi Aramco",
    "country": "Saudi Arabia",
    "basin": "Middle East",
    "latitude": 27.1245,
    "longitude": 49.5691,
    "frp": 18.5,
    "co2_eq_t": 211.3,
    "anomaly_score": 2.8,
    "severity": "critical",
    "message": "Flaring spike at Ghawar Well 12 — 18.5 MW (2.8σ above baseline)",
    "co2_spike_pct": 210,
    "attr_confidence": 0.92,
    "attr_alternatives": "[]",
    "acq_date": "2026-05-05T14:23:00",
    "matched_well": true
  },
  // ... more alerts
]
```

**Severity mapping:**
- **critical:** anomaly_score > 3 (extreme)
- **high:** anomaly_score 2.5-3 (significant)
- **medium:** anomaly_score 2-2.5 (notable)

**Use cases:**
- Alert feed on dashboard
- Trigger notifications/emails to operators
- Create incident reports

---

#### 4. `/api/trends` — Get Time Series
```
GET /api/trends?days=7
```

**Returns:** Daily aggregates
```json
[
  {
    "date_str": "2026-04-29",
    "co2_kt": 42.3,
    "flares": 234,
    "gas_usd": 147500
  },
  {
    "date_str": "2026-04-30",
    "co2_kt": 45.1,
    "flares": 267,
    "gas_usd": 157200
  },
  // ... one entry per day
]
```

**Use cases:**
- Populate trend charts
- Calculate moving averages
- Identify seasonal patterns

---

#### 5. `/api/pulse` — Global Emissions Headline
```
GET /api/pulse?days=7
```

**Returns:** Single overall metric for the period
```json
{
  "total_kt": 308.9,
  "avg_daily_kt": 44.1,
  "today_kt": 47.2,
  "prior_avg_kt": 43.5,
  "change_pct": 8.5,
  "trend": "elevated",
  "label": "ELEVATED",
  "days": 7
}
```

**Trend values:**
- **critical:** Today > 1.5× average OR change > 20%
- **elevated:** Change 8-20% OR today > 1.2× average
- **declining:** Change < -10%
- **normal:** Everything else

**Use cases:**
- Display as a headline metric
- Trigger alerts if critical
- Track global emissions pulse

---

#### 6. `/api/summary` — KPI Summary
```
GET /api/summary?days=7
```

**Returns:** High-level statistics
```json
{
  "total_detections": 1247,
  "active_sites": 247,
  "total_co2_kt": 45.3,
  "anomaly_count": 3,
  "countries_affected": 12,
  "days_covered": 7,
  "known_wells_total": 258,
  "known_wells_tracked": 189,
  "detection_rate": 23.4,
  "total_gas_value_usd": 8750000,
  "unattributed_count": 15
}
```

**Use cases:**
- Populate KPI cards
- Quick overview of system health

---

#### 7. `/api/country_emissions` — Climate TRACE Data
```
GET /api/country_emissions
```

**Returns:** Country-level emissions from Climate TRACE
```json
{
  "Saudi Arabia": {
    "co2_kt": 1240,
    "source": "oil_and_gas_sector"
  },
  "Nigeria": {
    "co2_kt": 890,
    "source": "oil_and_gas_sector"
  }
  // ... all countries
}
```

**Note:** This is static data (not real-time), updated annually

**Use cases:**
- Compare PETRO's satellite data with official reports
- Identify discrepancies
- Benchmark regional emissions

---

#### 8. `/api/known_wells` — All Wells Database
```
GET /api/known_wells
```

**Returns:** GeoJSON of all wells with coordinates
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [49.5691, 27.1245]
      },
      "properties": {
        "name": "Ghawar Well 12",
        "company": "Saudi Aramco",
        "country": "Saudi Arabia",
        "landmark": "Ghawar field",
        "source": "Saudi Aramco.xlsx",
        "detected": false  // currently has thermal anomaly?
      }
    }
    // ... all wells
  ]
}
```

**Use cases:**
- Show well locations on map
- Well database viewer

---

#### 9. `/api/oil_prices` — Live Commodity Prices
```
GET /api/oil_prices
```

**Returns:** Current and historical prices
```json
{
  "WTI": {
    "price": 87.50,
    "prev_close": 86.20,
    "change": 1.30,
    "change_pct": 1.51,
    "currency": "USD",
    "symbol": "CL=F",
    "history": [
      {"date": "2026-05-05", "price": 87.50},
      {"date": "2026-05-04", "price": 86.20},
      // ... 10-day history
    ]
  },
  "Brent": { ... },
  "NatGas": { ... }
}
```

**Use cases:**
- Oil price ticker widget
- Correlate price with flaring activity

---

#### 10. `/api/facility` — Single Facility Details (if implemented)
```
GET /api/facility/{cluster_id}
```

**Returns:** Complete details for one flare site

**Use cases:**
- Detailed view when clicking on map
- Generate facility reports

---

#### 11. `/health` — System Health Check
```
GET /health
```

**Returns:**
```json
{
  "status": "ok",
  "cache_keys": ["flares_7", "alerts_7", "summary_7"],
  "known_wells": 258,
  "wells_with_coords": 189
}
```

**Use cases:**
- Verify backend is running
- Check if data loaded successfully

---

### Advanced Data & AI Endpoints

#### 12. `/api/wind` — Wind Vector & Plume Data
```
GET /api/wind?days=5
```
**Parameters:**
- `days`: 1-5 (observation window)

**Returns:** Flare data enriched with wind vectors
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [49.5691, 27.1245]
      },
      "properties": {
        "well_name": "Ghawar Well 12",
        "company": "Saudi Aramco",
        "frp": 15.3,
        "co2_eq_t": 187.8,
        "wind_speed_ms": 4.5,
        "wind_dir_deg": 270,        # From west
        "u10": -4.23,               # Eastward component
        "v10": -1.89,               # Northward component
        "wind_gusts_ms": 6.2
      }
    }
  ]
}
```

**Data source:**
- Open-Meteo Forecast API (free, real-time)
- Wind measured at 10 metres elevation

**Use cases:**
- Render atmospheric plume simulator
- Model downwind air quality impact
- Analyze seasonal wind patterns

---

#### 13. `/api/wb_trends` — World Bank Historical Trends
```
GET /api/wb_trends
```

**Returns:** Global flaring history (1990-2024)
```json
[
  {
    "year": 2024,
    "global_bcm": 145.2,
    "top_countries": [
      {"country": "Iraq", "bcm": 18.5},
      {"country": "Russia", "bcm": 15.3},
      {"country": "Nigeria", "bcm": 12.8}
    ]
  },
  {
    "year": 2023,
    "global_bcm": 138.9,
    "top_countries": [...]
  }
  // ... back to 1990
]
```

**Source:**
- World Bank Global Gas Flaring Reduction Program

**Use cases:**
- Show 30+ year historical trend
- Compare current vs. historical baseline
- Identify long-term reduction progress

---

#### 14. `/api/wb_country_history` — Country Historical Flaring
```
GET /api/wb_country_history?country=Saudi%20Arabia
```
**Parameters:**
- `country`: Country name (URL-encoded)

**Returns:** Year-by-year flaring for that country
```json
[
  {"year": 2024, "bcm": 18.5},
  {"year": 2023, "bcm": 17.8},
  {"year": 2022, "bcm": 19.2},
  // ... back to 1990
]
```

**Use cases:**
- Track individual country progress
- Benchmark against peers
- Identify regulatory impact

---

#### 15. `/api/wb_locations` — Flare Site Historical Data
```
GET /api/wb_locations?country=Nigeria&year=2024
```
**Parameters:**
- `country`: Country name
- `year`: Year to query

**Returns:** Per-site flaring with operator info
```json
[
  {
    "latitude": 4.567,
    "longitude": 5.234,
    "bcm": 0.45,
    "field": "Bonga",
    "operator": "Shell Nigeria",
    "asset_type": "offshore"
  },
  // ... more locations
]
```

**Use cases:**
- Ground-truth satellite detections
- Identify persistent flare sites
- Track facility-level changes

---

#### 16. `/api/wb_countries` — All Countries with WB Data
```
GET /api/wb_countries
```

**Returns:** List of all countries in WB database
```json
[
  {"country": "Iraq", "years": [2000, 2001, ..., 2024]},
  {"country": "Nigeria", "years": [2000, 2001, ..., 2024]},
  // ... all countries
]
```

**Use cases:**
- Populate country selection filters
- Check data availability

---

#### 17. `/api/compare_2024` — Real-Time vs. 2024 Baseline
```
GET /api/compare_2024?days=7
```
**Parameters:**
- `days`: Recent observation window

**Returns:** Detailed comparison with 2024 WB baseline
```json
{
  "current_period_co2_kt": 308.9,
  "baseline_2024_co2_kt": 295.3,
  "change_pct": 4.6,
  "trend": "elevated",
  "by_country": [
    {
      "country": "Saudi Arabia",
      "current_kt": 45.2,
      "baseline_kt": 42.1,
      "change_pct": 7.4,
      "status": "elevated"
    }
  ],
  "summary": "Current flaring 4.6% above 2024 official baseline"
}
```

**Use cases:**
- ESG reporting: "How much above/below 2024 baseline?"
- Regulatory compliance tracking
- Executive dashboards

---

#### 18. `/api/chat` — PetroCopilot AI Assistant (POST)
```
POST /api/chat
Content-Type: application/json

{
  "message": "Who are the top CO₂ emitters today?",
  "days": 7
}
```

**Returns:** Natural language response + optional map actions
```json
{
  "reply": "🌍 **Top 5 CO₂ Emitters (Last 7 days)**\n\n• Saudi Aramco: 45.2 kt\n• Shell Nigeria: 38.1 kt\n...",
  "actions": [
    {
      "type": "fly_to_location",
      "coords": [49.5, 27.1],
      "zoom": 8,
      "label": "Ghawar Field"
    }
  ],
  "confidence": 0.95,
  "tool_calls": ["get_top_emitters", "get_summary"]
}
```

**Capabilities:**
- Answer natural language questions
- Navigate map (fly_to_location actions)
- Calculate environmental metrics
- Analyze trends and anomalies

**Authentication:**
- Requires GEMINI_API_KEY in .env
- Free tier: 50 requests/minute

**Use cases:**
- Interactive data exploration
- Executive Q&A
- Natural language queries

---

## Advanced Concepts (Math & Algorithms)

### 1. DBSCAN Clustering Algorithm

**What is it?**
An algorithm that groups nearby points together automatically.

**How it works:**

```
INPUTS:
  - Data points: latitude, longitude for each flare pixel
  - eps (epsilon): 1 km (maximum distance to consider "nearby")
  - min_samples: 1 (minimum points in a group)

ALGORITHM:
  1. For each point, find all other points within 1 km
  2. If there's at least 1 point (including itself), start a cluster
  3. Add all neighbors to the same cluster
  4. Recursively add their neighbors
  5. Continue until no more nearby points

OUTPUT:
  - cluster_id: which cluster does each point belong to?
  - cluster_size: how many points in the cluster?
```

**Example:**

```
Satellite detections at these coordinates:
  (27.1200, 49.5600) ← pixel 1
  (27.1202, 49.5602) ← pixel 2 (0.3 km away from pixel 1)
  (27.1205, 49.5605) ← pixel 3 (0.6 km away from pixel 1)
  (27.1250, 49.5650) ← pixel 4 (7 km away from pixel 1)

DBSCAN with eps=1km:
  Cluster A: [pixel 1, pixel 2, pixel 3] (all within 1 km of each other)
  Cluster B: [pixel 4] (alone, > 1 km from cluster A)

RESULT:
  cluster_id for pixel 1,2,3 = 42
  cluster_id for pixel 4 = 43
```

**Why this is important:**
- 50 individual satellite pixels of a flare → 1 flare site
- Reduces noise and creates a cleaner view of reality
- Foundation for all downstream analysis

**Key parameter tuning:**
- **eps=1km:** Distance threshold (smaller = more clusters)
- **min_samples=1:** Even single detections get a cluster ID
- **haversine metric:** Uses Earth's curvature for accurate geographic distances

**Time complexity:**
- O(n log n) with ball-tree algorithm
- Fast enough for 10,000 points in <1 second

---

### 2. Elvidge 2016 Emission Model

**What is it?**
A scientific equation that converts satellite heat signature (FRP) to natural gas volume.

**The Formula:**
```
log₁₀(V_gas) = 1.40 + 1.55 × log₁₀(FRP_MW)

Rearranged:
V_gas = 10^(1.40 + 1.55 × log₁₀(FRP))
```

**What it means:**
- **FRP_MW:** Fire Radiative Power in megawatts (what the satellite measures)
- **V_gas:** Volume of natural gas being burned in standard cubic meters per day (scm/day)

**Example calculation:**
```
FRP = 15.3 MW (observed from satellite)

Step 1: log₁₀(15.3) = 1.185
Step 2: 1.40 + 1.55 × 1.185 = 1.40 + 1.837 = 3.237
Step 3: 10^3.237 = 1,726 scm/day

Result: This flare burns ~1,726 standard cubic meters of gas per day
```

**Why this model?**
- Developed by Elvidge et al. (Remote Sensing journal, 2016)
- Based on measurements from oil fields in Kazakhstan
- Validated across multiple regions
- Simple but surprisingly accurate

**Limitations:**
- Assumes complete combustion (no unburned gas escaping)
- Gas composition varies by region (different energy content)
- Temperature and atmospheric conditions affect observation
- Only works for industrial flares (agricultural fires won't match)

---

### 3. CO₂ Emission Calculation

**What is it?**
Converting gas volume into CO₂ mass using chemistry.

**The Steps:**

```
Step 1: Gas volume (from Elvidge) → Mass
  Formula: mass_kg = volume_scm × density_kg_scm
  
  Where:
    - volume_scm = 1,726 (from previous step)
    - density_kg_scm = 0.8 kg/m³ (standard natural gas density)
  
  Result: 1,726 × 0.8 = 1,381 kg of gas per day

Step 2: Mass of gas → Mass of CO₂
  Formula: CO₂_kg = gas_mass_kg × EF_CO₂
  
  Where:
    - EF_CO₂ = 2.86 kg CO₂ per kg natural gas
    - Source: IPCC AR6 (Intergovernmental Panel on Climate Change)
  
  Why 2.86? Because:
    - Natural gas ≈ 75% methane (CH₄)
    - Burning: CH₄ + 2O₂ → CO₂ + 2H₂O
    - Molecular weights: 1 kg CH₄ → 2.75 kg CO₂
    - Account for other components → ~2.86 kg CO₂ per kg gas
  
  Result: 1,381 × 2.86 = 3,945 kg CO₂ per day

Step 3: Apply regional correction factor
  Formula: CO₂_corrected = CO₂_base × regional_factor
  
  Factors:
    - Middle East: 1.00 (baseline)
    - Permian Basin: 0.92 (less flaring, more capture)
    - North Sea: 0.88 (best practices)
    - Niger Delta: 1.05 (more flaring, less regulation)
  
  Result (Middle East): 3,945 × 1.00 = 3,945 kg/day = 3.945 tonnes/day
```

**Final CO₂-equivalent (with methane leakage uplift):**
```
Some gas escapes unburned (fugitive emissions).
Methane has 28× warming potential of CO₂ (over 100 years).

Formula: CO₂_eq = CO₂_base × 1.003  (adds ~0.3% for methane leaks)

Result: 3.945 × 1.003 = 3.956 tonnes CO₂-eq per day
```

**Check against real data:**
- Literature: ~200-300 kg CO₂ per MW of FRP
- Our result: 3,956 kg ÷ 15.3 MW = 258 kg CO₂/MW ✓ (in range)

---

### 4. Gas-to-Market-Value Calculation

**What is it?**
Converting gas volume into USD value to show the financial waste.

**The Steps:**

```
Step 1: Gas volume → Energy content (MJ)
  Formula: energy_MJ = volume_scm × GCV_MJ_scm
  
  Where:
    - volume_scm = 1,726 (from before)
    - GCV = 38 MJ/scm (Gross Calorific Value per ISO 6976)
  
  Result: 1,726 × 38 = 65,588 MJ per day

Step 2: Energy → MMBtu (standard energy unit for gas)
  Formula: energy_MMBtu = energy_MJ ÷ 1055.06
  
  Where:
    - 1 MMBtu (million BTU) = 1055.06 MJ (exact conversion)
  
  Result: 65,588 ÷ 1055.06 = 62.15 MMBtu per day

Step 3: MMBtu → USD
  Formula: value_USD = energy_MMBtu × price_USD_MMBtu
  
  Where:
    - price_USD_MMBtu = $3.50 (Henry Hub benchmark)
    - Henry Hub = standard US natural gas price index
    - $3.50 is typical 2026 price (varies: $2-8)
  
  Result: 62.15 × $3.50 = $217.53 per day
```

**Why this matters:**
- Shows economic incentive: capture this gas instead of burning it
- Higher value = company should invest in capture equipment
- Daily value × 365 = annual loss

**Example:**
```
This one flare wastes: $217.53 × 365 = $79,347 per year
Saudi Aramco with 250 flares: $79,347 × 250 = $19.8 million per year in wasted gas
```

---

### 5. Anomaly Detection (2σ Sigma Rule)

**What is it?**
Automatically flagging flares that are burning more intensely than usual.

**The Concept:**

```
Every flare has a baseline of "normal" activity.
If it suddenly spikes above that, something is different.

Example timeline for Ghawar Well 12:
  
  May 1: 12 MW
  May 2: 11 MW
  May 3: 14 MW
  May 4: 13 MW
  May 5: 12 MW
  ━━━━━━━━━━━
  Average (baseline): 12.4 MW
  
  Now on May 6: 21 MW ← Much higher!
  Is this important? How much higher is "higher"?
```

**The Statistics:**

```
Step 1: Calculate 7-day rolling baseline and volatility
  Baseline = average of all measurements
  Std Dev (σ) = measure of variability
  
  Example:
    Baseline = 12.4 MW
    Std Dev = 1.2 MW (measurements vary by ±1.2 typically)

Step 2: Calculate "Z-score" for today
  Formula: z_score = (today - baseline) ÷ std_dev
  
  If today = 21 MW:
    z_score = (21 - 12.4) ÷ 1.2 = 8.6 ÷ 1.2 = 7.17
  
  This means: Today is 7.17 standard deviations above normal

Step 3: Flag as anomaly if z_score > 2σ (threshold)
  
  2σ interpretation:
    - 2σ above = 97.7% of historical data is lower
    - Happens naturally only ~2% of the time
    - When it happens, investigate!
  
  If z_score = 7.17:
    - Flag: CRITICAL ANOMALY
    - Probability of random occurrence: <0.001% (essentially impossible)
```

**The distribution (for those familiar with statistics):**

```
Normal Distribution of FRP for a flare:
        │      ↑ 1σ
        │     ╱  \
        │    ╱    \
        │   ╱      \___
        │  ╱           \___
        │ ╱        2σ →    \___
    ────┼─────────────────────\────────
       12.4 MW          +2σ = 14.8 MW
       (baseline)
       
       If measured: 21 MW
       → Way beyond 2σ → Anomaly flag
```

**Severity levels:**
- **> 3σ:** CRITICAL (happens <0.1% of time)
- **2.5σ - 3σ:** HIGH (happens <0.6% of time)
- **2σ - 2.5σ:** ALERT (happens ~2-5% of time)
- **< 2σ:** Normal variation

**Why this matters:**
- Detects equipment failures (flare stacks breaking, controls malfunctioning)
- Detects unauthorized flaring (venting extra gas)
- Detects sudden production spikes
- Not a false alarm system (low false positive rate)

---

### 6. Attribution & Confidence Scoring

**What is it?**
Matching a satellite-detected flare to a specific company's well.

**The Challenge:**
```
Satellite says: "There's heat at coordinates 27.1234°N, 49.5678°E"
Question: Which well is this? Which company owns it?

Possibilities:
  A) Well ABC owned by Saudi Aramco (10 km away)
  B) Well XYZ owned by Saudi Aramco (100 km away)  
  C) Well 123 owned by Shell (50 km away)
  D) Unknown well (not in database)
```

**The Solution (Two-Stage):**

**Stage 1: Deterministic Matching (Exact)**
```
If satellite coordinate is within 5 km of a known well:
  ✓ Match to that well
  ✓ Confidence = 90-95%
  ✓ Method = "Exact well match"

Example:
  Satellite: 27.1234°N, 49.5678°E
  Well ABC: 27.1245°N, 49.5690°E
  Distance: ~1.8 km ✓ (within 5 km threshold)
  → Attribution: Saudi Aramco, Well ABC
  → Confidence: 0.92 (92%)
```

**Stage 2: Probabilistic Matching (Fallback)**
```
If no exact match within 5 km:
  1. Identify which basin the flare is in
  2. Look up all companies operating in that basin
  3. Weight by production share
  
Example:
  Satellite location: 27.1234°N, 49.5678°E
  Basin: Ghawar (identified from bounding box)
  
  Companies in Ghawar:
    - Saudi Aramco: 60% of production
    - Shell: 30% of production
    - ExxonMobil: 10% of production
  
  → Most likely: Saudi Aramco
  → Confidence: 0.60 (60%) - lower than exact match
  → Method: "Basin weighted probability"
```

**Confidence thresholds:**
- **80-100%:** Very high confidence (exact well match)
- **50-80%:** Moderate confidence (basin-level probability)
- **<50%:** Low confidence (ambiguous, but best guess)

**Why confidence matters:**
- High confidence: Can be reported as fact
- Low confidence: Need to verify independently before publishing
- Users can filter: "Show only flares with >80% confidence"

---

## Getting Started (First Time Users)

### Prerequisites

Before you start, make sure you have:

1. **Computer with Windows, Mac, or Linux**
2. **Internet connection** (to download and fetch data)
3. **API Keys:**
   - NASA FIRMS MAP_KEY (free, from https://firms.modaps.eosdis.nasa.gov/api/map_key/)
   - Mapbox Token (free tier available, from https://account.mapbox.com)

### Installation Steps

#### Step 1: Get the Code
```bash
# If using git:
git clone <your-repo-url>
cd petro

# If downloading ZIP:
# Extract ZIP file, navigate to folder
```

#### Step 2: Set Up Environment Variables
Create a `.env` file in the project root:
```
FIRMS_MAP_KEY=your_nasa_api_key_here
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

#### Step 3: Install Python Backend

```bash
# Navigate to backend folder
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
```

**Expected output:**
```
INFO:     Application startup complete
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

✓ Backend is now running!

#### Step 4: Install React Frontend

```bash
# Navigate to frontend folder (in a new terminal)
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Expected output:**
```
VITE v5.2.11  ready in 123 ms

➜  Local:   http://localhost:5173/
```

✓ Frontend is now running!

#### Step 5: Open in Browser

Go to: http://localhost:5173

**First-time tips:**
- Data takes 30-60 seconds to load (fetching from NASA)
- Map starts centered on Middle East (where most flares occur)
- Use the date range selector (top-left) to change the observation period

---

### First Time Usage: What to Do

#### 1. Understand the Layout
- **Left:** Leaderboard (companies ranked by emissions)
- **Center:** Global map (flare locations)
- **Right:** Alert feed (anomalies)
- **Top:** KPI cards (overall statistics)
- **Bottom:** Trend chart (historical data)

#### 2. Explore the Map
```
1. Scroll with mouse wheel to zoom
2. Click and drag to pan
3. Right-click + drag to rotate/tilt
4. Click on any flare marker for details
5. Search for a company in the leaderboard and click to zoom
```

#### 3. Read the Alerts
```
1. Look at the right panel "Alert Feed"
2. Click on any alert
3. Map will zoom to that flare
4. Review the "Confidence" score
5. Click "Operator" link to see all flares from that company
```

#### 4. Check the Trends
```
1. Scroll to bottom of dashboard
2. Look at "Weekly Trend Chart"
3. Is CO₂ going up? Down? Volatile?
4. Click on data points to see exact daily values
```

#### 5. Export Data
```
1. Click "Export as CSV" button
2. Opens the flares data in your spreadsheet app
3. Analyze in Excel, PowerBI, Tableau, etc.
```

---

### Customizing Your View

#### Change Date Range
- Top-left dropdown: Select 1, 3, 7, or 10 days
- More days = more historical context but slower load

#### Filter by Country
- Click on a country name in the KPI card
- Map will show only flares from that country

#### Filter by Company
- Click on a company in the leaderboard
- Map will highlight only that company's flares

#### Adjust Map Style
- Top-right (if available): Switch between satellite/light/dark map styles
- Dark mode easier for night-time viewing

#### Export to CSV
- Click "Export" button
- Share with colleagues or import into Excel

---

### Common Questions

**Q: Why is the map showing "loading" for a long time?**
- A: Fetching from NASA takes 30-60 seconds. This is normal. Be patient.

**Q: Why can't I see flares in my region?**
- A: Petro focuses on major oil & gas basins. Some regions not covered yet.

**Q: What does "Confidence" mean on alerts?**
- A: How confident we are that this flare is from the attributed well (80%+ is good).

**Q: Why is no data showing?**
- A: Check that both backend (port 8000) and frontend (port 5173) are running.

**Q: Can I use this on my phone?**
- A: Yes, the interface is responsive. May be slow on mobile.

---

## Troubleshooting

### Backend Issues

#### Issue: "Can't reach backend on port 8000"
**Solution:**
```bash
# Make sure you're in the backend folder
cd backend

# Start the server
uvicorn main:app --reload --port 8000

# If port 8000 is in use, try:
uvicorn main:app --reload --port 8001
# (Then change frontend API URL accordingly)
```

#### Issue: "FIRMS_MAP_KEY not found"
**Solution:**
```bash
# Check .env file exists and is formatted correctly
cat .env
# Should show:
# FIRMS_MAP_KEY=your_key_here
# VITE_MAPBOX_TOKEN=your_token_here
```

#### Issue: "No module named 'fastapi'"
**Solution:**
```bash
# Reinstall dependencies
pip install -r requirements.txt

# Or if using conda:
conda install -c conda-forge fastapi uvicorn pandas numpy scikit-learn
```

#### Issue: "Request timeout" on NASA FIRMS data
**Solution:**
- NASA API sometimes slow (can take 60+ seconds)
- Check your internet connection
- Try again in a few minutes

---

### Frontend Issues

#### Issue: "axios.get is not defined"
**Solution:**
```bash
# Reinstall dependencies
cd frontend
npm install
npm run dev
```

#### Issue: "Mapbox token invalid"
**Solution:**
```bash
# 1. Get valid token from https://account.mapbox.com
# 2. Update .env file
# 3. Restart frontend server (npm run dev)
```

#### Issue: "Map won't load / showing grey area"
**Solution:**
- Check internet connection
- Verify Mapbox token in .env
- Check browser console (F12) for errors
- Try a different browser

---

### Data Issues

#### Issue: "All data showing 'Unknown' company"
**Problem:** Wells not being matched to companies

**Solution:**
- Check Excel files are in project root:
  - `Saudi Aramco.xlsx`
  - `wells_india.xlsx`
  - `wells_iran.xlsx`
  - `wells_iraq.xlsx`
  - `wells_usa.xlsx`

#### Issue: "No anomalies detected"
**Problem:** No flares are spiking above baseline

**Solution:**
- This is actually normal if flaring is stable
- Anomalies are rare (should only be 2-5% of flares)
- Try different date ranges

#### Issue: "Confidence scores are very low"
**Problem:** Wells aren't being matched accurately

**Solution:**
- Add more wells to Excel files
- Update well coordinates (latitude/longitude)
- Verify basin definitions match satellite data

---

### Performance Issues

#### Issue: "Dashboard is slow / sluggish"
**Solution:**
```
1. Reduce date range (7 days instead of 10)
2. Check internet speed (needs >1 Mbps)
3. Close other applications
4. Clear browser cache (Ctrl+Shift+Delete)
5. Try a different browser (Chrome is fastest)
```

#### Issue: "Memory usage very high"
**Problem:** Backend in-memory cache is growing

**Solution:**
```python
# In main.py, reduce CACHE_TTL:
CACHE_TTL = 1800  # 30 minutes instead of 3600 (1 hour)
```

---

### Debugging Mode

#### Enable verbose logging
```bash
# In backend:
export LOGLEVEL=DEBUG
uvicorn main:app --reload --log-level debug

# In frontend browser console:
localStorage.setItem('debug', 'petro:*')
```

#### Check backend health
```
Visit: http://localhost:8000/health
Should return:
{
  "status": "ok",
  "cache_keys": [...],
  "known_wells": 258,
  "wells_with_coords": 189
}
```

#### Check API response
```bash
# Get flares
curl http://localhost:8000/api/flares?days=7 | jq .

# Get alerts  
curl http://localhost:8000/api/alerts?days=7 | jq .

# Get summary
curl http://localhost:8000/api/summary?days=7 | jq .
```

---

## Advanced Configuration

### Changing Clustering Parameters

Edit `backend/processing/clustering.py`:
```python
EPS_KM = 1.0        # Distance threshold (1 km is standard)
MIN_SAMPLES = 1     # Minimum points per cluster
```

### Changing Emission Factors

Edit `backend/processing/emission_factors.py`:
```python
ELVIDGE_A = 1.40    # Polynomial coefficient (standard: 1.40)
ELVIDGE_B = 1.55    # Polynomial coefficient (standard: 1.55)
EF_CO2_KG_PER_KG_GAS = 2.86  # IPCC factor (standard)
GAS_DENSITY_KG_SCM = 0.8     # Natural gas density
BENCHMARK_GAS_PRICE_USD_PER_MMBTU = 3.5  # Market price
```

### Changing Anomaly Threshold

Edit `backend/processing/anomaly.py`:
```python
def detect_anomalies(df: pd.DataFrame, sigma_threshold: float = 2.0) -> pd.DataFrame:
    # Change 2.0 to higher (e.g., 3.0) for stricter threshold
    # 2.0 = ~95% confidence, 3.0 = ~99% confidence
```

### Configuring Wind & Plume Modeling

Edit `backend/api/wind.py`:
```python
MAX_WIND_SITES = 80                 # Max sites to fetch wind for (performance)
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"  # Wind API endpoint
```

In frontend, enable/disable plume:
```javascript
// In frontend/src/App.jsx
const [plumeVisible, setPlumeVisible] = useState(false)  // Enable plume
const [plumeOpacity, setPlumeOpacity] = useState(0.82)   // Opacity 0-1
```

### Setting Up PetroCopilot (Gemini AI)

Edit `.env` file:
```
GEMINI_API_KEY=your_api_key_from_ai.google.dev
```

In `backend/api/copilot.py`, customize system prompt:
```python
SYSTEM_PROMPT = """
You are PetroCopilot, an elite AI analyst embedded inside the Petro Carbon Emissions
Intelligence Platform...
"""  # Modify this to change AI behavior
```

**Getting a free API key:**
1. Go to https://ai.google.dev
2. Click "Get API Key"
3. Create new API key
4. Copy to .env file
5. Rate limit: 50 req/min (free tier)

### Cache & Performance Tuning

Edit `backend/main.py`:
```python
CACHE_TTL = 3600        # Cache Time-To-Live in seconds
                        # 3600 = 1 hour (default)
                        # 1800 = 30 minutes (for memory constraints)
                        # 7200 = 2 hours (for stability)

_WIND_CACHE_KEY_PREFIX = "wind_"  # Prefix for wind data cache
```

Adjust cache based on:
- **Small teams (<10 users):** 3600 seconds (1 hour)
- **Medium teams (10-50):** 1800 seconds (30 min)
- **Large teams (50+):** 900 seconds (15 min) + database backend

### World Bank Data Configuration

The system includes offline World Bank data files:
```
backend/data/wb_flaring_by_economy_2012_2024.xlsx      # Annual by country
backend/data/wb_flaring_by_location_2012_2024.xlsx     # Location-level
```

To update with latest data:
1. Download latest from https://www.worldbank.org/en/programs/gasflaringreduction
2. Place in `backend/data/`
3. System auto-loads on startup

**File naming convention:**
```
wb_flaring_by_economy_YYYY_YYYY.xlsx
wb_flaring_by_location_YYYY_YYYY.xlsx
```

### Regional Emission Factors

Edit `backend/processing/emission_factors.py`:
```python
REGIONAL_CORRECTION = {
    "Permian Basin":   0.92,    # Lower correction (better capture)
    "North Sea":       0.88,    # Strictest regulations
    "Niger Delta":     1.05,    # Higher flaring, less regulation
    "West Siberia":    1.02,    # Moderate practices
    "Middle East":     1.00,    # Baseline
    "Marcellus":       0.94,    # Good practices
    # Add more regions as needed
}
```

### Adding New Wells Database

1. Create Excel file in project root:
   ```
   my_wells.xlsx
   ```

2. Format with columns:
   ```
   Well Name | Company | Country | Latitude | Longitude | Landmark | Status
   ```

3. File auto-loads on startup
4. Wells merged with existing database
5. Duplicates (same location) auto-deduplicated

### Debugging & Verbose Logging

Enable detailed logging:
```bash
# Terminal 1: Backend with debug logging
export LOGLEVEL=DEBUG
uvicorn main:app --reload --log-level debug

# Terminal 2: Frontend with debug output
# In browser console (F12):
localStorage.setItem('debug', 'petro:*')
```

**Check logs for:**
- FIRMS API success/failures
- Cache hits/misses
- Wind API response times
- Clustering statistics
- Attribution confidence scores

### Adding New Data Sources

The system is designed to be extended:

1. **Add new satellite API:**
   - Create `backend/api/new_source.py`
   - Implement async fetch function
   - Return DataFrame with lat, lon, frp columns
   - Mount router in `main.py`

2. **Add new processing pipeline:**
   - Create function in `backend/processing/`
   - Chain after anomaly detection
   - Add output columns to DataFrame

3. **Add new visualization:**
   - Create React component in `frontend/src/components/`
   - Import in `App.jsx`
   - Add state management with `useState` hook
   - Fetch data from API endpoint

4. **Add new Excel well database:**
   - Create file in project root
   - Auto-loads on startup
   - Must include: name, company, country, latitude, longitude

---

## Summary

**Petro is a complete system for tracking oil & gas flaring from space.**

It combines:
- **NASA satellite data** (real-time thermal anomalies)
- **Well databases** (company attribution)
- **Scientific models** (Elvidge emission estimates)
- **AI assistant** (natural language queries)
- **Wind modeling** (atmospheric dispersion)
- **Historical baseline** (World Bank 30-year trends)
- **Real-time alerts** (anomaly detection)
- **Beautiful visualization** (interactive global map)

All tied together with:
- **Python FastAPI backend** (data processing + AI)
- **React + Vite frontend** (interactive dashboard)
- **REST APIs** (100% data access)
- **In-memory caching** (sub-second responses)
- **Zero database** (simplicity + scalability)

## Who Uses Petro?

- **ESG Analysts:** Track company carbon emissions independently
- **Regulators:** Monitor compliance without relying on self-reports
- **Investors:** Benchmark portfolio companies' environmental performance
- **Environmental Groups:** Gather evidence for policy advocacy
- **Oil Companies:** Identify efficiency improvements and reduce waste
- **Researchers:** Analyze global flaring patterns and trends

## Next Steps

1. **Get API keys:** NASA FIRMS + Mapbox (both free)
2. **Run locally:** `uvicorn main:app` + `npm run dev`
3. **Explore data:** Use dashboard for 7 days
4. **Ask questions:** Use PetroCopilot AI assistant
5. **Export & analyze:** Download CSV for your own analysis

---

**For more information, consult the official documentation files or contact the development team.**

**Last Updated:** May 2026 (v2.2.0)

