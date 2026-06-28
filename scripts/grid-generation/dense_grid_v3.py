"""
dense_grid_v3.py — Scale existing 182K grid to 5-6M by subdivision
Strategy: Load the WORKING population_grid.geojson (182K cells),
then subdivide each cell into N smaller cells.
This avoids the SIGKILL issue — no country-level geometry processing.
Each existing cell is split into a K×K grid of smaller cells.
Scale factor = 5,500,000 / 182,840 ≈ 30 → sqrt(30) ≈ 5.5 → use 5x or 6x per dimension
"""
import json, math, time, os

INPUT_PATH = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid.geojson"
OUTPUT_PATH = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid.geojson"

TARGET_CELLS = 5500000
SUBDIVIDE = 6  # Split each cell into 6×6 = 36 smaller cells (182K * 36 ≈ 6.5M)

print(f"=== Dense Grid v3 — Subdivision Approach ===", flush=True)
print(f"Input: {INPUT_PATH}", flush=True)
print(f"Subdivide each cell into {SUBDIVIDE}x{SUBDIVIDE} = {SUBDIVIDE*SUBDIVIDE} cells", flush=True)

# Load existing grid
print("Loading existing grid...", flush=True)
with open(INPUT_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

features = data["features"]
existing_count = len(features)
expected_count = existing_count * SUBDIVIDE * SUBDIVIDE
print(f"Existing cells: {existing_count:,}", flush=True)
print(f"Expected output: {expected_count:,}", flush=True)

# Process and write streaming
print("Subdividing & writing...", flush=True)
written = 0
BATCH = 20000
start = time.time()

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    f.write('{"type":"FeatureCollection","features":[\n')
    
    for fi, feat in enumerate(features):
        geom = feat.get("geometry")
        if not geom or geom.get("type") not in ("Polygon", "MultiPolygon"):
            continue
        
        coords = geom.get("coordinates", [])
        props = feat.get("properties", {})
        region_id = props.get("region_id", "unknown")
        country = props.get("country", "??")
        pop = props.get("pop", 0)
        
        # Get bounding box of this cell
        if geom["type"] == "Polygon":
            rings = coords[0] if coords else []
        elif geom["type"] == "MultiPolygon":
            rings = coords[0][0] if coords and coords[0] else []
        else:
            continue
        
        if not rings or len(rings) < 3:
            continue
        
        lons = [p[0] for p in rings]
        lats = [p[1] for p in rings]
        minx, maxx = min(lons), max(lons)
        miny, maxy = min(lats), max(lats)
        
        dx = (maxx - minx) / SUBDIVIDE
        dy = (maxy - miny) / SUBDIVIDE
        
        new_pop = pop / (SUBDIVIDE * SUBDIVIDE)
        
        # Create SUBDIVIDE x SUBDIVIDE grid within this cell's bbox
        for i in range(SUBDIVIDE):
            cx = minx + i * dx
            cx2 = min(cx + dx, maxx)
            for j in range(SUBDIVIDE):
                cy = miny + j * dy
                cy2 = min(cy + dy, maxy)
                
                new_feat = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [cx, cy], [cx2, cy], [cx2, cy2], [cx, cy2], [cx, cy]
                        ]]
                    },
                    "properties": {
                        "region_id": f"{region_id}_{i}_{j}",
                        "country": country,
                        "pop": round(new_pop, 6),
                    }
                }
                
                is_last = (fi == len(features) - 1 and i == SUBDIVIDE - 1 and j == SUBDIVIDE - 1)
                f.write(json.dumps(new_feat) + ("" if is_last else ",") + "\n")
                written += 1
        
        # Progress every 10000 original features
        if (fi + 1) % 10000 == 0 or fi == len(features) - 1:
            elapsed = time.time() - start
            print(f"[{fi+1}/{existing_count}] written={written:,} ({elapsed:.1f}s)", flush=True)
    
    f.write(']}')

elapsed = time.time() - start
size_mb = os.path.getsize(OUTPUT_PATH) / 1e6
print(f"\nDONE!", flush=True)
print(f"Cells: {written:,} | Size: {size_mb:.1f} MB | Time: {elapsed:.1f}s", flush=True)
