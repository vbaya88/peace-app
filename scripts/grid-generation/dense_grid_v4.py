"""
dense_grid_v4.py — Generate dense grid with ROUNDED COORDINATES
- Subdivide existing 182K grid into smaller cells
- Round all coordinates to 5 decimal places (~1m precision) 
- This cuts JSON size significantly
- Target: ~5M cells, file < 500 MB
"""
import json, math, time, os

INPUT_PATH = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid_original.geojson"
OUTPUT_PATH = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid.geojson"

# 4x4 = 16x → 182K * 16 = 2.9M cells (good balance of density vs file size)
# 5x5 = 25x → 182K * 25 = 4.6M cells  
# 6x6 = 36x → 182K * 36 = 6.6M cells (too big?)
SUBDIVIDE = 5  # 5×5 = 25 → ~4.6M cells target
DECIMALS = 5   # round to 5 decimals (~1m precision)

print(f"=== Dense Grid v4 ===", flush=True)
print(f"Subdivision: {SUBDIVIDE}x{SUBDIVIDE} = {SUBDIVIDE*SUBDIVIDE} per cell", flush=True)
print(f"Coordinate precision: {DECIMALS} decimals", flush=True)

with open(INPUT_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

features = data["features"]
n_existing = len(features)
expected = n_existing * SUBDIVIDE * SUBDIVIDE
print(f"Input: {n_existing:,} cells", flush=True)
print(f"Expected output: {expected:,} cells", flush=True)

written = 0
start = time.time()

with open(OUTPUT_PATH, "w", encoding="utf-8") as out:
    out.write('{"type":"FeatureCollection","features":[\n')
    
    for fi, feat in enumerate(features):
        geom = feat.get("geometry")
        if not geom or geom.get("type") not in ("Polygon",):
            continue
        
        rings = geom.get("coordinates", [])[0]
        if not rings or len(rings) < 3:
            continue
        
        props = feat.get("properties", {})
        
        # Bbox from outer ring
        lons = [p[0] for p in rings]
        lats = [p[1] for p in rings]
        minx, maxx = round(min(lons), DECIMALS), round(max(lons), DECIMALS)
        miny, maxy = round(min(lats), DECIMALS), round(max(lats), DECIMALS)
        
        dx = round((maxx - minx) / SUBDIVIDE, DECIMALS)
        dy = round((maxy - miny) / SUBDIVIDE, DECIMALS)
        
        new_pop = round(props.get("pop", 0) / (SUBDIVIDE * SUBDIVIDE), 6)
        region_id = props.get("region_id", "?")
        country = props.get("country", "??")
        
        for i in range(SUBDIVIDE):
            cx = round(minx + i * dx, DECIMALS)
            cx2 = round(cx + dx, DECIMALS)
            if i == SUBDIVIDE - 1:
                cx2 = maxx  # ensure exact boundary match
            
            for j in range(SUBDIVIDE):
                cy = round(miny + j * dy, DECIMALS)
                cy2 = round(cy + dy, DECIMALS)
                if j == SUBDIVIDE - 1:
                    cy2 = maxy
                
                # Build polygon with rounded coords
                ring = [[cx, cy], [cx2, cy], [cx2, cy2], [cx, cy2], [cx, cy]]
                
                is_last = (fi == len(features) - 1 and i == SUBDIVIDE - 1 and j == SUBDIVIDE - 1)
                out.write(json.dumps({
                    "type": "Feature",
                    "geometry": {"type": "Polygon", "coordinates": [ring]},
                    "properties": {
                        "region_id": f"{region_id}_{i}_{j}",
                        "country": country,
                        "pop": new_pop,
                    }
                }, separators=(",", ":")) + ("" if is_last else ",") + "\n")
                written += 1
        
        if (fi + 1) % 20000 == 0 or fi == len(features) - 1:
            elapsed = time.time() - start
            print(f"[{fi+1}/{n_existing}] {written:,} cells ({elapsed:.1f}s)", flush=True)
    
    out.write(']}')

elapsed = time.time() - start
size_mb = os.path.getsize(OUTPUT_PATH) / 1e6
bytes_per = os.path.getsize(OUTPUT_PATH) / max(written, 1)
print(f"\nDONE! {written:,} cells | {size_mb:.1f} MB | {bytes_per:.0f} B/cell | {elapsed:.1f}s", flush=True)
