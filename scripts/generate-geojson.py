#!/usr/bin/env python
"""
Generate inline GeoJSON data files — no downloads needed.
Creates: countries.geojson, continents.geojson, top100-cities.geojson
"""
import json, math, os, urllib.request

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "data")
os.makedirs(OUT, exist_ok=True)

# ─── Inline continent polygons (rough coastlines, decimal degree precision) ──
CONTINENTS = {
    "AFRICA": {
        "label": "AFRICA", "lat": 0, "lng": 20,
        "coords": [[(-18,35), (35,35), (35,15), (40,15), (40,10), (50,10),
                    (50,-12), (35,-35), (18,-35), (12,-35), (12,18), (-18,18), (-18,35)]]
    },
    "EUROPE": {
        "label": "EUROPE", "lat": 50, "lng": 15,
        "coords": [[(35,60), (70,60), (70,30), (60,30), (60,35), (42,35),
                    (42,36), (40,36), (36,46), (36,60), (35,60)]]
    },
    "ASIA": {
        "label": "ASIA", "lat": 40, "lng": 90,
        "coords": [[(70,170), (70,30), (60,30), (60,42), (42,42), (42,36),
                    (40,36), (36,46), (36,60), (30,60), (30,75), (5,100),
                    (5,145), (45,145), (55,160), (70,170)]]
    },
    "NORTH AMERICA": {
        "label": "NORTH AMERICA", "lat": 45, "lng": -100,
        "coords": [[(25,-168), (70,-168), (75,-140), (75,-60), (50,-60),
                    (47,-53), (47,-85), (25,-85), (25,-105), (15,-105),
                    (15,-85), (8,-82), (8,-80), (25,-80), (25,-168)]]
    },
    "SOUTH AMERICA": {
        "label": "SOUTH AMERICA", "lat": -15, "lng": -60,
        "coords": [[(12,-78), (12,-35), (5,-35), (-55,-35), (-55,-78), (12,-78)]]
    },
    "OCEANIA": {
        "label": "OCEANIA", "lat": -20, "lng": 140,
        "coords": [[(-45,110), (-10,110), (-10,180), (30,180), (30,110), (-45,110)]]
    },
    "ANTARCTICA": {
        "label": "ANTARCTICA", "lat": -82, "lng": 0,
        "coords": [[(-60,-180), (-60,180), (-90,180), (-90,-180), (-60,-180)]]
    },
}

def ring_to_coords(ring):
    # GeoJSON uses [lng, lat] order (contrary to lat/lng convention)
    return [[round(lng, 2), round(lat, 2)] for lat, lng in ring]

def build_polygon(ring_coords):
    # ring_coords: list of (lat, lng) tuples, may or may not be closed
    first, last = ring_coords[0], ring_coords[-1]
    closed = ring_coords + [first] if first != last else list(ring_coords)
    return [ring_to_coords(list(closed))]  # closed is a tuple; make it a list of tuples

def make_continent_feature(name, info):
    poly = build_polygon(info["coords"][0])
    return {
        "type": "Feature",
        "properties": {"name": info["label"], "label_lat": info["lat"], "label_lng": info["lng"]},
        "geometry": {"type": "Polygon", "coordinates": poly}
    }

def generate_continents():
    fc = {"type": "FeatureCollection", "features": [make_continent_feature(n, i) for n, i in CONTINENTS.items()]}
    path = os.path.join(OUT, "continents.geojson")
    with open(path, "w") as f: json.dump(fc, f)
    print(f"Written: {path} ({os.path.getsize(path)//1024}KB, {len(fc['features'])} continents)")

# ─── Top-100 city circles from worldcities CSV (no external deps) ──
def city_radius(pop):
    return min(4.0, max(0.3, math.sqrt(pop) * 0.00007))

def make_circle(lat, lng, radius, steps=24):
    coords = []
    for i in range(steps+1):
        theta = 2 * math.pi * i / steps
        dlng = radius * math.cos(theta) / math.cos(math.radians(lat+0.001))
        dlat = radius * math.sin(theta)
        coords.append([round(lng + dlng, 3), round(lat + dlat, 3)])
    return [coords]

def generate_top100_cities():
    print("Fetching worldcities.csv...")
    url = "https://raw.githubusercontent.com/oumkale/WordPopulation_data/master/worldcities.csv"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        text = r.read().decode("utf-8")
    cities = []
    for line in text.split("\n")[1:]:
        if not line.strip(): continue
        p = line.split(",")
        if len(p) < 4: continue
        try:
            name = p[0].replace('"','').strip()
            pop = int(p[1].replace('"','').strip() or "0")
            lat = float(p[2].replace('"','').strip() or "0")
            lng = float(p[3].replace('"','').strip() or "0")
            if pop < 10000 or not (-85 < lat < 85): continue
            cities.append({"name": name, "pop": pop, "lat": lat, "lng": lng})
        except: continue
    cities.sort(key=lambda c: c["pop"], reverse=True)
    top100 = cities[:100]
    print(f"  Top 100 cities loaded (first: {top100[0]['name']}, total: {len(top100)})")

    features = []
    for c in top100:
        r = city_radius(c["pop"])
        features.append({
            "type": "Feature",
            "properties": {"name": c["name"], "population": c["pop"], "lat": c["lat"], "lng": c["lng"]},
            "geometry": {"type": "Polygon", "coordinates": make_circle(c["lat"], c["lng"], r)}
        })
    fc = {"type": "FeatureCollection", "features": features}
    path = os.path.join(OUT, "top100-cities.geojson")
    with open(path, "w") as f: json.dump(fc, f)
    print(f"Written: {path} ({os.path.getsize(path)//1024}KB, {len(features)} cities)")

# ─── Countries: simplified inline polygons for major countries ──
COUNTRIES = [
    ("AFGHANISTAN", {"name": "Afghanistan", "lat": 33, "lng": 65}, [[(29,60),(38,60),(38,75),(29,75),(29,60)]]),
    ("ALGERIA", {"name": "Algeria", "lat": 28, "lng": 3}, [[(19,-9),(37,-9),(37,12),(19,12),(19,-9)]]),
    ("ARGENTINA", {"name": "Argentina", "lat": -34, "lng": -66}, [[(-55,-74),(-21,-74),(-21,-53),(-55,-53),(-55,-74)]]),
    ("AUSTRALIA", {"name": "Australia", "lat": -27, "lng": 134}, [[(-44,114),(-10,114),(-10,154),(-44,154),(-44,114)]]),
    ("BOLIVIA", {"name": "Bolivia", "lat": -17, "lng": -65}, [[(-23,-62),(-22,-62),(-22,-58),(-10,-58),(-10,-69),(-23,-69),(-23,-62)]]),
    ("BRAZIL", {"name": "Brazil", "lat": -10, "lng": -55}, [[(-34,-74),(-34,-28),(-18,-28),(-18,-50),(-34,-50),(-34,-74)]]),
    ("CANADA", {"name": "Canada", "lat": 60, "lng": -100}, [[(42,-141),(70,-141),(70,-52),(42,-52),(42,-141)]]),
    ("CHILE", {"name": "Chile", "lat": -35, "lng": -71}, [[(-56,-76),(-17,-76),(-17,-66),(-56,-66),(-56,-76)]]),
    ("CHINA", {"name": "China", "lat": 35, "lng": 105}, [[(18,73),(54,73),(54,135),(18,135),(18,73)]]),
    ("COLOMBIA", {"name": "Colombia", "lat": 4, "lng": -72}, [[(-5,-79),(-5,-66),(12,-66),(12,-79),(-5,-79)]]),
    ("CONGO", {"name": "DR Congo", "lat": -4, "lng": 22}, [[(-14,12),(-14,31),(5,31),(5,12),(-14,12)]]),
    ("EGYPT", {"name": "Egypt", "lat": 26, "lng": 30}, [[(22,25),(32,25),(32,35),(22,35),(22,25)]]),
    ("ETHIOPIA", {"name": "Ethiopia", "lat": 9, "lng": 40}, [[(3,33),(15,33),(15,48),(3,48),(3,33)]]),
    ("FINLAND", {"name": "Finland", "lat": 64, "lng": 26}, [[(60,20),(70,20),(70,32),(60,32),(60,20)]]),
    ("FRANCE", {"name": "France", "lat": 46, "lng": 2}, [[(36,-5),(51,-5),(51,9),(36,9),(36,-5)]]),
    ("GERMANY", {"name": "Germany", "lat": 51, "lng": 10}, [[(47,6),(55,6),(55,16),(47,16),(47,6)]]),
    ("GREECE", {"name": "Greece", "lat": 39, "lng": 22}, [[(35,19),(42,19),(42,29),(35,29),(35,19)]]),
    ("GREENLAND", {"name": "Greenland", "lat": 72, "lng": -42}, [[(60,-73),(84,-73),(84,-12),(60,-12),(60,-73)]]),
    ("ICELAND", {"name": "Iceland", "lat": 65, "lng": -19}, [[(63,-25),(67,-13),(63,-13),(63,-25)]]),
    ("INDIA", {"name": "India", "lat": 20, "lng": 78}, [[(6,68),(36,68),(36,98),(6,98),(6,68)]]),
    ("INDONESIA", {"name": "Indonesia", "lat": -5, "lng": 120}, [[(-11,95),(-11,141),(6,141),(6,95),(-11,95)]]),
    ("IRAN", {"name": "Iran", "lat": 32, "lng": 53}, [[(25,44),(40,44),(40,63),(25,63),(25,44)]]),
    ("IRAQ", {"name": "Iraq", "lat": 33, "lng": 44}, [[(30,39),(37,39),(37,49),(30,49),(30,39)]]),
    ("ITALY", {"name": "Italy", "lat": 42, "lng": 12}, [[(36,7),(47,7),(47,19),(36,19),(36,7)]]),
    ("JAPAN", {"name": "Japan", "lat": 36, "lng": 138}, [[(24,123),(46,123),(46,146),(24,146),(24,123)]]),
    ("KAZAKHSTAN", {"name": "Kazakhstan", "lat": 48, "lng": 67}, [[(40,47),(56,47),(56,88),(40,88),(40,47)]]),
    ("KENYA", {"name": "Kenya", "lat": 1, "lng": 38}, [[(-5,34),(5,34),(5,42),(-5,42),(-5,34)]]),
    ("LIBYA", {"name": "Libya", "lat": 27, "lng": 17}, [[(20,10),(33,10),(33,26),(20,26),(20,10)]]),
    ("MADAGASCAR", {"name": "Madagascar", "lat": -20, "lng": 47}, [[(-26,43),(-12,43),(-12,51),(-26,51),(-26,43)]]),
    ("MALAYSIA", {"name": "Malaysia", "lat": 4, "lng": 108}, [[(0,99),(7,99),(7,120),(0,120),(0,99)]]),
    ("MEXICO", {"name": "Mexico", "lat": 24, "lng": -102}, [[(14,-118),(32,-118),(32,-86),(14,-86),(14,-118)]]),
    ("MONGOLIA", {"name": "Mongolia", "lat": 46, "lng": 104}, [[(42,88),(52,88),(52,120),(42,120),(42,88)]]),
    ("MOZAMBIQUE", {"name": "Mozambique", "lat": -18, "lng": 35}, [[(-27,31),(-11,31),(-11,41),(-27,41),(-27,31)]]),
    ("MYANMAR", {"name": "Myanmar", "lat": 19, "lng": 96}, [[(10,92),(28,92),(28,102),(10,102),(10,92)]]),
    ("NAMIBIA", {"name": "Namibia", "lat": -22, "lng": 18}, [[(-29,12),(-17,12),(-17,26),(-29,26),(-29,12)]]),
    ("NIGERIA", {"name": "Nigeria", "lat": 10, "lng": 8}, [[(4,3),(14,3),(14,15),(4,15),(4,3)]]),
    ("NORWAY", {"name": "Norway", "lat": 65, "lng": 16}, [[(58,5),(72,5),(72,32),(58,32),(58,5)]]),
    ("PAKISTAN", {"name": "Pakistan", "lat": 30, "lng": 70}, [[(24,61),(37,61),(37,77),(24,77),(24,61)]]),
    ("PERU", {"name": "Peru", "lat": -10, "lng": -76}, [[(-19,-82),(-19,-68),(0,-68),(0,-82),(-19,-82)]]),
    ("PHILIPPINES", {"name": "Philippines", "lat": 12, "lng": 122}, [[(4,116),(22,116),(22,128),(4,128),(4,116)]]),
    ("POLAND", {"name": "Poland", "lat": 52, "lng": 19}, [[(49,14),(55,14),(55,25),(49,25),(49,14)]]),
    ("ROMANIA", {"name": "Romania", "lat": 46, "lng": 25}, [[(44,20),(51,20),(51,30),(44,30),(44,20)]]),
    ("RUSSIA", {"name": "Russia", "lat": 60, "lng": 100}, [[(41,28),(82,28),(82,180),(41,180),(41,28)]]),
    ("SAUDI ARABIA", {"name": "Saudi Arabia", "lat": 24, "lng": 45}, [[(16,35),(32,35),(32,56),(16,56),(16,35)]]),
    ("SOUTH AFRICA", {"name": "South Africa", "lat": -29, "lng": 25}, [[(-35,17),(-25,17),(-25,33),(-35,33),(-35,17)]]),
    ("SPAIN", {"name": "Spain", "lat": 40, "lng": -4}, [[(36,-9),(44,-9),(44,4),(36,4),(36,-9)]]),
    ("SUDAN", {"name": "Sudan", "lat": 15, "lng": 30}, [[(9,22),(22,22),(22,39),(9,39),(9,22)]]),
    ("SWEDEN", {"name": "Sweden", "lat": 62, "lng": 17}, [[(56,11),(70,11),(70,24),(56,24),(56,11)]]),
    ("THAILAND", {"name": "Thailand", "lat": 15, "lng": 101}, [[(6,98),(21,98),(21,106),(6,106),(6,98)]]),
    ("TURKEY", {"name": "Turkey", "lat": 39, "lng": 35}, [[(36,26),(42,26),(42,45),(36,45),(36,26)]]),
    ("UKRAINE", {"name": "Ukraine", "lat": 49, "lng": 32}, [[(45,22),(53,22),(53,41),(45,41),(45,22)]]),
    ("UNITED KINGDOM", {"name": "United Kingdom", "lat": 55, "lng": -3}, [[(50,-9),(59,-9),(59,3),(50,3),(50,-9)]]),
    ("UNITED STATES", {"name": "United States", "lat": 39, "lng": -98}, [[(24,-126),(50,-124),(50,-66),(24,-66),(24,-126)]]),
    ("VENEZUELA", {"name": "Venezuela", "lat": 8, "lng": -66}, [[(0,-73),(12,-73),(12,-59),(0,-59),(0,-73)]]),
    ("VIETNAM", {"name": "Vietnam", "lat": 16, "lng": 108}, [[(9,103),(24,103),(24,110),(9,110),(9,103)]]),
]

def generate_countries():
    features = []
    for iso3, props, rings in COUNTRIES:
        coords = [ring_to_coords(list(r)) for r in rings]
        features.append({
            "type": "Feature",
            "properties": {"name": props["name"], "ISO_A3": iso3, "label_lat": props["lat"], "label_lng": props["lng"]},
            "geometry": {"type": "MultiPolygon" if len(rings)>1 else "Polygon", "coordinates": coords}
        })
    fc = {"type": "FeatureCollection", "features": features}
    path = os.path.join(OUT, "countries.geojson")
    with open(path, "w") as f: json.dump(fc, f)
    print(f"Written: {path} ({os.path.getsize(path)//1024}KB, {len(features)} countries)")

if __name__ == "__main__":
    print("Generating GeoJSON files (inline, no downloads for countries/continents)...\n")
    generate_continents()
    generate_countries()
    print("\nFetching top 100 cities (small CSV, fast)...")
    generate_top100_cities()
    print("\nAll done!")
