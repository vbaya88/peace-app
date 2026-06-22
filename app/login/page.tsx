import { Suspense } from "react";
import Link from "next/link";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950">
      {/* Stars background */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(1px 1px at 15% 25%, white 1px, transparent 0),
            radial-gradient(1px 1px at 35% 55%, white 1px, transparent 0),
            radial-gradient(1.5px 1.5px at 55% 15%, white 1px, transparent 0),
            radial-gradient(1px 1px at 75% 75%, white 1px, transparent 0),
            radial-gradient(1px 1px at 90% 35%, white 1px, transparent 0),
            radial-gradient(1.5px 1.5px at 25% 85%, white 1px, transparent 0)`,
          backgroundSize: "180px 180px",
        }}
      />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Universe of Kindness 🌌
          </h1>
          <p className="text-gray-400">Sign in or create your account</p>
        </div>

        <Suspense fallback={
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 flex items-center justify-center">
            <div className="text-white animate-pulse">Loading...</div>
          </div>
        }>
          <LoginForm />
        </Suspense>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
