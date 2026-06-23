"use client";

import { useEffect, useRef, useState } from "react";

interface EquatorRingProps {
  messages: string[];
  mapZoom?: number;
}

export default function EquatorRing({ messages, mapZoom }: EquatorRingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const angleRef = useRef(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState<number>(2);
  const msgRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // ── Accept external zoom updates from mapbox ──
  useEffect(() => {
    if (mapZoom !== undefined && Number.isFinite(mapZoom)) {
      console.log(`[EquatorRing] zoom received: ${mapZoom}`);
      setZoom(mapZoom);
    }
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

    const timers = [setTimeout(measure, 500), setTimeout(measure, 1500), setTimeout(measure, 3000)];
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // ── Animation loop ──
  useEffect(() => {
    if (size.w === 0) return;
    const SPEED = 0.3;

    const animate = () => {
      angleRef.current = (angleRef.current + SPEED) % 360;
      positionMessages();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [size.w, size.h, zoom]);

  // ── Globe radius from zoom ──
  const getGlobeRadius = (): number => {
    const { w, h } = size;
    if (w === 0) return 0;

    // At default zoom=2, globe fills ~76% of min dimension
    // Each zoom level ~doubles apparent globe size
    const z = Math.max(0.5, Math.min(zoom, 12));
    const zoomFactor = Math.pow(1.8, z - 2); // more aggressive scaling
    const rawRadius = Math.min(w, h) * 0.40 * zoomFactor;
    return Math.min(rawRadius, Math.min(w, h) * 0.52);
  };

  // ── Position messages on ellipse ──
  const positionMessages = () => {
    const els = msgRefs.current.filter(Boolean) as HTMLSpanElement[];
    if (els.length === 0 || size.w === 0) return;

    const { w, h } = size;
    const cx = w / 2;
    const cy = h / 2;

    const globeRadius = getGlobeRadius();
    const rx = globeRadius * 1.45; // ellipse width — wider to wrap around globe
    const ry = globeRadius * 0.20; // ellipse height (gentle curve)

    const baseAngle = angleRef.current * (Math.PI / 180);

    els.forEach((el, i) => {
      const spacing = (2 * Math.PI) / els.length;
      const theta = baseAngle + i * spacing;

      // Parametric ellipse
      const x = cx + rx * Math.cos(theta);
      const y = cy + ry * Math.sin(theta);

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;

      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      // ═══ VISIBILITY ═══
      //
      //   θ=0 → rightmost point (front-center)
      //   θ=π/2 → bottom of ellipse (BEHIND the globe)
      //   θ=π → leftmost point (front-left)
      //   θ=-π/2 or 3π/2 → top of ellipse (front-top)
      //
      // The BOTTOM half of the ellipse (sinT > 0) is what goes BEHIND the globe

      const isBehind = sinT > 0; // bottom arc = behind globe

      if (isBehind) {
        el.style.opacity = "0";
        el.style.transform = `translate(-50%, -50%) scale(0.5)`;
        el.style.pointerEvents = "none";
        return;
      }

      // Front half (top arc): visible with brightness gradient
      // Brightest at center-front (θ=0, right), slightly dimmer at edges (θ=±π)
      // Both left and right front edges should be reasonably bright
      const brightness = 0.6 + 0.4 * Math.abs(cosT); // 0.6 at top-center, 1.0 at left/right edges

      el.style.opacity = String(brightness);
      el.style.pointerEvents = "none";
      el.style.transform = `translate(-50%, -50%) scale(${0.85 + 0.15 * Math.abs(cosT)})`;
    });
  };

  // ── Messages ──
  const rawMessages = messages.length > 0
    ? [...messages, ...messages, ...messages, ...messages]
    : ["Peace and love! 🌍", "Kindness matters! ❤️", "Spread the light! ✨",
       "Together we shine! 🌟", "Be the change! 🦋"];

  const fontSize = Math.max(8, Math.min(14, 180 / rawMessages.length));

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-[5] overflow-hidden">
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
            left: "-2000px", top: "0px",
          }}
        >
          {msg} ✨
        </span>
      ))}
    </div>
  );
}
