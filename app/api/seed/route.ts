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

async function generateGrid(cities: RawCity[]) {
  cities.sort((a, b) => b.pop - a.pop);
  const seenKeys = new Set<string>();
  const BATCH = 2000;
  let totalPixels = 0;
  let totalBlocked = 0;

  for (let ci = 0; ci < cities.length; ci++) {
    const city = cities[ci];
    const countryCode = getCountryCode(city.lat, city.lng);
    const radius = cityRadius(city.pop);
    const minLat = Math.max(-90, city.lat - radius);
    const maxLat = Math.min(90, city.lat + radius);
    const minLng = city.lng - radius;
    const maxLng = city.lng + radius;
    const cosLat = Math.cos((city.lat * Math.PI) / 180);

    const batch: any[] = [];

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

        batch.push({
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

        if (batch.length >= BATCH) {
          await prisma.pixel.createMany({ data: batch, skipDuplicates: true });
          totalPixels += batch.length;
          batch.length = 0;
        }
      }
    }

    if (batch.length > 0) {
      await prisma.pixel.createMany({ data: batch, skipDuplicates: true });
      totalPixels += batch.length;
    }

    if ((ci + 1) % 500 === 0) {
      console.log(`[seed] ${ci + 1}/${cities.length} | pixels: ${totalPixels.toLocaleString()} | blocked: ${totalBlocked.toLocaleString()}`);
    }
  }

  return { totalPixels, totalBlocked };
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  const clear = url.searchParams.get("clear") === "1";

  try {
    if (clear) {
      await prisma.checkin.deleteMany();
      await prisma.pixel.deleteMany();
    }

    console.log("[seed] Fetching city data...");
    const cities = await fetchCities();
    console.log(`[seed] Loaded ${cities.length} cities`);

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
      return NextResponse.json({ dry: true, cities: cities.length, estimatedPixels: totalCells, estimatedBlocked: totalBlocked });
    }

    const result = await generateGrid(cities);
    return NextResponse.json({
      ok: true,
      citiesProcessed: cities.length,
      pixelsGenerated: result.totalPixels,
      pixelsBlocked: result.totalBlocked,
      totalInDb: await prisma.pixel.count(),
    });
  } catch (err: any) {
    console.error("[seed] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    return NextResponse.json({ pixels: await prisma.pixel.count(), checkins: await prisma.checkin.count() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
