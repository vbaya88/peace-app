import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/stars — получить все активные звёзды для 3D глобуса
export async function GET() {
  try {
    const stars = await prisma.star.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        message: true,
        x: true,
        y: true,
        z: true,
        color: true,
        size: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ stars });
  } catch (error) {
    console.error("[GET /api/stars]", error);
    return NextResponse.json(
      { error: "Failed to fetch stars" },
      { status: 500 }
    );
  }
}
