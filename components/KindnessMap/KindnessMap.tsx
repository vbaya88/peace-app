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
      style: "mapbox://styles/mapbox/dark-v10", // v10 = no globe projection (fixes Antarctica circle)
      center: [37.6173, 55.7558],
      zoom: 2,
      accessToken: token,
      projection: "mercator", // Force flat map — removes Antarctica globe circle
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
      // Natural Earth 10m Admin-1 boundaries (4,596 regions, 241 countries, 70 MB)
      // Source: ne_10m_admin_1_states_provinces.shp → admin1_ne10m.geojson
      // Replaces corrupted GADM-based admin1_web.geojson (all null geometries)
      map.current.addSource("admin-subdivisions", {
        type: "geojson",
        data: "/data/admin1_ne10m.geojson",
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

      // ── DISABLE globe projection to remove Antarctica circle artifact ──
      // Mapbox dark-v11 uses 3D globe by default → shows gray horizon disc over Antarctica
      // Fix: force Mercator (flat map) projection
      try { (map.current as any).setProjection?.('mercator'); } catch(e) { console.warn('Projection change failed:', e); }
      try { map.current.setFog({ color: 'transparent', 'high-color': 'transparent', 'horizon-blend': 0, 'space-color': 'transparent', 'star-intensity': 0 }); } catch(e) { /* ignore */ }

      // ════════════════════════════════════════════════════════
      //  GRID LAYERS (3-tier system)
      //  BASE:  Old population grid (182K cells, green, all zooms) — ALWAYS visible
      //  L1:    Admin1 region cells (109K cells, blue, zoom 10+) — refinement layer
      //  L2:    Dense pixel dots (4.7M cells, red circles, zoom 12+) — loaded per-country
      // ════════════════════════════════════════════════════════

      // ── BASE GRID: Dense population grid (2.4M cells, green, gzipped) ──
      // Uses gzip compression: 473MB raw -> 28MB gzipped (6% of original)
      // Browser decompresses via DecompressionStream API (all modern browsers)
      try {
        const gridRes = await fetch("/data/population_grid.geojson.gz");
        if (!gridRes.ok) throw new Error(`HTTP ${gridRes.status}`);
        
        // Decompress gzip in browser
        let gridData;
        if (typeof DecompressionStream !== "undefined" && gridRes.body) {
          const ds = new DecompressionStream("gzip");
          const decompressed = gridRes.body.pipeThrough(ds);
          const text = await new Response(decompressed).text();
          gridData = JSON.parse(text);
        } else {
          // Fallback for older browsers: fetch uncompressed
          console.warn("[KindnessMap] No DecompressionStream, trying raw GeoJSON");
          const fallbackRes = await fetch("/data/population_grid.geojson");
          gridData = await fallbackRes.json();
        }
        
        console.log(`[KindnessMap] Base grid loaded: ${gridData.features.length} cells`);

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
            "fill-color": "#1a8a5a",
            "fill-opacity": [
              "interpolate", ["linear"], ["zoom"],
              2, 0.05,
              3, 0.12,
              5, 0.20,
              7, 0.30,
              10, 0.45,
              14, 0.55,
            ],
            "fill-outline-color": "#2ecc71",
          },
          minzoom: 2,
          maxzoom: 14,
        });
      } catch (e) {
        console.warn("[KindnessMap] Base grid unavailable:", e);
      }

      // ── Level 1: Admin1 region cells (109K cells, bright cyan overlay, zoom 5+) ──
      // Shows province/state/oblast boundaries ON TOP of base green grid
      // These are the administrative subdivisions user wants to see
      try {
        // Try fetch-based loading first (works around Railway/LFS issues)
        const l1Res = await fetch("/data/grid_l1.geojson");
        if (!l1Res.ok) throw new Error(`HTTP ${l1Res.status}`);
        const l1Data = await l1Res.json();
        console.log(`[KindnessMap] L1 grid loaded: ${l1Data.features?.length ?? 0} region cells`);

        map.current.addSource("grid-l1-src", {
          type: "geojson",
          data: l1Data,
        });
      } catch (e) {
        // Fallback: load via URL (Mapbox handles large files natively)
        console.warn("[KindnessMap] L1 fetch failed, trying URL source:", e);
        try {
          map.current.addSource("grid-l1-src", {
            type: "geojson",
            data: "/data/grid_l1.geojson",
          });
          console.log("[KindnessMap] L1 loaded via URL fallback");
        } catch (e2) {
          console.warn("[KindnessMap] L1 grid unavailable:", e2);
        }
      }

      // Add L1 layers (will only render if source exists)
      try {
        // L1 fill: subtle cyan tint over green base
        map.current.addLayer({
          id: "grid-l1-fill",
          type: "fill",
          source: "grid-l1-src",
          paint: {
            "fill-color": "#00d4ff",
            "fill-opacity": [
              "interpolate", ["linear"], ["zoom"],
              5,  0.04,
              7,  0.08,
              9,  0.14,
              11, 0.20,
              14, 0.28,
            ],
          },
          minzoom: 5,
          maxzoom: 16,
        });
        // L1 line: bright cyan boundaries
        map.current.addLayer({
          id: "grid-l1-line",
          type: "line",
          source: "grid-l1-src",
          paint: {
            "line-color": "#00d4ff",
            "line-width": [
              "interpolate", ["linear"], ["zoom"],
              5,  0.6,
              7,  1.0,
              9,  1.6,
              11, 2.2,
              14, 3.0,
            ],
            "line-opacity": [
              "interpolate", ["linear"], ["zoom"],
              5,  0.5,
              7,  0.7,
              9,  0.85,
              11, 0.95,
              14, 1.0,
            ],
          },
          minzoom: 5,
          maxzoom: 16,
        });
      } catch (e) {
        console.warn("[KindnessMap] L1 layers failed:", e);
      }

      // ── Level 2: Dense pixel grid (4.7M cells, loaded per-country on demand) ──
      // L2 is too large (1.75GB) to load all at once.
      // Strategy: detect visible country → load that country's L2 chunk only.
      let l2LoadedCountry: string | null = null;
      let l2SourceAdded = false;

      map.current.on("zoomend", async () => {
        if (!map.current) return;
        const zoom = map.current.getZoom();
        if (zoom < 10) return; // Show L2 at zoom 10+ (when L1 is clearly visible)

        const center = map.current.getCenter();
        const features = map.current.queryRenderedFeatures(
          map.current.project(center),
          { layers: ["country-borders"] }
        );
        let countryCode = "";
        if (features.length > 0 && features[0].properties?.iso_a2) {
          countryCode = features[0].properties.iso_a2.toUpperCase();
        }

        if (!countryCode || countryCode === l2LoadedCountry) return;
        l2LoadedCountry = countryCode;

        console.log(`[KindnessMap] Loading L2 for ${countryCode}...`);
        try {
          const l2Res = await fetch(`/data/l2_chunks/L2_${countryCode}.geojson`);
          if (!l2Res.ok) {
            console.log(`[KindnessMap] No L2 chunk for ${countryCode} (HTTP ${l2Res.status})`);
            return;
          }
          const l2Data = await l2Res.json();
          console.log(`[KindnessMap] L2 ${countryCode}: ${l2Data.features.length} cells`);

          if (!l2SourceAdded) {
            map.current.addSource("grid-l2-src", { type: "geojson", data: l2Data });
            map.current.addLayer({
              id: "grid-l2-fill",
              type: "circle",
              source: "grid-l2-src",
              paint: {
                "circle-radius": [
                  "interpolate", ["linear"], ["zoom"],
                  11, 1.5,
                  13, 2.5,
                  15, 3.5,
                ],
                "circle-color": "#e74c3c",
                "circle-opacity": [
                  "interpolate", ["linear"], ["zoom"],
                  11, 0.5,
                  12, 0.7,
                  15, 0.9,
                ],
                "circle-stroke-color": "#c0392b",
                "circle-stroke-width": 0.5,
              },
              minzoom: 11,
              maxzoom: 22,
            });
            l2SourceAdded = true;
          } else {
            map.current.getSource("grid-l2-src").setData(l2Data);
          }
        } catch (e) {
          console.warn(`[KindnessMap] L2 load failed for ${countryCode}:`, e);
        }
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
