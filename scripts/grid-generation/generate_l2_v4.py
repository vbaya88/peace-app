"""
L2 Grid Generator v4 — ceiling-then-scale to hit exact target.
"""
import sys, time, os, json, math
sys.stdout.reconfigure(encoding="utf-8")
import geopandas as gpd
import pandas as pd
import numpy as np

TARGET = 5_000_000
L2_TARGET = TARGET - 109_311
STEP = 0.008  # degrees (~0.9km)

print(f"=== L2 v4: target={L2_TARGET:,} cells ===")

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

# Ceiling allocation: every anchor gets at least 1
matched["raw"] = (matched["pop"] / total_pop) * L2_TARGET
matched["ceil"] = matched["raw"].apply(math.ceil)
ceil_total = int(matched["ceil"].sum())
print(f"Ceiling total: {ceil_total:,} (target: {L2_TARGET:,})")

# Scale down to fit target
if ceil_total > L2_TARGET:
    scale = L2_TARGET / ceil_total
    matched["l2_per_anchor"] = (matched["ceil"] * scale).apply(lambda x: max(1, int(x)))
else:
    matched["l2_per_anchor"] = matched["ceil"]

# Ensure exact total
current = int(matched["l2_per_anchor"].sum())
diff = L2_TARGET - current
# Add diff to largest anchors
if diff != 0:
    top_idx = matched.nlargest(abs(diff), "l2_per_anchor").index
    matched.loc[top_idx[:abs(diff)], "l2_per_anchor"] += 1 if diff > 0 else -1
    matched["l2_per_anchor"] = matched["l2_per_anchor"].clip(lower=1)

final_total = int(matched["l2_per_anchor"].sum())
print(f"Final total: {final_total:,} (diff from target: {final_total - L2_TARGET:+,})")

# Per-country summary
country_stats = matched.groupby("iso_a2").agg(
    n_anchors=("l2_per_anchor","count"),
    l2_total=("l2_per_anchor","sum"),
    pop_sum=("pop","sum")
).reset_index().sort_values("l2_total", ascending=False)

print(f"Countries: {len(country_stats)}")
print("Top 10:")
for _, r in country_stats.head(10).iterrows():
    print(f"  {r['iso_a2']}: {r['l2_total']:,} cells")

# Generate
OUT_DIR = "public/data/l2_chunks"
os.makedirs(OUT_DIR, exist_ok=True)

t0 = time.time()
stats = []
written = 0
checkpoint = 50000

for _, crow in country_stats.iterrows():
    cc = crow["iso_a2"]
    if pd.isna(cc) or crow["l2_total"] <= 0:
        continue
    n_l2 = int(crow["l2_total"])
    if n_l2 < 4:
        continue
    
    c_df = matched[matched["iso_a2"] == cc].copy()
    if len(c_df) == 0:
        continue
    
    features = []
    for _, row in c_df.iterrows():
        n_this = int(row["l2_per_anchor"])
        if n_this <= 0:
            continue
        
        lon0 = round(row.geometry.x, 6)
        lat0 = round(row.geometry.y, 6)
        pop_base = row["pop"]
        region = str(row["name_en"]) if pd.notna(row["name_en"]) else ""
        reg_type = str(row["type_en"]) if pd.notna(row["type_en"]) else ""
        admin_str = str(row["admin"]) if pd.notna(row["admin"]) else ""
        reg_idx = int(row["index_right"])
        
        side = max(1, int(math.sqrt(n_this)))
        half = side // 2
        
        for xi in range(side):
            for yi in range(side):
                if len(features) >= n_this:
                    break
                lon = round(lon0 + (xi - half) * STEP, 6)
                lat = round(lat0 + (yi - half) * STEP, 6)
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [lon, lat]},
                    "properties": {
                        "grid_lng": lon, "grid_lat": lat,
                        "longitude": lon, "latitude": lat,
                        "country": str(cc), "region": region,
                        "region_type": reg_type, "admin": admin_str,
                        "pop": pop_base, "grid_level": "L2",
                        "region_idx": reg_idx,
                        "l1_idx": -1, "l2_idx": written + len(features),
                        "price_tier": 1,
                    }
                })
            if len(features) >= n_this:
                break
    
    if not features:
        continue
    
    cc_clean = str(cc).replace("/","_")
    chunk_path = f"{OUT_DIR}/L2_{cc_clean}.geojson"
    gdf = gpd.GeoDataFrame.from_features(features, crs="EPSG:4326")
    gdf.to_file(chunk_path, driver="GeoJSON")
    
    sz = os.path.getsize(chunk_path) // 1024
    stats.append({"country": cc, "l2_cells": len(features), "file_kb": sz, "anchors": int(crow["n_anchors"])})
    written += len(features)
    
    if written >= checkpoint:
        print(f"  {written:,} cells written ({len(stats)} countries)")
        checkpoint += 100000

elapsed = time.time()-t0
print(f"\n=== L2 DONE ===")
print(f"Total: {written:,} cells in {elapsed:.1f}s ({written/max(elapsed,1):.0f}/sec)")
print(f"Countries: {len(stats)}")

stats_df = pd.DataFrame(stats).sort_values("l2_cells", ascending=False)
stats_df.to_csv("scripts/grid-generation/l2_stats.csv", index=False)
print("\nTop 15 countries:")
for _, r in stats_df.head(15).iterrows():
    print(f"  {r['country']}: {r['l2_cells']:,} cells from {r['anchors']} anchors ({r['file_kb']}kb)")

with open(f"{OUT_DIR}/_index.json", "w") as f:
    json.dump({"countries": stats, "total_cells": written, "l2_target": L2_TARGET, "l1_cells": 109311, "total": written + 109311}, f)
print(f"\nTotal L1+L2: {written + 109311:,}")
print(f"Saved: {OUT_DIR}/_index.json")
