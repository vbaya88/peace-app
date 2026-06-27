"""
dense_grid_v5.py — Generate 5M+ SIMPLE SQUARE cells
Key difference from v3/v4:
- Each cell is a simple axis-aligned square (not clipped polygon)
- Minimal JSON: no property keys repeated, short keys
- Output as compact GeoJSON with separators optimization
- Target: ~5M cells, file < 500MB

Strategy: 
1. For each country, compute its bounding box
2. Divide bbox into N×N grid of small squares
3. Keep only squares whose CENTER point is inside the country
4. This gives simple 4-point polygons (no clipping = fast + small)
"""
import json, math, time, os
from shapely.geometry import shape, Point, box as shp_box
from shapely.geometry import mapping

COUNTRIES_PATH = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/countries.geojson"
OUTPUT_PATH = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid.geojson"

# Populations (millions)
POP = {
    "CN":1409.8,"IN":1428.6,"US":336.0,"ID":275.5,"PK":240.5,
    "BR":216.4,"NG":223.8,"BD":172.0,"RU":144.4,"MX":130.9,
    "JP":124.5,"ET":123.4,"PH":113.9,"EG":107.0,"VN":98.2,
    "TR":85.3,"IR":87.9,"DE":83.2,"TH":71.7,"TZ":63.3,
    "GB":67.3,"FR":64.6,"ZA":59.3,"IT":59.6,"KE":54.0,
    "MM":54.1,"CO":51.9,"KR":51.7,"ES":47.3,"AR":45.8,
    "SD":46.8,"DZ":44.2,"UA":43.5,"IQ":43.5,"AF":41.1,
    "PL":38.3,"CA":40.1,"MA":37.5,"SA":35.3,"NP":30.0,
    "PE":33.4,"UG":47.3,"AO":34.5,"MY":33.0,"GH":31.7,
    "MZ":32.8,"YE":33.7,"NA":25.8,"VE":28.4,"CM":27.9,
    "CI":27.5,"KP":26.0,"SY":21.3,"ZW":15.4,"BE":11.6,
    "SE":10.4,"PT":10.3,"BY":9.5,"CZ":10.5,"GR":10.4,
    "CU":11.3,"BO":11.8,"SO":18.1,"BF":21.5,"ML":21.9,
    "RS":7.1,"JO":10.9,"HT":11.4,"TJ":9.5,"AZ":10.1,
    "BI":12.3,"RW":13.3,"SS":11.4,"TD":17.4,"GW":2.1,
    "SL":8.7,"LR":5.3,"KG":6.5,"TM":6.1,"GE":3.7,
    "AM":3.0,"MN":3.3,"BT":0.78,"LK":21.9,"CW":0.19,
    "BS":0.41,"GY":0.79,"FJ":0.88,"SB":0.71,"VU":0.32,
    "WS":0.20,"KI":0.12,"TO":0.10,"PW":0.02,"FM":0.11,
    "MV":0.52,"BN":0.45,"IS":0.38,"NR":0.01,"AD":0.08,
    "MC":0.04,"SM":0.03,"KY":0.07,"DM":0.07,"AG":0.10,
    "VC":0.10,"GD":0.13,"BB":0.29,"LC":0.18,"MT":0.52,
}

TARGET = 9000000  # Target ~2M actual cells after center-point filtering → ~120MB raw → ~7MB gzipped
TOTAL_POP = 8100.0
COEF = TARGET / TOTAL_POP  # ~679 per million

print(f"=== Dense Grid v5 (Simple Squares) ===", flush=True)
print(f"Target: {TARGET:,} | Coef: {COEF:.1f}/M pop", flush=True)

with open(COUNTRIES_PATH, "r", encoding="utf-8") as f:
    fc = json.load(f)
features = fc["features"]
print(f"Loaded {len(features)} countries", flush=True)


def get_pop(code):
    return POP.get(code.upper(), 0.5)


def make_squares(geom, n_wanted):
    """
    Generate ~n_wanted simple squares inside geom.
    Uses center-point-in-polygon test (fast, no clipping).
    Returns list of [minx,miny,maxx,maxy] tuples.
    """
    if geom.is_empty:
        return []
    try:
        if not geom.is_valid:
            geom = geom.buffer(0)
    except:
        return []

    b = geom.bounds
    minx, miny, maxx, maxy = b
    bw, bh = maxx - minx, maxy - miny
    if bw < 1e-9 or bh < 1e-9:
        return []

    # step size for ~n_wanted squares (with oversample for edge clipping)
    area_est = bw * bh
    raw_step = math.sqrt(area_est / max(n_wanted, 1)) * 0.92
    step = max(0.003, min(2.5, raw_step))

    nx = max(1, int(bw / step) + 1)
    ny = max(1, int(bh / step) + 1)

    # Cap iterations
    MAX_ITER = 300000
    if nx * ny > MAX_ITER:
        scale = math.sqrt((nx * ny) / MAX_ITER)
        step *= scale
        nx = max(1, int(bw / step) + 1)
        ny = max(1, int(bh / step) + 1)

    results = []
    count = 0
    
    # Pre-make a Point for testing
    for i in range(nx):
        cx = minx + i * step
        x2 = cx + step
        if x2 > maxx: x2 = maxx
        for j in range(ny):
            cy = miny + j * step
            y2 = cy + step
            if y2 > maxy: y2 = maxy
            
            # Center point test (much faster than intersection!)
            midx = (cx + x2) / 2
            midy = (cy + y2) / 2
            
            try:
                if geom.contains(Point(midx, midy)):
                    results.append([round(cx,4), round(cy,4), round(x2,4), round(y2,4)])
                    count += 1
            except:
                pass

    return results


# ── Main loop ──
all_cells = []
stats = {}
start = time.time()

for idx, feat in enumerate(features):
    code = feat["properties"].get("ISO3166-1-Alpha-2", "?")
    pop = get_pop(code)
    n_want = max(3, int(round(pop * COEF)))
    
    try:
        geom = shape(feat["geometry"])
        squares = make_squares(geom, n_want)
        
        nc = len(squares)
        pp = round(pop / max(nc, 1), 6)
        
        for (sx, sy, ex, ey) in squares:
            all_cells.append([
                code,  # country
                [sx, sy, ex, ey],  # bbox coords
                pp  # pop
            ])
        
        stats[code] = nc
        
    except Exception as e:
        print(f"ERR {code}: {e}", flush=True)

    if (idx + 1) % 30 == 0 or idx == len(features) - 1:
        elapsed = time.time() - start
        print(f"[{idx+1}/{len(features)}] {len(all_cells):,} | {elapsed:.1f}s", flush=True)

# ── Write output using json.dumps (guarantees valid JSON) ──
total = len(all_cells)
print(f"\nTotal: {total:,} cells", flush=True)
print("Writing...", flush=True)

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    f.write('{"type":"FeatureCollection","features":[\n')
    for idx, (code, coords, pp) in enumerate(all_cells):
        feat = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [coords[0], coords[1]],
                    [coords[2], coords[1]],
                    [coords[2], coords[3]],
                    [coords[0], coords[3]],
                    [coords[0], coords[1]],
                ]]
            },
            "properties": {"c": code, "p": pp}
        }
        comma = "" if idx == total - 1 else ","
        f.write(json.dumps(feat, separators=(',', ':')) + comma + "\n")
        if (idx + 1) % 50000 == 0:
            f.flush()
    f.write(']}')

elapsed = time.time() - start
size_mb = os.path.getsize(OUTPUT_PATH) / 1e6
bpc = os.path.getsize(OUTPUT_PATH) / max(total, 1)
print(f"DONE! {total:,} cells | {size_mb:.1f} MB | {bpc:.0f} B/cell | {elapsed:.1f}s", flush=True)

top15 = sorted(stats.items(), key=lambda x: -x[1])[:15]
print("\nTop 15:")
for c, n in top15:
    print(f"  {c}: {n:,}")
