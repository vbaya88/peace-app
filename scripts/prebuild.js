/**
 * prebuild.js — Download grid from R2 + decompress before Next.js build
 * Railway doesn't support Git LFS, so grid files are downloaded from Cloudflare R2.
 */
const { createReadStream, createWriteStream, existsSync, unlinkSync, statSync } = require('fs');
const { createGunzip } = require('zlib');
const { join } = require('path');
const https = require('https');
const http = require('http');

// R2 URL for the 8.2M population-proportional grid (155 MB gzip)
const R2_URL = 'https://pub-b87fe0cbaa1245839b4e755f6fc2cd4a.r2.dev/population_grid_v2.geojson.gz';

const files = [
  // Grid v2: download from R2 (Railway has no Git LFS)
  {
    url: R2_URL,
    gz: join(process.cwd(), 'public/data/population_grid_v2.geojson.gz'),
    out: join(process.cwd(), 'public/data/population_grid_v2.geojson'),
    download: true,
  },
  // Legacy grid (keep for fallback during transition)
  {
    gz: join(process.cwd(), 'public/data/population_grid.geojson.gz'),
    out: join(process.cwd(), 'public/data/population_grid.geojson'),
    download: false,
  },
];

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    console.log(`[prebuild] Downloading ${url} -> ${destPath}`);

    const file = createWriteStream(destPath);
    protocol.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Follow redirect
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }

      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0 && downloadedBytes % (5 * 1024 * 1024) < chunk.length) {
          // Log progress every ~5MB
          const pct = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          process.stdout.write(`[prebuild]   Download progress: ${(downloadedBytes / 1024 / 1024).toFixed(0)} / ${(totalBytes / 1024 / 1024).toFixed(0)} MB (${pct}%)\r`);
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        const sizeMB = statSync(destPath).size / (1024 * 1024);
        console.log(`\n[prebuild]   Downloaded: ${sizeMB.toFixed(1)} MB`);
        resolve();
      });
    }).on('error', reject);

    file.on('error', reject);
  });
}

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
    // Step 1: Download from R2 if needed
    if (f.download) {
      try {
        await downloadFile(f.url, f.gz);
      } catch (err) {
        console.error(`[prebuild] ERROR downloading ${f.url}:`, err.message);
        // Don't fail build — skip this file
        continue;
      }
    }

    // Step 2: Check file exists
    if (!existsSync(f.gz)) {
      console.log(`[prebuild]   SKIP: ${f.gz} not found`);
      continue;
    }

    // Remove existing output if it's an LFS pointer or stale
    if (existsSync(f.out)) {
      const stat = statSync(f.out);
      if (stat.size < 1024) {
        console.log(`[prebuild]   Removing LFS pointer/stale file (${stat.size} bytes)`);
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
