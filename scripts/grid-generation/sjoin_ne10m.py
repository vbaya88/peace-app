"""Full sjoin test with NE10m admin1 (241 countries)"""
import sys, time
sys.stdout.reconfigure(encoding="utf-8")
import geopandas as gpd

print("Loading data...")
admin1 = gpd.read_file("public/data/admin1_ne10m.geojson").to_crs("EPSG:4326")
grid    = gpd.read_file("public/data/population_grid.geojson").to_crs("EPSG:4326")
print(f"Admin1: {len(admin1):,} regions, {admin1['iso_a2'].nunique()} countries | Grid: {len(grid):,} cells")

# Filter valid
admin1_clean = admin1[admin1.geometry.is_valid & ~admin1.geometry.is_empty & ~admin1.geometry.isna()].copy()
print(f"Admin1 valid: {len(admin1_clean):,}")

# Create centroids
print("\nCreating grid centroids...")
t0 = time.time()
grid_pts = grid.copy()
grid_pts.geometry = grid.geometry.centroid
print(f"Centroids done in {time.time()-t0:.1f}s")

# Full spatial join
print("\nRunning sjoin (182K x 4596)...")
t0 = time.time()
joined = gpd.sjoin(
    grid_pts,
    admin1_clean[["geometry","iso_a2","name_en","type_en","admin"]],
    how="left", predicate="intersects"
)
print(f"Done in {time.time()-t0:.1f}s | Total rows: {len(joined):,}")

matched = joined[joined["index_right"].notna()]
unmatched = joined[joined["index_right"].isna()]
print(f"Matched: {len(matched):,} | Unmatched: {len(unmatched):,}")
print(f"Match rate: {len(matched)/len(joined)*100:.1f}%")

# Country breakdown
country_pop = matched.groupby("iso_a2").agg(cell_count=("pop","count"), pop_sum=("pop","sum")).sort_values("pop_sum", ascending=False)
print(f"\nCountries matched: {len(country_pop)}")
print("Top 20 countries:")
for cc, row in country_pop.head(20).iterrows():
    print(f"  {cc}: {row['cell_count']:,} cells, {row['pop_sum']:.1f}M pop")

# Save country populations
country_pop.reset_index().to_csv("scripts/grid-generation/country_pop_gpw.csv", index=False)
print("\nSaved: country_pop_gpw.csv")

# Allocation
TARGET = 5_000_000
l1 = int(TARGET * 0.02)
l2 = TARGET - l1
total_pop = country_pop["pop_sum"].sum()

alloc = country_pop.reset_index().copy()
alloc.columns = ["iso_a2","cell_count","pop_m"]
alloc["l1"] = ((alloc["pop_m"]/total_pop)*l1).astype(int).clip(lower=4)
alloc["l2"] = ((alloc["pop_m"]/total_pop)*l2).astype(int)
alloc = alloc.sort_values("l2", ascending=False)

print(f"\n=== Allocation (target={TARGET:,}) ===")
print(f"L1: {alloc['l1'].sum():,} | L2: {alloc['l2'].sum():,}")
print("Top 15 by L2:")
for _, r in alloc.head(15).iterrows():
    print(f"  {r['iso_a2']}: L1={r['l1']}, L2={r['l2']:,}")

# Unmatched info
if len(unmatched) > 0:
    unmatched_countries = unmatched["country"].value_counts().head(15)
    print(f"\nUnmatched cells by country (top 15):")
    for cc, cnt in unmatched_countries.items():
        print(f"  {cc}: {cnt:,}")
