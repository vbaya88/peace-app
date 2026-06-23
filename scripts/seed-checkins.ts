/**
 * Seed script: 1000 test check-ins across 20 countries/cities
 * Run: npx tsx scripts/seed-checkins.ts
 */
import { prisma } from "@/lib/prisma";

// 20 cities across the world — [city, country, lat, lng]
const CITIES = [
  ["New York",       "US",      40.7128,   -74.0060],
  ["Los Angeles",    "US",      34.0522,  -118.2437],
  ["London",         "GB",      51.5074,    -0.1278],
  ["Paris",          "FR",      48.8566,     2.3522],
  ["Berlin",         "DE",      52.5200,    13.4050],
  ["Tokyo",          "JP",      35.6762,   139.6503],
  ["Sydney",         "AU",     -33.8688,   151.2093],
  ["Moscow",         "RU",      55.7558,    37.6173],
  ["Dubai",          "AE",      25.2048,    55.2708],
  ["Singapore",      "SG",       1.3521,   103.8198],
  ["Mumbai",         "IN",      19.0760,    72.8777],
  ["São Paulo",      "BR",     -23.5505,   -46.6333],
  ["Cairo",          "EG",      30.0444,    31.2357],
  ["Lagos",          "NG",       6.5244,     3.3792],
  ["Nairobi",        "KE",      -1.2921,    36.8219],
  ["Toronto",        "CA",      43.6532,   -79.3832],
  ["Mexico City",    "MX",      19.4326,   -99.1332],
  ["Seoul",          "KR",      37.5665,   126.9780],
  ["Istanbul",       "TR",      41.0082,    28.9784],
  ["Buenos Aires",   "AR",     -34.6037,   -58.3816],
];

// Random kindness messages
const MESSAGES = [
  "Kindness starts with a smile! 😊",
  "Spreading love around the world 🌍",
  "We are all connected 💜",
  "One act of kindness can change everything",
  "Peace begins with each of us ✨",
  "Let's make the world a better place!",
  "Kindness is contagious 💕",
  "Every small act counts 🌟",
  "Love and peace to everyone 🕊️",
  "Be the change you wish to see 🌈",
  "Kindness costs nothing but means everything 💖",
  "Together we are stronger 🤝",
  "Spread kindness wherever you go 🌻",
  "A kinder world is possible 🌍",
  "Small gestures, big impact ✊",
  "Choose kindness today and every day 💛",
  "We rise by lifting others 🌅",
  "Kindness makes the world go round 🌍",
  "Share your light with the world ✨",
  "One person can make a difference 💫",
  "Be kind whenever possible 🦋",
  "The world needs more love 💗",
  "Peace, love, and kindness 🌸",
  "Every heartbeat matters ❤️",
  "Let's plant seeds of kindness 🌱",
];

// Random first + last names
const FIRST = ["Alex","Maria","Sam","Priya","Chen","Amara","Liam","Sofia","Yuki","Fatima","Carlos","Anna","Raj","Emma","Ivan","Olivia","Mika","Julia","Dani","Nia"];
const LAST  = ["Smith","Garcia","Patel","Chen","Johnson","Williams","Brown","Jones","Miller","Davis","Wilson","Moore","Taylor","Anderson","Thomas","Jackson","White","Harris","Martin","Thompson"];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function gaussianRand(): number {
  // Box-Muller transform for somewhat natural distribution
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function jitter(base: number, spread: number): number {
  return base + gaussianRand() * spread;
}

function randomName(): string {
  return `${rand(FIRST)}_${rand(LAST)}`;
}

// Reliable cat image from Unsplash (free to use, no auth required)
const CAT_IMAGE = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=100&q=80";

async function main() {
  console.log("🗑️  Clearing existing check-ins...");
  await prisma.checkin.deleteMany({});

  console.log("🌍 Seeding 1000 check-ins across 20 cities...");
  const checkins: any[] = [];

  for (let i = 0; i < 1000; i++) {
    const [city, countryCode, baseLat, baseLng] = rand(CITIES);
    // Spread ~2-3km around city centre
    const lat = jitter(baseLat as number, 0.025);
    const lng = jitter(baseLng as number, 0.035);
    const zoom = Math.floor(Math.random() * 4) + 8; // 8–11

    checkins.push({
      name: randomName(),
      message: rand(MESSAGES),
      photoUrl: CAT_IMAGE,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      zoomLevel: zoom,
      countryCode,
      city,
      isVisible: true,
      isPaid: i < 200, // 200 are "paid", 800 are free test
    });

    // Batch insert every 100
    if (checkins.length >= 100) {
      await prisma.checkin.createMany({ data: checkins.splice(0, 100) });
      process.stdout.write(`\r✓ Inserted ${i + 1}/1000...`);
    }
  }

  if (checkins.length > 0) {
    await prisma.checkin.createMany({ data: checkins });
  }

  // Update counter to 1000
  await prisma.counter.upsert({
    where: { id: "global" },
    update: { count: 1000 },
    create: { id: "global", count: 1000 },
  });

  const total = await prisma.checkin.count();
  console.log(`\n✅ Done! Total check-ins in DB: ${total}`);
  console.log("📍 Cities covered:", CITIES.map(([c]) => c).join(", "));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
