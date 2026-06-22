import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVoletPayment } from "@/lib/payments/volet";
import { PaymentProvider, PaymentStatus, ProductType } from "@prisma/client";

const PRODUCT_PRICES: Record<ProductType, number> = {
  PAY_SEE: 100,        // $1.00 = 100 cents
  LEAVE_MESSAGE: 200,  // $2.00
  BUY_STAR: 500,       // $5.00
  COMPANY_PROFILE: 1000, // $10.00 (basic tier)
};

const PRODUCT_NAMES: Record<ProductType, string> = {
  PAY_SEE: "Pay & See — View the kindness counter",
  LEAVE_MESSAGE: "Leave a Message — Add to the cosmic ticker",
  BUY_STAR: "Buy a Star — Name your own star",
  COMPANY_PROFILE: "Company Profile — Verified business presence",
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();

    const {
      productType,
      name,
      message,
      starName,
      companyName,
    } = body as {
      productType: ProductType;
      name?: string;
      message?: string;
      starName?: string;
      companyName?: string;
    };

    if (!productType || !(productType in PRODUCT_PRICES)) {
      return NextResponse.json(
        { error: "Invalid product type" },
        { status: 400 }
      );
    }

    const amount = PRODUCT_PRICES[productType];
    const orderId = `uok_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://payseewhopay.com";

    // Create payment record in PENDING state
    const payment = await prisma.payment.create({
      data: {
        orderId,
        userId: session?.user?.id ?? null,
        amount,
        currency: "USD",
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.VOLLET,
        productType,
        name: name ?? null,
        messageText: message ?? null,
        starName: starName ?? null,
        companyName: companyName ?? null,
      },
    });

    // Create Volet invoice
    const voletPayment = await createVoletPayment({
      amount,
      currency: "USD",
      orderId,
      description: PRODUCT_NAMES[productType],
      successUrl: `${siteUrl}/payment/success?orderId=${orderId}`,
      failUrl: `${siteUrl}/payment/failed?orderId=${orderId}`,
      metadata: {
        paymentId: payment.id,
        productType,
        userId: session?.user?.id ?? "anonymous",
      },
    });

    // Update payment with Volet ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerPaymentId: voletPayment.id },
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      paymentUrl: voletPayment.paymentUrl,
      orderId,
    });
  } catch (error) {
    console.error("[POST /api/payments/create]", error);
    return NextResponse.json(
      { error: "Failed to create payment", details: String(error) },
      { status: 500 }
    );
  }
}
