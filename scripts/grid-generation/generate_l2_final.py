"""
L2 Grid Generator — FINAL. Fixed: global placed counter per country.
"""
import sys, time, os, json, math
sys.stdout.reconfigure(encoding="utf-8")
import geopandas as gpd
import pandas as pd
import numpy as np

TARGET = 5_000_000
L2_TARGET = TARGET - 109_311
STEP = 0.008

print(f"=== L2 FINAL: target={L2_TARGET:,} cells ===")

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

total_pop = matched["pop"].sum()
n = len(matched)
print(f"Anchors: {n:,}")

# Allocation: ceiling + scale
matched["raw"] = (matched["pop"] / total_pop) * L2_TARGET
matched["ceil"] = matched["raw"].apply(math.ceil)
ceil_total = int(matched["ceil"].sum())
print(f"Ceiling total: {ceil_total:,}")

if ceil_total > L2_TARGET:
    scale = L2_TARGET / ceil_total
    matched["l2_per_anchor"] = matched["ceil"].apply(lambda x: max(1, int(x * scale)))
else:
    matched["l2_per_anchor"] = matched["ceil"].astype(int)

current = int(matched["l2_per_anchor"].sum())
diff = L2_TARGET - current
if diff != 0:
    top_idx = matched.nlargest(abs(diff), "l2_per_anchor").index
    matched.loc[top_idx[:abs(diff)], "l2_per_anchor"] += (1 if diff > 0 else -1)
    matched["l2_per_anchor"] = matched["l2_per_anchor"].clip(lower=1)

final_total = int(matched["l2_per_anchor"].sum())
print(f"Final: {final_total:,} | anchors>0: {(matched['l2_per_anchor']>0).sum()}")
print(f"Per-anchor: min={matched['l2_per_anchor'].min()}, max={matched['l2_per_anchor'].max()}, mean={matched['l2_per_anchor'].mean():.1f}")

# Per-country summary
country_stats = matched.groupby("iso_a2").agg(
    n_anchors=("l2_per_anchor","count"),
    l2_total=("l2_per_anchor","sum"),
).reset_index().sort_values("l2_total", ascending=False)
total_check = country_stats["l2_total"].sum()
print(f"Countries: {len(country_stats)} | Sum check: {total_check:,}")

# Generate per country
OUT_DIR = "public/data/l2_chunks"
os.makedirs(OUT_DIR, exist_ok=True)

t0 = time.time()
stats = []
written = 0

for _, crow in country_stats.iterrows():
    cc = str(crow["iso_a2"]) if not pd.isna(crow["iso_a2"]) else "UNK"
    n_l2 = int(crow["l2_total"])
    n_anch = int(crow["n_anchors"])
    
    if n_l2 < 4 or n_anch == 0:
        continue
    
    c_df = matched[matched["iso_a2"] == cc].copy()
    if len(c_df) == 0:
        continue
    
    features = []
    country_placed = 0  # FIXED: global counter per country
    
    for _, row in c_df.iterrows():
        n_this = int(row["l2_per_anchor"])
        if n_this <= 0:
            continue
        
        # Check global limit for this country
        if country_placed >= n_l2:
            break
        
        lon0 = round(row.geometry.x, 6)
        lat0 = round(row.geometry.y, 6)
        pop_base = row["pop"]
        region = str(row["name_en"]) if pd.notna(row["name_en"]) else ""
        reg_type = str(row["type_en"]) if pd.notna(row["type_en"]) else ""
        admin_str = str(row["admin"]) if pd.notna(row["admin"]) else ""
        reg_idx = int(row["index_right"])
        
        # Square grid, centered on anchor
        side = max(1, int(math.sqrt(n_this)))
        half = side // 2
        
        for xi in range(side):
            if country_placed >= n_l2:
                break
            for yi in range(side):
                if country_placed >= n_l2:
                    break
                
                lon = round(lon0 + (xi - half) * STEP, 6)
                lat = round(lat0 + (yi - half) * STEP, 6)
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [lon, lat]},
                    "properties": {
                        "grid_lng": lon, "grid_lat": lat,
                        "longitude": lon, "latitude": lat,
                        "country": cc,
                        "region": region,
                        "region_type": reg_type,
                        "admin": admin_str,
                        "pop": pop_base,
                        "grid_level": "L2",
                        "region_idx": reg_idx,
                        "l1_idx": -1,
                        "l2_idx": written + len(features),
                        "price_tier": 1,
                    }
                })
                country_placed += 1
    
    if not features:
        continue
    
    # Save country chunk
    cc_clean = cc.replace("/","_")
    chunk_path = f"{OUT_DIR}/L2_{cc_clean}.geojson"
    gdf = gpd.GeoDataFrame.from_features(features, crs="EPSG:4326")
    gdf.to_file(chunk_path, driver="GeoJSON")
    
    sz = os.path.getsize(chunk_path) // 1024
    stats.append({"country": cc, "l2_cells": len(features), "file_kb": sz, "anchors": n_anch})
    written += len(features)
    
    pct = written / max(L2_TARGET, 1) * 100
    print(f"  {cc}: {len(features):,} cells ({sz}kb) | total: {written:,} ({pct:.0f}%)")

elapsed = time.time() - t0
print(f"\n=== L2 DONE ===")
print(f"Total: {written:,} cells in {elapsed:.1f}s ({written/max(elapsed,1):.0f}/sec)")
print(f"Countries: {len(stats)}")

stats_df = pd.DataFrame(stats).sort_values("l2_cells", ascending=False)
stats_df.to_csv("scripts/grid-generation/l2_stats.csv", index=False)

print(f"\nTop 15:")
for _, r in stats_df.head(15).iterrows():
    print(f"  {r['country']}: {r['l2_cells']:,} ({r['file_kb']}kb)")

with open(f"{OUT_DIR}/_index.json", "w") as f:
    json.dump({
        "countries": stats,
        "total_cells": written,
        "l2_target": L2_TARGET,
        "l1_cells": 109311,
        "total": written + 109311
    }, f, indent=2)

total_all = written + 109311
print(f"\nTotal L1+L2: {total_all:,} (target: {TARGET:,})")
print(f"Files: {OUT_DIR}/")
print("DONE")
