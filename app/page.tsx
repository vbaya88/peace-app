"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [count, setCount] = useState(2);
  const [messages, setMessages] = useState<string[]>([
    "Peace and love! 🌍",
    "Kindness matters! ❤️",
    "Spread the light! ✨",
    "Together we shine! 🌟",
    "Be the change! 🦋",
  ]);

  const handlePayment = () => {
    alert("Payment system will be connected soon! 💚");
  };

  const handleLeaveMessage = () => {
    alert("Message feature coming soon! ✨");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white overflow-hidden flex flex-col">
      {/* Header - Viral Phrase */}
      <header className="text-center py-6 px-4">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Pay $1 to see how many people paid $1
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-2">
          to see how many people paid $
        </p>
        <p className="text-lg text-gray-400 mt-4">
          Universe of Kindness 🌌
        </p>
      </header>

      {/* Scrolling Messages */}
      <div className="bg-black/30 py-3 overflow-hidden">
        <div className="flex animate-scroll whitespace-nowrap">
          {[...messages, ...messages].map((msg, index) => (
            <span key={index} className="mx-8 text-lg">
              {msg}
            </span>
          ))}
        </div>
      </div>

      {/* Main Content - Compact, fits on one screen */}
      <section className="flex-grow flex flex-col justify-center items-center py-8 px-4">
        {/* Counter */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center border border-white/20 shadow-2xl mb-6 w-full max-w-md">
          <p className="text-lg text-gray-300 mb-2">People who paid $1</p>
          <div className="text-6xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
            {count}
          </div>
          <p className="text-sm text-gray-400">
            See how many people joined the universe of kindness
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={handlePayment}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-full text-base shadow-lg transform hover:scale-105 transition-all duration-300"
          >
            💚 Pay $1 + Leave Wish
          </button>
          <button
            onClick={handleLeaveMessage}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-full text-base shadow-lg transform hover:scale-105 transition-all duration-300"
          >
            ✨ Leave Message - $2
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-3 text-gray-500 text-xs">
        <p>© 2024 Universe of Kindness. Spreading love around the world.</p>
      </footer>
    </main>
  );
}