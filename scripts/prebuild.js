/**
 * prebuild.js — Decompress grid .gz files before Next.js build
 * Railway doesn't support Git LFS, so .gz files are served as pointer text.
 * This script extracts the real content during build.
 */
const { createReadStream, createWriteStream, existsSync, unlinkSync, statSync } = require('fs');
const { createGunzip } = require('zlib');
const { join } = require('path');

const files = [
  // Grid v2: 8.2M population-proportional cells (155 MB gzip)
  {
    gz: join(process.cwd(), 'public/data/population_grid_v2.geojson.gz'),
    out: join(process.cwd(), 'public/data/population_grid_v2.geojson'),
  },
  // Legacy grid (keep for fallback during transition)
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
  console.log('[prebuild] Starting...');

  for (const f of files) {
    if (!existsSync(f.gz)) {
      console.log(`[prebuild]   SKIP: ${f.gz} not found`);
      continue;
    }

    // Remove existing file if it's an LFS pointer (small file)
    if (existsSync(f.out)) {
      const stat = statSync(f.out);
      // LFS pointer files are ~100-200 bytes; real GeoJSON is MBs+
      if (stat.size < 1024) {
        console.log(`[prebuild]   Removing LFS pointer (${stat.size} bytes)`);
        unlinkSync(f.out);
      }
    }

    await decompress(f.gz, f.out);
  }

  console.log('[prebuild] Complete!');
}

main().catch(e => {
  console.error('[prebuild] Error:', e);
  process.exit(1);
});
