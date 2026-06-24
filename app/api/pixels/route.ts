import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CITIES = [
  { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 80 },
  { country: "US", city: "Los Angeles", lat: 34.0522, lng: -118.2437, count: 60 },
  { country: "US", city: "Chicago", lat: 41.8781, lng: -87.6298, count: 50 },
  { country: "US", city: "Houston", lat: 29.7604, lng: -95.3698, count: 40 },
  { country: "US", city: "Phoenix", lat: 33.4484, lng: -112.074, count: 35 },
  { country: "US", city: "Philadelphia", lat: 39.9526, lng: -75.1652, count: 30 },
  { country: "US", city: "San Diego", lat: 32.7157, lng: -117.1611, count: 25 },
  { country: "US", city: "Dallas", lat: 32.7767, lng: -96.797, count: 35 },
  { country: "US", city: "Miami", lat: 25.7617, lng: -80.1918, count: 35 },
  { country: "US", city: "Seattle", lat: 47.6062, lng: -122.3321, count: 30 },
  { country: "US", city: "Denver", lat: 39.7392, lng: -104.9903, count: 25 },
  { country: "US", city: "Boston", lat: 42.3601, lng: -71.0589, count: 25 },
  { country: "US", city: "Atlanta", lat: 33.749, lng: -84.388, count: 25 },
  { country: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832, count: 40 },
  { country: "CA", city: "Vancouver", lat: 49.2827, lng: -123.1207, count: 25 },
  { country: "CA", city: "Montreal", lat: 45.5017, lng: -73.5673, count: 25 },
  { country: "MX", city: "Mexico City", lat: 19.4326, lng: -99.1332, count: 50 },
  { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 70 },
  { country: "GB", city: "Manchester", lat: 53.4808, lng: -2.2426, count: 25 },
  { country: "FR", city: "Paris", lat: 48.8566, lng: 2.3522, count: 60 },
  { country: "DE", city: "Berlin", lat: 52.52, lng: 13.405, count: 50 },
  { country: "DE", city: "Munich", lat: 48.1351, lng: 11.582, count: 30 },
  { country: "DE", city: "Hamburg", lat: 53.5511, lng: 9.9937, count: 25 },
  { country: "ES", city: "Madrid", lat: 40.4168, lng: -3.7038, count: 40 },
  { country: "ES", city: "Barcelona", lat: 41.3851, lng: 2.1734, count: 35 },
  { country: "IT", city: "Rome", lat: 41.9028, lng: 12.4964, count: 45 },
  { country: "IT", city: "Milan", lat: 45.4642, lng: 9.19, count: 35 },
  { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 25 },
  { country: "SE", city: "Stockholm", lat: 59.3293, lng: 18.0686, count: 20 },
  { country: "PL", city: "Warsaw", lat: 52.2297, lng: 21.0122, count: 25 },
  { country: "CH", city: "Zurich", lat: 47.3769, lng: 8.5417, count: 15 },
  { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 80 },
  { country: "JP", city: "Osaka", lat: 34.6937, lng: 135.5023, count: 40 },
  { country: "CN", city: "Beijing", lat: 39.9042, lng: 116.4074, count: 70 },
  { country: "CN", city: "Shanghai", lat: 31.2304, lng: 121.4737, count: 60 },
  { country: "CN", city: "Shenzhen", lat: 22.5431, lng: 114.0579, count: 40 },
  { country: "HK", city: "Hong Kong", lat: 22.3193, lng: 114.1694, count: 35 },
  { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 30 },
  { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 55 },
  { country: "IN", city: "Mumbai", lat: 19.076, lng: 72.8777, count: 45 },
  { country: "IN", city: "Delhi", lat: 28.7041, lng: 77.1025, count: 40 },
  { country: "IN", city: "Bangalore", lat: 12.9716, lng: 77.5946, count: 30 },
  { country: "TH", city: "Bangkok", lat: 13.7563, lng: 100.5018, count: 35 },
  { country: "ID", city: "Jakarta", lat: -6.2088, lng: 106.8456, count: 30 },
  { country: "AE", city: "Dubai", lat: 25.2048, lng: 55.2708, count: 25 },
  { country: "IL", city: "Tel Aviv", lat: 32.0853, lng: 34.7818, count: 15 },
  { country: "BR", city: "Sao Paulo", lat: -23.5505, lng: -46.6333, count: 55 },
  { country: "BR", city: "Rio de Janeiro", lat: -22.9068, lng: -43.1729, count: 40 },
  { country: "AR", city: "Buenos Aires", lat: -34.6037, lng: -58.3816, count: 40 },
  { country: "CO", city: "Bogota", lat: 4.711, lng: -74.0721, count: 25 },
  { country: "ZA", city: "Johannesburg", lat: -26.2041, lng: 28.0473, count: 25 },
  { country: "EG", city: "Cairo", lat: 30.0444, lng: 31.2357, count: 25 },
  { country: "NG", city: "Lagos", lat: 6.5244, lng: 3.3792, count: 20 },
  { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 40 },
  { country: "AU", city: "Melbourne", lat: -37.8136, lng: 144.9631, count: 35 },
  { country: "AU", city: "Brisbane", lat: -27.4698, lng: 153.0251, count: 20 },
  { country: "NZ", city: "Auckland", lat: -36.8485, lng: 174.7633, count: 15 },
];

async function seedPixels() {
  const count = await prisma.pixel.count();
  if (count > 0) return count;

  let total = 0;
  for (const { country, city, lat, lng, count: cnt } of CITIES) {
    const placed = new Set<string>();
    const pixels = [];
    for (let i = 0; i < cnt * 3; i++) {
      const spread = 0.8 + Math.random() * 0.8;
      const gt = Math.round((lat + (Math.random() - 0.5) * 2 * spread) * 10);
      const gl = Math.round((lng + (Math.random() - 0.5) * 2 * spread) * 10);
      const key = gt + "_" + gl;
      if (placed.has(key)) continue;
      placed.add(key);
      // gridLat/gridLng = integer index; latitude/longitude = cell center
      const cellLat = gt / 10;
      const cellLng = gl / 10;
      pixels.push({
        gridLat: gt,
        gridLng: gl,
        latitude: cellLat,
        longitude: cellLng,
        countryCode: country,
        city: city,
        status: "AVAILABLE",
        color: "#1e293b",
        isPaid: false,
        priceTier: "BASIC",
      });
      if (pixels.length >= cnt) break;
    }
    // Batch in groups of 100 to avoid createMany limit
    for (let i = 0; i < pixels.length; i += 100) {
      const batch = pixels.slice(i, i + 100);
      await prisma.pixel.createMany({ data: batch as any, skipDuplicates: true });
    }
    total += pixels.length;
  }
  return total;
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
