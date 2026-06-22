import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950">
      <div className="relative z-10 text-center max-w-md px-4">
        <div className="text-7xl mb-6">✨🌍✨</div>
        <h1 className="text-4xl font-bold text-white mb-4">
          You&apos;re part of the universe! 💚
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Your payment was received. The kindness counter will update shortly.
          Thank you for spreading love! ❤️
        </p>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-6">
          <p className="text-gray-300 text-sm">
            The counter updates automatically after our system confirms your
            payment (usually within a few seconds via Volet).
          </p>
          <p className="text-gray-400 text-xs mt-2">
            If your message/star doesn&apos;t appear, please wait 1-2 minutes
            and refresh the page.
          </p>
        </div>
        <Link
          href="/"
          className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 px-8 rounded-full hover:from-blue-600 hover:to-indigo-700 transition-all"
        >
          ← Back to Universe
        </Link>
      </div>
    </div>
  );
}
