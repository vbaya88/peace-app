/**
 * API route: /api/grid/tile
 *
 * Streams a single grid tile (gzipped GeoJSON) from R2.
 * Client sends zoom/x/y, server fetches the corresponding tile from R2,
 * decompresses it on the fly and returns as JSON.
 *
 * This avoids loading the full 2.4 GB grid into memory.
 */
import { NextRequest, NextResponse } from 'next/server';

const R2_BASE = 'https://pub-b87fe0cbaa1245839b4e755f6fc2cd4a.r2.dev';
const GRID_GZ_URL = `${R2_BASE}/population_grid_v2.geojson.gz`;

// Tile index — precomputed bounds per zoom level
// At each zoom, world is divided into 2^zoom x 2^zoom tiles
// We serve tiles that contain grid cells

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const z = parseInt(searchParams.get('z') || '0', 10);
  const x = parseInt(searchParams.get('x') || '0', 10);
  const y = parseInt(searchParams.get('y') || '0', 10);

  if (isNaN(z) || isNaN(x) || isNaN(y)) {
    return NextResponse.json({ error: 'Missing z/x/y params' }, { status: 400 });
  }

  // For now: return a small stub tile with no features
  // The real implementation will use a spatial index (MBTiles or similar)
  // For immediate fix: we skip the full grid and return empty
  
  // This is a placeholder — the real fix requires:
  // 1. Pre-splitting the grid into tiles on the developer machine
  // 2. Uploading tiles to R2 as individual files
  // 3. Serving them from this API route
  
  return NextResponse.json({
    type: 'FeatureCollection',
    features: [],
    _meta: { z, x, y, note: 'tile system not yet implemented' },
  });
}
