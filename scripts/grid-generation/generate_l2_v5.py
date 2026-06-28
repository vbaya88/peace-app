"""
L2 Grid Generator v5 — with verbose debug.
"""
import sys, time, os, json, math
sys.stdout.reconfigure(encoding="utf-8")
import geopandas as gpd
import pandas as pd
import numpy as np

TARGET = 5_000_000
L2_TARGET = TARGET - 109_311
STEP = 0.008

print(f"=== L2 v5: target={L2_TARGET:,} ===")

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

# Ceiling allocation
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
print(f"Final: {final_total:,} | anchors with >0: {(matched['l2_per_anchor']>0).sum()}")
print(f"l2_per_anchor stats: min={matched['l2_per_anchor'].min()}, max={matched['l2_per_anchor'].max()}, mean={matched['l2_per_anchor'].mean():.1f}")

# Country stats
country_stats = matched.groupby("iso_a2").agg(
    n_anchors=("l2_per_anchor","count"),
    l2_total=("l2_per_anchor","sum"),
).reset_index().sort_values("l2_total", ascending=False)
print(f"\nCountry stats (top 5):")
for _, r in country_stats.head(5).iterrows():
    print(f"  {r['iso_a2']}: {r['l2_total']:,} cells, {r['n_anchors']} anchors")

# Check first country
cc_test = country_stats.iloc[0]["iso_a2"]
n_test = int(country_stats.iloc[0]["l2_total"])
c_test = matched[matched["iso_a2"] == cc_test].copy()
print(f"\nDEBUG {cc_test}: n_l2={n_test}, anchors={len(c_test)}")
print(f"  l2_per_anchor sample: {c_test['l2_per_anchor'].head(5).tolist()}")
print(f"  Expected features: ~{c_test['l2_per_anchor'].sum():,}")

# Generate only for top 3 countries
OUT_DIR = "public/data/l2_chunks"
os.makedirs(OUT_DIR, exist_ok=True)
t0 = time.time()
stats = []
written = 0

for _, crow in country_stats.head(10).iterrows():
    cc = str(crow["iso_a2"]) if not pd.isna(crow["iso_a2"]) else "UNK"
    n_l2 = int(crow["l2_total"])
    n_anch = int(crow["n_anchors"])
    
    print(f"\nProcessing {cc}: n_l2={n_l2:,}, anchors={n_anch}")
    
    c_df = matched[matched["iso_a2"] == cc].copy()
    print(f"  c_df rows: {len(c_df)}")
    print(f"  l2_per_anchor sample: {c_df['l2_per_anchor'].head(3).tolist()}")
    
    features = []
    anchors_processed = 0
    cells_generated = 0
    
    for i, (_, row) in enumerate(c_df.iterrows()):
        n_this = int(row["l2_per_anchor"])
        if n_this <= 0:
            continue
        
        lon0 = round(row.geometry.x, 6)
        lat0 = round(row.geometry.y, 6)
        
        side = max(1, int(math.sqrt(n_this)))
        half = side // 2
        
        placed = 0
        for xi in range(side):
            for yi in range(side):
                if placed >= n_this:
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
                        "region": str(row["name_en"]) if pd.notna(row["name_en"]) else "",
                        "grid_level": "L2",
                        "l2_idx": len(features),
                        "price_tier": 1,
                    }
                })
                placed += 1
            if placed >= n_this:
                break
        
        anchors_processed += 1
        cells_generated += placed
        
        if i >= 4:
            break
    
    print(f"  Processed {anchors_processed} anchors, {cells_generated} cells, features={len(features)}")
    
    if len(features) > 0:
        cc_clean = cc.replace("/","_")
        chunk_path = f"{OUT_DIR}/L2_{cc_clean}.geojson"
        gdf = gpd.GeoDataFrame.from_features(features, crs="EPSG:4326")
        gdf.to_file(chunk_path, driver="GeoJSON")
        sz = os.path.getsize(chunk_path) // 1024
        stats.append({"country": cc, "l2_cells": len(features), "file_kb": sz})
        written += len(features)
        print(f"  Saved: {chunk_path} ({sz}kb)")

print(f"\n=== v5 DEBUG DONE ===")
print(f"Written: {written:,} cells")
print(f"Elapsed: {time.time()-t0:.1f}s")
