"use client";

import { useEffect, useRef, useState } from "react";

interface EquatorRingProps {
  messages: string[];
}

export default function EquatorRing({ messages }: EquatorRingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const angleRef = useRef(0);
  const [radius, setRadius] = useState(0);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);

  // Listen for map zoom/pan to get globe center & radius
  useEffect(() => {
    const updateGlobeBounds = () => {
      const canvas = document.querySelector(".mapboxgl-canvas") as HTMLCanvasElement;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      // Globe center is roughly canvas center (for globe projection)
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      // Globe radius ~ min dimension * 0.38 at default zoom, scales with zoom
      // We use the actual visible globe size by checking map transform
      const mapContainer = canvas.closest(".mapboxgl-map");
      if (!mapContainer) return;

      // Get map instance from window (mapbox stores it on the container)
      const mapEl = mapContainer as any;
      // Estimate: at zoom 2 with globe projection, globe fills ~76% of min dimension
      // We'll use a heuristic based on canvas size — globe radius ≈ 38% of smaller side
      const baseRadius = Math.min(rect.width, rect.height) * 0.38;

      setCenter({ x: cx, y: cy });
      setRadius(baseRadius);
      setReady(true);
    };

    // Initial calculation + update on resize/zoom
    updateGlobeBounds();

    // Watch for map events (zoom, move) to recalculate
    let debounce: ReturnType<typeof setTimeout>;
    const onMapChange = () => {
      clearTimeout(debounce);
      debounce = setTimeout(updateGlobeBounds, 150);
    };

    // Mapbox fires these on the map container
    const mapEl = document.querySelector(".mapboxgl-map");
    if (mapEl) {
      mapEl.addEventListener("wheel", onMapChange, { passive: true });
      // Also listen for moveend from mapbox
      document.addEventListener("moveend", onMapChange);
    }

    const onResize = () => {
      clearTimeout(debounce);
      debounce = setTimeout(updateGlobeBounds, 200);
    };
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(debounce);
      window.removeEventListener("resize", onResize);
      if (mapEl) mapEl.removeEventListener("wheel", onMapChange);
      document.removeEventListener("moveend", onMapChange);
    };
  }, []);

  // Animation loop — rotate messages around equator
  useEffect(() => {
    if (!ready || messages.length === 0) return;

    const SPEED = 0.15; // degrees per frame (~9°/sec at 60fps)

    const animate = () => {
      angleRef.current += SPEED;
      if (angleRef.current >= 360) angleRef.current -= 360;
      renderFrame();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [ready, messages]);

  // Render message positions into DOM
  const renderFrame = () => {
    const container = containerRef.current;
    if (!container || radius === 0) return;

    const els = container.querySelectorAll<HTMLElement>(".eq-msg");
    const count = els.length;
    if (count === 0) return;

    // Distribute messages evenly around the ring
    // Multiple rows: row 0 at equator (radius), row 1 slightly above/below, etc.
    const rows = 3; // number of orbital rings
    const rowOffsets = [-1, 0, 1]; // offset multiplier for each row

    els.forEach((el, i) => {
      const rowIndex = i % rows;
      const msgIndex = Math.floor(i / rows);
      const rowOffset = rowOffsets[rowIndex] * 14; // px offset per row

      // Each message gets its own base angle, then we add global rotation
      const baseAngle = (msgIndex / Math.ceil(count / rows)) * 360;
      const angleDeg = baseAngle + angleRef.current;
      const angleRad = ((angleDeg - 90) * Math.PI) / 180; // -90 so text starts at top

      const r = radius + rowOffset;
      const x = center.x + r * Math.cos(angleRad);
      const y = center.y + r * Math.sin(angleRad);

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      // Fade out messages near edges (behind globe effect)
      const normalizedY = (y - center.y) / radius;
      const opacity = normalizedY < -0.3 ? 0.15 : normalizedY > 0.5 ? 0.85 : 0.7 + normalizedY * 0.3;
      el.style.opacity = String(Math.max(0.08, Math.min(1, opacity)));

      // Scale down messages "behind" the globe
      const scale = 0.7 + (normalizedY + 1) * 0.15;
      el.style.transform = `translate(-50%, -50%) scale(${scale})`;
    });
  };

  // Build display messages array (duplicate for seamless loop)
  const displayMessages = messages.length > 0
    ? [...messages, ...messages, ...messages] // triple for density
    : ["Peace and love! 🌍", "Kindness matters! ❤️", "Spread the light! ✨",
       "Together we shine! 🌟", "Be the change! 🦋"];

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-[5]"
      style={{ overflow: "hidden" }}
    >
      {displayMessages.map((msg, i) => (
        <span
          key={`${i}-${msg.slice(0, 20)}`}
          className="eq-msg absolute whitespace-nowrap text-white font-medium drop-shadow-lg"
          style={{
            fontSize: "11px",
            letterSpacing: "0.02em",
            textShadow: "0 1px 4px rgba(0,0,0,0.8), 0 0 12px rgba(0,0,0,0.5)",
            left: "-1000px", // hide until positioned
            top: "-1000px",
          }}
        >
          {msg} ✨
        </span>
      ))}
    </div>
  );
}
