"use client";
import { useEffect, useRef } from "react";

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
  const initDone = useRef(false);

  useEffect(() => {
    if (!map || checkins.length === 0) return;

    const doInit = () => {
      if (initDone.current) {
        // Already initialized — just update data
        const src = map.getSource("pixel-dots-src");
        if (src) {
          src.setData({
            type: "FeatureCollection",
            features: checkins.map(c => ({
              type: "Feature" as const,
              geometry: { type: "Point" as const, coordinates: [c.pixelLng, c.pixelLat] },
              properties: {
                id: c.id,
                color: c.color,
                name: c.name || "Anonymous",
                message: c.message || "",
                photoUrl: c.photoUrl || "",
              },
            })),
          });
          return;
        }
      }

      // Remove old layers/sources (idempotent)
      try {
        map.removeLayer("pixel-dots");
        map.removeSource("pixel-dots-src");
      } catch {}

      if (checkins.length === 0) return;

      // Add circle dots source
      map.addSource("pixel-dots-src", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: checkins.map(c => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [c.pixelLng, c.pixelLat] },
            properties: {
              id: c.id,
              color: c.color,
              name: c.name || "Anonymous",
              message: c.message || "",
              photoUrl: c.photoUrl || "",
            },
          })),
        },
      });

      // Add circle dots layer — visible at ALL zoom levels
      map.addLayer({
        id: "pixel-dots",
        type: "circle",
        source: "pixel-dots-src",
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            0,   6,    // large enough to see on globe
            3,   8,
            8,   10,
            14,  14,
          ],
          "circle-opacity": [
            "interpolate", ["linear"], ["zoom"],
            0,   1.0,
            14,  0.9,
          ],
          "circle-stroke-color": "rgba(255,255,255,0.8)",
          "circle-stroke-width": [
            "interpolate", ["linear"], ["zoom"],
            0,   1,
            14,  1.5,
          ],
        },
      });

      // Hover events
      map.on("mouseenter", "pixel-dots", (e: any) => {
        map.getCanvas().style.cursor = "pointer";
        if (!e.features?.length) return;
        hoveredPixel.current = e.features[0].properties;
      });

      map.on("mouseleave", "pixel-dots", () => {
        map.getCanvas().style.cursor = "";
        hoveredPixel.current = null;
      });

      initDone.current = true;
    };

    if (map.loaded()) {
      doInit();
    } else {
      map.once("load", doInit);
    }

    return () => {
      try {
        map.removeLayer("pixel-dots");
        map.removeSource("pixel-dots-src");
        initDone.current = false;
      } catch {}
    };
  }, [map, checkins]);

  return null;
}

export { snapToPixel };
