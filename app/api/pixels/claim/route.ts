import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GEO_API = "http://ip-api.com/json";
const RATE_LIMIT = 45; // ip-api.com free tier: 45 req/min

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function getCountryCode(ip: string): Promise<string | null> {
  // Skip for localhost/private IPs
  if (ip === "unknown" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    // Fallback: return a test country (dev mode)
    return "US";
  }
  try {
    const res = await fetch(`${GEO_API}/${ip}?fields=status,countryCode`);
    const data = await res.json();
    if (data.status === "success" && data.countryCode) {
      return data.countryCode;
    }
  } catch {}
  return null;
}

// POST /api/pixels/claim
// Body: { pixelId: string, name: string, color: string, message?: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pixelId, name, color, message } = body;

    if (!pixelId || !name || !color) {
      return NextResponse.json({ error: "Missing required fields: pixelId, name, color" }, { status: 400 });
    }

    // 1. Get pixel
    const pixel = await prisma.pixel.findUnique({ where: { id: pixelId } });
    if (!pixel) {
      return NextResponse.json({ error: "Pixel not found" }, { status: 404 });
    }

    // 2. Geo-IP country validation (Phase 1 key rule!)
    const clientIp = getClientIp(req);
    const userCountry = await getCountryCode(clientIp);

    if (!userCountry) {
      return NextResponse.json({ error: "Could not determine your country. Please try again." }, { status: 400 });
    }

    if (pixel.countryCode !== userCountry) {
      return NextResponse.json({
        error: `You can only claim pixels in ${userCountry}. This pixel belongs to ${pixel.countryCode}.`,
        code: "COUNTRY_MISMATCH",
        yourCountry: userCountry,
        pixelCountry: pixel.countryCode,
      }, { status: 403 });
    }

    // 3. Check availability
    if (pixel.status !== "AVAILABLE") {
      return NextResponse.json({
        error: "Pixel already claimed",
        status: pixel.status,
      }, { status: 409 });
    }

    // 4. Claim pixel
    const updated = await prisma.pixel.update({
      where: { id: pixelId },
      data: {
        status: "CLAIMED",
        name,
        color,
        message: message || null,
        isPaid: false, // Phase 1: free claiming (payment in later phases)
      },
    });

    return NextResponse.json({
      ok: true,
      pixel: updated,
      message: `Pixel in ${pixel.city}, ${pixel.countryCode} claimed!`,
    });
  } catch (e) {
    console.error("[/api/pixels/claim]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
