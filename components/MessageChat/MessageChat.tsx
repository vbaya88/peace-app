"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  id: string;
  name: string;
  text: string;
}

interface MessageChatProps {
  messages: ChatMessage[];
  /** i18n title */
  title: string;
}

export default function MessageChat({ messages, title }: MessageChatProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  // Auto-scroll to show newest at top
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [messages.length]);

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="absolute top-4 right-4 z-[60] bg-white/10 backdrop-blur-lg rounded-l-full px-3 py-2 border border-white/20 text-white text-xs hover:bg-white/20 transition-all"
        style={{ writingMode: "vertical-rl" }}
      >
        ▶ {title}
      </button>
    );
  }

  return (
    <div
      className="absolute top-4 right-4 z-[40] w-[280px] max-h-[60vh] flex flex-col pointer-events-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-black/50 backdrop-blur-lg rounded-t-xl px-3 py-2 border border-white/15 border-b-0">
        <h3 className="text-white text-sm font-semibold">{title}</h3>
        <button
          onClick={() => setVisible(false)}
          className="text-white/50 hover:text-white text-xs transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Messages container — scrollable, newest on top */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-black/30 backdrop-blur-md rounded-b-xl border border-white/10 p-2 space-y-1.5"
        style={{
          maxHeight: "calc(60vh - 36px)",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.2) transparent",
        }}
      >
        {messages.length === 0 ? (
          <div className="text-white/30 text-xs text-center py-8">
            No messages yet...
          </div>
        ) : (
          messages.map((msg, i) => {
            // Fade: top messages bright, bottom dimmer
            const fadeIndex = Math.min(i, 12); // cap fade range
            const opacity = 1 - fadeIndex * 0.06; // 100% → ~28% over 12 items

            return (
              <div
                key={msg.id ?? `chat-${i}`}
                className="text-xs leading-snug px-1.5 py-1 rounded hover:bg-white/5 transition-colors"
                style={{ opacity }}
              >
                <span className="font-bold text-cyan-300">{msg.name}</span>
                <span className="text-white/80">: </span>
                <span className="text-white/90">{msg.text}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
