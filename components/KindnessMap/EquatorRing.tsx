"use client";

import { useEffect, useRef, useState } from "react";

interface EquatorRingProps {
  messages: string[];
  /** Optional: receive map zoom for better globe size estimation */
  mapZoom?: number;
}

export default function EquatorRing({ messages, mapZoom }: EquatorRingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const angleRef = useRef(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState<number | undefined>(undefined);
  const msgRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // ── Accept external zoom updates from parent (mapbox) ──
  useEffect(() => {
    if (mapZoom !== undefined) setZoom(mapZoom);
  }, [mapZoom]);

  // ── Measure container ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);

    const timers = [
      setTimeout(measure, 500),
      setTimeout(measure, 1500),
      setTimeout(measure, 3000),
    ];

    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // ── Animation loop: rotate messages along ellipse ──
  useEffect(() => {
    if (size.w === 0) return;

    const SPEED = 0.3; // degrees per frame (~18°/sec at 60fps)

    const animate = () => {
      angleRef.current = (angleRef.current + SPEED) % 360;
      positionMessages();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [size.w, size.h, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Calculate globe radius based on zoom and container size ──
  const getGlobeRadius = (): number => {
    const { w, h } = size;
    if (w === 0) return 0;

    // Mapbox globe projection: at zoom=2, globe fills ~76% of min dimension
    // At higher zoom, globe appears larger
    // At lower zoom, globe appears smaller
    const baseZoom = zoom ?? 2;
    // Empirical: each zoom level doubles apparent size
    // Globe radius as fraction of viewport
    const zoomFactor = Math.pow(1.5, baseZoom - 2); // 1.0 at z=2
    const rawRadius = Math.min(w, h) * 0.38 * zoomFactor;

    // Clamp: ellipse should always be visible but not exceed container
    return Math.min(rawRadius, Math.min(w, h) * 0.48);
  };

  // ── Position each message on the ellipse ──
  const positionMessages = () => {
    const els = msgRefs.current.filter(Boolean) as HTMLSpanElement[];
    if (els.length === 0 || size.w === 0) return;

    const { w, h } = size;
    const cx = w / 2;
    const cy = h / 2;

    const globeRadius = getGlobeRadius();
    const rx = globeRadius * 1.15;
    const ry = globeRadius * 0.20;

    const baseAngle = angleRef.current * (Math.PI / 180);

    els.forEach((el, i) => {
      const spacing = (2 * Math.PI) / els.length;
      const theta = baseAngle + i * spacing;

      const x = cx + rx * Math.cos(theta);
      const y = cy + ry * Math.sin(theta);

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;

      const cosT = Math.cos(theta);

      // Back half (behind globe): completely hidden
      if (cosT < 0) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        el.style.transform = `translate(-50%, -50%) scale(0.5)`;
        return;
      }

      // Front half: brightness based on position
      // cosT: 0 at front-edges, 1 at front-center-right
      const brightness = 0.55 + 0.45 * cosT; // 0.55 at edges, 1.0 at center

      el.style.opacity = String(brightness);
      el.style.pointerEvents = "none";
      el.style.transform = `translate(-50%, -50%) scale(${0.85 + 0.15 * cosT})`;
    });
  };

  // ── Build display messages ──
  const rawMessages = messages.length > 0
    ? [...messages, ...messages, ...messages, ...messages]
    : ["Peace and love! 🌍", "Kindness matters! ❤️", "Spread the light! ✨",
       "Together we shine! 🌟", "Be the change! 🦋"];

  const fontSize = Math.max(8, Math.min(14, 180 / rawMessages.length));

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-[5] overflow-hidden"
    >
      {rawMessages.map((msg, i) => (
        <span
          key={`eq-${i}`}
          ref={(el) => { msgRefs.current[i] = el; }}
          className="absolute whitespace-nowrap text-white font-medium select-none"
          style={{
            fontSize: `${fontSize}px`,
            letterSpacing: "0.03em",
            fontFamily: "system-ui, sans-serif",
            fontWeight: 500,
            textShadow: "0 0 6px rgba(0,0,0,0.95), 0 0 16px rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,0.9)",
            left: "-2000px",
            top: "0px",
          }}
        >
          {msg} ✨
        </span>
      ))}
    </div>
  );
}
