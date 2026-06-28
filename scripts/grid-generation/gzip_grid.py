import gzip, os

SRC = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid.geojson"
DST = "C:/Users/User/.qclaw-oversea/workspace-agent-universe-of-kindness/peace-app/public/data/population_grid.geojson.gz"

with open(SRC, "rb") as f_in:
    with gzip.open(DST, "wb", compresslevel=9) as f_out:
        f_out.writelines(f_in)

raw = os.path.getsize(SRC)
gz = os.path.getsize(DST)
print(f"Raw: {raw/1e6:.1f} MB")
print(f"Gzipped: {gz/1e6:.1f} MB ({gz/raw*100:.1f}% of raw)")
