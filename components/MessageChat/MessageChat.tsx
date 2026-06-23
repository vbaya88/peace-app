"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  id: string;
  name: string;
  text: string;
  tier?: "paid2" | "paid5"; // payment tier for badge
}

interface MessageChatProps {
  messages: ChatMessage[];
  /** i18n title */
  title: string;
}

// Demo messages to simulate activity
const DEMO_MESSAGES: ChatMessage[] = [
  { id: "d1",  name: "Maria_G",      text: "This world needs more kindness! 🌏", tier: "paid5" },
  { id: "d2",  name: "Alex_K",       text: "Spreading love from Moscow 💜",        tier: "paid2" },
  { id: "d3",  name: "Sofia_M",      text: "One small act can change everything ✨", tier: "paid5" },
  { id: "d4",  name: "IvanP",        text: "Together we are stronger 💪",          tier: "paid2" },
  { id: "d5",  name: "ElenaV",      text: "Thank you for creating this! 🙏",       tier: "paid5" },
  { id: "d6",  name: "Dmitri_S",    text: "Peace begins with a smile 😊",         tier: "paid2" },
  { id: "d7",  name: "AnnaL",       text: "From Brazil with love 🇧🇷",             tier: "paid5" },
  { id: "d8",  name: "Maxxim",      text: "Keep shining bright! ⭐",               tier: "paid2" },
  { id: "d9",  name: "OlgaN",       text: "Science + kindness = progress 🧬",     tier: "paid5" },
  { id: "d10", name: "Sergey_K",    text: "Every heart matters ❤️",               tier: "paid2" },
  { id: "d11", name: "Kate_D",     text: "New York believes in you 🗽",           tier: "paid5" },
  { id: "d12", name: "Andrey_B",    text: "Light always wins 🌅",                 tier: "paid2" },
  { id: "d13", name: "Natalia_F",   text: "Hope is contagious 🦋",                tier: "paid5" },
  { id: "d14", name: "RomanE",      text: "From Siberia with warmth ❄️🔥",        tier: "paid2" },
  { id: "d15", name: "YuliaM",       text: "Kindness is the only currency 💖",     tier: "paid5" },
  { id: "d16", name: "ViktorA",     text: "Belarus sends hugs 🤗",                 tier: "paid2" },
  { id: "d17", name: "Tatiana_K",  text: "Love has no borders 🌍❤️",              tier: "paid5" },
  { id: "d18", name: "OlegN",       text: "Stay kind, stay strong 💪",             tier: "paid2" },
  { id: "d19", name: "Veronika_S",  text: "Paris sends light to the world 🗼",    tier: "paid5" },
  { id: "d20", name: "PavelM",     text: "One love, one heart ☮️",                tier: "paid2" },
  { id: "d21", name: "IrinaV",      text: "Kazakhstan believes in goodness 🇰🇿",  tier: "paid5" },
  { id: "d22", name: "Konstantin", text: "The universe is listening 👂✨",        tier: "paid2" },
  { id: "d23", name: "Svetlana_R",  text: "Berlin → world: we care 🐻",           tier: "paid5" },
  { id: "d24", name: "ArtemZ",      text: "Keep the flame alive 🔥",               tier: "paid2" },
  { id: "d25", name: "Marina_K",   text: "Kyiv stands with kindness 🇺🇦💛",       tier: "paid5" },
  { id: "d26", name: "IgorP",       text: "Minsk energy: positive only ⚡",       tier: "paid2" },
  { id: "d27", name: "AlinaS",      text: "Almaty hearts are open 💖",             tier: "paid5" },
  { id: "d28", name: "FedorL",      text: "Good vibes only 🌿",                     tier: "paid2" },
  { id: "d29", name: "EkaterinaD", text: "Warsaw says thank you 🇵🇱🙏",           tier: "paid5" },
  { id: "d30", name: "Nikolay_A",   text: "The future is kind 💫",                 tier: "paid2" },
];

// Stable color per username (consistent across renders)
function nameToColor(name: string): string {
  const PALETTE = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
    "#F8B500", "#00CED1", "#FF69B4", "#32CD32", "#FFA07A",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function getInitials(name: string): string {
  return name
    .split(/[_\s-]/g)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export default function MessageChat({ messages, title }: MessageChatProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [demoVisible, setDemoVisible] = useState<Set<string>>(new Set());

  // Interleave demo messages into real messages (real ones always on top)
  const realMessages = messages.slice(0, 5); // show up to 5 real on top
  const allMessages = [...realMessages, ...DEMO_MESSAGES];

  // Auto-scroll to top (newest)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [messages.length]);

  // Animate demo messages appearing one by one
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    DEMO_MESSAGES.forEach((msg, i) => {
      const t = setTimeout(() => {
        setDemoVisible((prev) => new Set([...prev, msg.id]));
      }, i * 120); // staggered reveal
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="absolute right-4 z-[60] bg-black/40 backdrop-blur-lg rounded-l-full px-3 py-3 border border-white/20 text-white text-xs hover:bg-white/20 transition-all"
        style={{ top: "50%", transform: "translateY(-50%)" }}
      >
        <span style={{ writingMode: "vertical-rl" }}>▶ {title}</span>
      </button>
    );
  }

  return (
    <div
      className="absolute right-4 z-[40] w-[300px] flex flex-col"
      style={{ top: "50%", transform: "translateY(-50%)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-xl px-4 py-2.5 border border-white/15"
        style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <h3 className="text-white text-sm font-semibold">{title}</h3>
        <button
          onClick={() => setVisible(false)}
          className="text-white/50 hover:text-white text-xs transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Messages — fully transparent bg */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto rounded-b-xl border border-white/10 p-2 space-y-1.5"
        style={{
          background: "rgba(0,0,0,0.12)",
          backdropFilter: "blur(8px)",
          maxHeight: "calc(58vh - 40px)",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.15) transparent",
        }}
      >
        {allMessages.map((msg, i) => {
          const isReal = !msg.id.startsWith("d");
          const isVisible = isReal || demoVisible.has(msg.id);
          const fadeIndex = Math.min(i, 14);
          const opacity = isReal ? Math.max(0.5, 1 - i * 0.08) : isVisible ? Math.max(0.3, 1 - fadeIndex * 0.05) : 0;

          if (!isVisible && !isReal) return null;

          const bg = nameToColor(msg.name);
          const initials = getInitials(msg.name);

          return (
            <div
              key={msg.id}
              className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-white/5 transition-colors"
              style={{ opacity }}
            >
              {/* Avatar */}
              <div
                className="flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold select-none"
                style={{
                  width: 28,
                  height: 28,
                  minWidth: 28,
                  background: bg,
                  fontSize: 10,
                  lineHeight: "28px",
                  textAlign: "center",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                }}
              >
                {initials}
              </div>

              {/* Badge (for $5 tier) */}
              {msg.tier === "paid5" && (
                <span className="flex-shrink-0 text-yellow-300 text-xs" title="$5 supporter">⭐</span>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <span className="font-bold text-white/90 text-xs" style={{ fontSize: 12 }}>{msg.name}</span>
                <span className="text-white/60 text-xs" style={{ fontSize: 12 }}>: </span>
                <span className="text-white/80 text-xs" style={{ fontSize: 12 }}>{msg.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
