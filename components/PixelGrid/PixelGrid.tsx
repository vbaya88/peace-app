"use client";
import { useEffect, useRef } from "react";

interface PixelCheckin {
  id: string;
  pixelLat: number;
  pixelLng: number;
  color?: string;
  name?: string;
  message?: string;
  photoUrl?: string;
  status?: string;
  countryCode?: string;
  cityName?: string;
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

function toGeoJSON(checkins: PixelCheckin[]) {
  return {
    type: "FeatureCollection" as const,
    features: checkins.map((c) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [c.pixelLng, c.pixelLat] as [number, number],
      },
      properties: {
        id: c.id,
        color: c.color || "#ffffff",
        name: c.name || "Anonymous",
        message: c.message || "",
        photoUrl: c.photoUrl || "",
        status: c.status || "AVAILABLE",
        countryCode: c.countryCode || "",
        cityName: c.cityName || "",
      },
    })),
  };
}

export default function PixelGrid({ map, checkins }: PixelGridProps) {
  const initDone = useRef(false);

  useEffect(() => {
    if (!map || !checkins?.length) return;

    const doInit = () => {
      if (initDone.current) {
        const src = map.getSource("pixel-dots-src");
        if (src) {
          src.setData(toGeoJSON(checkins));
          return;
        }
      }

      // Clean up old resources
      try {
        if (map.getLayer("pixel-dots")) map.removeLayer("pixel-dots");
        if (map.getSource("pixel-dots-src")) map.removeSource("pixel-dots-src");
      } catch (e) { /* ignore */ }

      if (checkins.length === 0) return;

      const data = toGeoJSON(checkins);

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
              14, 2
            ],
          },
        });
      } catch (e) { console.error("[PixelGrid] addLayer:", e); return; }

      initDone.current = true;
    };

    if (map.loaded()) {
      doInit();
    } else {
      map.once("load", doInit);
    }

    return () => {
      initDone.current = false;
      try {
        if (map.getLayer("pixel-dots")) map.removeLayer("pixel-dots");
        if (map.getSource("pixel-dots-src")) map.removeSource("pixel-dots-src");
      } catch {}
    };
  }, [map, checkins]);

  return null;
}
