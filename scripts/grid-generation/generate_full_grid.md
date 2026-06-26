# Two-Level Grid Generation — Results

## Generation Pipeline

### Data Sources
- **Admin1**: Natural Earth 10m (`admin1_ne10m.geojson`) — 4,596 regions, 241 countries
- **GPW Grid**: `population_grid.geojson` — 182,840 anchor cells, 0.05° resolution
- **Countries**: `countries.geojson` — base country boundaries

### Allocation Formula
- Target: 5,000,000 total cells
- L1 (admin1 regions): 2% = ~100,000 cells (proportional to region population)
- L2 (dense cells): 98% = ~4,900,000 cells (spread across GPW anchors)

### L1 Generation (`generate_two_level_grid.py`)
- Spatial join: 181,562/182,840 cells matched to 3,255 admin1 regions (99.3%)
- Per-region L1 allocation: `(region_pop / total_pop) * 100,000` cells
- Cell placement: random sampling within region bounds
- **Result**: `public/data/grid_l1.geojson` — 109,311 cells, 42 MB

### L2 Generation (`generate_l2_final.py`)
- Anchors: 181,562 GPW cells matched to admin1
- Per-anchor allocation: ceiling + proportional scale to hit target
- Cell spacing: 0.008° (~0.9 km at equator)
- **Result**: `public/data/l2_chunks/L2_XX.geojson` — 210 country files

## Output Files

### Committed to Git
- `public/data/grid_l1.geojson` (42 MB) — L1 cells, all countries
- `public/data/admin1_ne10m.geojson` (70 MB) — admin1 boundaries
- `public/data/region_pop_gpw.csv` — per-region population + allocation
- `public/data/l2_chunks/_index.json` — L2 file manifest
- `scripts/grid-generation/l2_stats.csv` — per-country L2 cell counts

### NOT Committed (too large)
- `public/data/l2_chunks/L2_*.geojson` — 1.75 GB across 210 files
  → Run `python scripts/grid-generation/generate_l2_final.py` to regenerate

## Grid Statistics

| Metric | Value |
|--------|-------|
| Total cells (L1+L2) | 4,821,872 |
| L1 cells | 109,311 |
| L2 cells | 4,712,561 |
| Countries | 210 |
| Admin1 regions | 3,255 |
| Cell spacing | ~0.9 km (0.008°) |
| Target achieved | 96.4% |

### Top 15 Countries by L2 Cells
| Rank | Country | L2 Cells | L1 Cells |
|------|---------|----------|----------|
| 1 | CN (China) | 2,345,879 | 48,351 |
| 2 | IN (India) | 1,919,178 | 40,083 |
| 3 | NG (Nigeria) | 82,253 | 1,897 |
| 4 | PK (Pakistan) | 52,584 | 1,314 |
| 5 | BR (Brazil) | 50,065 | 1,118 |
| 6 | ID (Indonesia) | 39,135 | 1,111 |
| 7 | US (United States) | 22,921 | 457 |
| 8 | BD (Bangladesh) | 21,256 | 841 |
| 9 | EG (Egypt) | 20,969 | 558 |
| 10 | ET (Ethiopia) | 16,976 | 496 |
| 11 | TR (Turkey) | 14,961 | — |
| 12 | DE (Germany) | 13,787 | — |
| 13 | IR (Iran) | 12,367 | — |
| 14 | MX (Mexico) | 10,624 | — |
| 15 | RU (Russia) | 8,837 | 474 |

## Usage in App

```typescript
// Load L1 for zoom 11+ (all regions visible)
const L1 = await fetch('/data/grid_l1.geojson')

// Load L2 chunks by country (for focused country views)
const CN_L2 = await fetch('/data/l2_chunks/L2_CN.geojson')
```

## Regeneration

```bash
cd peace-app
python scripts/grid-generation/generate_two_level_grid.py  # L1
python scripts/grid-generation/generate_l2_final.py       # L2 chunks
```
