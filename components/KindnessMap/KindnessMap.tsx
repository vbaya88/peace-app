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

export default function KindnessMap({ onMapReady, onMarkerClick, messages = [] }: KindnessMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    // ── Navigation controls ─────────────────────────────────────────────────
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
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load check-ins from API ────────────────────────────────────────────────

  const loadCheckins = useCallback(async () => {
    if (!mapRef.current || !mapLoaded) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    try {
      const res = await fetch("/api/checkins");
      if (!res.ok) return;

      const data = await res.json();
      const checkins: CheckinMarker[] = data.checkins ?? [];

      checkins.forEach((checkin) => {
        const el = createPhotoMarkerEl(checkin);

        // Popup on click
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          className: "kindness-popup",
        }).setHTML(`
          <div style="text-align:center;min-width:140px;">
            ${
              checkin.photoUrl
                ? `<img src="${checkin.photoUrl}" alt="${checkin.name}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid #818cf8;margin-bottom:6px;" />`
                : `<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;margin:0 auto 6px;font-size:28px;color:white;font-weight:bold;">${checkin.name.charAt(0).toUpperCase()}</div>`
            }
            <strong style="color:#333;font-size:14px;">${checkin.name}</strong>
            ${checkin.message ? `<p style="color:#666;font-size:12px;margin:4px 0 0;">${checkin.message}</p>` : ""}
          </div>
        `);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([checkin.longitude, checkin.latitude])
          .setPopup(popup)
          .addTo(mapRef.current!);

        el.addEventListener("click", () => {
          onMarkerClick?.(checkin);
        });

        markersRef.current.push(marker);
      });
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
