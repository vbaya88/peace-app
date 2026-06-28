import json
from collections import Counter

data = json.load(open('public/data/population_grid.geojson', 'r', encoding='utf-8'))
features = data['features']

country_counts = Counter()
for feat in features:
    cc = feat['properties'].get('country', '??')
    country_counts[cc] += 1

print(f"Total cells: {len(features)}")
print()

names = {
    'CN': 'China', 'IN': 'India', 'US': 'USA', 'ID': 'Indonesia', 'PK': 'Pakistan',
    'BR': 'Brazil', 'NG': 'Nigeria', 'BD': 'Bangladesh', 'RU': 'Russia', 'MX': 'Mexico',
    'JP': 'Japan', 'ET': 'Ethiopia', 'PH': 'Philippines', 'EG': 'Egypt', 'VN': 'Vietnam',
    'CD': 'DR Congo', 'DE': 'Germany', 'IR': 'Iran', 'TR': 'Turkey', 'FR': 'France',
    'GB': 'UK', 'IT': 'Italy', 'ZA': 'South Africa', 'KR': 'South Korea',
    'CO': 'Colombia', 'ES': 'Spain', 'TZ': 'Tanzania', 'AR': 'Argentina',
    'UA': 'Ukraine', 'KE': 'Kenya', 'PL': 'Poland', 'CA': 'Canada', 'AU': 'Australia',
    'MY': 'Malaysia', 'AF': 'Afghanistan', 'SA': 'Saudi Arabia', 'PE': 'Peru',
    'MA': 'Morocco', 'UZ': 'Uzbekistan', 'TH': 'Thailand', 'MM': 'Myanmar',
}

top20 = country_counts.most_common(20)
print(f"{'#':<3} {'Country':<20} {'ISO':<5} {'Cells':>8}")
print('-' * 42)
for i, (code, count) in enumerate(top20, 1):
    name = names.get(code, code)
    print(f"{i:<3} {name:<20} {code:<5} {count:>8}")

print()
print(f"Total countries with cells: {len(country_counts)}")

# Also show region_id breakdown for top 5 countries
print()
print("=" * 60)
print("REGION BREAKDOWN (top 5 countries)")
print("=" * 60)

region_counts = Counter()
for feat in features:
    rid = feat['properties'].get('region_id', '??')
    region_counts[rid] += 1

for country_code in ['CN', 'IN', 'US', 'ID', 'RU']:
    country_regions = [(rid, cnt) for rid, cnt in region_counts.most_common() if rid.startswith(country_code + '_')]
    total_cells = sum(c for _, c in country_regions)
    print(f"\n{names.get(country_code, country_code)} ({country_code}): {total_cells} cells in {len(country_regions)} regions")
    print(f"  {'RegionID':<15} {'Cells':>6}")
    for rid, cnt in sorted(country_regions, key=lambda x: -x[1])[:10]:
        print(f"  {rid:<15} {cnt:>6}")
    if len(country_regions) > 10:
        print(f"  ... +{len(country_regions)-10} more regions")
