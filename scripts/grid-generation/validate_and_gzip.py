import json, os

p = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid.geojson"
print(f"File size: {os.path.getsize(p)/1e6:.1f} MB")

# Validate JSON
try:
    d = json.load(open(p, "r", encoding="utf-8"))
    print(f"✅ VALID JSON: {len(d['features']):,} cells")
except Exception as e:
    print(f"❌ INVALID JSON: {e}")
    exit(1)

# Gzip it
import gzip
gz = p + ".gz"
with open(p, "rb") as f_in:
    with gzip.open(gz, "wb", compresslevel=9) as f_out:
        f_out.writelines(f_in)
print(f"Gzipped: {os.path.getsize(gz)/1e6:.1f} MB ({os.path.getsize(gz)/os.path.getsize(p)*100:.1f}% of raw)")
