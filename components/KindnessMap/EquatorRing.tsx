"use client";

import { useEffect, useRef, useState } from "react";

interface EquatorRingProps {
  messages: string[];
}

export default function EquatorRing({ messages }: EquatorRingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // ── Measure container ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) setSize({ w: r.width, h: r.height });
    };

    const ro = new ResizeObserver(measure);
    ro.observe(el);

    // Poll for late map load
    measure();
    setTimeout(measure, 500);
    setTimeout(measure, 1500);
    setTimeout(measure, 3000);

    return () => ro.disconnect();
  }, []);

  const { w, h } = size;

  // No size yet → render nothing visible
  if (w === 0 || h === 0) {
    return (
      <div ref={containerRef} className="absolute inset-0 pointer-events-none z-[5]" />
    );
  }

  // Globe parameters
  const cx = w / 2;
  const cy = h / 2;
  const globeRadius = Math.min(w, h) * 0.38; // visible globe radius
  const rx = globeRadius * 1.12; // ellipse rx (slightly wider)
  const ry = globeRadius * 0.22; // ellipse ry (curved around sphere)

  // Build messages
  const rawMessages = messages.length > 0
    ? [...messages, ...messages, ...messages, ...messages]
    : ["Peace and love! 🌍", "Kindness matters! ❤️", "Spread the light! ✨",
       "Together we shine! 🌟", "Be the change! 🦋"];

  // Duplicate for seamless loop
  const allMsgs = [...rawMessages, ...rawMessages];

  // Auto-scale font based on message count
  const baseFontSize = Math.max(8, Math.min(14, 180 / allMsgs.length));

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-[5] overflow-visible"
    >
      <svg
        width={w}
        height={h}
        className="absolute inset-0"
        style={{ overflow: "visible" }}
      >
        {/* Define the elliptical equator path */}
        <defs>
          <path
            id="equator-path"
            d={`M ${cx - rx} ${cy}
                A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy}
                A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy}`}
            fill="none"
          />
        </defs>

        {/* Render each message along the path with animation offset */}
        {allMsgs.map((msg, i) => {
          // Distribute evenly along path, then animate offset
          const totalMessages = allMsgs.length;
          const baseOffset = (i / totalMessages) * 100;

          return (
            <text key={`eq-${i}`}>
              <textPath
                href="#equator-path"
                startOffset={`${baseOffset}%`}
                textAnchor="middle"
                dominantBaseline="central"
                className="equator-text"
                style={{
                  fontSize: `${baseFontSize}px`,
                  fill: "#ffffff",
                  letterSpacing: "0.03em",
                  fontFamily: "system-ui, sans-serif",
                  fontWeight: 500,
                  filter: "drop-shadow(0 0 6px rgba(0,0,0,0.9)) drop-shadow(0 0 16px rgba(0,0,0,0.7)) drop-shadow(0 2px 4px rgba(0,0,0,0.9))",
                  animation: `eq-flow ${30 + totalMessages * 2}s linear infinite`,
                  animationDelay: `-${(i / totalMessages) * (30 + totalMessages * 2)}s`,
                }}
              >
                {msg} ✨
              </textPath>
            </text>
          );
        })}
      </svg>

      {/* Inline styles for animation */}
      <style jsx global>{`
        @keyframes eq-flow {
          from { offset-distance: 0%; }
          to   { offset-distance: 100%; }
        }

        .equator-text {
          /* Fade effect handled by SVG visibility on back-half of ellipse */
        }
      `}</style>
    </div>
  );
}
