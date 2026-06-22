import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PaymentStatus, ProductType } from "@prisma/client";

// GET /api/counter — вернуть текущий счётчик
export async function GET() {
  try {
    const counter = await prisma.counter.findUnique({
      where: { id: "global" },
    });

    return NextResponse.json({
      count: counter?.count ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/counter]", error);
    return NextResponse.json(
      { error: "Failed to fetch counter" },
      { status: 500 }
    );
  }
}

// POST /api/counter — инкремент после успешной оплаты (вызывается из webhook)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerWebhookId, increment } = body;

    // Verify it's from our own webhook or has a secret
    const secret = request.headers.get("x-api-secret");
    if (secret !== process.env.INCREMENT_SECRET && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prevent double-increment via replay attacks
    if (providerWebhookId) {
      const existing = await prisma.payment.findUnique({
        where: { providerWebhookId },
      });
      if (existing) {
        return NextResponse.json({ error: "Already processed", count: 0 });
      }
    }

    // Increment counter (upsert pattern)
    const counter = await prisma.counter.upsert({
      where: { id: "global" },
      create: { id: "global", count: 1 },
      update: { count: { increment: increment ?? 1 } },
    });

    return NextResponse.json({
      success: true,
      count: counter.count,
    });
  } catch (error) {
    console.error("[POST /api/counter]", error);
    return NextResponse.json(
      { error: "Failed to increment counter" },
      { status: 500 }
    );
  }
}
