"use client";

import { useEffect, useRef, useState } from "react";

interface EquatorRingProps {
  messages: string[];
}

export default function EquatorRing({ messages }: EquatorRingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const angleRef = useRef(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const msgRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const widthsCache = useRef<number[]>([]);

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

    // Poll for late map load
    const timers = [
      setTimeout(measure, 500),
      setTimeout(measure, 1500),
      setTimeout(measure, 3000),
      // Also re-measure on map zoom/pan (mapbox fires wheel/moveend)
      setInterval(measure, 2000),
    ];

    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      timers.forEach(clearTimeout);
      clearInterval(timers[timers.length - 1]);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // ── Cache message widths ──
  useEffect(() => {
    const widths: number[] = [];
    msgRefs.current.forEach((el) => {
      if (el) widths.push(el.offsetWidth || el.scrollWidth || 120);
    });
    if (widths.length > 0 && widths.some((w) => w > 0)) {
      widthsCache.current = widths;
    }
  }, [messages, size]);

  // ── Animation loop: rotate messages along ellipse ──
  useEffect(() => {
    if (size.w === 0) return;

    const SPEED = 0.25; // degrees per frame (~15°/sec at 60fps)

    const animate = () => {
      angleRef.current = (angleRef.current + SPEED) % 360;
      positionMessages();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [size.w, size.h]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Position each message on the ellipse ──
  const positionMessages = () => {
    const els = msgRefs.current.filter(Boolean) as HTMLSpanElement[];
    if (els.length === 0 || size.w === 0) return;

    const { w, h } = size;
    const cx = w / 2;
    const cy = h / 2;
    const globeRadius = Math.min(w, h) * 0.38;
    const rx = globeRadius * 1.1; // slightly wider than globe
    const ry = globeRadius * 0.18; // gentle curve

    const baseAngle = angleRef.current * (Math.PI / 180); // current rotation in radians

    els.forEach((el, i) => {
      // Distribute messages evenly around the full ellipse
      const spacing = (2 * Math.PI) / els.length;
      const theta = baseAngle + i * spacing;

      // Ellipse parametric: x = cx + rx*cos(θ), y = cy + ry*sin(θ)
      const x = cx + rx * Math.cos(theta);
      const y = cy + ry * Math.sin(theta);

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.transform = `translate(-50%, -50%)`;

      // Determine visibility: front half (cos > 0) = visible, back half = hidden/faded
      const cosTheta = Math.cos(theta);
      const isFront = cosTheta >= 0;

      // Opacity: fully visible at front-center, fading to invisible at back
      let opacity: number;
      if (isFront) {
        opacity = 0.4 + 0.6 * cosTheta; // 0.4 at edges, 1.0 at center-front
      } else {
        opacity = Math.max(0, 0.3 * (1 + cosTheta)); // fade out behind globe
      }

      el.style.opacity = String(opacity);

      // Scale slightly smaller when "behind" the globe
      const scale = isFront ? 1 : 0.7 + 0.3 * (1 + cosTheta);
      el.style.transform = `translate(-50%, -50%) scale(${scale})`;

      // Keep text upright always (no upside-down text!)
      // Text is always horizontal regardless of position on ellipse
    });
  };

  // ── Build display messages ──
  const rawMessages = messages.length > 0
    ? [...messages, ...messages, ...messages, ...messages]
    : ["Peace and love! 🌍", "Kindness matters! ❤️", "Spread the light! ✨",
       "Together we shine! 🌟", "Be the change! 🦋"];

  // Auto-scale font based on count
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
