"""
Emission factor calculations using:
- Elvidge et al. 2016 (Remote Sensing) polynomial for FRP → gas volume
- IPCC AR6 combustion EF: 2.86 kg CO₂ per kg natural gas
- Energy content of natural gas (GPA 2172 / ISO 6976): 38 MJ/scm
- Benchmark gas price: Henry Hub proxy (USD/MMBtu)
"""
import numpy as np
import pandas as pd

# Elvidge 2016 polynomial coefficients: log10(V_gas) = a + b*log10(FRP)
ELVIDGE_A = 1.40
ELVIDGE_B = 1.55

# IPCC AR6: CO₂ emission factor for natural gas flaring
EF_CO2_KG_PER_KG_GAS = 2.86
# Average natural gas density at standard conditions
GAS_DENSITY_KG_SCM = 0.8       # kg per standard cubic metre

# ── Gas-to-value parameters ─────────────────────────────────────────────────
# GPA 2172 / ISO 6976: gross heating value of natural gas
GAS_ENERGY_MJ_PER_SCM = 38.0   # MJ per standard cubic metre
MJ_PER_MMBTU = 1055.06         # 1 MMBtu = 1055.06 MJ (exact)
# Henry Hub benchmark proxy (USD/MMBtu) — override via live API when available
BENCHMARK_GAS_PRICE_USD_PER_MMBTU = 3.5

# Regional correction factors (ratio to global baseline)
REGIONAL_CORRECTION = {
    "Permian Basin": 0.92,
    "North Sea":     0.88,
    "Niger Delta":   1.05,
    "West Siberia":  1.02,
    "Middle East":   1.00,
    "Marcellus":     0.94,
}


def frp_to_gas_volume(frp_mw: float) -> float:
    """
    Elvidge 2016: convert Fire Radiative Power (MW) to gas volume (scm/day).
    Returns 0 for non-positive FRP.
    """
    if frp_mw <= 0:
        return 0.0
    log_v = ELVIDGE_A + ELVIDGE_B * np.log10(frp_mw)
    return 10 ** log_v   # scm/day


def gas_volume_to_co2(v_scm_day: float, basin: str = "") -> float:
    """
    Convert gas volume (scm/day) to CO₂ mass (tonnes/day).
    Applies regional correction factor if available.
    """
    correction = REGIONAL_CORRECTION.get(basin, 1.0)
    mass_gas_kg = v_scm_day * GAS_DENSITY_KG_SCM
    co2_kg = mass_gas_kg * EF_CO2_KG_PER_KG_GAS * correction
    return co2_kg / 1000.0   # kg → tonnes


def gas_volume_to_market_value(
    v_scm_day: float,
    price_usd_mmbtu: float = BENCHMARK_GAS_PRICE_USD_PER_MMBTU,
) -> float:
    """
    Convert gas volume (scm/day) to daily market value (USD/day).

    Pipeline: scm/day → MJ/day (via GCV 38 MJ/scm) → MMBtu/day → USD/day

    Uses gross calorific value per GPA 2172 / ISO 6976 and a configurable
    benchmark gas price (default: Henry Hub proxy at $3.5/MMBtu).
    FRP-based shortcut bypassed intentionally — volume already derived
    from the Elvidge polynomial for consistency with the CO₂ pipeline.
    """
    if v_scm_day <= 0:
        return 0.0
    energy_mj    = v_scm_day * GAS_ENERGY_MJ_PER_SCM
    energy_mmbtu = energy_mj / MJ_PER_MMBTU
    return energy_mmbtu * price_usd_mmbtu


def calculate_emissions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply emission factor pipeline to a DataFrame of flare detections.
    Adds columns:
      v_gas_scm   — gas volume (scm/day) via Elvidge 2016
      co2_t_day   — CO₂ mass (tonnes/day)
      co2_eq_t    — CO₂-equivalent including fugitive methane uplift
      gas_value_usd — estimated market value of flared gas (USD/day)
                      computed from volume × energy content × benchmark price,
                      consistent with the CO₂ pipeline.
    """
    if df.empty:
        return df

    df = df.copy()
    df["v_gas_scm"]    = df["frp"].apply(frp_to_gas_volume)
    df["co2_t_day"]    = df.apply(
        lambda r: gas_volume_to_co2(r["v_gas_scm"], r.get("basin", "")), axis=1
    )
    # CO₂-equivalent includes small methane leakage (5% unburned → GWP 28)
    df["co2_eq_t"]     = df["co2_t_day"] * 1.04   # ≈ 4% uplift for fugitives
    # Market value via physically grounded pipeline (volume → energy → price)
    df["gas_value_usd"] = df["v_gas_scm"].apply(gas_volume_to_market_value)

    return df
