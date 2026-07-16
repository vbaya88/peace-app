"use client";
import { useEffect, useRef, useState } from "react";
import { snapToPixel } from "@/components/PixelGrid/PixelGrid";

const WATER_CHECK_API = "/api/geo/water-check";

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
      return;
    }

    (async () => {
      // Strategy 1: Meta tag (server-injected)
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

      setStatusMsg("Mapbox token not configured");
    })();

    return () => { /* noop */ };
  });

  const initMap = (token: string) => {
    const container = mapContainer.current;
    if (!container) return;

    (window as any).mapboxgl.accessToken = token;

    map.current = new (window as any).mapboxgl.Map({
      container,
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

      // ── Country borders ─────────────────────────────────────────────
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
            1, 0.3, 2, 0.5, 4, 0.75, 7, 1.1, 10, 1.5, 14, 2.0,
          ],
          "line-opacity": [
            "interpolate", ["linear"], ["zoom"],
            1, 0.35, 2, 0.45, 5, 0.65, 10, 0.80,
          ],
        },
        layout: { "line-cap": "round", "line-join": "round" },
        minzoom: 1,
        maxzoom: 18,
      });

      // ── Country name labels (zoom 7-12) ─────────────────────────────
      if (!map.current.getLayer("country-labels")) {
        try {
          map.current.addLayer({
            id: "country-labels",
            type: "symbol",
            source: "countries-src",
            layout: {
              "text-field": ["get", "NAME"],
              "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
              "text-size": [
                "interpolate", ["linear"], ["zoom"],
                7, 10, 9, 14, 11, 18,
              ],
              "text-letter-spacing": 0.5,
              "text-allow-overlap": true,
              "text-ignore-placement": true,
            },
            paint: {
              "text-color": "#ffffff",
              "text-halo-color": "#000000",
              "text-halo-width": 1.5,
              "text-opacity": [
                "interpolate", ["linear"], ["zoom"],
                6.5, 0, 7.5, 0.7, 12, 0.9, 13, 0,
              ],
            },
            minzoom: 7,
            maxzoom: 13,
          });
        } catch (e) { console.warn("[KindnessMap] Country labels failed:", e); }
      }

      // ── Stars / sky ────────────────────────────────────────────────
      try {
        map.current.setFog({
          color: 'transparent',
          'high-color': 'transparent',
          'horizon-blend': 0,
          'space-color': '#050510',
          'star-intensity': 1.0,
        });
      } catch (e) { console.warn('Fog/stars failed:', e); }

      // ═══════════════════════════════════════════════════════════════
      //  GRID v2 — 8.2M population-proportional cells
      //
      //  Property: "iso" (country ISO3 code)
      //  Levels:
      //    L1: zoom 5-7   — full polygon grid visible (density: ~1-5 cells/country visible)
      //    L2: zoom 8-11  — denser cells (each L1 cell subdivided x4 mathematically)
      //    L3: zoom 12-14 — finest detail (each L2 subdivided x4 mathematically)
      //
      //  CELL STATE:
      //    Unpurchased → gray (#3a3a4a) — hides flag underneath
      //    Purchased   → owner's color (from DB) — reveals flag underneath
      //
      //  FLAG REVEAL MECHANIC (World Flags Challenge):
      //    Gray cells = "unrevealed" part of flag
      //    Colored cells = "revealed" part of flag (owner chose color)
      //    More purchases in country → more of flag is visible
      // ═══════════════════════════════════════════════════════════════

      // ── Load Grid v2 ─────────────────────────────────────────────
      try {
        const gridRes = await fetch("/data/population_grid_v2.geojson");
        if (!gridRes.ok) throw new Error(`Grid HTTP ${gridRes.status}`);
        const gridData = await gridRes.json();
        console.log(`[KindnessMap] Grid v2 loaded: ${gridData.features?.length?.toLocaleString() ?? 0} cells`);

        map.current.addSource("grid-v2", {
          type: "geojson",
          data: gridData,
        });

        // LAYER 1: Unpurchased cells (gray) — visible from zoom 3+
        map.current.addLayer({
          id: "grid-v2-unpurchased",
          type: "fill",
          source: "grid-v2",
          paint: {
            "fill-color": "#2e2e3e",
            "fill-opacity": [
              "interpolate", ["linear"], ["zoom"],
              2, 0.0,
              3, 0.15,
              4, 0.30,
              6, 0.45,
              8, 0.55,
              12, 0.65,
              16, 0.80,
            ],
          },
          minzoom: 2,
          maxzoom: 22,
        });

        // LAYER 2: Purchased cells overlay (colored by owner)
        // This layer shows purchased cells ON TOP of the gray layer
        // Color comes from the Pixel DB — loaded separately via /api/pixels
        // Implementation: after loading purchased pixels from API,
        // call updateGridColors(purchasedPixels: PixelRecord[])
        console.log("[KindnessMap] Grid v2 ready. Call updateGridColors() to show purchased pixels.");
      } catch (e) {
        console.warn("[KindnessMap] Grid v2 unavailable:", e);
        // Fallback: try old grid
        try {
          const oldRes = await fetch("/data/population_grid.geojson");
          if (oldRes.ok) {
            const oldData = await oldRes.json();
            console.log(`[KindnessMap] Falling back to old grid: ${oldData.features?.length?.toLocaleString() ?? 0} cells`);
            map.current.addSource("grid-v2", { type: "geojson", data: oldData });
            map.current.addLayer({
              id: "grid-v2-unpurchased",
              type: "fill",
              source: "grid-v2",
              paint: {
                "fill-color": "#2e2e3e",
                "fill-opacity": [
                  "interpolate", ["linear"], ["zoom"],
                  5, 0.0, 6, 0.25, 7, 0.40, 8, 0.50, 10, 0.60, 14, 0.75,
                ],
              },
              minzoom: 5,
              maxzoom: 22,
            });
          }
        } catch (e2) { console.warn("[KindnessMap] Old grid also failed:", e2); }
      }

      // ═══════════════════════════════════════════════════════════════
      //  FLAG TINT LAYER — gradual reveal (World Flags Challenge)
      //
      //  Grid v2 cells have property "iso" (ISO3 country code)
      //  This tint layer adds country flag colors at higher zoom levels
      //  When cells are purchased: owner's color covers gray, revealing flag
      //  When cells are NOT purchased: gray hides the flag
      //
      //  The gradual reveal is NATURAL:
      //    More purchases in country → more colored cells → more flag visible
      //    No purchases in country → all cells gray → flag completely hidden
      // ═══════════════════════════════════════════════════════════════
      if (map.current.getSource("grid-v2") && !map.current.getLayer("flag-tint")) {
        try {
          map.current.addLayer({
            id: "flag-tint",
            type: "fill",
            source: "grid-v2",
            paint: {
              // Average flag color per country (approximated from real flags)
              "fill-color": [
                "match", ["get", "iso"],
                // ── Red dominant ──
                "CHN", "#de2910",
                "JPN", "#bc002d",
                "USA", "#3c3b6e",
                "PRK", "#c60c30",
                "VNM", "#da2517",
                "IND", "#ff9933",
                "AFG", "#000000",
                "PAK", "#01411c",
                "BGD", "#006a4e",
                "NPL", "#dc143c",
                "KHM", "#004fa3",
                "MMR", "#fecb00",
                "IDN", "#ff0000",
                "PHL", "#0038a8",
                "IRN", "#239f40",
                "IRQ", "#008000",
                "SAU", "#006c35",
                "ARE", "#00732f",
                "OMN", "#006c35",
                "YEM", "#ce1126",
                "SYR", "#cc0000",
                "TUR", "#e30a17",
                // ── Blue dominant ──
                "RUS", "#0039a6",
                "GBR", "#012169",
                "FRA", "#0055a4",
                "DEU", "#000000",
                "ITA", "#009246",
                "ESP", "#c60b1e",
                "BRA", "#009b3a",
                "MEX", "#006847",
                "CAN", "#ff0000",
                "AUS", "#00008b",
                "NZL", "#00247d",
                "KOR", "#003478",
                "ZAF", "#007a4d",
                "ARG", "#74acdf",
                "UKR", "#005bbb",
                "KAZ", "#00c3ff",
                "POL", "#dc143c",
                "NLD", "#ae1c28",
                "SWE", "#006aa7",
                "NOR", "#ba0c2f",
                "FIN", "#002f6c",
                "DNK", "#c8102e",
                "GRC", "#0d5eaf",
                // ── Green/other ──
                "NGA", "#008751",
                "KEN", "#006100",
                "GHA", "#006100",
                "MAR", "#c1272d",
                "EGY", "#c09300",
                "SDN", "#d21034",
                "ETH", "#078930",
                "TZA", "#1eb53a",
                "COD", "#c19e3f",
                "THA", "#241d4f",
                "MYS", "#010066",
                "SGP", "#ed2939",
                // Small states
                "ISL", "#003897",
                "LUX", "#00a1e4",
                "CHE", "#ff0000",
                "AUT", "#ed2939",
                "BEL", "#000000",
                "PRT", "#006600",
                "IRL", "#169b62",
                "PER", "#d91023",
                "COL", "#0033a0",
                "CHL", "#d52b1e",
                "VEN", "#ffcc00",
                "#2a2a3a"
              ],
              "fill-opacity": [
                "interpolate", ["linear"], ["zoom"],
                5, 0.0,
                7, 0.0,
                8, 0.05,
                10, 0.12,
                12, 0.20,
                14, 0.28,
              ],
            },
            minzoom: 8,
            maxzoom: 22,
          });
          console.log("[KindnessMap] Flag tint layer added (zoom 8+)");
        } catch (e) {
          console.warn("[KindnessMap] Flag tint layer failed:", e);
        }
      }

      // ═══════════════════════════════════════════════════════════════
      //  PURCHASED PIXELS OVERLAY
      //  Loaded from /api/pixels — shows actual purchased cells as colored circles
      //  This is the KEY LAYER: purchased cells = reveal flag
      // ═══════════════════════════════════════════════════════════════
      let pixelsLoaded = false;

      async function loadPurchasedPixels() {
        if (pixelsLoaded || !map.current) return;
        pixelsLoaded = true;

        try {
          const res = await fetch("/api/pixels");
          if (!res.ok) return;
          const pixels: PixelRecord[] = await res.json();
          if (!pixels.length) return;

          console.log(`[KindnessMap] Loading ${pixels.length} purchased pixels...`);

          // Convert to GeoJSON points
          const features = pixels.map(p => ({
            type: "Feature" as const,
            properties: {
              id: p.id,
              color: p.color,
              name: p.name ?? "",
              message: p.message ?? "",
            },
            geometry: {
              type: "Point" as const,
              coordinates: [p.longitude, p.latitude],
            },
          }));

          const sourceData = {
            type: "FeatureCollection" as const,
            features,
          };

          const sourceId = "purchased-pixels";
          if (map.current.getSource(sourceId)) {
            map.current.getSource(sourceId).setData(sourceData);
          } else {
            map.current.addSource(sourceId, { type: "geojson", data: sourceData });
          }

          // Add circle layer for purchased pixels
          if (!map.current.getLayer("purchased-pixels-circles")) {
            map.current.addLayer({
              id: "purchased-pixels-circles",
              type: "circle",
              source: sourceId,
              paint: {
                "circle-radius": [
                  "interpolate", ["linear"], ["zoom"],
                  5, 3,
                  8, 5,
                  11, 8,
                  14, 12,
                ],
                "circle-color": ["get", "color"],
                "circle-opacity": 0.9,
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": [
                  "interpolate", ["linear"], ["zoom"],
                  5, 0.3,
                  10, 0.6,
                  14, 1.0,
                ],
                "circle-stroke-opacity": 0.5,
              },
              minzoom: 2,
              maxzoom: 22,
            });
          }
          console.log(`[KindnessMap] Purchased pixels layer active (${pixels.length} cells)`);
        } catch (e) {
          console.warn("[KindnessMap] Purchased pixels load failed:", e);
        }
      }

      // Load purchased pixels after grid is ready
      loadPurchasedPixels();

      // Also load purchased pixels on zoom change (in case they change)
      map.current.on("zoomend", () => {
        if (mapLoaded) loadPurchasedPixels();
      });

      setMapLoaded(true);
    });

    map.current.on("click", (e: any) => {
      const { lat } = e.lngLat;
      onMapClickRef.current?.(lat);
    });
  };

  // Cleanup
  useEffect(() => {
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Handle placing mode
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
        <div style={{ fontWeight: 600, marginBottom: 4, color: "#c4b5fd" }}>World Flags Challenge</div>
        <div>Click any gray cell to paint your flag</div>
        <div style={{ marginTop: 2 }}>More cells painted = more flag visible</div>
      </div>
    </div>
  );
}
