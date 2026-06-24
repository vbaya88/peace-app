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

export function snapToPixel(lat: number, lng: number): [number, number] {
  const latStep = 10 / 111320;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const lngStep = 10 / (111320 * cosLat);
  const snappedLat = Math.round(lat / latStep) * latStep;
  const snappedLng = Math.round(lng / lngStep) * lngStep;
  return [snappedLat, snappedLng];
}

export default function PixelGrid({ map, checkins }: PixelGridProps) {
  const hoveredPixel = useRef<PixelCheckin | null>(null);
  const initDone = useRef(false);

  useEffect(() => {
    console.log("[PixelGrid] effect fired — map=", typeof map, "checkins=", checkins?.length);

    if (!map || !checkins?.length) {
      console.log("[PixelGrid] early return: map missing or no checkins");
      return;
    }

    const doInit = () => {
      console.log("[PixelGrid] doInit — initDone=", initDone.current, "checkins=", checkins.length);

      if (initDone.current) {
        const src = map.getSource("pixel-dots-src");
        console.log("[PixelGrid] already inited — src=", !!src, "layer=", map.getLayer("pixel-dots") ? "exists" : "missing");
        if (src) {
          src.setData({
            type: "FeatureCollection",
            features: checkins.map(c => ({
              type: "Feature" as const,
              geometry: { type: "Point" as const, coordinates: [c.pixelLng, c.pixelLat] },
              properties: { id: c.id, color: c.color || "#fff", name: c.name || "Anonymous", message: c.message || "", photoUrl: c.photoUrl || "" },
            })),
          });
          console.log("[PixelGrid] data updated, features=", checkins.length);
          return;
        } else {
          console.warn("[PixelGrid] source missing, will recreate");
        }
      }

      // Clean up old resources
      try {
        if (map.getLayer("pixel-dots")) { map.removeLayer("pixel-dots"); }
        if (map.getSource("pixel-dots-src")) { map.removeSource("pixel-dots-src"); }
      } catch (e) { console.warn("[PixelGrid] cleanup:", e); }

      if (checkins.length === 0) { console.log("[PixelGrid] no checkins, skip layer"); return; }

      // Build GeoJSON
      const features = checkins.map(c => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [c.pixelLng, c.pixelLat] },
        properties: { id: c.id, color: c.color || "#ffffff", name: c.name || "Anonymous", message: c.message || "", photoUrl: c.photoUrl || "" },
      }));
      console.log("[PixelGrid] creating source + layer with", features.length, "features");

      try {
        map.addSource("pixel-dots-src", { type: "geojson", data: { type: "FeatureCollection", features } });
        console.log("[PixelGrid] source added OK");
      } catch (e) { console.error("[PixelGrid] addSource error:", e); return; }

      try {
        map.addLayer({
          id: "pixel-dots", type: "circle", source: "pixel-dots-src",
          paint: {
            "circle-color": ["get", "color"],
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 8, 3, 10, 8, 12, 14, 16],
            "circle-opacity": 1.0,
            "circle-stroke-color": "rgba(255,255,255,0.9)",
            "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 0, 1.5, 14, 2],
          },
        });
        console.log("[PixelGrid] layer added OK");
      } catch (e) { console.error("[PixelGrid] addLayer error:", e); return; }

      // Hover
      try {
        map.on("mouseenter", "pixel-dots", (e: any) => {
          map.getCanvas().style.cursor = "pointer";
          if (e.features?.length) hoveredPixel.current = e.features[0].properties;
        });
        map.on("mouseleave", "pixel-dots", () => { map.getCanvas().style.cursor = ""; hoveredPixel.current = null; });
      } catch (e) { console.warn("[PixelGrid] hover events:", e); }

      initDone.current = true;
      console.log("[PixelGrid] init complete");
    };

    if (map.loaded()) {
      doInit();
    } else {
      console.log("[PixelGrid] waiting for map load");
      map.once("load", doInit);
    }

    return () => {
      try {
        map.removeLayer("pixel-dots");
        map.removeSource("pixel-dots-src");
        initDone.current = false;
        console.log("[PixelGrid] cleanup done");
      } catch {}
    };
  }, [map, checkins]);

  return null;
}
