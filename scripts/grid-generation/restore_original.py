import json, subprocess, os

# Restore original 182K grid from git
print("Restoring original grid from git HEAD...")
result = subprocess.run(
    ["git", "show", "HEAD:public/data/population_grid.geojson"],
    capture_output=True, text=True, cwd="C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app"
)
with open("C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid_original.geojson", "w", encoding="utf-8") as f:
    f.write(result.stdout)

data = json.loads(result.stdout)
print(f"Original grid restored: {len(data['features']):,} cells")
size = os.path.getsize("C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid_original.geojson")
print(f"Size: {size/1e6:.1f} MB")
