import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CITIES: [string,string,number,number][] = [
  ["New York","US",40.7128,-74.0060],["Los Angeles","US",34.0522,-118.2437],
  ["London","GB",51.5074,-0.1278],["Paris","FR",48.8566,2.3522],
  ["Berlin","DE",52.5200,13.4050],["Tokyo","JP",35.6762,139.6503],
  ["Sydney","AU",-33.8688,151.2093],["Moscow","RU",55.7558,37.6173],
  ["Dubai","AE",25.2048,55.2708],["Singapore","SG",1.3521,103.8198],
  ["Mumbai","IN",19.0760,72.8777],["São Paulo","BR",-23.5505,-46.6333],
  ["Cairo","EG",30.0444,31.2357],["Lagos","NG",6.5244,3.3792],
  ["Nairobi","KE",-1.2921,36.8219],["Toronto","CA",43.6532,-79.3832],
  ["Mexico City","MX",19.4326,-99.1332],["Seoul","KR",37.5665,126.9780],
  ["Istanbul","TR",41.0082,28.9784],["Buenos Aires","AR",-34.6037,-58.3816],
];
const MSGS = ["Kindness! 😊","Love 🌍","We are connected 💜","One act changes everything","Peace ✨","Make the world better!","Kindness is contagious 💕","Every small act counts 🌟","We rise by lifting others 🌅","Small gestures, big impact ✊","Share your light ✨","Every heartbeat matters ❤️","Plant seeds of kindness 🌱","Choose kindness 💛","Together stronger 🤝","A kinder world 🦋","Love and peace 🕊️","Be the change 🌈","One person makes a difference 💫","Kindness makes the world go round 🌍"];
const COLORS = ["#818cf8","#f472b6","#34d399","#fbbf24","#60a5fa","#a78bfa","#f87171","#4ade80","#e879f9","#facc15","#38bdf8","#c084fc","#fb923c","#2dd4bf","#f43f5e","#a3e635"];
const FIRST = ["Alex","Maria","Sam","Priya","Chen","Amara","Liam","Sofia","Yuki","Fatima","Carlos","Anna","Raj","Emma","Ivan","Olivia","Mika","Julia","Dani","Nia"];
const LAST  = ["Smith","Garcia","Patel","Chen","Johnson","Williams","Brown","Jones","Miller","Davis","Wilson","Moore","Taylor","Anderson","Thomas","Jackson","White","Harris","Martin","Thompson"];
const CAT_IMG = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=100&q=80";

function r<T>(a: T[]): T { return a[Math.floor(Math.random()*a.length)]; }

function j(base: number, sp: number): number {
  let u=0,v=0;
  while(!u) u = Math.random();
  while(!v) v = Math.random();
  return base + Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)*sp;
}

export async function GET() {
  try {
    return NextResponse.json({ total: await prisma.checkin.count() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const clear = new URL(req.url).searchParams.get("clear") === "true";
  try {
    if (clear) await prisma.checkin.deleteMany({});

    const TOTAL = 1000, BATCH = 100;
    let seeded = 0;

    while (seeded < TOTAL) {
      const batch: any[] = [];
      for (let i = 0; i < Math.min(BATCH, TOTAL - seeded); i++) {
        const [city, cc, bl, bln] = r(CITIES);
        batch.push({
          name: `${r(FIRST)}_${r(LAST)}`,
          message: r(MSGS),
          photoUrl: CAT_IMG,
          latitude: parseFloat(j(bl, 0.025).toFixed(6)),
          longitude: parseFloat(j(bln, 0.035).toFixed(6)),
          color: r(COLORS),
          pixelLat: parseFloat(j(bl, 0.00009).toFixed(6)),
          pixelLng: parseFloat(j(bln, 0.00013).toFixed(6)),
          level: "pixel",
          zoomLevel: Math.floor(Math.random() * 4) + 8,
          countryCode: cc,
          city,
          isVisible: true,
          isPaid: seeded + i < 200,
        });
      }
      await prisma.checkin.createMany({ data: batch });
      seeded += batch.length;
    }

    await prisma.counter.upsert({
      where: { id: "global" },
      update: { count: TOTAL },
      create: { id: "global", count: TOTAL },
    });

    return NextResponse.json({ ok: true, total: await prisma.checkin.count() });
  } catch(e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
