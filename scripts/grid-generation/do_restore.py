import os, json, shutil
src = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid_original.geojson"
dst = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid.geojson"
shutil.copy2(src, dst)
d = json.load(open(dst, "r", encoding="utf-8"))
print(f"RESTORED: {len(d['features']):,} cells, {os.path.getsize(dst)/1e6:.1f} MB")
