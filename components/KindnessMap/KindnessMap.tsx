"use client";
import { useEffect, useRef, useState } from "react";
import { snapToPixel } from "@/components/PixelGrid/PixelGrid";

const WATER_CHECK_API = "/api/geo/water-check";

// Pixel record from /api/pixels (matches Prisma Pixel model)
interface PixelRecord {
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

interface KindnessMapProps {
  isPlacingMode?: boolean;
  onLocationSelect?: (pixelLat: number, pixelLng: number, label: string) => void;
  onMapClick?: (lat: number) => void;
  messages?: string[];
  selectedColor?: string;
}

export default function KindnessMap({
  isPlacingMode = false,
  onLocationSelect,
  onMapClick,
  messages,
  selectedColor,
}: KindnessMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  // Init map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    if (!(window as any).mapboxgl) {
      setStatusMsg("Loading map...");
      const timer = setTimeout(() => { /* re-trigger effect */ }, 200);
      return () => clearTimeout(timer);
    }

    (async () => {
      // Strategy 1: Meta tag (server-injected in layout.tsx)
      const metaToken = document.querySelector('meta[name="mapbox-token"]')?.getAttribute("content");
      if (metaToken?.startsWith("pk.")) {
        initMap(metaToken);
        return;
      }

      // Strategy 2: Runtime API fetch
      try {
        const res = await fetch("/api/config?key=mapbox_token");
        if (res.ok) {
          const data = await res.json();
          const token = data.value as string | undefined;
          if (token?.startsWith("pk.")) {
            initMap(token);
            return;
          }
        }
      } catch { /* ignore */ }

      setStatusMsg("⚠ Mapbox token not configured");
    })();

    return () => { /* noop */ };
  });

  const initMap = (token: string) => {
    const container = mapContainer.current;
    if (!container) return;

    (window as any).mapboxgl.accessToken = token;

    map.current = new (window as any).mapboxgl.Map({
      container: container,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [37.6173, 55.7558],
      zoom: 2,
      accessToken: token,
    });

    map.current.addControl(new (window as any).mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new (window as any).mapboxgl.FullscreenControl(), "top-right");
    map.current.addControl(new (window as any).mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.current.on("load", () => {
      map.current.resize();

      // ── Country borders from Natural Earth GeoJSON (REAL geographic boundaries) ──
      map.current.addSource("countries-src", {
        type: "geojson",
        data: "/data/countries.geojson",
      });
      map.current.addLayer({
        id: "country-borders",
        type: "line",
        source: "countries-src",
        paint: {
          "line-color": "#ffffff",
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            1, 0.8,
            2, 1.3,
            4, 1.8,
            7, 2.5,
            10, 3.5,
            14, 4.5,
          ],
          "line-opacity": [
            "interpolate", ["linear"], ["zoom"],
            1, 0.35,
            2, 0.55,
            5, 0.75,
            10, 0.9,
          ],
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        minzoom: 1,
        maxzoom: 18,
      });

      // ── City boundary circles (GeoJSON polygons with ~24 points each) ──
      // These are proper circle polygons defined in top100-cities.geojson
      // Rendered as a Mapbox line layer — follows map projection naturally
      map.current.addSource("cities-src", {
        type: "geojson",
        data: "/data/top100-cities.geojson",
      });
      map.current.addLayer({
        id: "city-boundaries",
        type: "line",
        source: "cities-src",
        paint: {
          "line-color": "rgba(255,255,255,0.9)",
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            6, 1.5,
            8, 2.5,
            10, 3.5,
            12, 4.5,
          ],
          "line-opacity": [
            "interpolate", ["linear"], ["zoom"],
            5, 0,
            6, 0.7,
            9, 0.95,
          ],
        },
        minzoom: 5,
        maxzoom: 15,
      });

      // City labels
      map.current.addLayer({
        id: "city-labels",
        type: "symbol",
        source: "cities-src",
        layout: {
          "text-field": ["get", "name"],
          "text-size": [
            "interpolate", ["linear"], ["zoom"],
            7, 11,
            10, 14,
            13, 18,
          ],
          "text-variable-anchor": ["center", "top", "bottom", "left", "right"],
          "text-justify": "auto",
        },
        paint: {
          "text-color": "rgba(255,255,255,0.9)",
          "text-halo-color": "rgba(0,0,0,0.85)",
          "text-halo-width": 2,
          "text-opacity": [
            "interpolate", ["linear"], ["zoom"],
            7, 0,
            8, 0.85,
          ],
        },
        minzoom: 7,
        maxzoom: 15,
      });

      // ── Fog + stars ──────────────────────────────────────────────────────
      map.current.setFog({
        color: "rgb(10, 10, 30)",
        "high-color": "rgb(30, 30, 80)",
        "horizon-blend": 0.03,
        "space-color": "rgb(5, 5, 15)",
        "star-intensity": 0.6,
      });

      setMapLoaded(true);
    });

    map.current.on("click", (e: any) => {
      const { lat } = e.lngLat;
      onMapClickRef.current?.(lat);
    });
  };

  useEffect(() => {
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const handleClick = async (e: any) => {
      if (!isPlacingMode) return;

      const { lng, lat } = e.lngLat;
      setStatusMsg("Checking location...");

      try {
        const res = await fetch(WATER_CHECK_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: lat, longitude: lng }),
        });
        const check = await res.json();

        if (!check.allowed) {
          setStatusMsg(check.reason || "Location not available");
          setTimeout(() => setStatusMsg(""), 4000);
          return;
        }

        const [pixelLat, pixelLng] = snapToPixel(lat, lng);

        if (onLocationSelect) {
          onLocationSelect(pixelLat, pixelLng, check.feature || "Selected location");
          setStatusMsg("");
        }
      } catch {
        setStatusMsg("Error checking location. Try again.");
        setTimeout(() => setStatusMsg(""), 3000);
      }
    };

    map.current.on("click", handleClick);
    return () => { map.current?.off("click", handleClick); };
  }, [mapLoaded, isPlacingMode, onLocationSelect]);

  useEffect(() => {
    if (!map.current) return;
    map.current.getCanvas().style.cursor = isPlacingMode ? "crosshair" : "";
  }, [isPlacingMode]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

      {statusMsg && (
        <div style={{
          position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.85)", color: "#fff", padding: "10px 20px",
          borderRadius: 24, fontSize: 13, zIndex: 10, whiteSpace: "nowrap",
          border: "1px solid rgba(255,255,255,0.15)",
        }}>
          {statusMsg}
        </div>
      )}

      <div style={{
        position: "absolute", bottom: 20, left: 20,
        background: "rgba(10,10,20,0.85)", borderRadius: 12,
        padding: "10px 14px", zIndex: 10, fontSize: 11, color: "rgba(255,255,255,0.7)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: "#c4b5fd" }}>Kindness Map</div>
        <div>🌍 Click map to place your pixel</div>
        <div style={{ marginTop: 2 }}>Zoom in to see more detail</div>
      </div>
    </div>
  );
}
