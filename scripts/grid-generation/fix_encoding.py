import os, json
p = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid_182k.geojson"
d = json.load(open(p, "r", encoding="utf-16"))
print(f"Cells: {len(d['features']):,}, Size: {os.path.getsize(p)/1e6:.1f} MB")
# Save as UTF-8
out = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid.geojson"
with open(out, "w", encoding="utf-8") as f:
    json.dump(d, f)
print(f"Saved as UTF-8: {os.path.getsize(out)/1e6:.1f} MB")
