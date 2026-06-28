import json, gzip, os

p = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid.geojson"
print(f"File: {os.path.getsize(p)/1e6:.1f} MB")

# Validate
try:
    d = json.load(open(p, "r", encoding="utf-8"))
    print(f"VALID JSON: {len(d['features']):,} cells")
except json.JSONDecodeError as e:
    print(f"INVALID JSON: {e}")
    exit(1)

# Gzip it
gz = p + ".gz"
with open(p, "rb") as f_in:
    with gzip.open(gz, "wb", compresslevel=9) as f_out:
        f_out.writelines(f_in)
raw_sz = os.path.getsize(p)
gz_sz = os.path.getsize(gz)
print(f"Gzipped: {gz_sz/1e6:.1f} MB ({gz_sz/raw_sz*100:.1f}% of raw)")
