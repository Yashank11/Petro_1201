"""
DBSCAN spatial clustering of VIIRS flare detections.
Groups nearby hotspots (within ~1 km) into single flare sites.
"""
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN

EARTH_RADIUS_KM = 6371.0
EPS_KM = 1.0        # cluster radius: 1 km
MIN_SAMPLES = 1     # even single detections get a cluster ID


def cluster_flares(df: pd.DataFrame) -> pd.DataFrame:
    """
    Run DBSCAN on (lat, lon) to assign cluster_id to each detection.
    Adds columns: cluster_id, cluster_size, cluster_lat, cluster_lon.
    """
    if df.empty:
        return df

    df = df.copy()
    coords = np.radians(df[["latitude", "longitude"]].values)
    eps_rad = EPS_KM / EARTH_RADIUS_KM   # convert km → radians for haversine

    labels = DBSCAN(
        eps=eps_rad,
        min_samples=MIN_SAMPLES,
        algorithm="ball_tree",
        metric="haversine",
    ).fit_predict(coords)

    df["cluster_id"] = labels

    # Compute cluster centroid and aggregate stats
    cluster_stats = (
        df.groupby("cluster_id")
        .agg(
            cluster_lat=("latitude",  "mean"),
            cluster_lon=("longitude", "mean"),
            cluster_size=("latitude", "count"),
            max_frp=("frp",           "max"),
        )
        .reset_index()
    )

    df = df.merge(cluster_stats, on="cluster_id", how="left")

    # Use cluster centroid as the representative position
    df["latitude"]  = df["cluster_lat"]
    df["longitude"] = df["cluster_lon"]

    # One row per cluster per date (keep the hottest detection)
    df = (
        df.sort_values("frp", ascending=False)
        .drop_duplicates(subset=["cluster_id", "acq_date"])
        .reset_index(drop=True)
    )

    return df
