"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CheckinMarker {
  id: string;
  name: string;
  message?: string;
  photoUrl?: string;
  latitude: number;
  longitude: number;
  zoomLevel: number;
}

interface KindnessMapProps {
  onMapReady?: () => void;
  onMarkerClick?: (marker: CheckinMarker) => void;
  /** Fires when user clicks anywhere on the map (not on a marker) */
  onMapClick?: (lat: number, lng: number) => void;
  messages?: string[];
}

// ─── Cluster popup HTML ──────────────────────────────────────────────────────

function createPhotoMarkerEl(marker: CheckinMarker): HTMLElement {
  const el = document.createElement("div");
  el.className = "kindness-marker";
  el.style.cssText = `
    width: 44px; height: 44px;
    border-radius: 50%;
    border: 3px solid #818cf8;
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0 0 12px rgba(129,140,248,0.7);
    transition: transform 0.2s, box-shadow 0.2s;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #667eea, #764ba2);
    font-family: sans-serif;
  `;

  if (marker.photoUrl) {
    el.style.background = "transparent";
    el.style.border = "3px solid #818cf8";
    el.innerHTML = `<img src="${marker.photoUrl}" alt="${marker.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  } else {
    el.innerHTML = `<span style="color:white;font-size:16px;font-weight:bold;">${marker.name.charAt(0).toUpperCase()}</span>`;
  }

  el.addEventListener("mouseenter", () => {
    el.style.transform = "scale(1.2)";
    el.style.boxShadow = "0 0 20px rgba(129,140,248,1)";
  });
  el.addEventListener("mouseleave", () => {
    el.style.transform = "scale(1)";
    el.style.boxShadow = "0 0 12px rgba(129,140,248,0.7)";
  });

  return el;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KindnessMap({ onMapReady, onMarkerClick, onMapClick, messages = [] }: KindnessMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Capture onMapClick in a ref to avoid stale closures inside map events
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  // ── Initialize map ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || token.startsWith("pk.YOUR_")) {
      setError("Mapbox token not configured");
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [30, 30],
      zoom: 2,
      projection: "globe" as unknown as mapboxgl.Projection,
      attributionControl: false,
    });

    // ── Atmosphere / space look ──────────────────────────────────────────────
    map.on("style.load", () => {
      map.setFog({
        range: [-1, 2],
        "horizon-blend": 0.08,
        color: "#1a1a2e",
        "high-color": "#234",
        "space-color": "#0a0a1a",
        "star-intensity": 0.6,
      });
    });

    // ── Navigation controls (smaller) ──────────────────────────────────────
    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "bottom-right");
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      "bottom-right"
    );

    // ── Scale ───────────────────────────────────────────────────────────────
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");



    map.on("load", () => {
      setMapLoaded(true);
      onMapReady?.();

      // User clicked on map (not on a marker) — fire onMapClick
      map.on("click", (e) => {
        const { lng, lat } = e.lngLat;
        onMapClickRef.current?.(lat, lng);
      });
    });

    mapRef.current = map;

    return () => {
      const m = mapRef.current;
      if (!m) return;
      if (m.getLayer("checkins-clusters")) m.removeLayer("checkins-clusters");
      if (m.getLayer("checkins-cluster-count")) m.removeLayer("checkins-cluster-count");
      if (m.getLayer("checkins-unclustered-point")) m.removeLayer("checkins-unclustered-point");
      if (m.getSource("checkins")) m.removeSource("checkins");
      markersRef.current.forEach((mk) => mk.remove());
      markersRef.current = [];
      m.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load check-ins from API (GeoJSON + clustering for 1000+ markers) ───────

  const loadCheckins = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Remove old GeoJSON source + layers if they exist
    if (map.getSource("checkins")) {
      map.removeLayer("checkins-clusters");
      map.removeLayer("checkins-cluster-count");
      map.removeLayer("checkins-unclustered-point");
      map.removeSource("checkins");
    }

    try {
      const res = await fetch("/api/checkins");
      if (!res.ok) return;

      const data = await res.json();
      const checkins: CheckinMarker[] = data.checkins ?? [];

      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: checkins.map((c) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [c.longitude, c.latitude] },
          properties: {
            id: c.id,
            name: c.name,
            message: c.message ?? "",
            photoUrl: c.photoUrl ?? "",
            latitude: c.latitude,
            longitude: c.longitude,
          },
        })),
      };

      // ── Add GeoJSON source with clustering ────────────────────────────────
      map.addSource("checkins", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 10,   // stop clustering at zoom 10
        clusterRadius: 50,    // cluster radius in pixels
      });

      // Cluster circles
      map.addLayer({
        id: "checkins-clusters",
        type: "circle",
        source: "checkins",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "#818cf8", 10,  "#a78bfa", 50,
            "#c084fc", 100, "#e879f9", 500,
            "#f0abfc",
          ],
          "circle-radius": [
            "step", ["get", "point_count"],
            18, 10, 24, 50, 32, 100, 40, 500, 50,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.4)",
          "circle-opacity": 0.85,
        },
      });

      // Cluster count labels
      map.addLayer({
        id: "checkins-cluster-count",
        type: "symbol",
        source: "checkins",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: { "text-color": "#ffffff" },
      });

      // Individual markers (unclustered)
      map.addLayer({
        id: "checkins-unclustered-point",
        type: "circle",
        source: "checkins",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#818cf8",
          "circle-radius": 7,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // ── Click on cluster → zoom in ─────────────────────────────────────────
      map.on("click", "checkins-clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["checkins-clusters"],
        });
        const clusterId = features[0].properties?.cluster_id;
        const source = map.getSource("checkins") as mapboxgl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          const geometry = features[0].geometry;
          if (geometry.type === "Point") {
            map.easeTo({
              center: geometry.coordinates as [number, number],
              zoom: zoom ?? 10,
            });
          }
        });
      });

      // ── Click on individual marker → show popup ─────────────────────────────
      map.on("click", "checkins-unclustered-point", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["checkins-unclustered-point"],
        });
        if (!features.length) return;
        const p = features[0].properties;
        const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];

        new mapboxgl.Popup({ closeButton: false, offset: 15, className: "kindness-popup" })
          .setLngLat(coords)
          .setHTML(`
            <div style="text-align:center;min-width:140px;">
              ${p?.photoUrl
                ? `<img src="${p.photoUrl}" alt="${p.name}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid #818cf8;margin-bottom:6px;" />`
                : `<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;margin:0 auto 6px;font-size:28px;color:white;font-weight:bold;">${(p?.name as string ?? "?").charAt(0).toUpperCase()}</div>`
              }
              <strong style="color:#333;font-size:14px;">${p?.name ?? ""}</strong>
              ${p?.message ? `<p style="color:#666;font-size:12px;margin:4px 0 0;">${p.message}</p>` : ""}
            </div>
          `)
          .addTo(map);

        onMarkerClick?.({
          id: p?.id ?? "",
          name: p?.name ?? "",
          message: p?.message ?? undefined,
          photoUrl: p?.photoUrl ?? undefined,
          latitude: p?.latitude ?? 0,
          longitude: p?.longitude ?? 0,
          zoomLevel: 10,
        });
      });

      // ── Cursor changes ──────────────────────────────────────────────────────
      map.on("mouseenter", "checkins-clusters", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "checkins-clusters", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "checkins-unclustered-point", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "checkins-unclustered-point", () => { map.getCanvas().style.cursor = ""; });

    } catch {
      // Silently fail
    }
  }, [mapLoaded, onMarkerClick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when map loads
  useEffect(() => {
    if (mapLoaded) {
      loadCheckins();
    }
  }, [mapLoaded, loadCheckins]);

  // ── Error state ───────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-center text-white p-8">
          <div className="text-4xl mb-4">🗺️</div>
          <p className="text-lg font-medium">{error}</p>
          <p className="text-gray-400 text-sm mt-2">Set NEXT_PUBLIC_MAPBOX_TOKEN in .env</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-full">
      {/* CSS: shrink Mapbox zoom buttons 2x */}
      <style>{`
        .mapboxgl-ctrl-group {
          transform: scale(0.5) !important;
          transform-origin: bottom right;
        }
        .mapboxgl-ctrl-logo,
        .mapboxgl-ctrl-attrib {
          transform: scale(0.5) !important;
          transform-origin: bottom left;
        }
        .mapboxgl-ctrl-scale {
          transform: scale(0.5) !important;
          transform-origin: bottom left;
          margin-bottom: 6px !important;
        }
      `}</style>
      <div ref={mapContainerRef} className="w-full h-full" />



      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-sm">Loading kindness map...</span>
          </div>
        </div>
      )}
    </div>
  );
}
