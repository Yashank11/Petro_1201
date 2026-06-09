"""
Anomaly detection: flags flare sites with intensity > 2σ above their
7-day rolling baseline. Uses z-score per cluster_id.
"""
import numpy as np
import pandas as pd


def detect_anomalies(df: pd.DataFrame, sigma_threshold: float = 2.0) -> pd.DataFrame:
    """
    For each cluster, compute mean and std of frp across dates.
    Flag rows where frp > mean + sigma_threshold * std.
    Adds columns: baseline_frp, anomaly_score, is_anomaly.
    """
    if df.empty or "cluster_id" not in df.columns:
        df["is_anomaly"]    = False
        df["anomaly_score"] = 0.0
        df["baseline_frp"]  = df.get("frp", 0)
        return df

    df = df.copy()

    stats = (
        df.groupby("cluster_id")["frp"]
        .agg(baseline_frp="mean", frp_std="std")
        .reset_index()
    )
    stats["frp_std"] = stats["frp_std"].fillna(1.0).clip(lower=0.1)

    df = df.merge(stats, on="cluster_id", how="left")

    df["anomaly_score"] = (df["frp"] - df["baseline_frp"]) / df["frp_std"]
    df["is_anomaly"]    = df["anomaly_score"] > sigma_threshold

    return df
