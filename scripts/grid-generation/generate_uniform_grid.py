"""
World Flags Grid Generator v4 — Polygon Squares
Fixes:
- Outputs POLYGON squares (not Points) so Mapbox fill layer renders them correctly
- NAME_TO_CODE for -99 ISO features (France, Norway, Kosovo, etc.)
- Population-proportional cell count per country
"""
import json, gzip, time, os, math
from shapely.geometry import shape

COUNTRIES_PATH = r"C:\Users\User\.qclaw-oversea\workspace-agent-universe-of-kindness\peace-app\public\data\countries.geojson"
OUTPUT_PATH = r"C:\Users\User\.qclaw-oversea\workspace-agent-universe-of-kindness\peace-app\public\data\population_grid.geojson"
OUTPUT_GZ = OUTPUT_PATH + ".gz"
TARGET_TOTAL = 10_000_000
MIN_CELLS = 5000
MAX_CELLS = 200_000

POP = {
    "CN":1425.9,"IN":1428.6,"US":336.0,"ID":277.4,"PK":240.5,"BR":216.4,"NG":223.8,
    "BD":172.1,"RU":144.4,"MX":131.6,"JP":124.5,"ET":123.5,"PH":114.1,"EG":107.0,
    "VN":98.2,"TR":85.3,"IR":87.9,"DE":83.8,"TH":71.0,"TZ":63.3,"GB":67.9,"FR":64.8,
    "ZA":59.4,"IT":59.3,"KE":54.0,"MM":54.1,"CO":52.1,"KR":51.7,"ES":47.5,"AR":45.8,
    "SD":46.8,"DZ":44.4,"UA":43.5,"IQ":43.5,"AF":41.3,"PL":38.3,"MA":37.5,"SA":35.3,
    "NE":26.1,"AU":26.0,"PE":33.4,"UG":47.3,"AO":34.5,"MY":33.1,"GH":31.7,"MZ":32.8,
    "YE":33.7,"VE":28.4,"CM":27.9,"CI":27.5,"KP":26.0,"SY":21.3,"ZW":15.3,"BE":11.7,
    "SE":10.6,"PT":10.4,"BY":9.5,"CZ":10.5,"GR":10.4,"CU":11.3,"BO":11.8,"SO":18.1,
    "BF":21.5,"ML":21.9,"RS":7.1,"JO":10.9,"HT":11.4,"TJ":9.5,"AZ":10.1,"BI":12.3,
    "RW":13.3,"SS":11.4,"TD":17.4,"GW":2.1,"SL":8.7,"LR":5.3,"KG":6.5,"TM":6.1,
    "GE":3.7,"AM":3.0,"MN":3.3,"BT":0.78,"LK":21.9,"DJ":1.1,"BW":2.4,"CY":1.2,
    "FJ":0.88,"GA":2.4,"GN":13.0,"KM":0.84,"LS":2.3,"LU":0.65,"MT":0.52,"MV":0.52,
    "BN":0.45,"IS":0.38,"NR":0.01,"AD":0.08,"MC":0.04,"SM":0.03,"BZ":0.41,"BB":0.29,
    "LC":0.18,"VC":0.10,"GD":0.13,"TT":1.4,"SR":0.62,"GY":0.79,"PY":6.9,"BS":0.41,
    "DM":0.07,"AG":0.10,"KN":0.05,"WS":0.20,"KI":0.12,"TO":0.10,"PW":0.02,"FM":0.11,
    "MH":0.06,"VU":0.32,"SB":0.71,"PG":9.9,"NC":2.7,"TV":0.01,"PA":4.3,"CR":5.2,
    "UY":3.5,"CL":19.6,"IE":5.1,"NZ":5.1,"XK":1.7,"HR":4.0,"BH":1.5,"KW":4.5,"QA":2.7,
    "OM":4.6,"LY":6.8,"CF":5.4,"CD":100.6,"CG":5.9,"RE":0.87,"MG":28.9,"MW":20.3,
    "MR":4.6,"BJ":13.4,"TG":8.7,"SN":17.3,"GM":2.5,"CV":0.59,"EH":0.59,"TN":11.8,
    "IL":9.3,"PS":5.0,"LB":5.9,"UZ":35.3,"LA":7.3,"KH":16.9,"TL":1.3,"TW":23.6,
    "HK":7.5,"MO":0.68,"GI":0.03,"AL":2.9,"MK":1.8,"BA":3.3,"ME":0.62,"SI":2.1,
    "SK":5.4,"HU":9.6,"RO":19.1,"BG":6.9,"MD":2.6,"EE":1.4,"LV":1.8,"LT":2.8,
    "NL":17.9,"CH":8.8,"AT":9.1,"NO":5.5,"FI":5.5,"DK":5.9,"GT":17.1,"HN":10.3,
    "SV":6.3,"NI":7.0,"EC":17.8,"MU":1.3,"SC":0.1,"ST":0.23,"SG":5.9,"KZ":19.0,
    "AE":9.9,"CA":38.0,"DO":11.0,"ER":3.6,"GQ":1.5,"JM":2.8,"KY":0.07,"NA":2.6,
    "NP":30.0,"SZ":1.2,"ZM":20.5,"CW":0.19,"SX":0.04,"PR":3.3,"GU":0.17,"MP":0.05,
    "AS":0.05,"BM":0.06,"GL":0.06,"FO":0.05,"JE":0.1,"GG":0.06,"IM":0.08,"AX":0.03,
    "TC":0.04,"VG":0.03,"VI":0.10,"PF":0.30,"PN":0.05,"CK":0.02,"NU":0.002,
}

NAME_TO_CODE = {
    "France": "FR",
    "Norway": "NO",
    "Kosovo": "XK",
    "Somaliland": "SO",
    "Northern Cyprus": "CY",
    "Cyprus No Mans Area": "CY",
    "Dhekelia Sovereign Base Area": "CY",
    "US Naval Base Guantanamo Bay": "CU",
    "Brazilian Island": "BR",
    "Siachen Glacier": "IN",
}

TOTAL_POP = sum(POP.values())
N_COUNTRIES = len(POP)

print(f"=== World Flags Grid Generator v4 (Polygon Squares) ===", flush=True)
print(f"Target: {TARGET_TOTAL:,} cells | {N_COUNTRIES} countries", flush=True)

with open(COUNTRIES_PATH, "r", encoding="utf-8") as f:
    fc = json.load(f)
features = fc["features"]
print(f"Loaded {len(features)} features from countries.geojson", flush=True)

# Build shapes dict
shapes = {}
for f in features:
    props = f.get("properties", {})
    geom = shape(f["geometry"])
    code = str(props.get("ISO3166-1-Alpha-2") or "").upper()
    name = props.get("name", "") or ""
    if code in ("-99", "-1", "None", ""):
        mapped = NAME_TO_CODE.get(name)
        if mapped:
            code = mapped
        else:
            continue
    if code not in ("-99", "-1", "None", ""):
        shapes[code] = geom

print(f"Loaded {len(shapes)} country shapes", flush=True)
for c in ["FR", "NO", "XK"]:
    print(f"  {'OK' if c in shapes else 'MISSING'} {c}", flush=True)

# Stream output as NDJSON first (memory efficient)
ndjson_path = OUTPUT_PATH + ".ndjson"
ndjson_out = open(ndjson_path, "w", encoding="utf-8")
cell_id = 0
total = 0
start = time.time()
last_report = 0

for feat in features:
    props = feat.get("properties", {})
    geom = shape(feat["geometry"])
    name = props.get("name", "") or ""

    # Resolve country code
    code = str(props.get("ISO3166-1-Alpha-2") or "").upper()
    if code in ("-99", "-1", "None", ""):
        mapped = NAME_TO_CODE.get(name)
        if mapped:
            code = mapped
        else:
            continue

    pop = POP.get(code, 1.0)
    share = pop / TOTAL_POP
    want = share * TARGET_TOTAL
    n_cells = max(MIN_CELLS, min(MAX_CELLS, int(want)))

    bounds = geom.bounds
    min_lng, min_lat, max_lng, max_lat = bounds
    width_lng = max_lng - min_lng
    height_lat = max_lat - min_lat
    
    if width_lng <= 0 or height_lat <= 0:
        continue
    
    # Calculate cell size to fit n_cells inside country bounds
    # Use sqrt to get roughly square cells: n_cols * n_rows ≈ n_cells
    aspect = width_lng / height_lat if height_lat > 0 else 1.0
    n_rows = max(1, round(math.sqrt(n_cells / aspect)))
    n_cols = max(1, round(n_cells / n_rows))
    
    step_lng = width_lng / n_cols
    step_lat = height_lat / n_rows
    
    for row in range(n_rows):
        for col in range(n_cols):
            x0 = min_lng + col * step_lng
            y0 = min_lat + row * step_lat
            x1 = x0 + step_lng
            y1 = y0 + step_lat
            
            # Only write cells whose center is inside country geometry
            cx = (x0 + x1) / 2
            cy = (y0 + y1) / 2
            
            from shapely.geometry import Point as Pt
            if geom.contains(Pt(cx, cy)):
                ndjson_out.write(json.dumps({
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]
                    },
                    "properties": {
                        "id": cell_id,
                        "cc": code,
                        "region_id": f"{code}_{cell_id}",
                    }
                }) + "\n")
                cell_id += 1
                total += 1

    elapsed = time.time() - start
    if elapsed - last_report >= 15:
        rate = total / elapsed if elapsed > 0 else 0
        print(f"  {code}: {total:,} cells ({rate:,.0f}/s)", flush=True)
        last_report = elapsed

ndjson_out.close()
elapsed = time.time() - start
print(f"\nGeneration done: {total:,} polygon cells in {elapsed:.0f}s", flush=True)

# Build final GeoJSON from NDJSON
print("Building GeoJSON...", flush=True)
features_out = []
with open(ndjson_path, encoding="utf-8") as f:
    for line in f:
        features_out.append(json.loads(line))

fc_out = {"type": "FeatureCollection", "features": features_out}
del features_out

print(f"Writing {len(fc_out['features']):,} features...", flush=True)
with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(fc_out, f)

size_mb = os.path.getsize(OUTPUT_PATH) / 1e6
print(f"GeoJSON: {size_mb:.1f} MB", flush=True)

# Gzip
print("Gzipping...", flush=True)
with open(OUTPUT_PATH, "rb") as f_in:
    with gzip.open(OUTPUT_GZ, "wb", compresslevel=6) as f_out:
        f_out.writelines(f_in)

size_gz = os.path.getsize(OUTPUT_GZ) / 1e6
print(f"Gzipped: {size_gz:.1f} MB", flush=True)

# Cleanup temp file
os.remove(ndjson_path)
print("DONE!", flush=True)
