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

async function seedPixels() {
  const total = await prisma.pixel.count();
  if (total > 0) return total;

  const cities = await fetchCities();
  cities.sort((a, b) => b.pop - a.pop);
  const seenKeys = new Set<string>();
  const BATCH = 2000;
  let generated = 0;
  let blocked = 0;

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
        if (isBlockedTerrain(lat, lng, countryCode)) { blocked++; continue; }
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
          generated += batch.length;
          batch.length = 0;
        }
      }
    }
    if (batch.length > 0) {
      await prisma.pixel.createMany({ data: batch, skipDuplicates: true });
      generated += batch.length;
    }
    if ((ci + 1) % 500 === 0) {
      console.log(`[pixels/seed] ${ci + 1}/${cities.length} | generated: ${generated.toLocaleString()} | blocked: ${blocked.toLocaleString()}`);
    }
  }
  return generated;
}

// GET /api/pixels?country=US&status=AVAILABLE&limit=100
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country");
  const status = searchParams.get("status") as any;
  const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 500);
  const doSeed = searchParams.get("seed") === "true";

  try {
    if (doSeed || process.env.AUTO_SEED_PIXELS === "true") {
      const seeded = await seedPixels();
      return NextResponse.json({ seeded });
    }

    const countOnly = searchParams.get("count") === "true";
    if (countOnly) {
      return NextResponse.json({ total: await prisma.pixel.count() });
    }

    const where: any = {};
    if (country) where.countryCode = country.toUpperCase();
    if (status) where.status = status;

    const pixels = await prisma.pixel.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ pixels, total: pixels.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
