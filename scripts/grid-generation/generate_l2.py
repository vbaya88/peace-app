"""
Generate L2 grid: dense population-proportional cells (streaming, 4.9M cells).
Streams to public/data/grid_l2.geojson in batches.
"""
import sys, time, json
sys.stdout.reconfigure(encoding="utf-8")
import geopandas as gpd
import pandas as pd
import numpy as np
from shapely.geometry import Point

TARGET = 5_000_000
L2_TARGET = 4_898_868  # from L1 script output

print("=== L2 Grid Generation (Streaming) ===")
print(f"Target L2: {L2_TARGET:,}")

# Load
admin1 = gpd.read_file("public/data/admin1_ne10m.geojson").to_crs("EPSG:4326")
grid    = gpd.read_file("public/data/population_grid.geojson").to_crs("EPSG:4326")
admin1_clean = admin1[admin1.geometry.is_valid & ~admin1.geometry.is_empty & ~admin1.geometry.isna()].copy()

# Load L2 budget
l2_info = pd.read_csv("scripts/grid-generation/l2_budget.csv")
print(f"L2 regions: {len(l2_info):,}")

# Load GPW grid per region for dense placement
# We use GPW grid points as anchors, then add density around them
grid_pts = grid.copy()
grid_pts["orig_idx"] = grid.index
grid_pts.geometry = grid.geometry.centroid

joined = gpd.sjoin(
    grid_pts,
    admin1_clean[["geometry","iso_a2","name_en","type_en","admin"]],
    how="left", predicate="intersects"
)
matched = joined[joined["index_right"].notna()].copy()
print(f"GPW cells matched: {len(matched):,}")

# Per-GPW-cell L2 budget
total_l2 = l2_info["l2_alloc"].sum()
total_gpw_pop = matched["pop"].sum()

# Compute L2 density per GPW cell
matched = matched.merge(
    l2_info[["index_right","l2_alloc"]],
    left_on="index_right", right_on="index_right", how="left"
)
matched["l2_alloc"] = matched["l2_alloc"].fillna(0).astype(int)
matched["l2_per_gpw"] = ((matched["pop"] / max(total_gpw_pop, 1)) * total_l2).astype(int).clip(lower=0)
print(f"Total L2 density: {matched['l2_per_gpw'].sum():,}")

# Stream L2 cells to file
OUT_PATH = "public/data/grid_l2.geojson"
BATCH = 50000

print("\nStreaming L2 cells to file...")
t0 = time.time()

# Build features list
features = []
total_written = 0
region_stats = []

for gidx, grow in matched.iterrows():
    n_l2 = int(grow["l2_per_gpw"])
    if n_l2 <= 0:
        continue
    
    reg_idx = int(grow["index_right"])
    lon_base = round(grow.geometry.x, 6)
    lat_base = round(grow.geometry.y, 6)
    pop_base = grow["pop"]
    iso_a2 = grow["iso_a2"]
    region = grow["name_en"]
    reg_type = grow["type_en"]
    admin = grow["admin"]
    
    # Generate n_l2 cells around this GPW anchor
    # Use a spiral/grid pattern centered on the GPW cell
    # Cell spacing: ~0.01° for dense coverage (adjacent cells almost touch)
    cell_spacing = 0.008  # degrees
    
    # Grid around center
    side = max(1, int(n_l2 ** 0.5))
    half = side // 2
    
    placed = 0
    for di in range(side):
        if placed >= n_l2:
            break
        for dj in range(side):
            if placed >= n_l2:
                break
            
            # Offset from center
            lon = lon_base + (di - half) * cell_spacing
            lat = lat_base + (dj - half) * cell_spacing
            
            # Verify in region (only for first few to save time)
            if placed < 500:
                pt = Point(lon, lat)
                reg_geom = admin1_clean.loc[reg_idx, "geometry"]
                if not reg_geom.contains(pt):
                    continue
            
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "properties": {
                    "grid_lng": lon,
                    "grid_lat": lat,
                    "longitude": lon,
                    "latitude": lat,
                    "country": iso_a2 if pd.notna(iso_a2) else "UNK",
                    "region": str(region) if pd.notna(region) else "",
                    "region_type": str(reg_type) if pd.notna(reg_type) else "",
                    "admin": str(admin) if pd.notna(admin) else "",
                    "pop": pop_base,
                    "grid_level": "L2",
                    "region_idx": reg_idx,
                    "l1_idx": -1,
                    "l2_idx": total_written,
                    "price_tier": 1,
                }
            })
            total_written += 1
            placed += 1
    
    # Flush batches
    if len(features) >= BATCH:
        mode = "a" if total_written > BATCH else "w"
        with open(OUT_PATH, mode, encoding="utf-8") as f:
            if mode == "w":
                f.write('{"type":"FeatureCollection","features":')
            else:
                f.write(',')
            json.dump(features[0 if mode == "w" else 0:], f)
            if mode == "w":
                f.write('}')
        region_stats.append({"region": reg_idx, "l2_written": len(features)})
        features = []
        if int(gidx) % 10000 == 0:
            print(f"  GPW {gidx:,}: {total_written:,} L2 cells written...")

print(f"\nL2 generation complete: {total_written:,} cells in {time.time()-t0:.1f}s")

# Verify output
import os
if os.path.exists(OUT_PATH):
    size_mb = os.path.getsize(OUT_PATH) // 1024 // 1024
    print(f"Output: {OUT_PATH} ({size_mb} MB)")
else:
    print(f"ERROR: {OUT_PATH} not created!")

print(f"\n=== L2 DONE ===")
print(f"Next: combine L1 + L2 into final grid, then push to GitHub")
