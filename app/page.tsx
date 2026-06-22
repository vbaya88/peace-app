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
  const [showNameModal, setShowNameModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [name, setName] = useState("");
  const [messageName, setMessageName] = useState("");
  const [message, setMessage] = useState("");

  const handleNameSubmit = () => {
    if (name.trim()) {
      alert(`Thank you ${name}! Payment system will be connected soon! 💚`);
      setShowNameModal(false);
      setName("");
    }
  };

  const handleMessageSubmit = () => {
    if (messageName.trim() && message.trim()) {
      alert(`Thank you ${messageName}! Your message will be added soon! ✨`);
      setShowMessageModal(false);
      setMessageName("");
      setMessage("");
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Cosmic Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-indigo-950 via-purple-950 to-black">
        {/* Nebula 1 */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
        
        {/* Nebula 2 */}
        <div className="absolute bottom-1/3 right-0 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
        
        {/* Nebula 3 */}
        <div className="absolute top-1/3 left-0 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl animate-pulse delay-2000" />
        
        {/* Nebula 4 */}
        <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-pink-600/15 rounded-full blur-3xl animate-pulse delay-700" />
        
        {/* Cosmic dust/glow overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header - Viral Phrase */}
        <header className="text-center py-6 px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Pay $1 to see how many people paid $1
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-2">
            to see how many people paid $1
          </p>
          <p className="text-lg text-gray-400 mt-4">
            Universe of Kindness 🌌
          </p>
        </header>

        {/* Scrolling Messages */}
        <div className="bg-black/30 py-3 overflow-hidden backdrop-blur-sm">
          <div className="flex animate-scroll whitespace-nowrap">
            {[...messages, ...messages].map((msg, index) => (
              <span key={index} className="mx-8 text-lg text-gray-200">
                {msg}
              </span>
            ))}
          </div>
        </div>

        {/* Main Content */}
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
              onClick={() => setShowNameModal(true)}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-full text-base shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              💙 Pay $1 - Pay & See
            </button>
            <button
              onClick={() => setShowMessageModal(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-full text-base shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              ✨ Leave Message - $2
            </button>
          </div>

          {/* Explanation */}
          <div className="text-center text-sm text-gray-400 mt-6 max-w-md">
            <p className="mb-2">
              <span className="text-blue-400">$1</span> - Pay & see the count
            </p>
            <p>
              <span className="text-purple-400">$2</span> - Leave your name & message
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-3 text-gray-500 text-xs">
          <p>© 2024 Universe of Kindness. Spreading love around the world.</p>
        </footer>
      </div>

      {/* Modal for Name */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-indigo-900 to-purple-900 rounded-2xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-center text-white">Pay & See</h2>
            <p className="text-gray-300 mb-6 text-center">
              Pay $1 to see how many people joined the universe
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name or nickname"
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNameModal(false)}
                className="flex-1 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 transition-colors text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleNameSubmit}
                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-colors font-bold text-white"
              >
                Pay $1
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Message */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-purple-900 to-pink-900 rounded-2xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-center text-white">Leave Your Message</h2>
            <p className="text-gray-300 mb-6 text-center">
              Pay $2 and share your kind wish with the world
            </p>
            
            {/* Name field */}
            <input
              type="text"
              value={messageName}
              onChange={(e) => setMessageName(e.target.value)}
              placeholder="Your name or nickname"
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            
            {/* Message field */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your kind message..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowMessageModal(false)}
                className="flex-1 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 transition-colors text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleMessageSubmit}
                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 transition-colors font-bold text-white"
              >
                Pay $2
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}