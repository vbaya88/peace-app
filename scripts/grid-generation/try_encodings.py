import os, json
p = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid_182k.geojson"
# Read as binary to check BOM
with open(p, "rb") as f:
    raw = f.read(4)
    print(f"First 4 bytes: {raw.hex()}")
    print(f"BOM UTF-16LE: {b'\\xff\\xfe'.hex()}")
    
# Try different encodings
for enc in ["utf-16-le", "utf-16", "utf-8-sig", "ascii"]:
    try:
        with open(p, "r", encoding=enc) as f:
            d = json.load(f)
        print(f"SUCCESS with {enc}: {len(d['features'])} cells")
        break
    except Exception as e:
        print(f"  {enc}: {type(e).__name__}")
