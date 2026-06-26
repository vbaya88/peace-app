"""
Generate L1 grid: one cell per admin1 region (centroid), proportional allocation.
Target: ~100,000 L1 cells (2% of 5M total)
"""
import sys, time, json
sys.stdout.reconfigure(encoding="utf-8")
import geopandas as gpd
import pandas as pd

TARGET = 5_000_000
L1_FRAC = 0.02
L1_TARGET = int(TARGET * L1_FRAC)   # 100,000
L2_TARGET = TARGET - L1_TARGET       # 4,900,000

print(f"=== L1 Grid Generation ===")
print(f"Target L1: {L1_TARGET:,} | Target L2: {L2_TARGET:,}")

# Load data
print("\nLoading data...")
admin1 = gpd.read_file("public/data/admin1_ne10m.geojson").to_crs("EPSG:4326")
grid    = gpd.read_file("public/data/population_grid.geojson").to_crs("EPSG:4326")
print(f"Admin1: {len(admin1):,} | Grid: {len(grid):,}")

admin1_clean = admin1[admin1.geometry.is_valid & ~admin1.geometry.is_empty & ~admin1.geometry.isna()].copy()
print(f"Admin1 valid: {len(admin1_clean):,}")

# Centroid-based sjoin
print("\nSpatial join (grid centroids x admin1)...")
t0 = time.time()
grid_pts = grid.copy()
grid_pts["orig_idx"] = grid.index
grid_pts.geometry = grid.geometry.centroid

joined = gpd.sjoin(
    grid_pts,
    admin1_clean[["geometry","iso_a2","name_en","type_en","admin"]],
    how="left", predicate="intersects"
)
print(f"Done in {time.time()-t0:.1f}s | Matched: {joined['index_right'].notna().sum():,}")

# Matched: get region-level aggregation
matched = joined[joined["index_right"].notna()].copy()
unmatched = joined[joined["index_right"].isna()].copy()

# Per-region population sums
region_pop = matched.groupby("index_right").agg(
    pop_sum=("pop","sum"),
    cell_count=("pop","count"),
    # Take first properties
    iso_a2=("iso_a2","first"),
    name_en=("name_en","first"),
    type_en=("type_en","first"),
    admin=("admin","first")
).reset_index()

total_pop = region_pop["pop_sum"].sum()
print(f"Total matched pop: {total_pop:.2f} | Regions: {len(region_pop):,}")

# L1 allocation per region
region_pop["l1_alloc"] = ((region_pop["pop_sum"] / total_pop) * L1_TARGET).astype(int).clip(lower=4)
l1_total = region_pop["l1_alloc"].sum()
print(f"L1 allocated: {l1_total:,} (target: {L1_TARGET:,})")

# Remaining L2 budget after L1
l2_budget = L2_TARGET
region_pop["l2_alloc"] = ((region_pop["pop_sum"] / total_pop) * l2_budget).astype(int)
l2_total = region_pop["l2_alloc"].sum()
print(f"L2 allocated: {l2_total:,} (target: {L2_TARGET:,})")

# Save region pop + allocation
region_pop.to_csv("scripts/grid-generation/region_pop_gpw.csv", index=False)
print("Saved: region_pop_gpw.csv")

# For L1: for each region, allocate cells around centroid proportional to pop
# L1 cells are SPARSE — one per region or few per region
print("\n--- Building L1 grid ---")
l1_cells = []

for _, row in region_pop.iterrows():
    rid = row["index_right"]
    n_l1 = int(row["l1_alloc"])
    if n_l1 <= 0:
        continue
    
    region_geom = admin1_clean.loc[rid, "geometry"]
    cent = region_geom.centroid
    minx, miny, maxx, maxy = region_geom.bounds
    
    # Grid spacing: spread cells across region bounding box
    # Use sqrt to get 2D spread
    side = max(1, int(n_l1 ** 0.5))
    
    # Random sampling within bbox, filtered to region
    import numpy as np
    np.random.seed(int(rid) % 2**31)
    
    attempts = 0
    placed = 0
    max_attempts = n_l1 * 50
    
    while placed < n_l1 and attempts < max_attempts:
        lon = minx + np.random.random() * (maxx - minx)
        lat = miny + np.random.random() * (maxy - miny)
        from shapely.geometry import Point
        pt = Point(lon, lat)
        if region_geom.contains(pt):
            l1_cells.append({
                "grid_lng": round(lon, 6),
                "grid_lat": round(lat, 6),
                "longitude": round(lon, 6),
                "latitude": round(lat, 6),
                "country": row["iso_a2"],
                "region": row["name_en"],
                "region_type": row["type_en"],
                "admin": row["admin"],
                "pop": row["pop_sum"] / max(1, n_l1),
                "grid_level": "L1",
                "region_idx": int(rid),
                "l1_idx": placed,
                "l2_idx": -1,
                "price_tier": 1,
            })
            placed += 1
        attempts += 1
    
    if placed < n_l1:
        # Fallback: use centroid + tiny offset grid
        for di in range(placed, n_l1):
            offset = 0.001 * (di - n_l1//2)
            l1_cells.append({
                "grid_lng": round(cent.x + offset, 6),
                "grid_lat": round(cent.y + offset, 6),
                "longitude": round(cent.x + offset, 6),
                "latitude": round(cent.y + offset, 6),
                "country": row["iso_a2"],
                "region": row["name_en"],
                "region_type": row["type_en"],
                "admin": row["admin"],
                "pop": row["pop_sum"] / max(1, n_l1),
                "grid_level": "L1",
                "region_idx": int(rid),
                "l1_idx": di,
                "l2_idx": -1,
                "price_tier": 1,
            })

l1_df = pd.DataFrame(l1_cells)
print(f"L1 cells generated: {len(l1_df):,}")

# Save L1
l1_geo = gpd.GeoDataFrame(
    l1_df,
    geometry=gpd.points_from_xy(l1_df["longitude"], l1_df["latitude"]),
    crs="EPSG:4326"
)
l1_geo.to_file("public/data/grid_l1.geojson", driver="GeoJSON")
print(f"Saved: public/data/grid_l1.geojson ({len(l1_df):,} cells)")

# Summary stats
print(f"\n=== L1 Summary ===")
print(f"Total cells: {len(l1_df):,}")
print(f"Countries: {l1_df['country'].nunique()}")
print(f"Regions: {l1_df['region_idx'].nunique()}")
print(f"L1 budget: {L1_TARGET:,} | Actual: {len(l1_df):,}")
print(f"\nTop 15 countries by L1 count:")
for cc, cnt in l1_df["country"].value_counts().head(15).items():
    print(f"  {cc}: {cnt:,}")

# Save L2 budget info
l2_info = region_pop[["index_right","iso_a2","name_en","admin","l2_alloc","pop_sum"]].copy()
l2_info.to_csv("scripts/grid-generation/l2_budget.csv", index=False)
print(f"\nSaved: l2_budget.csv ({len(l2_info):,} regions with L2 budget)")

print(f"\n=== L1 DONE — Ready for Part 2 (L2 generation) ===")
print(f"L2 cells to generate: {l2_info['l2_alloc'].sum():,}")
