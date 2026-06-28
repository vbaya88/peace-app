"""
dense_grid.py — Generate 5-6M population-proportional grid cells
Same approach as fast_grid.py v4 but with TARGET=5,500,000 (~28x denser)

Key change: step-based grid instead of sqrt(n) subdivision
For 5M+ cells we need fine-grained per-country grid generation
Uses the same countries.geojson + population weighting
Output overwrites population_grid.geojson
"""
import json, math, time, os, sys
from shapely.geometry import shape, box
from shapely.ops import unary_union
from shapely.geometry import mapping

COUNTRIES_GEOJSON = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/countries.geojson"
OUTPUT_PATH = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid.geojson"

# Country populations (millions) — same as fast_grid.py v4
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
    "CI": 27.5, "KP": 26.0, "SY": 21.3, "ZW": 15.4, "BE": 11.6,
    "SE": 10.4, "PT": 10.3, "BY": 9.5, "CZ": 10.5, "GR": 10.4,
    "CU": 11.3, "BO": 11.8, "SO": 18.1, "BF": 21.5, "ML": 21.9,
    "RS": 7.1, "JO": 10.9, "HT": 11.4, "TJ": 9.5, "AZ": 10.1,
    "BI": 12.3, "RW": 13.3, "SS": 11.4, "TD": 17.4, "GW": 2.1,
    "SL": 8.7, "LR": 5.3, "KG": 6.5, "TM": 6.1, "GE": 3.7,
    "AM": 3.0, "MN": 3.3, "BT": 0.78, "LK": 21.9, "CW": 0.19,
    "BS": 0.41, "GY": 0.79, "FJ": 0.88, "SB": 0.71, "VU": 0.32,
    "WS": 0.20, "KI": 0.12, "TO": 0.10, "PW": 0.02, "FM": 0.11,
    "MV": 0.52, "BN": 0.45, "IS": 0.38, "NR": 0.01, "AD": 0.08,
    "MC": 0.04, "SM": 0.03, "KY": 0.07, "DM": 0.07, "AG": 0.10,
    "VC": 0.10, "GD": 0.13, "BB": 0.29, "LC": 0.18, "MT": 0.52,
}

TOTAL_POP = 8100.0  # world pop in millions
TARGET_CELLS = 5500000  # 5.5M target (was 500K → 11x more)
COEF = TARGET_CELLS / TOTAL_POP  # ~679 cells per million people

print(f"=== Dense Grid Generator ===")
print(f"Target: {TARGET_CELLS:,} cells | Coef: {COEF:.1f} cells/million pop")

with open(COUNTRIES_GEOJSON, "r", encoding="utf-8") as f:
    fc = json.load(f)
features = fc["features"]
print(f"Loaded {len(features)} countries")


def get_pop(code):
    return COUNTRY_POP.get(code.upper(), 0.5)


def generate_dense_cells(geom, n_wanted):
    """
    Generate approximately n_wanted cells inside geom using step-based grid.
    For large n_wanted (>1000), use fine step; for small, use coarse.
    Returns list of Shapely polygons.
    """
    if geom.is_empty or not geom.is_valid:
        return []

    min_cells = max(2, n_wanted)
    bbox = geom.bounds
    minx, miny, maxx, maxy = bbox
    
    # Calculate step size from desired cell count and area
    bbox_area = (maxx - minx) * (maxy - miny)
    if bbox_area < 1e-10:
        return []
    
    # For N cells in a rectangular bbox: step ≈ sqrt(bbox_area / N)
    # But we want slightly more since many will be clipped
    target_step = math.sqrt(bbox_area / min_cells) * 0.9  # 0.9 = oversample factor
    
    # Clamp step to reasonable range: 0.001° (~100m) to 2° (~200km)
    step = max(0.002, min(2.0, target_step))
    
    results = []
    
    nx = int((maxx - minx) / step) + 1
    ny = int((maxy - miny) / step) + 1
    
    # Cap iterations for very large bboxes (e.g., Russia at fine step)
    max_iter = min_cells * 4  # don't iterate more than 4x what we need
    iter_count = 0
    
    for i in range(nx):
        if iter_count >= max_iter:
            break
        cx = minx + i * step
        for j in range(ny):
            if iter_count >= max_iter:
                break
            cy = miny + j * step
            
            cell_xmin = cx
            cell_ymin = cy
            cell_xmax = min(cx + step, maxx)
            cell_ymax = min(cy + step, maxy)
            
            cell = box(cell_xmin, cell_ymin, cell_xmax, cell_ymax)
            
            try:
                intersection = cell.intersection(geom)
                if not intersection.is_empty:
                    inter_area = intersection.area
                    cell_a = cell.area
                    if cell_a > 0 and inter_area / cell_a > 0.02:  # >2% overlap
                        results.append(intersection)
            except Exception:
                pass
            
            iter_count += 1
    
    return results


# Process all countries
all_cells = []
country_stats = {}
start = time.time()

for idx, feat in enumerate(features):
    code = feat["properties"].get("ISO3166-1-Alpha-2", "?")
    pop = get_pop(code)
    n_wanted = max(3, int(round(pop * COEF)))
    
    try:
        geom = shape(feat["geometry"])
        if not geom.is_valid:
            geom = geom.buffer(0)
        
        cells = generate_dense_cells(geom, n_wanted)
        
        for ci, cell in enumerate(cells):
            props = {
                "region_id": f"{code}_{idx}",
                "country": code,
                "pop": round(pop / max(len(cells), 1), 4),
            }
            all_cells.append({
                "type": "Feature",
                "geometry": mapping(cell),
                "properties": props
            })
        
        country_stats[code] = len(cells)
        
        if (idx + 1) % 20 == 0 or idx == len(features) - 1:
            elapsed = time.time() - start
            print(f"[{idx+1}/{len(features)}] {len(all_cells):,} cells | last={code}:{len(cells)} | {elapsed:.1f}s")
    
    except Exception as e:
        print(f"Error {code}: {e}")

print(f"\n=== RESULT ===")
print(f"Total cells: {len(all_cells):,}")
print(f"Countries: {len(country_stats)}")

# Write output (streaming for memory efficiency)
print(f"Writing to {OUTPUT_PATH}...")
BATCH_SIZE = 20000
with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    f.write('{"type":"FeatureCollection","features":[\n')
    total = len(all_cells)
    for i in range(0, total, BATCH_SIZE):
        batch = all_cells[i:i+BATCH_SIZE]
        for j, cell in enumerate(batch):
            is_last = (i + j == total - 1)
            f.write(json.dumps(cell) + ("" if is_last else ",") + "\n")
        f.flush()
    f.write(']}')

elapsed = time.time() - start
size_mb = os.path.getsize(OUTPUT_PATH) / 1e6
print(f"Done! Cells: {len(all_cells):,} | Size: {size_mb:.1f} MB | Time: {elapsed:.1f}s")

top15 = sorted(country_stats.items(), key=lambda x: -x[1])[:15]
print("\nTop 15:")
for c, n in top15:
    pct = n / len(all_cells) * 100 if all_cells else 0
    print(f"  {c}: {n:,} ({pct:.1f}%)")
