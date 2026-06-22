/**
 * Volet (volet.com) Payment API Client
 * Docs: https://volet.com/docs
 *
 * Environment variables needed:
 *   VOLET_API_KEY     — API key from Volet dashboard
 *   VOLET_WALLET_ID  — Your wallet/account ID
 *   VOLET_API_URL    — Base URL (default: https://api.volet.io/v1)
 *   SITE_URL         — Public URL of the site (for success/cancel URLs)
 */

const VOLET_API_URL = process.env.VOLET_API_URL ?? "https://api.volet.io/v1";

export interface VoletPaymentRequest {
  amount: number; // in cents (e.g., 100 = $1.00)
  currency: string;
  orderId: string;
  description: string;
  successUrl: string;
  failUrl: string;
  metadata?: Record<string, string>;
}

export interface VoletPaymentResponse {
  id: string;
  status: string;
  paymentUrl: string;
  amount: number;
  currency: string;
  orderId: string;
}

/**
 * Create a Volet payment invoice/checkout session
 */
export async function createVoletPayment(
  params: VoletPaymentRequest
): Promise<VoletPaymentResponse> {
  const apiKey = process.env.VOLET_API_KEY;
  const walletId = process.env.VOLET_WALLET_ID;

  if (!apiKey || !walletId) {
    throw new Error("Volet API key or wallet ID not configured");
  }

  const response = await fetch(`${VOLET_API_URL}/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      order_id: params.orderId,
      description: params.description,
      success_url: params.successUrl,
      fail_url: params.failUrl,
      metadata: {
        ...params.metadata,
        wallet_id: walletId,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Volet API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  return {
    id: data.id,
    status: data.status,
    paymentUrl: data.payment_url ?? data.checkout_url ?? `${VOLET_API_URL}/invoice/${data.id}`,
    amount: data.amount,
    currency: data.currency,
    orderId: data.order_id,
  };
}

/**
 * Get payment status from Volet
 */
export async function getVoletPaymentStatus(paymentId: string): Promise<{
  id: string;
  status: "pending" | "paid" | "failed" | "cancelled";
}> {
  const apiKey = process.env.VOLET_API_KEY;

  if (!apiKey) {
    throw new Error("Volet API key not configured");
  }

  const response = await fetch(`${VOLET_API_URL}/invoices/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Volet API error ${response.status}`);
  }

  const data = await response.json();

  const statusMap: Record<string, "pending" | "paid" | "failed" | "cancelled"> = {
    pending: "pending",
    wait: "pending",
    paid: "paid",
    completed: "paid",
    succeeded: "paid",
    failed: "failed",
    cancelled: "cancelled",
  };

  return {
    id: data.id,
    status: statusMap[data.status] ?? "pending",
  };
}

/**
 * Verify Volet webhook signature
 */
export function verifyVoletWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Volet uses HMAC-SHA256 for webhook signatures
  const crypto = require("crypto") as typeof import("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return signature === expectedSignature;
}
