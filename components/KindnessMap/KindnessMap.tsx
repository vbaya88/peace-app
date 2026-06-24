"use client";
import { useEffect, useRef, useState, useCallback } from "react";
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

interface CityCircleData {
  name: string;
  lng: number;
  lat: number;
  radiusKm: number; // radius in kilometers
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const citiesRef = useRef<CityCircleData[]>([]);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  // Draw city circles on canvas overlay (perfect circles, correct scaling)
  const drawCityCircles = useCallback(() => {
    if (!map.current || !canvasRef.current || !citiesRef.current.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas size to map container
    const rect = map.current.getContainer().getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const zoom = map.current.getZoom();
    if (zoom < 6) return; // Don't show circles below zoom 6

    // Scale factor: larger circles as you zoom in
    const baseRadiusPx = Math.max(15, (zoom - 6) * 12 + 20);

    citiesRef.current.forEach((city) => {
      const pos = map.current.project([city.lng, city.lat]);
      // Adjust radius by latitude to counteract Mercator stretching
      const latFactor = Math.cos((city.lat * Math.PI) / 180);
      const radiusX = baseRadiusPx;
      const radiusY = baseRadiusPx * latFactor; // Slightly shorter vertically

      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = Math.max(2, (zoom - 6) * 0.4 + 2.5);
      ctx.stroke();

      // Subtle glow
      ctx.shadowColor = "rgba(255,255,255,0.4)";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // City name label
      if (zoom >= 7) {
        ctx.font = `${Math.max(10, (zoom - 7) * 1.5 + 11)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(city.name, pos.x, pos.y + radiusY + 4);
      }
    });
  }, []);

  // Init map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    if (!(window as any).mapboxgl) {
      setStatusMsg("Loading map...");
      const timer = setTimeout(() => { /* re-trigger effect */ }, 200);
      return () => clearTimeout(timer);
    }

    (async () => {
      const metaToken = document.querySelector('meta[name="mapbox-token"]')?.getAttribute("content");
      if (metaToken?.startsWith("pk.")) {
        initMap(metaToken);
        return;
      }
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

      // ── Country borders from Natural Earth GeoJSON (REAL geographic boundaries) ──
      // Using our downloaded Natural Earth file — gives us FULL control over styling
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
            1, 1.5,
            2, 2.5,
            4, 3.5,
            7, 5.0,
            10, 7.0,
            14, 9.0,
          ],
          "line-opacity": [
            "interpolate", ["linear"], ["zoom"],
            1, 0.4,
            2, 0.65,
            5, 0.85,
            10, 0.95,
          ],
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        minzoom: 1,
        maxzoom: 18,
      });

      // ── Load city centers for circle rendering ──
      try {
        const cityRes = await fetch("/data/top100-cities.geojson");
        const cityGeo = await cityRes.json();
        const cities: CityCircleData[] = cityGeo.features.map((f: any) => {
          const coords = f.geometry.coordinates[0];
          let sumLng = 0, sumLat = 0;
          coords.forEach((pt: number[]) => { sumLng += pt[0]; sumLat += pt[1]; });
          const centerLng = sumLng / coords.length;
          const centerLat = sumLat / coords.length;
          const dx = coords[0][0] - centerLng;
          const dy = coords[0][1] - centerLat;
          // Approximate radius in km (1 degree ≈ 111km at equator)
          const radiusKm = Math.sqrt(dx * dx + dy * dy) * 111;
          return { name: f.properties.name, lng: centerLng, lat: centerLat, radiusKm };
        });
        citiesRef.current = cities;
      } catch (e) {
        console.warn("Failed to load city data:", e);
      }

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

    // Redraw circles on every move/zoom
    map.current.on("move", drawCityCircles);
    map.current.on("zoom", drawCityCircles);

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

      {/* Canvas overlay for perfect city circles */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: 5,
        }}
      />

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
