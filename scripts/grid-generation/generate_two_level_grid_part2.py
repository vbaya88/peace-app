"""
Part 2 of generate_two_level_grid.py
Cell generation: place cells within polygons using population-weighted sampling
"""

import json, sys, time
sys.stdout.reconfigure(encoding='utf-8')
import numpy as np
import geopandas as gpd
from shapely.geometry import Point, box, Polygon, MultiPolygon
from shapely.ops import unary_union
from collections import defaultdict
import warnings
warnings.filterwarnings("ignore")

print("\n[5/6] Generating grid cells within polygons...")
t0 = time.time()

# ── Load data (same as Part 1) ─────────────────────────────────────────────
ADMIN1_PATH = "public/data/admin1_web.geojson"
GRID_PATH   = "public/data/population_grid.geojson"
COUNTRIES_PATH = "public/data/countries.geojson"

admin1_gdf = gpd.read_file(ADMIN1_PATH).to_crs("EPSG:4326")
grid_gdf   = gpd.read_file(GRID_PATH).to_crs("EPSG:4326")
countries_gdf = gpd.read_file(COUNTRIES_PATH).to_crs("EPSG:4326")

# Spatial join
joined = gpd.sjoin(
    grid_gdf,
    admin1_gdf[["geometry", "iso_a2", "iso_3166_2", "name_en", "type_en", "admin"]],
    how="left", predicate="within"
)

# Region pops
region_pop = (
    joined.dropna(subset=["iso_3166_2"])
    .groupby(["iso_a2", "iso_3166_2"])["pop"].sum().reset_index()
)
region_info = (
    joined.dropna(subset=["iso_3166_2"])
    [["iso_a2", "iso_3166_2", "name_en", "type_en", "admin"]].drop_duplicates("iso_3166_2")
)
region_pop = region_pop.merge(region_info, on=["iso_a2", "iso_3166_2"], how="left")

country_pop = (
    joined.dropna(subset=["iso_a2"])
    .groupby("iso_a2")["pop"].sum().reset_index()
)
country_region_count = region_pop.groupby("iso_a2").size().reset_index(name="n_regions")
country_pop = country_pop.merge(country_region_count, on="iso_a2", how="left")

total_pop = country_pop["pop"].sum()
TARGET_TOTAL = 5_000_000
L1_RATIO = 0.02
total_l1_budget = int(TARGET_TOTAL * L1_RATIO)
total_l2_budget = TARGET_TOTAL - total_l1_budget

country_pop["l1_cells"] = (
    (country_pop["pop"] / total_pop) * total_l1_budget
).astype(int).clip(lower=4)
country_pop["l2_country_budget"] = (country_pop["pop"] / total_pop) * total_l2_budget

region_pop = region_pop.merge(
    country_pop[["iso_a2", "pop", "l2_country_budget", "n_regions"]],
    on="iso_a2", how="left"
)
region_pop["l2_cells"] = (
    (region_pop["pop"] / region_pop["pop"]) *  # proportion within country
    region_pop["l2_country_budget"]
).astype(int).clip(lower=5)

# Scale if needed
total_l2 = region_pop["l2_cells"].sum()
if total_l2 > total_l2_budget * 0.98:
    scale = (total_l2_budget * 0.98) / total_l2
    region_pop["l2_cells"] = (region_pop["l2_cells"] * scale).astype(int).clip(lower=5)

print(f"  L1: {country_pop['l1_cells'].sum()}, L2: {region_pop['l2_cells'].sum()}")

# ── Build spatial index of admin1 polygons ──────────────────────────────────
# Create a dict: iso_3166_2 → polygon geometry
admin1_index = {}
for _, row in admin1_gdf.iterrows():
    code = row["iso_3166_2"]
    admin1_index[code] = row["geometry"]

# Also index countries
country_index = {}
for _, row in countries_gdf.iterrows():
    code = row.get("iso_a2", row.get("ADM0_A2"))
    if code:
        country_index[code] = row["geometry"]

# ── Cell generation helpers ─────────────────────────────────────────────────

def generate_grid_in_polygon(polygon, n_cells, step, random_seed=42):
    """
    Generate ~n_cells points inside a polygon using a regular grid,
    then randomly sample to reach exactly n_cells.
    Returns list of (lng, lat) tuples.
    """
    if polygon is None or polygon.is_empty:
        return []
    
    # Get bounding box
    minx, miny, maxx, maxy = polygon.bounds
    
    # Generate candidate points on a regular grid
    lngs = np.arange(minx, maxx, step)
    lats = np.arange(miny, maxy, step)
    
    candidates = []
    for lng in lngs:
        for lat in lats:
            pt = Point(lng, lat)
            if polygon.contains(pt):
                candidates.append((lng, lat))
    
    if len(candidates) == 0:
        # Fallback: use centroid and random offset
        cx, cy = polygon.centroid.x, polygon.centroid.y
        rng = np.random.default_rng(random_seed)
        for _ in range(n_cells):
            angle = rng.uniform(0, 2*np.pi)
            r = rng.uniform(0, min(maxx-minx, maxy-miny)/2)
            lng = cx + r * np.cos(angle)
            lat = cy + r * np.sin(angle)
            pt = Point(lng, lat)
            if polygon.contains(pt):
                candidates.append((lng, lat))
    
    if len(candidates) == 0:
        return []
    
    if len(candidates) <= n_cells:
        return candidates
    
    # Randomly sample to reach n_cells
    rng = np.random.default_rng(random_seed)
    indices = rng.choice(len(candidates), size=min(n_cells, len(candidates)), replace=False)
    return [candidates[i] for i in indices]


def get_polygon_area_km2(polygon):
    """Approximate area in km² using WGS84 → meters conversion."""
    if polygon is None or polygon.is_empty:
        return 0
    # Reproject to equal-area (meters) for accurate area
    import pyproj
    geod = pyproj.Geod(ellps='WGS84')
    if polygon.geom_type == 'Polygon':
        coords = list(polygon.exterior.coords)
        lons, lats = zip(*coords)
        area_m2 = abs(geod.polygon_area_perimeter(lons, lats)[0])
        return area_m2 / 1e6  # km²
    elif polygon.geom_type == 'MultiPolygon':
        total = 0
        for poly in polygon.geoms:
            coords = list(poly.exterior.coords)
            lons, lats = zip(*coords)
            total += abs(geod.polygon_area_perimeter(lons, lats)[0])
        return total / 1e6
    return 0


# ── Generate Level 1 cells (country-level coarse) ─────────────────────────────
print("\n  Generating L1 (country-level) cells...")
t1 = time.time()
all_features = []
cell_counter = 0
l1_total = 0

GRID_STEP_L1 = 0.25
GRID_STEP_L2 = 0.05

for _, crow in country_pop.iterrows():
    iso2 = crow["iso_a2"]
    n_cells = crow["l1_cells"]
    
    polygon = country_index.get(iso2)
    if polygon is None or n_cells < 4:
        continue
    
    cells = generate_grid_in_polygon(polygon, n_cells, step=GRID_STEP_L1, random_seed=hash(iso2) % 2**32)
    
    for lng, lat in cells:
        all_features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(lng), float(lat)]},
            "properties": {
                "region_id": f"{iso2}_L1",
                "region_name": f"{iso2} (country level)",
                "country": iso2,
                "level": 1,
                "pop": float(crow["pop"] / n_cells * 1000) if n_cells > 0 else 0,  # approx people per cell
                "cell_index": cell_counter
            }
        })
        cell_counter += 1
    l1_total += len(cells)

print(f"    L1: {l1_total} cells in {time.time()-t1:.1f}s")

# ── Generate Level 2 cells (region-level fine) ────────────────────────────────
print("\n  Generating L2 (region-level) cells...")
t1 = time.time()
l2_total = 0
l2_by_country = defaultdict(int)

for _, rrow in region_pop.iterrows():
    iso2 = rrow["iso_a2"]
    region_code = rrow["iso_3166_2"]
    n_cells = rrow["l2_cells"]
    region_name = rrow.get("name_en", region_code)
    country_pop_val = rrow.get("pop", 1)
    
    polygon = admin1_index.get(region_code)
    if polygon is None or n_cells < 5:
        continue
    
    # Choose step based on polygon area
    area_km2 = get_polygon_area_km2(polygon)
    
    # Dynamic step: try to generate ~4-10x the target, then sample down
    # Large regions: use coarser step; small: finer step
    if area_km2 > 500000:   # > 500k km² (e.g., states, provinces)
        step = 0.1
    elif area_km2 > 100000: # 100-500k km²
        step = 0.05
    elif area_km2 > 10000:  # 10-100k km²
        step = 0.02
    elif area_km2 > 1000:   # 1-10k km²
        step = 0.01
    else:                   # < 1k km²
        step = 0.005
    
    # Generate with oversampling factor
    oversample = 4
    candidates_needed = n_cells * oversample
    
    cells = generate_grid_in_polygon(
        polygon, 
        n_cells * oversample, 
        step=step, 
        random_seed=hash(region_code) % 2**32
    )
    
    # If we got too few, try smaller step
    if len(cells) < n_cells * 0.5:
        cells = generate_grid_in_polygon(
            polygon, n_cells * 8,
            step=step * 0.5,
            random_seed=hash(region_code) % 2**32
        )
    
    # Sample down to n_cells
    if len(cells) > n_cells:
        rng = np.random.default_rng(hash(region_code) % 2**32)
        indices = rng.choice(len(cells), size=n_cells, replace=False)
        cells = [cells[i] for i in indices]
    
    for lng, lat in cells:
        all_features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(lng), float(lat)]},
            "properties": {
                "region_id": region_code,
                "region_name": region_name,
                "country": iso2,
                "level": 2,
                "pop": float(country_pop_val / n_cells * 1000) if n_cells > 0 else 0,
                "cell_index": cell_counter
            }
        })
        cell_counter += 1
    
    l2_total += len(cells)
    l2_by_country[iso2] += len(cells)
    
    if l2_total % 100000 == 0 and l2_total > 0:
        print(f"    L2 progress: {l2_total:,} cells generated...")

print(f"    L2: {l2_total:,} cells in {time.time()-t1:.1f}s")
print(f"    L2 total: {l2_total:,}")
print(f"    GRAND TOTAL: {len(all_features):,}")

# Show L2 top countries
l2_sorted = sorted(l2_by_country.items(), key=lambda x: -x[1])[:10]
print("\n  Top 10 countries by L2 cells:")
for code, cnt in l2_sorted:
    print(f"    {code}: {cnt:,} L2 cells")

# ── Step 6: Save output ─────────────────────────────────────────────────────
print(f"\n[6/6] Saving to {OUTPUT_PATH}...")
t1 = time.time()

output = {
    "type": "FeatureCollection",
    "name": "Two-Level Population Grid v2",
    "description": f"~5M cells: Level 1 (country-level, coarse) + Level 2 (region-level, fine). Population from GPW.",
    "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
    "features": all_features
}

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False)

size_mb = len(json.dumps(output, ensure_ascii=False).encode("utf-8")) / 1e6
print(f"  Saved! File size: ~{size_mb:.1f} MB (JSON string estimate)")
print(f"  Total cells: {len(all_features):,}")
print(f"  Total time: {time.time()-start_total:.1f}s")
