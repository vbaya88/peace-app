import { NextResponse } from "next/server";

// Expose safe runtime env vars to the client
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  const allowedKeys: Record<string, string> = {
    mapbox_token: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "",
    site_url: process.env.NEXT_PUBLIC_SITE_URL || "",
  };

  if (!key || !allowedKeys[key]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ value: allowedKeys[key] });
}
