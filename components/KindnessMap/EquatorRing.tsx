"use client";

import { useEffect, useRef, useState } from "react";

interface EquatorRingProps {
  messages: string[];
}

export default function EquatorRing({ messages }: EquatorRingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const offsetRef = useRef(0);
  const [globeInfo, setGlobeInfo] = useState({ cx: 0, cy: 0, rx: 0, ry: 0 });
  const [ready, setReady] = useState(false);

  // ── Calculate globe ellipse (equator appears as horizontal line through center) ──
  useEffect(() => {
    const updateGlobeBounds = () => {
      const canvas = document.querySelector(".mapboxgl-canvas") as HTMLCanvasElement;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      // Globe center
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      // Globe is roughly circular; equator at default view is a horizontal line
      // rx ≈ globe radius, ry ≈ 0 for pure horizontal line
      // But we add slight vertical curve to simulate perspective tilt
      const baseRadius = Math.min(rect.width, rect.height) * 0.38;

      setGlobeInfo({
        cx,
        cy,
        rx: baseRadius * 1.15,   // slightly wider than globe (equator wraps around)
        ry: baseRadius * 0.08,    // very slight curve — almost flat line
      });
      setReady(true);
    };

    updateGlobeBounds();

    let debounce: ReturnType<typeof setTimeout>;
    const onMapChange = () => {
      clearTimeout(debounce);
      debounce = setTimeout(updateGlobeBounds, 150);
    };

    window.addEventListener("resize", onMapChange);

    const mapEl = document.querySelector(".mapboxgl-map");
    if (mapEl) mapEl.addEventListener("wheel", onMapChange, { passive: true });

    return () => {
      clearTimeout(debounce);
      window.removeEventListener("resize", onMapChange);
      if (mapEl) mapEl.removeEventListener("wheel", onMapChange);
    };
  }, []);

  // ── Animation loop — scroll messages along the equator line ──
  useEffect(() => {
    if (!ready || messages.length === 0) return;

    const SPEED = 0.4; // pixels per frame

    const animate = () => {
      offsetRef.current -= SPEED;
      // Wrap around when offset exceeds message total width
      renderFrame();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [ready, messages]);

  // Position all messages in a single horizontal line through globe center
  const renderFrame = () => {
    const container = containerRef.current;
    if (!container || globeInfo.rx === 0) return;

    const els = container.querySelectorAll<HTMLElement>(".eq-msg");
    const { cx, cy, rx, ry } = globeInfo;
    let totalWidth = 0;
    const widths: number[] = [];

    els.forEach((el) => {
      const w = el.offsetWidth;
      widths.push(w);
      totalWidth += w + 16; // +16px gap
    });

    // Wrap offset within total width
    const wrapOffset = ((offsetRef.current % totalWidth) + totalWidth) % totalWidth;

    let currentX = cx - rx + wrapOffset;
    els.forEach((el, i) => {
      const w = widths[i];

      // Position along the equator line (horizontal through center)
      // Add slight elliptical Y based on X position for subtle 3D curve
      const relX = (currentX - cx) / rx; // -1 to 1
      const y = cy + ry * (1 - relX * relX); // parabola: peaks at edges

      el.style.left = `${currentX}px`;
      el.style.top = `${y}px`;

      // Fade at edges of the visible band
      const distFromCenter = Math.abs(relX);
      const opacity = distFromCenter > 0.95 ? 0 : distFromCenter > 0.8 ? 0.4 : 1;
      el.style.opacity = String(opacity);

      currentX += w + 16;
    });
  };

  // Build messages array — duplicate many times for seamless infinite scroll
  const displayMessages = messages.length > 0
    ? [...messages, ...messages, ...messages, ...messages, ...messages, ...messages]
    : ["Peace and love! 🌍", "Kindness matters! ❤️", "Spread the light! ✨",
       "Together we shine! 🌟", "Be the change! 🦋"];

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-[5] overflow-hidden"
    >
      {displayMessages.map((msg, i) => (
        <span
          key={`${i}-${msg.slice(0, 20)}`}
          className="eq-msg absolute whitespace-nowrap text-white font-medium"
          style={{
            fontSize: "12px",
            letterSpacing: "0.03em",
            textShadow: "0 0 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.8)",
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
