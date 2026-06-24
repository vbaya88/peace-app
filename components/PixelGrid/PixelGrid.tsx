"use client";
import React, { useEffect, useRef } from "react";

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

// Grid step matches seed/route.ts GRID_STEP = 0.05
const GRID_STEP = 0.05;

export function snapToPixel(lat: number, lng: number): [number, number] {
  const gt = Math.round((lat + 90) / GRID_STEP) * GRID_STEP;
  const gl = Math.round((lng + 180) / GRID_STEP) * GRID_STEP;
  return [gt, gl];
}

// Build grid cell polygons from pixel centers
function pixelToCellFeature(p: Pixel) {
  const half = GRID_STEP / 2;
  const [minLng, maxLng] = [p.longitude - half, p.longitude + half];
  const [minLat, maxLat] = [p.latitude - half, p.latitude + half];
  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [[
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
      ]] as unknown as [number, number][],
    },
    properties: {
      id: p.id,
      status: p.status || "AVAILABLE",
      color: p.color || "#1e293b",
      countryCode: p.countryCode || "",
      city: p.city || "",
    },
  };
}

function toGeoJSON(pixels: Pixel[]) {
  // Grid fill (polygons for each cell)
  const features = pixels.map(pixelToCellFeature);
  return { type: "FeatureCollection" as const, features };
}

function toDotsGeoJSON(pixels: Pixel[]) {
  // Center dots (for claimed pixels — bright marker)
  return {
    type: "FeatureCollection" as const,
    features: pixels.filter(p => p.status !== "AVAILABLE").map((p) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.longitude, p.latitude] as [number, number] },
      properties: {
        id: p.id,
        color: p.color || "#ffffff",
        name: p.name || "Anonymous",
        status: p.status,
        countryCode: p.countryCode,
        city: p.city,
      },
    })),
  };
}

export default function PixelGrid({ map, pixels }: PixelGridProps): React.ReactElement | null {
  const initDone = useRef(false);

  useEffect(() => {
    if (!map) return;

    const doInit = () => {
      if (initDone.current) {
        // Update data on existing sources
        const fillSrc = map.getSource("pixel-grid-src");
        if (fillSrc) fillSrc.setData(toGeoJSON(pixels || []));
        const dotSrc = map.getSource("pixel-dots-src");
        if (dotSrc) dotSrc.setData(toDotsGeoJSON(pixels || []));
        return;
      }

      // Clean up old resources
      try {
        ["pixel-grid-fill", "pixel-grid-line", "pixel-dots"].forEach(id => {
          try { if (map.getLayer(id)) map.removeLayer(id); } catch (_) {}
        });
        ["pixel-grid-src", "pixel-dots-src"].forEach(id => {
          try { if (map.getSource(id)) map.removeSource(id); } catch (_) {}
        });
      } catch (_) {}

      const fillData = toGeoJSON(pixels || []);
      const dotData = toDotsGeoJSON(pixels || []);

      try {
        map.addSource("pixel-grid-src", { type: "geojson", data: fillData });
        map.addSource("pixel-dots-src", { type: "geojson", data: dotData });
      } catch (e) { console.error("[PixelGrid] addSource:", e); return; }

      // Layer 1: Grid cell FILL (available = dark translucent, claimed = user color)
      try {
        map.addLayer({
          id: "pixel-grid-fill",
          type: "fill",
          source: "pixel-grid-src",
          paint: {
            "fill-color": [
              "case",
              ["==", ["get", "status"], "AVAILABLE"],
              "rgba(99, 102, 241, 0.08)",     // indigo-500 at 8% opacity
              ["get", "color"]
            ],
            "fill-opacity": [
              "case",
              ["==", ["get", "status"], "AVAILABLE"],
              1.0,
              0.5,
            ],
            "fill-outline-color": "rgba(148, 163, 184, 0.25)", // slate-400 at 25%
          },
        });
      } catch (e) { console.error("[PixelGrid] fill layer:", e); }

      // Layer 2: Grid cell LINES (always visible borders)
      try {
        map.addLayer({
          id: "pixel-grid-line",
          type: "line",
          source: "pixel-grid-src",
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "status"], "AVAILABLE"],
              "rgba(148, 163, 184, 0.18)",   // subtle gray for available
              "rgba(255, 255, 255, 0.6)",    // bright white for claimed
            ],
            "line-width": [
              "interpolate", ["linear"], ["zoom"],
              0, 0.3,
              4, 0.6,
              8, 1.0,
              12, 1.5,
            ],
            "line-opacity": 1.0,
          },
        });
      } catch (e) { console.error("[PixelGrid] line layer:", e); }

      // Layer 3: Claimed pixel DOTS (bright circles on claimed cells)
      try {
        map.addLayer({
          id: "pixel-dots",
          type: "circle",
          source: "pixel-dots-src",
          paint: {
            "circle-color": ["get", "color"],
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              2, 6,
              6, 10,
              10, 14,
              14, 18,
            ],
            "circle-opacity": 0.9,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": [
              "interpolate", ["linear"], ["zoom"],
              2, 1,
              8, 2,
              14, 3,
            ],
          },
        });
      } catch (e) { console.error("[PixelGrid] dots layer:", e); }

      initDone.current = true;
    };

    if (map.loaded()) {
      doInit();
    } else {
      map.on("load", doInit);
    }

    return () => {
      try {
        ["pixel-grid-fill", "pixel-grid-line", "pixel-dots"].forEach(id => {
          try { if (map.getLayer(id)) map.removeLayer(id); } catch (_) {}
        });
        ["pixel-grid-src", "pixel-dots-src"].forEach(id => {
          try { if (map.getSource(id)) map.removeSource(id); } catch (_) {}
        });
      } catch (_) {}
      initDone.current = false;
    };
  }, [map, pixels]);

  return null;
}
