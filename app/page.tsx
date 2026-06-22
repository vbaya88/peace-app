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

  useEffect(() => {
    // Здесь будет загрузка реального счетчика из базы данных
    // Пока используем тестовое значение
  }, []);

  const handlePayment = () => {
    // Здесь будет интеграция с платежной системой
    alert("Payment system will be connected soon! 🚀");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white">
      {/* Header */}
      <header className="text-center py-12 px-4">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Universe of Kindness
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Leave your kind wish and see how many people are spreading kindness around the world
        </p>
      </header>

      {/* Scrolling Messages */}
      <div className="bg-black/30 py-4 overflow-hidden">
        <div className="flex animate-scroll whitespace-nowrap">
          {messages.map((msg, index) => (
            <span key={index} className="mx-8 text-lg">
              {msg}
            </span>
          ))}
        </div>
      </div>

      {/* Counter */}
      <section className="flex justify-center items-center py-20">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 text-center border border-white/20 shadow-2xl">
          <p className="text-2xl text-gray-300 mb-4">Kindness Count</p>
          <div className="text-8xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
            {count}
          </div>
          <p className="text-xl text-gray-300">
            people left kind wishes
          </p>
        </div>
      </section>

      {/* Payment Button */}
      <section className="text-center pb-20">
        <button
          onClick={handlePayment}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-6 px-12 rounded-full text-xl shadow-lg transform hover:scale-105 transition-all duration-300"
        >
          💚 Leave Kind Wish - $1
        </button>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-500 text-sm">
        <p>© 2024 Universe of Kindness. Spreading love around the world.</p>
      </footer>
    </main>
  );
}