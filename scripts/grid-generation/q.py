import os, json

p = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid.geojson"
print(f"Grid: {os.path.getsize(p)/1e6:.1f} MB" if os.path.exists(p) else "MISSING")

# Check if valid JSON
if os.path.exists(p):
    try:
        with open(p, "r", encoding="utf-8") as f:
            # Just check first 200 chars are valid JSON start
            start = f.read(200)
        print(f"Starts with: {start[:80]}")
        # Try full parse
        d = json.load(open(p, "r", encoding="utf-8"))
        print(f"VALID: {len(d['features']):,} cells")
    except Exception as e:
        print(f"INVALID: {str(e)[:100]}")
