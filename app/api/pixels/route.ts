import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/pixels?country=US&status=AVAILABLE&limit=100
// Returns list of pixels, optionally filtered by country
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country");
  const status = searchParams.get("status") as any;
  const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 500);

  try {
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
