import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/checkins — return all visible check-ins
export async function GET() {
  try {
    const checkins = await prisma.checkin.findMany({
      where: { isVisible: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    return NextResponse.json({ checkins });
  } catch (error) {
    console.error("[/api/checkins GET]", error);
    return NextResponse.json({ error: "Failed to load check-ins" }, { status: 500 });
  }
}

// POST /api/checkins — create a new check-in (requires $1 payment)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, message, latitude, longitude, zoomLevel, photoUrl, paymentId, level } = body;
    const color = body.color || "#818cf8";

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json({ error: "Latitude and longitude are required" }, { status: 400 });
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    // Validate not on water
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const waterRes = await fetch(`${origin}/api/geo/water-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude, longitude }),
    });
    const waterData = await waterRes.json();
    if (!waterData.allowed) {
      return NextResponse.json({ error: waterData.reason }, { status: 400 });
    }

    // BLOCK ANTARCTICA
    if (latitude < -60) {
      return NextResponse.json(
        { error: "Antarctica is not available for check-ins yet. This region will be enabled in a future update." },
        { status: 400 }
      );
    }

    // Use location from water check response
    const countryCode = waterData.countryCode || "XX";
    const city = waterData.city || "Unknown";

    const checkin = await prisma.checkin.create({
      data: {
        name: name.trim(),
        message: message?.trim() || null,
        latitude,
        longitude,
        zoomLevel: zoomLevel || 10,
        countryCode,
        city,
        photoUrl: photoUrl || null,
        paymentId: paymentId || null,
        isPaid: !!paymentId,
        isVisible: true,
        // Pixel War fields
        color,
        pixelLat: latitude,
        pixelLng: longitude,
        level: level || "pixel",
      },
    });

    return NextResponse.json({ checkin }, { status: 201 });
  } catch (error) {
    console.error("[/api/checkins POST]", error);
    return NextResponse.json({ error: "Failed to create check-in" }, { status: 500 });
  }
}
