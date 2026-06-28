"""
Generate L2 grid: dense population-proportional cells, split by country.
Each country gets its own L2_XX.geojson file for efficient loading.
"""
import sys, time, json, os
sys.stdout.reconfigure(encoding="utf-8")
import geopandas as gpd
import pandas as pd
import numpy as np
from shapely.geometry import Point

TARGET = 5_000_000
L2_TARGET = 4_898_868

print("=== L2 Grid Generation (by-country chunks) ===")
print(f"Target: {L2_TARGET:,} cells across countries")

# Load
admin1 = gpd.read_file("public/data/admin1_ne10m.geojson").to_crs("EPSG:4326")
grid    = gpd.read_file("public/data/population_grid.geojson").to_crs("EPSG:4326")
admin1_clean = admin1[admin1.geometry.is_valid & ~admin1.geometry.is_empty & ~admin1.geometry.isna()].copy()
l2_info = pd.read_csv("scripts/grid-generation/l2_budget.csv")

print("Sjoin...")
grid_pts = grid.copy()
grid_pts.geometry = grid.geometry.centroid
joined = gpd.sjoin(grid_pts, admin1_clean[["geometry","iso_a2","name_en","type_en","admin"]], how="left", predicate="intersects")
matched = joined[joined["index_right"].notna()].copy()
matched = matched.merge(l2_info[["index_right","l2_alloc"]], on="index_right", how="left")
matched["l2_alloc"] = matched["l2_alloc"].fillna(0).astype(int)
print(f"GPW cells: {len(matched):,}")

# Per-country aggregation for L2 budget
country_l2 = matched.groupby("iso_a2").agg(
    total_l2=("l2_alloc","sum"),
    n_gpw=("l2_alloc","count"),
    pop_sum=("pop","sum")
).reset_index().sort_values("total_l2", ascending=False)

total_l2_all = country_l2["total_l2"].sum()
print(f"Total L2 budget: {total_l2_all:,}")

# L2 cells per GPW anchor
matched["l2_per_gpw"] = ((matched["pop"] / matched["pop"].sum()) * total_l2_all).astype(int).clip(lower=0)

# Stream per country
OUT_DIR = "public/data/l2_chunks"
os.makedirs(OUT_DIR, exist_ok=True)

t0 = time.time()
stats = []
written_total = 0

for _, crow in country_l2.iterrows():
    cc = crow["iso_a2"]
    if pd.isna(cc) or crow["total_l2"] <= 0:
        continue
    
    n_l2 = int(crow["total_l2"])
    if n_l2 < 4:
        continue
    
    # Get GPW anchors for this country
    c_matched = matched[matched["iso_a2"] == cc].copy()
    if len(c_matched) == 0:
        continue
    
    # Distribute n_l2 across GPW anchors proportional to pop
    total_pop = c_matched["pop"].sum()
    c_matched["l2_share"] = ((c_matched["pop"] / max(total_pop, 1)) * n_l2).astype(int).clip(lower=0)
    
    # Generate cells per anchor
    features = []
    placed = 0
    
    for _, grow in c_matched.iterrows():
        n_this = int(grow["l2_share"])
        if n_this <= 0:
            continue
        
        lon_base = round(grow.geometry.x, 6)
        lat_base = round(grow.geometry.y, 6)
        pop_base = grow["pop"]
        region = str(grow["name_en"]) if pd.notna(grow["name_en"]) else ""
        reg_type = str(grow["type_en"]) if pd.notna(grow["type_en"]) else ""
        admin = str(grow["admin"]) if pd.notna(grow["admin"]) else ""
        reg_idx = int(grow["index_right"])
        
        # Grid pattern around anchor
        side = max(1, int(n_this ** 0.5))
        step = 0.008  # degrees between cells (~0.9km)
        half = side // 2
        
        for di in range(side):
            for dj in range(side):
                if placed >= n_this:
                    break
                lon = round(lon_base + (di - half) * step, 6)
                lat = round(lat_base + (dj - half) * step, 6)
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [lon, lat]},
                    "properties": {
                        "grid_lng": lon, "grid_lat": lat,
                        "longitude": lon, "latitude": lat,
                        "country": str(cc), "region": region,
                        "region_type": reg_type, "admin": admin,
                        "pop": pop_base, "grid_level": "L2",
                        "region_idx": reg_idx,
                        "l1_idx": -1, "l2_idx": written_total + len(features),
                        "price_tier": 1,
                    }
                })
                placed += 1
            if placed >= n_this:
                break
    
    if len(features) == 0:
        continue
    
    # Save country chunk
    cc_clean = str(cc).replace("/","_")
    chunk_path = f"{OUT_DIR}/L2_{cc_clean}.geojson"
    gdf = gpd.GeoDataFrame.from_features(features, crs="EPSG:4326")
    gdf.to_file(chunk_path, driver="GeoJSON")
    
    sz = os.path.getsize(chunk_path) // 1024
    stats.append({"country": cc, "l2_cells": len(features), "file_kb": sz})
    written_total += len(features)
    
    if len(stats) % 20 == 0:
        elapsed = time.time()-t0
        rate = written_total / max(elapsed, 1)
        eta = (total_l2_all - written_total) / max(rate, 1)
        print(f"  {written_total:,}/{total_l2_all:,} ({written_total/total_l2_all*100:.0f}%) ETA:{eta:.0f}s")

elapsed = time.time()-t0
print(f"\n=== L2 DONE ===")
print(f"Total cells: {written_total:,} in {elapsed:.1f}s ({written_total/max(elapsed,1):.0f} cells/sec)")
print(f"Countries: {len(stats)}")
print(f"Output: {OUT_DIR}/")

# Summary
stats_df = pd.DataFrame(stats).sort_values("l2_cells", ascending=False)
stats_df.to_csv("scripts/grid-generation/l2_stats.csv", index=False)
print("\nTop 15 countries by L2 count:")
for _, r in stats_df.head(15).iterrows():
    print(f"  {r['country']}: {r['l2_cells']:,} cells ({r['file_kb']}kb)")
