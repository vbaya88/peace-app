"use client";
import { useEffect, useRef, useCallback } from "react";

interface PixelCheckin {
  id: string;
  pixelLat: number;
  pixelLng: number;
  color: string;
  name?: string;
  message?: string;
  photoUrl?: string;
}

interface PixelGridProps {
  map: any;
  checkins: PixelCheckin[];
}

// Snap coordinates to 10m pixel grid
function snapToPixel(lat: number, lng: number): [number, number] {
  const latStep = 10 / 111320;
  const lngStep = 10 / (111320 * Math.cos((lat * Math.PI) / 180));
  const snappedLat = Math.round(lat / latStep) * latStep;
  const snappedLng = Math.round(lng / lngStep) * lngStep;
  return [snappedLat, snappedLng];
}

export default function PixelGrid({ map, checkins }: PixelGridProps) {
  const hoveredPixel = useRef<{ lat: number; lng: number; name: string; message: string; photoUrl: string; color: string } | null>(null);

  const drawPixels = useCallback(() => {
    if (!map || !map.loaded()) return;

    // Remove old layers/sources
    if (map.getLayer("pixel-grid-fill")) map.removeLayer("pixel-grid-fill");
    if (map.getLayer("pixel-grid-outline")) map.removeLayer("pixel-grid-outline");
    if (map.getSource("pixels")) map.removeSource("pixels");

    if (checkins.length === 0) return;

    // Build pixel polygons (10m × 10m squares)
    const features = checkins.map(c => {
      const [lat, lng] = snapToPixel(c.pixelLat, c.pixelLng);
      const dLat = 10 / 111320;
      const dLng = 10 / (111320 * Math.cos((lat * Math.PI) / 180));
      return {
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [lng - dLng / 2, lat - dLat / 2],
            [lng + dLng / 2, lat - dLat / 2],
            [lng + dLng / 2, lat + dLat / 2],
            [lng - dLng / 2, lat + dLat / 2],
            [lng - dLng / 2, lat - dLat / 2],
          ]],
        },
        properties: {
          id: c.id,
          color: c.color,
          name: c.name || "Anonymous",
          message: c.message || "",
          photoUrl: c.photoUrl || "",
        },
      };
    });

    map.addSource("pixels", {
      type: "geojson",
      data: { type: "FeatureCollection", features },
    });

    map.addLayer({
      id: "pixel-grid-fill",
      type: "fill",
      source: "pixels",
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": [
          "interpolate", ["linear"], ["zoom"],
          3, 0.05,
          8, 0.7,
          14, 0.9,
        ],
      },
    });

    map.addLayer({
      id: "pixel-grid-outline",
      type: "line",
      source: "pixels",
      minzoom: 15,
      paint: {
        "line-color": "rgba(255,255,255,0.3)",
        "line-width": 0.5,
      },
    });

    // Popup on hover
    map.on("mouseenter", "pixel-grid-fill", (e: any) => {
      map.getCanvas().style.cursor = "pointer";
      if (!e.features?.length) return;
      const p = e.features[0].properties;
      hoveredPixel.current = p;
    });

    map.on("mouseleave", "pixel-grid-fill", () => {
      map.getCanvas().style.cursor = "";
      hoveredPixel.current = null;
    });
  }, [map, checkins]);

  useEffect(() => {
    if (!map) return;
    if (map.loaded()) {
      drawPixels();
    } else {
      map.on("load", drawPixels);
    }
    return () => {
      if (map.getLayer("pixel-grid-fill")) map.removeLayer("pixel-grid-fill");
      if (map.getLayer("pixel-grid-outline")) map.removeLayer("pixel-grid-outline");
      if (map.getSource("pixels")) map.removeSource("pixels");
    };
  }, [map, drawPixels]);

  // Redraw when checkins change
  useEffect(() => {
    if (map && map.loaded()) drawPixels();
  }, [checkins, map, drawPixels]);

  return null;
}

export { snapToPixel };
