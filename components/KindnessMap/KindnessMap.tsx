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

    map.current.on("load", async () => {
      map.current.resize();

      // ── Country borders from Natural Earth GeoJSON ──
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
            1, 0.3,
            2, 0.5,
            4, 0.75,
            7, 1.1,
            10, 1.5,
            14, 2.0,
          ],
          "line-opacity": [
            "interpolate", ["linear"], ["zoom"],
            1, 0.35,
            2, 0.45,
            5, 0.65,
            10, 0.80,
          ],
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        minzoom: 1,
        maxzoom: 18,
      });

      // ── Administrative subdivision borders (states, provinces, oblasts, prefectures) ──
      // Natural Earth Admin-1 boundaries (~4,600 regions worldwide, 1.25 MB local file)
      // Source: converted from ne_10m_admin_1_states_provinces.shp (Douglas-Peucker simplified)
      // Line width: halved from original (user requested thinner)
      // Visibility: appears when zoomed into a country (zoom 4+)
      map.current.addSource("admin-subdivisions", {
        type: "geojson",
        data: "/data/admin1_web.geojson",
      });
      map.current.addLayer({
        id: "subdivision-borders",
        type: "line",
        source: "admin-subdivisions",
        paint: {
          "line-color": "#ffffff",
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            3,  0.25,
            4,  0.4,
            6,  0.6,
            8,  0.8,
            10, 1.0,
            14, 1.4,
          ],
          "line-opacity": 0.7,
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        minzoom: 3,
        maxzoom: 18,
      });

      // ── Fog + stars ──────────────────────────────────────────────────────
      map.current.setFog({
        color: "rgb(10, 10, 30)",
        "high-color": "rgb(30, 30, 80)",
        "horizon-blend": 0.03,
        "space-color": "rgb(5, 5, 15)",
        "star-intensity": 0.6,
      });

      // ── Population grid: ~182K cells covering inhabited land areas ──
      // Load with fetch to handle LFS pointer issues on Railway
      try {
        const gridRes = await fetch("/data/population_grid.geojson");
        if (!gridRes.ok) throw new Error(`HTTP ${gridRes.status}`);
        const gridData = await gridRes.json();
        console.log("[KindnessMap] Population grid loaded:", gridData.features.length, "cells");

        map.current.addSource("population-grid", {
          type: "geojson",
          data: gridData,
          promoteId: "region_id",
        });
        map.current.addLayer({
          id: "population-grid-fill",
          type: "fill",
          source: "population-grid",
          paint: {
            "fill-color": "#1a5276",
            "fill-opacity": [
              "interpolate", ["linear"], ["zoom"],
              2, 0.02,
              4, 0.08,
              7, 0.15,
              10, 0.25,
              14, 0.40,
            ],
          },
          minzoom: 2,
          maxzoom: 18,
        });
      } catch (e) {
        console.warn("[KindnessMap] Population grid unavailable:", e);
      }

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
