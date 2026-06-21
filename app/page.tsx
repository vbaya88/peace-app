"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function Home() {
  const [count, setCount] = useState(0);
  const [messages, setMessages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Загружаем данные при старте
  useEffect(() => {
    const fetchData = async () => {
      // 1. Получаем счетчик
      const { data: counterData } = await supabase
        .from("counter")
        .select("count")
        .eq("id", 1)
        .single();

      if (counterData) setCount(counterData.count);

      // 2. Получаем сообщения
      const { data: messagesData } = await supabase
        .from("messages")
        .select("text")
        .order("created_at", { ascending: false })
        .limit(50);

      if (messagesData) {
        setMessages(messagesData.map((m: any) => m.text));
      }
      
      setLoading(false);
    };

    fetchData();

    // Подписываемся на обновления счетчика
    const countChannel = supabase
      .channel("counter-changes")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "counter" }, (payload) => {
        setCount(payload.new.count);
      })
      .subscribe();

    // Подписываемся на новые сообщения
    const msgChannel = supabase
      .channel("messages-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        setMessages((prev) => [payload.new.text, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(countChannel);
      supabase.removeChannel(msgChannel);
    };
  }, []);

  // Функция для увеличения счетчика
  const incrementCount = async () => {
    const newCount = count + 1;
    await supabase.from("counter").update({ count: newCount }).eq("id", 1);
  };

  // Функция для добавления сообщения
  const addMessage = async () => {
    const text = window.prompt("Напишите ваше послание миру:");
    if (text && text.trim().length > 0) {
      await supabase.from("messages").insert({ text: text.trim() });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-purple-900 to-black text-white">
      <header className="p-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          🕊️ Мир за $1
        </h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
          Заплати $1, чтобы посмотреть, сколько человек заплатило $1, 
          чтобы посмотреть, сколько человек заплатило $1 за мир во всем мире
        </p>
      </header>

      {/* Бегущая строка */}
      <div className="bg-black/50 py-4 overflow-hidden border-y border-purple-500/30">
        <div className="whitespace-nowrap animate-marquee flex">
          {/* Дублируем сообщения, чтобы строка была бесконечной */}
          {[...messages, ...messages].map((msg, idx) => (
            <span key={idx} className="inline-block mx-8 text-lg">
              {msg}
            </span>
          ))}
        </div>
      </div>

      <main className="flex flex-col items-center justify-center py-20 px-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 md:p-12 mb-8 text-center border border-white/20 shadow-2xl">
          <p className="text-xl md:text-2xl mb-4 text-gray-300">Нас уже</p>
          <div className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent mb-4">
            {loading ? "..." : count.toLocaleString()}
          </div>
          <p className="text-xl md:text-2xl text-gray-300">человек заплатили $1 за мир</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <button 
            onClick={incrementCount}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-full text-xl transition-all transform hover:scale-105 shadow-lg"
          >
            💚 Заплатить $1 (тест)
          </button>
          <button 
            onClick={addMessage}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-full text-xl transition-all transform hover:scale-105 shadow-lg"
          >
             Оставить сообщение ($2)
          </button>
        </div>

        <div className="max-w-3xl text-center text-gray-300 space-y-4">
          <p className="text-lg">Это не просто проект. Это движение за мир во всем мире.</p>
          <p>Каждый доллар — это голос за прекращение всех конфликтов.</p>
        </div>
      </main>

      <footer className="text-center py-8 text-gray-500 border-t border-white/10">
        <p>Вместе мы можем изменить мир</p>
      </footer>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </div>
  );
}