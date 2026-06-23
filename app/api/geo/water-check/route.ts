import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { latitude, longitude } = await req.json();

    // Use Nominatim reverse geocoding to check what is at this location
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      { headers: { "User-Agent": "KindnessMap/1.0" } }
    );
    const data = await res.json();
    const addr = data.address || {};
    const full = JSON.stringify(addr).toLowerCase();

    // Water types that are FORBIDDEN
    const waterTypes = [
      "water", "river", "lake", "sea", "ocean", "bay",
      "reservoir", "pond", "channel", "canal", "stream",
      "coast", "shore", "beach", "lagoon", "wetland"
    ];

    // Also check the "class" field from Nominatim
    const osmClass = (data.class || "").toLowerCase();
    const osmType = (data.type || "").toLowerCase();

    const isWaterClass = ["water", "waterway", "coastline"].includes(osmClass);
    const isWaterType = waterTypes.includes(osmType);

    // Keywords in the full address
    const hasWaterKeyword = waterTypes.some(t => full.includes(t));
    const isIsland = addr.place === "island" || addr.place === "islet";

    if ((isWaterClass || isWaterType || hasWaterKeyword) && !isIsland) {
      return NextResponse.json({
        allowed: false,
        reason: "Water bodies are not available for check-in. Please choose a land location.",
        feature: data.display_name,
      });
    }

    return NextResponse.json({
      allowed: true,
      feature: data.display_name,
      isIsland,
      city: addr.city || addr.town || addr.village || addr.county || "",
      country: addr.country || "",
      countryCode: addr.country_code?.toUpperCase() || "",
    });
  } catch (e) {
    console.error("Water check error:", e);
    return NextResponse.json({ allowed: false, reason: "Could not verify location. Please try again." }, { status: 500 });
  }
}
