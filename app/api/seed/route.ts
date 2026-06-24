/**
 * POST /api/seed
 * Generates the full pixel grid — proportional to city populations.
 * Terrain exclusions: water, oceans, rivers, canals, lakes, deserts, taiga,
 * mountains are BLOCKED. Mountain-countries (NP, BT, AD, CH, etc.) are ALLOWED.
 *
 * Grid: 0.05° cells (~5.5 km at equator)
 * Min radius: 0.60° (even tiny cities get ~66 km coverage)
 * Target: 3–6 M unique land pixels
 *
 * Query params:
 *   ?clear=1   — wipe Pixel + Checkin tables first
 *   ?dry=1     — count only, don't write
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCountryCode, isBlockedTerrain } from "@/lib/terrain";

const GRID_STEP = 0.05;
const MIN_RADIUS = 0.60;

function cityRadius(population: number): number {
  return Math.min(12, Math.max(MIN_RADIUS, Math.sqrt(population) * 0.0012));
}

function snapGrid(lat: number, lng: number) {
  return {
    gridLat: Math.round((lat + 90) / GRID_STEP) * GRID_STEP,
    gridLng: Math.round((lng + 180) / GRID_STEP) * GRID_STEP,
  };
}

interface RawCity { name: string; pop: number; lat: number; lng: number }

async function fetchCities(): Promise<RawCity[]> {
  const res = await fetch(
    "https://raw.githubusercontent.com/oumkale/WordPopulation_data/master/worldcities.csv",
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`Failed to fetch cities: ${res.status}`);
  const text = await res.text();
  const cities: RawCity[] = [];
  for (const line of text.split("\n").slice(1)) {
    if (!line.trim()) continue;
    const parts = line.split(",");
    if (parts.length < 4) continue;
    const name = parts[0].replace(/"/g, "").trim();
    const pop = parseInt(parts[1].replace(/"/g, "").trim(), 10);
    if (isNaN(pop) || pop < 1000) continue;
    const lat = parseFloat(parts[2].replace(/"/g, "").trim());
    const lng = parseFloat(parts[3].replace(/"/g, "").trim());
    if (isNaN(lat) || isNaN(lng)) continue;
    cities.push({ name, pop, lat, lng });
  }
  return cities;
}

async function generateGrid(
  cities: RawCity[],
  writer?: WritableStreamDefaultWriter<Uint8Array>,
  encoder?: TextEncoder
) {
  cities.sort((a, b) => b.pop - a.pop);
  const seenKeys = new Set<string>();
  // Accumulate ALL pixels in memory, then do ONE bulk write
  const ALL_PIXELS: any[] = [];
  let totalBlocked = 0;
  const SUPER_BATCH = 50000; // flush to DB every 50K
  let totalPixels = 0;

  for (let ci = 0; ci < cities.length; ci++) {
    const city = cities[ci];
    const countryCode = getCountryCode(city.lat, city.lng);
    const radius = cityRadius(city.pop);
    const minLat = Math.max(-90, city.lat - radius);
    const maxLat = Math.min(90, city.lat + radius);
    const minLng = city.lng - radius;
    const maxLng = city.lng + radius;
    const cosLat = Math.cos((city.lat * Math.PI) / 180);

    for (let lat = minLat; lat <= maxLat; lat += GRID_STEP) {
      for (let lng = minLng; lng <= maxLng; lng += GRID_STEP) {
        const dLat = lat - city.lat;
        const dLng = (lng - city.lng) * cosLat;
        if (Math.sqrt(dLat * dLat + dLng * dLng) > radius) continue;

        const snapped = snapGrid(lat, lng);
        const key = `${snapped.gridLat.toFixed(4)},${snapped.gridLng.toFixed(4)}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        if (isBlockedTerrain(lat, lng, countryCode)) { totalBlocked++; continue; }

        ALL_PIXELS.push({
          gridLat: parseFloat(snapped.gridLat.toFixed(4)),
          gridLng: parseFloat(snapped.gridLng.toFixed(4)),
          latitude: parseFloat(lat.toFixed(6)),
          longitude: parseFloat(lng.toFixed(6)),
          countryCode,
          city: city.name,
          status: "AVAILABLE",
          color: "#1e293b",
          priceTier: "BASIC",
          isPaid: false,
        });

        if (ALL_PIXELS.length >= SUPER_BATCH) {
          await prisma.pixel.createMany({ data: ALL_PIXELS, skipDuplicates: true });
          totalPixels += ALL_PIXELS.length;
          ALL_PIXELS.length = 0;
        }
      }
    }

    if ((ci + 1) % 1000 === 0) {
      const msg = `[seed] ${ci + 1}/${cities.length} | accumulated: ${ALL_PIXELS.length.toLocaleString()} | written: ${totalPixels.toLocaleString()} | blocked: ${totalBlocked.toLocaleString()}`;
      console.log(msg);
      if (writer && encoder) {
        await writer.write(encoder.encode(JSON.stringify({ status: "progress", city: ci + 1, totalCities: cities.length, written: totalPixels, accumulated: ALL_PIXELS.length, blocked: totalBlocked }) + '\n'));
      }
    }
  }

  // Final flush
  if (ALL_PIXELS.length > 0) {
    await prisma.pixel.createMany({ data: ALL_PIXELS, skipDuplicates: true });
    totalPixels += ALL_PIXELS.length;
    ALL_PIXELS.length = 0;
  }

  return { totalPixels, totalBlocked };
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  const clear = url.searchParams.get("clear") === "1";

  // Use TransformStream to stream progress — prevents Cloudflare timeout
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const response = new Response(stream.readable, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
  });

  // Run seed in background, write progress to stream
  (async () => {
    try {
      if (clear) {
        await writer.write(encoder.encode('{"status":"clearing"}\n'));
        await prisma.checkin.deleteMany();
        await prisma.pixel.deleteMany();
      }

      await writer.write(encoder.encode('{"status":"fetching_cities"}\n'));
      let cities = await fetchCities();

      if (dry) {
        let totalCells = 0, totalBlocked = 0;
        const seenKeys = new Set<string>();
        for (const city of cities) {
          const radius = cityRadius(city.pop);
          const cc = getCountryCode(city.lat, city.lng);
          const cosLat = Math.cos((city.lat * Math.PI) / 180);
          for (let lat = Math.max(-90, city.lat - radius); lat <= Math.min(90, city.lat + radius); lat += GRID_STEP) {
            for (let lng = city.lng - radius; lng <= city.lng + radius; lng += GRID_STEP) {
              const dLat = lat - city.lat, dLng = (lng - city.lng) * cosLat;
              if (Math.sqrt(dLat * dLat + dLng * dLng) > radius) continue;
              const key = `${Math.round((lat + 90) / GRID_STEP) * GRID_STEP},${Math.round((lng + 180) / GRID_STEP) * GRID_STEP}`;
              if (seenKeys.has(key)) continue;
              seenKeys.add(key);
              if (isBlockedTerrain(lat, lng, cc)) { totalBlocked++; continue; }
              totalCells++;
            }
          }
        }
        await writer.write(encoder.encode(JSON.stringify({ dry: true, cities: cities.length, estimatedPixels: totalCells, estimatedBlocked: totalBlocked }) + '\n'));
        await writer.close();
        return;
      }

      // Apply ?top=N limit before generating
      const topParam = url.searchParams.get("top");
      if (topParam) {
        const topN = parseInt(topParam, 10);
        if (topN > 0 && topN < cities.length) {
          cities = cities.slice(0, topN);
          await writer.write(encoder.encode(`{"status":"limited","cities":${topN}}\n`));
        }
      }

      const result = await generateGrid(cities, writer, encoder);
      const totalInDb = await prisma.pixel.count();
      await writer.write(encoder.encode(
        JSON.stringify({
          ok: true,
          status: "done",
          citiesProcessed: cities.length,
          pixelsGenerated: result.totalPixels,
          pixelsBlocked: result.totalBlocked,
          totalInDb,
        }) + '\n'
      ));
      await writer.close();
    } catch (err: any) {
      await writer.write(encoder.encode(JSON.stringify({ error: err.message, status: "error" }) + '\n'));
      await writer.close();
    }
  })();

  return response;
}

export async function GET() {
  try {
    return NextResponse.json({ pixels: await prisma.pixel.count(), checkins: await prisma.checkin.count() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
