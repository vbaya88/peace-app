import os, json
p = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid_182k.geojson"
d = json.load(open(p, "r", encoding="utf-8"))
print(f"Cells: {len(d['features']):,}, Size: {os.path.getsize(p)/1e6:.1f} MB")
