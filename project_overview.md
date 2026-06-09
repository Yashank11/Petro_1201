# Petro — Carbon Emissions Intelligence Platform: Project Overview

## What We Are Doing
Petro is a high-performance, near-real-time carbon emissions monitoring platform designed to track global oil and gas infrastructure. 

The primary goal of the system is to provide a visually compelling, "Palantir-style" dashboard that allows stakeholders to monitor real-time carbon emissions and thermal anomalies without relying on a heavy backend infrastructure. It aggregates satellite thermal anomaly data and computes emission metrics to identify high-polluting operators and anomalous flaring events.

## How It Works

The platform operates on a streamlined architecture split between a **Python FastAPI backend** and a **React/Mapbox frontend**.

### 1. Data Ingestion (Backend)
The backend operates entirely in-memory without a persistent database (using an LRU-style caching mechanism). It pulls live data from two primary sources:
*   **NASA FIRMS API**: Fetches near-real-time Visible Infrared Imaging Radiometer Suite (VIIRS) satellite thermal anomaly data (updated daily, 375m resolution).
*   **Climate TRACE API**: Pulls static country-level emission data for the oil and gas sector.

### 2. Processing Pipeline
Once the NASA FIRMS data is fetched, it runs through a mathematical pipeline:
1.  **Filtering**: Isolates industrial flares (type 2: static land, type 3: offshore) and removes false positives by asserting high brightness (> 1600 K) or Fire Radiative Power (FRP > 1 MW).
2.  **Spatial Clustering**: Applies the **DBSCAN** (Density-Based Spatial Clustering of Applications with Noise) algorithm using a haversine distance metric (eps = 1 km). This groups nearby thermal hits into distinct facilities or flare stacks.
3.  **Attribution**: Maps the geographic coordinates of the clusters to known oil basin bounding boxes, thereby assigning an "operator" (company) and basin name to the emission source.
4.  **Emission Calculation**: Uses the **Elvidge et al. 2016 model** to calibrate the FRP to natural gas volume: `log₁₀(V_gas) = 1.40 + 1.55 × log₁₀(FRP_MW)`.
5.  **CO₂ Equivalent**: Translates the volume to estimated CO₂-eq using IPCC AR6 conversion metrics (`CO₂_eq = V_gas × 0.8 kg/m³ × 2.86 kg/kg × regional_factor`).
6.  **Anomaly Detection**: Continuously monitors flare sites and flags them if the recent intensity spikes significantly above a 7-day rolling baseline (using a 2σ standard deviation threshold).

### 3. API & Serving
The processed data is served to the frontend via a set of optimized REST endpoints:
*   `/api/flares`: Serves a GeoJSON payload of all detected and clustered flares for the map.
*   `/api/top_emitters`: Ranks companies and basins by their aggregate CO₂ equivalent.
*   `/api/alerts`: Exposes critical anomalies and spikes.
*   `/api/trends` & `/api/summary`: Feeds the frontend charts and KPI metrics.

### 4. Presentation (Frontend)
The React-based frontend fetches these JSON payloads and visualizes them using **Mapbox GL JS**. It provides:
*   A responsive, dark-mode geospatial map showing flare intensities.
*   Widgets displaying the top emitting companies.
*   Live anomaly alerts highlighting sudden, unauthorized, or excessive flaring activities in specific basins.

## Summary
In short, Petro turns raw infrared satellite pixels into actionable corporate intelligence, calculating the CO₂ footprints of global drilling operators in near-real-time through advanced spatial math—all presented through a modern, premium web interface.
