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

// Snap coordinates to pixel grid
function snapToPixel(lat: number, lng: number): [number, number] {
  const latStep = 10 / 111320;
  const lngStep = 10 / (111320 * Math.cos((lat * Math.PI) / 180));
  const snappedLat = Math.round(lat / latStep) * latStep;
  const snappedLng = Math.round(lng / lngStep) * lngStep;
  return [snappedLat, snappedLng];
}

export default function PixelGrid({ map, checkins }: PixelGridProps) {
  const hoveredPixel = useRef<{ lat: number; lng: number; name: string; message: string; photoUrl: string; color: string } | null>(null);
  const drawnRef = useRef(false);

  const drawPixels = useCallback(() => {
    if (!map || !map.loaded() || drawnRef.current) return;

    // Remove old layers/sources
    if (map.getLayer("pixel-dots")) map.removeLayer("pixel-dots");
    if (map.getLayer("pixel-grid-fill")) map.removeLayer("pixel-grid-fill");
    if (map.getLayer("pixel-grid-outline")) map.removeLayer("pixel-grid-outline");
    if (map.getSource("pixels")) map.removeSource("pixels");
    if (map.getSource("pixel-dots-src")) map.removeSource("pixel-dots-src");

    if (checkins.length === 0) return;

    // === LAYER 1: Circle dots (visible at ALL zoom levels for globe view) ===
    const dotFeatures = checkins.map(c => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [c.pixelLng, c.pixelLat] },
      properties: {
        id: c.id,
        color: c.color,
        name: c.name || "Anonymous",
        message: c.message || "",
        photoUrl: c.photoUrl || "",
      },
    }));

    map.addSource("pixel-dots-src", {
      type: "geojson",
      data: { type: "FeatureCollection", features: dotFeatures },
    });

    map.addLayer({
      id: "pixel-dots",
      type: "circle",
      source: "pixel-dots-src",
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": [
          "interpolate", ["linear"], ["zoom"],
          0,   4,
          2,   5,
          5,   8,
          10,  12,
          14,  16,
        ],
        "circle-opacity": [
          "interpolate", ["linear"], ["zoom"],
          0,   0.9,
          2,   0.95,
          8,   0.85,
          14,  0.7,
        ],
        "circle-stroke-color": "rgba(255,255,255,0.6)",
        "circle-stroke-width": [
          "interpolate", ["linear"], ["zoom"],
          0,   0.5,
          10,  1,
        ],
        "circle-blur": 0.3,
      },
    });

    // === LAYER 2: Pixel polygons (visible when zoomed in) ===
    const polyFeatures = checkins.map(c => {
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
      data: { type: "FeatureCollection", features: polyFeatures },
    });

    map.addLayer({
      id: "pixel-grid-fill",
      type: "fill",
      source: "pixels",
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": [
          "interpolate", ["linear"], ["zoom"],
          10, 0.05,
          13, 0.6,
          15, 0.85,
          18, 0.95,
        ],
      },
    });

    map.addLayer({
      id: "pixel-grid-outline",
      type: "line",
      source: "pixels",
      minzoom: 14,
      paint: {
        "line-color": "rgba(255,255,255,0.4)",
        "line-width": 1,
      },
    });

    // Popup on hover
    map.on("mouseenter", "pixel-dots", (e: any) => {
      map.getCanvas().style.cursor = "pointer";
      if (!e.features?.length) return;
      const p = e.features[0].properties;
      hoveredPixel.current = p;
    });

    map.on("mouseleave", "pixel-dots", () => {
      map.getCanvas().style.cursor = "";
      hoveredPixel.current = null;
    });

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

    drawnRef.current = true;
  }, [map, checkins]);

  useEffect(() => {
    if (!map) return;
    if (map.loaded()) {
      drawPixels();
    } else {
      map.once("load", drawPixels);
    }
    return () => {
      drawnRef.current = false;
      try {
        if (map.getLayer("pixel-dots")) map.removeLayer("pixel-dots");
        if (map.getLayer("pixel-grid-fill")) map.removeLayer("pixel-grid-fill");
        if (map.getLayer("pixel-grid-outline")) map.removeLayer("pixel-grid-outline");
        if (map.getSource("pixels")) map.removeSource("pixels");
        if (map.getSource("pixel-dots-src")) map.removeSource("pixel-dots-src");
      } catch {}
    };
  }, [map, drawPixels]);

  // Redraw when checkins change
  useEffect(() => {
    if (map && map.loaded() && checkins.length > 0) {
      drawnRef.current = false;
      drawPixels();
    }
  }, [checkins, map, drawPixels]);

  return null;
}

export { snapToPixel };
