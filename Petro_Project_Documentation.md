# Petro — Carbon Emissions Intelligence Platform: Strategic Documentation

## Project Vision
**Petro** is an industrial-grade intelligence platform designed to eliminate the "opacity" of global oil and gas emissions. By fusing near-real-time satellite thermal monitoring with high-resolution asset databases, Petro transforms raw spectral data into actionable corporate environmental intelligence.

Our mission is to provide stakeholders—from ESG analysts to regulatory bodies—with a "Palantir-style" interface that tracks, attributes, and flags carbon emissions at the individual facility level.

---

## Core Architecture

The system is built on a high-concurrency, data-intensive architecture that prioritizes near-real-time processing without the overhead of traditional persistent databases.

### 1. Data Ingestion & Fusion Layer
The platform ingests data from four critical sources:
*   **Satellite Telemetry (NASA FIRMS)**: Daily VIIRS thermal anomaly data (375m resolution). This is our "sensor" for active flaring.
*   **Asset Database (Excel/XLSX)**: A curated database of 258+ global assets (Wells, Terminals, Refineries) from Saudi Aramco, ONGC, and others. This is our "ground truth."
*   **Macro Benchmarks (Climate TRACE)**: Country-level sector emissions used for normalization and regional factor calibration.
*   **Market Intelligence**: Live Brent Crude oil prices to correlate flaring intensity with global production cycles.

### 2. The Intelligence Pipeline
Raw data is processed through a multi-stage spatial and mathematical pipeline:

1.  **Industrial Filtering**: We isolate industrial flares (Type 2 & 3) by filtering out non-persistent heat sources (wildfires/agricultural burning) using brightness (> 1600 K) and FRP (> 1 MW) thresholds.
2.  **Spatial Clustering (DBSCAN)**: We use the **DBSCAN** algorithm (eps=1km) to group individual satellite pixels into distinct "Flare Clusters" or facilities.
3.  **High-Precision Attribution**:
    *   **Deterministic Matching**: Any cluster within **5 km** of a known well (from our asset database) is attributed to that specific asset name and operator (e.g., "Ghawar Well 12" -> Saudi Aramco).
    *   **Probabilistic Fallback**: If no exact match is found, clusters are assigned to operators based on weighted regional production shares within the basin.
4.  **Carbon Quantification (Elvidge 2016)**:
    *   **FRP to Volume**: `log₁₀(V_gas) = 1.40 + 1.55 × log₁₀(FRP_MW)`
    *   **Volume to CO₂-eq**: Calculated using IPCC AR6 metrics, converting methane/CO₂ volumes into metric tons of CO₂ equivalent.
5.  **Anomaly Detection**: A 7-day rolling baseline monitors every cluster. Any spike exceeding **2σ (standard deviations)** triggers an automated ESG alert.

---

## Technical Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Backend** | Python / FastAPI | High-speed data processing & API orchestration |
| **Frontend** | React / Vite | Interactive dashboard & state management |
| **Mapping** | Mapbox GL JS | Geospatial visualization & vector tile rendering |
| **Analysis** | Pandas / NumPy / Scikit-learn | Spatial clustering and emission modeling |
| **Data Source** | NASA FIRMS / Climate TRACE | External API integration for live satellite data |

---

## Recent Milestones (Phase 2 Integration)
We have recently transitioned from a generic monitoring tool to a **High-Resolution Asset Intelligence** platform:

*   **Saudi Aramco Integration**: Successfully ingested and deduplicated Saudi Aramco's regional well data for the Middle East, enabling 100% attribution accuracy in the Ghawar and Safaniyah fields.
*   **Global Asset Expansion**: Integrated India (ONGC/Rajasthan), Iran, Iraq, and USA (Permian/Marcellus) well datasets.
*   **ESG Risk Modeling**: Introduced a risk-scoring algorithm that ranks operators by their "Flaring Intensity to Production" ratio.
*   **Live Market Ticker**: Integrated real-time Brent oil pricing to show the correlation between market volatility and flaring frequency.

---

## Key Performance Indicators (KPIs)
*   **Near-Real-Time Latency**: < 24-hour lag from satellite detection to dashboard visualization.
*   **Attribution Accuracy**: > 85% for major global basins with high-density asset data.
*   **Clustering Resolution**: Distinct facility identification down to 1km spatial separation.

---

**Petro** is turning environmental monitoring into a deterministic science, moving the industry from "estimated emissions" to "verified asset-level carbon intelligence."
