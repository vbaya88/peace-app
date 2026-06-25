"""
fast_grid.py v4 — Population-adaptive grid generator
Adaptive subdivision: divides each country's bbox into NxN grid,
intersects with country polygon to get exact cell count per population.
"""
import json, math, time
from shapely.geometry import shape, box
from shapely.ops import unary_union
from shapely.geometry import mapping
import numpy as np

COUNTRIES_GEOJSON = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/countries.geojson"
OUTPUT_PATH = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid.geojson"

# Country populations (millions) — top 50 + rest
COUNTRY_POP = {
    "CN": 1409.8, "IN": 1428.6, "US": 336.0, "ID": 275.5, "PK": 240.5,
    "BR": 216.4, "NG": 223.8, "BD": 172.0, "RU": 144.4, "MX": 130.9,
    "JP": 124.5, "ET": 123.4, "PH": 113.9, "EG": 107.0, "VN": 98.2,
    "TR": 85.3, "IR": 87.9, "DE": 83.2, "TH": 71.7, "TZ": 63.3,
    "GB": 67.3, "FR": 64.6, "ZA": 59.3, "IT": 59.6, "KE": 54.0,
    "MM": 54.1, "CO": 51.9, "KR": 51.7, "ES": 47.3, "AR": 45.8,
    "SD": 46.8, "DZ": 44.2, "UA": 43.5, "IQ": 43.5, "AF": 41.1,
    "PL": 38.3, "CA": 40.1, "MA": 37.5, "SA": 35.3, "NP": 30.0,
    "PE": 33.4, "UG": 47.3, "AO": 34.5, "MY": 33.0, "GH": 31.7,
    "MZ": 32.8, "YE": 33.7, "NA": 25.8, "VE": 28.4, "CM": 27.9,
    "CI": 27.5, "KP": 26.0, "SY": 21.3, "ZW": 15.4, "ZW": 15.4,
    "BE": 11.6, "SE": 10.4, "PT": 10.3, "BY": 9.5, "CZ": 10.5,
    "GR": 10.4, "CU": 11.3, "BO": 11.8, "SO": 18.1, "AF": 41.1,
    "BF": 21.5, "ML": 21.9, "RS": 7.1, "JO": 10.9, "HT": 11.4,
    "TJ": 9.5, "AZ": 10.1, "BI": 12.3, "RW": 13.3, "SS": 11.4,
    "TD": 17.4, "GW": 2.1, "SL": 8.7, "LR": 5.3, "TJ": 9.5,
    "KG": 6.5, "TM": 6.1, "GE": 3.7, "AM": 3.0, "MN": 3.3,
    "BT": 0.78, "LK": 21.9, "CW": 0.19, "BS": 0.41, "GY": 0.79,
    "FJ": 0.88, "SB": 0.71, "VU": 0.32, "WS": 0.20, "KI": 0.12,
    "TO": 0.10, "PW": 0.02, "FM": 0.11, "MV": 0.52, "BN": 0.45,
    "IS": 0.38, "NR": 0.01, "AD": 0.08, "MC": 0.04, "SM": 0.03,
    "KY": 0.07, "DM": 0.07, "AG": 0.10, "VC": 0.10, "GD": 0.13,
    "BB": 0.29, "LC": 0.18, "MT": 0.52, "MT": 0.52,
}

TOTAL_POP = 8100.0  # approximate world population in millions
TARGET_CELLS = 500000
COEF = TARGET_CELLS / TOTAL_POP

print("Loading countries...")
with open(COUNTRIES_GEOJSON, "r", encoding="utf-8") as f:
    fc = json.load(f)

features = fc["features"]
print(f"Loaded {len(features)} countries")

def get_pop(code):
    return COUNTRY_POP.get(code.upper(), 0.5)

def subdivide_country(geom, n_wanted):
    """Adaptive grid subdivision into ~n_wanted cells."""
    min_cells = 2
    n_wanted = max(min_cells, n_wanted)
    
    bbox = geom.bounds
    minx, miny, maxx, maxy = bbox
    area = geom.area
    
    if area < 1e-8:
        return []
    
    # Start with sqrt(n) grid
    n_sqrt = max(1, int(math.sqrt(n_wanted)))
    
    dx = (maxx - minx) / n_sqrt
    dy = (maxy - miny) / n_sqrt
    
    results = []
    for i in range(n_sqrt):
        for j in range(n_sqrt):
            cell = box(minx + i*dx, miny + j*dy, minx + (i+1)*dx, miny + (j+1)*dy)
            intersection = cell.intersection(geom)
            
            if intersection.is_empty:
                continue
            
            inter_area = intersection.area
            cell_area = cell.area
            
            # Keep if >1% intersection
            if inter_area / cell_area > 0.01:
                results.append(intersection)
    
    return results

# Process
BATCH = 10000
all_cells = []
country_stats = {}

start = time.time()
for idx, feat in enumerate(features):
    code = feat["properties"].get("ISO3166-1-Alpha-2", "?")
    pop = get_pop(code)
    n_cells = max(3, int(round(pop * COEF)))
    
    try:
        geom = shape(feat["geometry"])
        if not geom.is_valid:
            geom = geom.buffer(0)
        cells = subdivide_country(geom, n_cells)
        
        for cell in cells:
            props = {"region_id": f"{code}_{idx}", "country": code, "pop": pop}
            all_cells.append({
                "type": "Feature",
                "geometry": mapping(cell),
                "properties": props
            })
        
        country_stats[code] = len(cells)
        
        if (idx + 1) % 50 == 0:
            elapsed = time.time() - start
            print(f"[{idx+1}/{len(features)}] {len(all_cells):,} cells, {elapsed:.1f}s")
    
    except Exception as e:
        print(f"Error {code}: {e}")

print(f"\nTotal: {len(all_cells):,} cells from {len(country_stats)} countries")

# Write streaming
print(f"Writing to {OUTPUT_PATH}...")
BATCH_SIZE = 10000
with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    f.write('{"type":"FeatureCollection","features":[\n')
    for i in range(0, len(all_cells), BATCH_SIZE):
        batch = all_cells[i:i+BATCH_SIZE]
        for j, cell in enumerate(batch):
            comma = "," if (i + j) < len(all_cells) - 1 else ""
            f.write(json.dumps(cell) + comma + "\n")
        f.flush()
    f.write(']}')

elapsed = time.time() - start
size_mb = __import__("os").path.getsize(OUTPUT_PATH) / 1e6
print(f"Done! Cells: {len(all_cells):,} Size: {size_mb:.1f} MB Time: {elapsed:.1f}s")

top10 = sorted(country_stats.items(), key=lambda x: -x[1])[:10]
print("Top 10 countries:")
for c, n in top10:
    print(f"  {c} = {n:,}")
