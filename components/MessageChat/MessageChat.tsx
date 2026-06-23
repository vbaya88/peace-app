"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  id: string;
  name: string;
  text: string;
  tier?: "paid2" | "paid5";
}

interface MessageChatProps {
  messages: ChatMessage[];
  title: string;
}

// ── Demo messages pool ──
const DEMO_POOL: Omit<ChatMessage, "id">[] = [
  { name: "Maria_G",      text: "This world needs more kindness! 🌏", tier: "paid5" },
  { name: "Alex_K",       text: "Spreading love from Moscow 💜",        tier: "paid2" },
  { name: "Sofia_M",      text: "One small act can change everything ✨", tier: "paid5" },
  { name: "IvanP",        text: "Together we are stronger 💪",          tier: "paid2" },
  { name: "ElenaV",       text: "Thank you for creating this! 🙏",       tier: "paid5" },
  { name: "Dmitri_S",     text: "Peace begins with a smile 😊",         tier: "paid2" },
  { name: "AnnaL",        text: "From Brazil with love 🇧🇷",             tier: "paid5" },
  { name: "Maxxim",       text: "Keep shining bright! ⭐",               tier: "paid2" },
  { name: "OlgaN",        text: "Science + kindness = progress 🧬",     tier: "paid5" },
  { name: "Sergey_K",     text: "Every heart matters ❤️",               tier: "paid2" },
  { name: "Kate_D",       text: "New York believes in you 🗽",           tier: "paid5" },
  { name: "Andrey_B",     text: "Light always wins 🌅",                 tier: "paid2" },
  { name: "Natalia_F",    text: "Hope is contagious 🦋",                tier: "paid5" },
  { name: "RomanE",       text: "From Siberia with warmth ❄️🔥",        tier: "paid2" },
  { name: "YuliaM",       text: "Kindness is the only currency 💖",     tier: "paid5" },
  { name: "ViktorA",      text: "Belarus sends hugs 🤗",                 tier: "paid2" },
  { name: "Tatiana_K",    text: "Love has no borders 🌍❤️",              tier: "paid5" },
  { name: "OlegN",        text: "Stay kind, stay strong 💪",             tier: "paid2" },
  { name: "Veronika_S",   text: "Paris sends light to the world 🗼",    tier: "paid5" },
  { name: "PavelM",       text: "One love, one heart ☮️",                tier: "paid2" },
  { name: "IrinaV",       text: "Kazakhstan believes in goodness 🇰🇿",  tier: "paid5" },
  { name: "Konstantin",   text: "The universe is listening 👂✨",        tier: "paid2" },
  { name: "Svetlana_R",   text: "Berlin → world: we care 🐻",           tier: "paid5" },
  { name: "ArtemZ",       text: "Keep the flame alive 🔥",               tier: "paid2" },
  { name: "Marina_K",     text: "Kyiv stands with kindness 🇺🇦💛",       tier: "paid5" },
  { name: "IgorP",        text: "Minsk energy: positive only ⚡",       tier: "paid2" },
  { name: "AlinaS",       text: "Almaty hearts are open 💖",             tier: "paid5" },
  { name: "FedorL",       text: "Good vibes only 🌿",                     tier: "paid2" },
  { name: "Ekaterina_D",  text: "Warsaw says thank you 🇵🇱🙏",           tier: "paid5" },
  { name: "Nikolay_A",    text: "The future is kind 💫",                 tier: "paid2" },
];

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
  return name.split(/[_\s-]/g).filter(Boolean).slice(0, 2)
    .map((p) => p[0].toUpperCase()).join("");
}

export default function MessageChat({ messages, title }: MessageChatProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);

  // Auto-scroll to top on new message
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [liveMessages.length]);

  // Inject real messages at top when they arrive
  useEffect(() => {
    if (messages.length > 0) {
      setLiveMessages((prev) => [...messages, ...prev]);
    }
  }, [messages]);

  // Simulate live demo activity: push a random demo msg every 3–6 seconds
  useEffect(() => {
    let idx = 0;

    // Seed initial batch of ~10 messages immediately
    const initialBatch: ChatMessage[] = [];
    for (let i = 0; i < Math.min(10, DEMO_POOL.length); i++) {
      const demo = DEMO_POOL[idx++ % DEMO_POOL.length];
      initialBatch.push({ ...demo, id: `demo-${Date.now()}-${i}` });
    }
    setLiveMessages(initialBatch);

    // Then keep adding every 3–6 seconds
    const timer = setInterval(() => {
      const demo = DEMO_POOL[idx++ % DEMO_POOL.length];
      setLiveMessages((prev) => [
        { ...demo, id: `demo-${Date.now()}-${idx}` },
        ...prev,
      ].slice(0, 30));
    }, 3000 + Math.random() * 3000);

    return () => clearInterval(timer);
  }, []);

  if (!visible) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setVisible(true); }}
        className="fixed left-0 z-[9999] bg-black/40 backdrop-blur-md rounded-r-lg px-2 py-6 border border-white/20 text-white text-xs hover:bg-white/20 transition-all cursor-pointer select-none"
        style={{ top: "50%", transform: "translateY(-50%)" }}
      >
        <span style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>▶ {title}</span>
      </button>
    );
  }

  return (
    <div
      className="absolute left-4 z-[40] w-[300px] flex flex-col pointer-events-auto"
      style={{ top: "50%", transform: "translateY(-50%)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between rounded-t-xl px-4 py-2.5"
        style={{
          background: "rgba(10, 12, 30, 0.35)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 -2px 20px rgba(0,0,0,0.15)",
        }}
      >
        <h3 className="text-white text-sm font-semibold">{title}</h3>
        <button
          onClick={() => setVisible(false)}
          className="text-white/50 hover:text-white text-xs transition-colors cursor-pointer"
        >✕</button>
      </div>

      {/* Messages container — FULLY TRANSPARENT background */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto rounded-b-xl space-y-1 px-1.5 py-2"
        style={{
          background: "transparent",
          maxHeight: "calc(58vh - 40px)",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.1) transparent",
        }}
      >
        {liveMessages.map((msg, i) => {
          const fadeIndex = Math.min(i, 14);
          const opacity = Math.max(0.25, 1 - fadeIndex * 0.05);
          const bg = nameToColor(msg.name);
          const initials = getInitials(msg.name);

          return (
            <div
              key={msg.id}
              className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-white/[0.06] transition-all"
              style={{ opacity }}
            >
              {/* Avatar circle */}
              <div
                className="flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold select-none"
                style={{
                  width: 28, height: 28, minWidth: 28,
                  background: bg, fontSize: 10, lineHeight: "28px",
                  textAlign: "center",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.45)",
                }}
              >{initials}</div>

              {/* Badge for $5+ */}
              {msg.tier === "paid5" && (
                <span className="flex-shrink-0 text-yellow-300 text-[11px]" title="$5 supporter">⭐</span>
              )}

              {/* Name + Text */}
              <div className="flex-1 min-w-0">
                <span className="font-bold text-white/90 text-xs">{msg.name}</span>
                <span className="text-white/55 text-xs">: </span>
                <span className="text-white/75 text-xs">{msg.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
