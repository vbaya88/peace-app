import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentStatus, ProductType } from "@prisma/client";
import { verifyVoletWebhook } from "@/lib/payments/volet";

// Volet webhook event types
interface VoletWebhookEvent {
  id: string;
  type: "invoice.paid" | "invoice.failed" | "invoice.cancelled";
  data: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    order_id: string;
    metadata?: Record<string, string>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-volet-signature") ?? "";
    const secret = process.env.VOLET_WEBHOOK_SECRET ?? "";

    // Verify signature (skip in dev if no secret set)
    if (secret && !verifyVoletWebhook(rawBody, signature, secret)) {
      console.warn("[Webhook] Invalid Volet signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event: VoletWebhookEvent = JSON.parse(rawBody);

    // Handle different event types
    switch (event.type) {
      case "invoice.paid": {
        const { data } = event;
        const providerPaymentId = data.id;

        // Find the payment
        const payment = await prisma.payment.findUnique({
          where: { providerPaymentId },
        });

        if (!payment) {
          // Try by order_id
          const byOrder = await prisma.payment.findFirst({
            where: { orderId: data.order_id },
          });
          if (!byOrder) {
            console.warn("[Webhook] Payment not found:", data.order_id);
            return NextResponse.json({ received: true });
          }
          await handleSuccessfulPayment(byOrder.id, providerPaymentId, data);
          break;
        }

        await handleSuccessfulPayment(payment.id, providerPaymentId, data);
        break;
      }

      case "invoice.failed":
      case "invoice.cancelled": {
        const { data } = event;
        await prisma.payment.updateMany({
          where: { providerPaymentId: data.id },
          data: { status: PaymentStatus.FAILED },
        });
        break;
      }

      default:
        console.log("[Webhook] Unhandled event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[POST /api/payments/webhook]", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleSuccessfulPayment(
  paymentId: string,
  providerPaymentId: string,
  data: VoletWebhookEvent["data"]
) {
  // Check if already processed (idempotency)
  const existing = await prisma.payment.findUnique({
    where: { providerPaymentId },
  });

  if (existing?.status === PaymentStatus.COMPLETED) {
    console.log("[Webhook] Payment already completed:", paymentId);
    return;
  }

  // Update payment to COMPLETED
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.COMPLETED,
      providerWebhookId: providerPaymentId,
    },
  });

  // Get payment details
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) return;

  // Increment global counter
  await prisma.counter.upsert({
    where: { id: "global" },
    create: { id: "global", count: 1 },
    update: { count: { increment: 1 } },
  });

  // Handle product-specific logic
  switch (payment.productType) {
    case ProductType.PAY_SEE:
      // Just the counter increment — nothing else needed
      break;

    case ProductType.LEAVE_MESSAGE:
      if (payment.messageText && payment.name) {
        await prisma.message.create({
          data: {
            userId: payment.userId,
            name: payment.name,
            text: payment.messageText,
            locale: "en",
            isVisible: true,
            isPaid: true,
            paymentId: payment.id,
          },
        });
      }
      break;

    case ProductType.BUY_STAR:
      if (payment.starName) {
        // Generate a random position on the 3D globe surface
        // Using spherical coordinates (uniform distribution on sphere)
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 1.0;

        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        // RA in hours (0-24), Dec in degrees (-90 to 90)
        const ra = ((theta / (2 * Math.PI)) * 24).toFixed(6);
        const dec = (((Math.PI / 2) - phi) * (180 / Math.PI)).toFixed(6);

        await prisma.star.create({
          data: {
            userId: payment.userId,
            name: payment.starName,
            message: payment.messageText,
            paymentId: payment.id,
            x,
            y,
            z,
            ra: parseFloat(ra),
            dec: parseFloat(dec),
            color: getRandomStarColor(),
            size: 1.5,
          },
        });
      }
      break;

    case ProductType.COMPANY_PROFILE:
      // Company creation handled separately via profile page
      break;
  }

  console.log("[Webhook] Payment completed:", paymentId, payment.productType);
}

function getRandomStarColor(): string {
  const colors = [
    "#ffffff", // white
    "#ffe4b5", // warm
    "#add8e6", // blue
    "#ffd700", // gold
    "#ff69b4", // pink
    "#98fb98", // green
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
