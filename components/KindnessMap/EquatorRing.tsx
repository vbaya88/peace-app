"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface EquatorRingProps {
  messages: string[];
}

export default function EquatorRing({ messages }: EquatorRingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const offsetRef = useRef(0);
  // Use the container's own dimensions instead of querying mapbox canvas
  const [size, setSize] = useState({ w: 0, h: 0 });
  const msgRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const widthsCache = useRef<number[]>([]);

  // ── Measure container size on mount, resize, and periodically ──
  const measureSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setSize({ w: rect.width, h: rect.height });
    }
  }, []);

  useEffect(() => {
    measureSize();

    // Initial + resize observer
    const ro = new ResizeObserver(measureSize);
    if (containerRef.current) ro.observe(containerRef.current);

    // Also poll a few times in case map loads late
    const timers = [
      setTimeout(measureSize, 500),
      setTimeout(measureSize, 1500),
      setTimeout(measureSize, 3000),
    ];

    window.addEventListener("resize", measureSize);

    return () => {
      ro.disconnect();
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", measureSize);
    };
  }, [measureSize]);

  // ── Cache message widths after render ──
  useEffect(() => {
    const widths: number[] = [];
    msgRefs.current.forEach((el) => {
      if (el) widths.push(el.offsetWidth || el.scrollWidth || 120);
    });
    if (widths.length > 0 && widths.some((w) => w > 0)) {
      widthsCache.current = widths;
    }
  }, [messages, size]);

  // ── Animation loop ──
  useEffect(() => {
    if (size.w === 0 || messages.length === 0) return;

    const SPEED = 0.5; // px per frame

    const animate = () => {
      offsetRef.current -= SPEED;
      positionMessages();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [messages, size.w, size.h]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Position all messages along equator line ──
  const positionMessages = () => {
    const els = msgRefs.current.filter(Boolean) as HTMLSpanElement[];
    if (els.length === 0 || size.w === 0) return;

    const { w, h } = size;
    const cx = w / 2;
    const cy = h / 2;
    const baseRadius = Math.min(w, h) * 0.38;
    const rx = baseRadius * 1.15;
    const ry = baseRadius * 0.06;

    // Calculate total width for wrapping
    const widths = widthsCache.current.length === els.length
      ? widthsCache.current
      : els.map((el) => el.offsetWidth || 120);

    let totalWidth = widths.reduce((sum, wd) => sum + wd + 16, 0);
    if (totalWidth === 0) totalWidth = els.length * 136; // fallback

    const wrapOffset = ((offsetRef.current % totalWidth) + totalWidth) % totalWidth;

    let currentX = cx - rx + wrapOffset;

    els.forEach((el, i) => {
      const wd = widths[i] || 120;

      // Elliptical position along equator
      const relX = (currentX - cx) / rx;
      const y = cy + ry * (1 - relX * relX);

      el.style.left = `${currentX}px`;
      el.style.top = `${y}px`;

      // Fade at edges
      const dist = Math.abs(relX);
      el.style.opacity = dist > 0.95 ? "0" : dist > 0.8 ? "0.35" : "1";

      currentX += wd + 16;
    });
  };

  // ── Build display messages (duplicated for seamless loop) ──
  const rawMessages = messages.length > 0
    ? [...messages, ...messages, ...messages, ...messages, ...messages, ...messages]
    : ["Peace and love! 🌍", "Kindness matters! ❤️", "Spread the light! ✨",
       "Together we shine! 🌟", "Be the change! 🦋"];

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-[5] overflow-hidden"
    >
      {rawMessages.map((msg, i) => (
        <span
          key={`${i}-${msg.slice(0, 20)}`}
          ref={(el) => { msgRefs.current[i] = el; }}
          className="absolute whitespace-nowrap text-white font-medium"
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
