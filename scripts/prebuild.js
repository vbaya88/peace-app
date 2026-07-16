/**
 * prebuild.js — Decompress grid .gz files before Next.js build
 *
 * Grid v2 (8.2M cells, 2.4 GB uncompressed) is TOO LARGE for Railway memory.
 * It causes STATUS_BREAKPOINT (OOM kill).
 *
 * Strategy: SKIP v2 grid entirely. The map now uses lightweight on-the-fly
 * grid generation inside KindnessMap.tsx (no heavy GeoJSON needed).
 *
 * Legacy grid (v1) is kept as optional fallback if it exists locally.
 */
const { createReadStream, createWriteStream, existsSync, unlinkSync, statSync } = require('fs');
const { createGunzip } = require('zlib');
const { join } = require('path');

// Only decompress the legacy grid (small, ~30 MB uncompressed)
const files = [
  {
    gz: join(process.cwd(), 'public/data/population_grid.geojson.gz'),
    out: join(process.cwd(), 'public/data/population_grid.geojson'),
  },
];

async function decompress(gzPath, outPath) {
  return new Promise((resolve, reject) => {
    const stat = statSync(gzPath);
    console.log(`[prebuild] Decompressing ${gzPath} (${(stat.size/1024/1024).toFixed(1)} MB) -> ${outPath}`);
    const readStream = createReadStream(gzPath);
    const writeStream = createWriteStream(outPath);
    const gunzip = createGunzip();

    readStream.pipe(gunzip).pipe(writeStream);

    writeStream.on('finish', () => {
      const sizeMB = writeStream.bytesWritten / (1024 * 1024);
      console.log(`[prebuild]   Done: ${sizeMB.toFixed(1)} MB decompressed`);
      resolve();
    });

    readStream.on('error', reject);
    gunzip.on('error', reject);
    writeStream.on('error', reject);
  });
}

async function main() {
  console.log('[prebuild] Starting (lightweight mode — skipping v2 grid to avoid OMM)...');

  for (const f of files) {
    if (!existsSync(f.gz)) {
      console.log(`[prebuild]   SKIP: ${f.gz} not found`);
      continue;
    }

    // Remove existing output if stale
    if (existsSync(f.out)) {
      try { unlinkSync(f.out); } catch {}
    }

    await decompress(f.gz, f.out);
  }

  console.log('[prebuild] Complete!');
}

main().catch(e => {
  console.error('[prebuild] Error:', e);
  process.exit(1);
});
