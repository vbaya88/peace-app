"use client";

import { useEffect, useRef } from "react";

interface EquatorRingProps {
  messages: string[];
}

export default function EquatorRing({ messages }: EquatorRingProps) {
  const ref = useRef<HTMLDivElement>(null);

  // ── Just ensure container exists and has size ──
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Debug: log that we rendered
    console.log("[EquatorRing] mounted, container size:", el.getBoundingClientRect().width, "x", el.getBoundingClientRect().height);
  }, []);

  const rawMessages = messages.length > 0
    ? [...messages, ...messages, ...messages, ...messages]
    : ["Peace and love! 🌍", "Kindness matters! ❤️", "Spread the light! ✨",
       "Together we shine! 🌟", "Be the change! 🦋"];

  return (
    <div
      ref={ref}
      className="absolute inset-0 pointer-events-none z-[5] overflow-hidden"
      style={{ contain: "layout style" }}
    >
      {/* The equator line — positioned at vertical center */}
      <div
        className="absolute left-0 right-0 flex items-center overflow-hidden"
        style={{
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        {/* Scrolling content via CSS animation */}
        <div
          className="flex whitespace-nowrap"
          style={{
            animation: "equator-scroll 30s linear infinite",
          }}
        >
          {[...rawMessages, ...rawMessages].map((msg, i) => (
            <span
              key={`eq-${i}`}
              className="inline-block whitespace-nowrap mx-4 text-white font-medium select-none"
              style={{
                fontSize: "12px",
                letterSpacing: "0.03em",
                textShadow: "0 0 8px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.9)",
              }}
            >
              {msg} ✨
            </span>
          ))}
        </div>
      </div>

      {/* Inline keyframes — no external CSS needed */}
      <style jsx>{`
        @keyframes equator-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
