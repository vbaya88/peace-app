"use client";
import { useEffect, useRef } from "react";

// Raw pixel from /api/pixels (matches Prisma Pixel model)
interface Pixel {
  id: string;
  gridLat: number;
  gridLng: number;
  latitude: number;
  longitude: number;
  countryCode: string;
  city: string | null;
  status: string;
  color: string;
  name: string | null;
  message: string | null;
  priceTier: string;
  isPaid: boolean;
}

interface PixelGridProps {
  map: any;
  pixels: Pixel[];
}

export function snapToPixel(lat: number, lng: number): [number, number] {
  // Snap to 0.1° grid cell center
  const gt = Math.round((lat + 90) * 10);
  const gl = Math.round((lng + 180) * 10);
  return [gt, gl];
}

function toGeoJSON(pixels: Pixel[]) {
  return {
    type: "FeatureCollection" as const,
    features: pixels.map((p) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [p.longitude, p.latitude] as [number, number],
      },
      properties: {
        id: p.id,
        gridLat: p.gridLat,
        gridLng: p.gridLng,
        color: p.color || "#ffffff",
        name: p.name || "Anonymous",
        message: p.message || "",
        status: p.status || "AVAILABLE",
        countryCode: p.countryCode || "",
        city: p.city || "",
        priceTier: p.priceTier || "BASIC",
      },
    })),
  };
}

export default function PixelGrid({ map, pixels }: PixelGridProps) {
  const initDone = useRef(false);

  useEffect(() => {
    if (!map) return;

    const doInit = () => {
      if (initDone.current) {
        const src = map.getSource("pixel-dots-src");
        if (src) {
          src.setData(toGeoJSON(pixels || []));
          return;
        }
      }

      // Clean up old resources
      try {
        if (map.getLayer("pixel-dots")) map.removeLayer("pixel-dots");
        if (map.getSource("pixel-dots-src")) map.removeSource("pixel-dots-src");
      } catch (e) { /* ignore */ }

      const data = toGeoJSON(pixels || []);

      try {
        map.addSource("pixel-dots-src", { type: "geojson", data });
      } catch (e) { console.error("[PixelGrid] addSource:", e); return; }

      try {
        map.addLayer({
          id: "pixel-dots",
          type: "circle",
          source: "pixel-dots-src",
          paint: {
            // Available = dark slate, Claimed = bright user color
            "circle-color": [
              "case",
              ["==", ["get", "status"], "AVAILABLE"], "#1e293b",
              ["get", "color"]
            ],
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              0, 5,
              3, 8,
              8, 11,
              14, 14
            ],
            "circle-opacity": 1.0,
            "circle-stroke-color": [
              "case",
              ["==", ["get", "status"], "AVAILABLE"], "rgba(255,255,255,0.15)",
              "rgba(255,255,255,0.9)"
            ],
            "circle-stroke-width": [
              "interpolate", ["linear"], ["zoom"],
              0, 0.8,
              3, 1.2,
              8, 1.5,
              14, 2
            ],
          },
        });
      } catch (e) { console.error("[PixelGrid] addLayer:", e); }

      initDone.current = true;
    };

    if (map.loaded()) {
      doInit();
    } else {
      map.on("load", doInit);
    }

    return () => {
      try {
        if (map.getLayer("pixel-dots")) map.removeLayer("pixel-dots");
        if (map.getSource("pixel-dots-src")) map.removeSource("pixel-dots-src");
      } catch (e) { /* ignore */ }
      initDone.current = false;
    };
  }, [map, pixels]);
}
