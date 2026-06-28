"""Process existing NE10m shapefile into admin1_ne10m.geojson"""
import sys, os, zipfile, geopandas as gpd

WORK_DIR = os.path.abspath("public/data")
SHP_PATH = os.path.join(WORK_DIR, "ne_10m_admin_1_states_provinces.shp")
OUT_PATH = os.path.join(WORK_DIR, "admin1_ne10m.geojson")

print("=== Loading NE10m shapefile ===")
gdf = gpd.read_file(SHP_PATH)
print(f"Loaded: {len(gdf):,} regions | CRS: {gdf.crs}")
print(f"Valid: {gdf.geometry.is_valid.sum()} | Empty: {gdf.geometry.is_empty.sum()} | NA: {gdf.geometry.isna().sum()}")

# Fix invalid
bad = (~gdf.geometry.is_valid & ~gdf.geometry.is_empty & ~gdf.geometry.isna()).sum()
if bad:
    print(f"Fixing {bad} invalid geometries...")
    gdf["geometry"] = gdf.geometry.apply(lambda g: g if g.is_valid else g.buffer(0))
    print(f"After fix: {gdf.geometry.is_valid.sum()} valid")

gdf = gdf.to_crs("EPSG:4326")

print(f"\nCountries: {gdf['iso_a2'].nunique()} | Regions: {len(gdf)}")
cc = gdf.groupby("iso_a2").size().sort_values(ascending=False)
print(f"Top 20 countries by region count:")
for c, n in cc.head(20).items():
    print(f"  {c}: {n}")

gdf.to_file(OUT_PATH, driver="GeoJSON")
size_mb = os.path.getsize(OUT_PATH) // 1024 // 1024
print(f"\nSaved: {OUT_PATH} ({size_mb} MB)")
print("DONE")
