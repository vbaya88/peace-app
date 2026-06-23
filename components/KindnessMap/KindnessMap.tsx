"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import PixelGrid, { snapToPixel } from "@/components/PixelGrid/PixelGrid";

const WATER_CHECK_API = "/api/geo/water-check";

interface Checkin {
  id: string;
  latitude: number;
  longitude: number;
  name?: string;
  message?: string;
  photoUrl?: string;
  color?: string;
  pixelLat?: number;
  pixelLng?: number;
  level?: string;
}

interface KindnessMapProps {
  onLocationSelect?: (lat: number, lng: number, address: string) => void;
  selectedColor?: string;
  isPlacingMode?: boolean;
  onMapClick?: (lat: number) => void;
  messages?: string[];
}

export default function KindnessMap({
  onLocationSelect,
  selectedColor = "#818cf8",
  isPlacingMode = false,
  onMapClick,
  messages = [],
}: KindnessMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  // Load checkins
  const loadCheckins = useCallback(async () => {
    try {
      const r = await fetch("/api/checkins?limit=10000");
      if (r.ok) {
        const data = await r.json();
        setCheckins(data.checkins || []);
      }
    } catch {}
  }, []);

  // Init map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Wait for mapboxgl to load from CDN script
    if (!(window as any).mapboxgl) {
      setStatusMsg("Loading map...");
      const timer = setTimeout(() => { /* re-trigger effect */ }, 200);
      return () => clearTimeout(timer);
    }

    // Try build-time env first, then fallback to runtime fetch
    let token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || token.startsWith("pk.YOUR_")) {
      try {
        const r = await fetch("/api/config?key=mapbox_token");
        if (r.ok) {
          const d = await r.json();
          token = d.value;
        }
      } catch { /* ignore */ }
    }

    if (!token || !token.startsWith("pk.")) {
      setStatusMsg("Mapbox token not configured");
      return;
    }

    map.current = new (window as any).mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [37.6173, 55.7558],
      zoom: 3,
      projection: "globe",
    });

    map.current.addControl(new (window as any).mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new (window as any).mapboxgl.FullscreenControl(), "top-right");

    map.current.on("load", () => {
      map.current.setFog({
        color: "rgb(10, 10, 30)",
        "high-color": "rgb(30, 30, 80)",
        "horizon-blend": 0.03,
        "space-color": "rgb(5, 5, 15)",
        "star-intensity": 0.6,
      });
      setMapLoaded(true);
      loadCheckins();
    });

    // General map click (Antarctica block etc)
    map.current.on("click", (e: any) => {
      const { lat } = e.lngLat;
      onMapClickRef.current?.(lat);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [loadCheckins]);

  // Place pixel on click (when in placing mode)
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

  // Cursor style
  useEffect(() => {
    if (!map.current) return;
    map.current.getCanvas().style.cursor = isPlacingMode ? "crosshair" : "";
  }, [isPlacingMode]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

      {/* Pixel layer */}
      {mapLoaded && map.current && (
        <PixelGrid map={map.current} checkins={checkins.filter(c => c.pixelLat != null && c.pixelLng != null) as any} />
      )}

      {/* Status message */}
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

      {/* Legend */}
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
