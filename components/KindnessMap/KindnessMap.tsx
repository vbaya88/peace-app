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

// City point data for native circle layer
interface CityPoint {
  name: string;
  lng: number;
  lat: number;
  radiusKm: number; // circle radius in km
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
  const citiesRef = useRef<CityPoint[]>([]);
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
            1, 0.4,
            2, 0.65,
            4, 0.9,
            7, 1.25,
            10, 1.75,
            14, 2.25,
          ],
          "line-opacity": [
            "interpolate", ["linear"], ["zoom"],
            1, 0.3,
            2, 0.45,
            5, 0.65,
            10, 0.85,
          ],
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        minzoom: 1,
        maxzoom: 18,
      });

      // ── Load city centers and create NATIVE CIRCLE layer ──
      // Mapbox's 'circle' layer type renders TRUE geometric circles
      // that stay perfectly round regardless of Mercator projection!
      try {
        const cityRes = await fetch("/data/top100-cities.geojson");
        const cityGeo = await cityRes.json();
        const cities: CityPoint[] = cityGeo.features.map((f: any) => {
          const coords = f.geometry.coordinates[0];
          // Calculate bounding box from all polygon vertices
          let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
          coords.forEach((pt: number[]) => {
            if (pt[0] < minLng) minLng = pt[0];
            if (pt[0] > maxLng) maxLng = pt[0];
            if (pt[1] < minLat) minLat = pt[1];
            if (pt[1] > maxLat) maxLat = pt[1];
          });
          // Center of bounding box
          const centerLng = (minLng + maxLng) / 2;
          const centerLat = (minLat + maxLat) / 2;
          // Radius = half the diagonal of the bounding box (inscribed circle in the bbox)
          const dxDeg = (maxLng - minLng) / 2;
          const dyDeg = (maxLat - minLat) / 2;
          // Use the LARGER dimension so circle fully covers the city extent
          const radiusKm = Math.sqrt(dxDeg * dxDeg + dyDeg * dyDeg) * 111;
          return { name: f.properties.name, lng: centerLng, lat: centerLat, radiusKm };
        });
        citiesRef.current = cities;

        // Create a GeoJSON FeatureCollection of POINTS for the circle layer
        const cityPointsGeo = {
          type: "FeatureCollection" as const,
          features: cities.map(c => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] },
            properties: { name: c.name, radiusKm: c.radiusKm },
          })),
        };

        map.current.addSource("cities-point-src", {
          type: "geojson",
          data: cityPointsGeo,
        });

        // NATIVE CIRCLE LAYER — perfect circles in screen space
        // Simple fixed radius that covers city area (all GeoJSON cities are ~same size)
        // Radius scales with zoom so circles always cover the visible city extent
        map.current.addLayer({
          id: "city-circles",
          type: "circle",
          source: "cities-point-src",
          paint: {
            "circle-color": "transparent",
            "circle-stroke-color": "rgba(255,255,255,0.92)",
            "circle-stroke-width": 2.5,
            // Big, simple radius — covers full city area at all zoom levels
            // At zoom 6: 60px, zoom 8: 120px, zoom 10: 280px, zoom 12: 500px
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              5,  0,
              6,  60,
              7,  90,
              8,  130,
              9,  200,
              10, 280,
              11, 400,
              12, 500,
            ],
            "circle-opacity": 0.92,
            "circle-stroke-opacity": 0.92,
          },
        });

        // City labels from same point source
        map.current.addLayer({
          id: "city-labels",
          type: "symbol",
          source: "cities-point-src",
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
            "text-offset": [0, 1.5],
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
