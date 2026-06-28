"""
dense_grid_v2.py — Generate 5-6M population-proportional grid cells
Optimized: adaptive step, batch processing, streaming output
Key fix from v1: SIGKILL due to too many iterations on Russia/Canada etc.
Solution: cap max iterations, use coarser base grid + refinement
"""
import json, math, time, os, sys
from shapely.geometry import shape, box, Polygon, MultiPolygon
from shapely.geometry import mapping

COUNTRIES_GEOJSON = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/countries.geojson"
OUTPUT_PATH = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid.geojson"

# Country populations (millions)
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

TOTAL_POP = 8100.0
TARGET_CELLS = 5500000
COEF = TARGET_CELLS / TOTAL_POP  # ~679 per million pop

print(f"=== Dense Grid v2 ===", flush=True)
print(f"Target: {TARGET_CELLS:,} | Coef: {COEF:.1f}/M pop", flush=True)

with open(COUNTRIES_GEOJSON, "r", encoding="utf-8") as f:
    fc = json.load(f)
features = fc["features"]
print(f"Loaded {len(features)} countries", flush=True)


def get_pop(code):
    return COUNTRY_POP.get(code.upper(), 0.5)


def generate_cells(geom, n_wanted):
    """
    Generate ~n_wanted cells inside geom.
    Uses uniform step grid with intersection test.
    Optimized: pre-compute bounds, limit iterations.
    """
    if geom.is_empty:
        return []
    
    try:
        if not geom.is_valid:
            geom = geom.buffer(0)
    except:
        return []
    
    bounds = geom.bounds
    minx, miny, maxx, maxy = bounds
    
    bw = maxx - minx
    bh = maxy - miny
    if bw < 1e-9 or bh < 1e-9:
        return []
    
    bbox_area = bw * bh
    
    # Step size: sqrt(bbox_area / n_wanted) * oversample(0.85)
    # This gives us ~n_wanted cells after clipping
    raw_step = math.sqrt(bbox_area / max(n_wanted, 1)) * 0.85
    # Clamp: min 0.003° (~300m), max 3°
    step = max(0.003, min(3.0, raw_step))
    
    nx = max(1, int(bw / step) + 1)
    ny = max(1, int(bh / step) + 1)
    
    # Hard cap on total iterations to prevent SIGKILL
    MAX_ITER = 500000
    total_iter = nx * ny
    
    if total_iter > MAX_ITER:
        # Need coarser step — scale up
        scale = math.sqrt(total_iter / MAX_ITER)
        step *= scale
        nx = max(1, int(bw / step) + 1)
        ny = max(1, int(bh / step) + 1)
    
    results = []
    count = 0
    
    for i in range(nx):
        cx = minx + i * step
        x2 = min(cx + step, maxx)
        for j in range(ny):
            cy = miny + j * step
            y2 = min(cy + step, maxy)
            
            cell = box(cx, cy, x2, y2)
            try:
                inter = cell.intersection(geom)
                if not inter.is_empty:
                    ca = cell.area
                    if ca > 0 and inter.area / ca > 0.01:
                        results.append(inter)
                        count += 1
            except:
                pass
    
    return results


# ── Main generation loop ──
all_cells = []
country_stats = {}
start = time.time()
total_features = len(features)

for idx, feat in enumerate(features):
    code = feat["properties"].get("ISO3166-1-Alpha-2", "?")
    pop = get_pop(code)
    n_wanted = max(3, int(round(pop * COEF)))
    
    try:
        geom = shape(feat["geometry"])
        cells = generate_cells(geom, n_wanted)
        
        ncells = len(cells)
        pop_per_cell = round(pop / max(ncells, 1), 6)
        
        for cell in cells:
            all_cells.append({
                "type": "Feature",
                "geometry": mapping(cell),
                "properties": {
                    "region_id": f"{code}_{idx}",
                    "country": code,
                    "pop": pop_per_cell,
                }
            })
        
        country_stats[code] = ncells
        
    except Exception as e:
        print(f"ERR {code}: {e}", flush=True)
    
    # Progress every 30 countries
    if (idx + 1) % 30 == 0 or idx == total_features - 1:
        elapsed = time.time() - start
        print(f"[{idx+1}/{total_features}] cells={len(all_cells):,} last={code}:{country_stats.get(code,0)} t={elapsed:.1f}s", flush=True)

# ── Write output ──
total = len(all_cells)
print(f"\nTotal: {total:,} cells, {len(country_stats)} countries", flush=True)
print("Writing...", flush=True)

BATCH = 20000
with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    f.write('{"type":"FeatureCollection","features":[\n')
    for i in range(0, total, BATCH):
        batch = all_cells[i:i+BATCH]
        for j, item in enumerate(batch):
            is_last = (i + j >= total - 1)
            f.write(json.dumps(item) + ("" if is_last else ",") + "\n")
        f.flush()
    f.write(']}')

elapsed = time.time() - start
size_mb = os.path.getsize(OUTPUT_PATH) / 1e6
print(f"DONE: {total:,} cells | {size_mb:.1f} MB | {elapsed:.1f}s", flush=True)

top15 = sorted(country_stats.items(), key=lambda x: -x[1])[:15]
print("\nTop 15:")
for c, n in top15:
    print(f"  {c}: {n:,}")
