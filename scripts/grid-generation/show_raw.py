p = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid_182k.geojson"
with open(p, "rb") as f:
    raw = f.read(500)
print(f"Size: {len(raw)} bytes (first 500)")
print(f"Raw text: {raw[:300]}")
