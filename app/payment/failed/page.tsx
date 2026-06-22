import Link from "next/link";

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-gradient-to-b from-slate-900 via-red-950 to-slate-950">
      <div className="relative z-10 text-center max-w-md px-4">
        <div className="text-7xl mb-6">💔</div>
        <h1 className="text-4xl font-bold text-white mb-4">Payment Cancelled</h1>
        <p className="text-xl text-gray-300 mb-8">
          No worries! Your payment was not processed. Feel free to try again
          whenever you&apos;re ready. 💙
        </p>
        <Link
          href="/"
          className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 px-8 rounded-full hover:from-blue-600 hover:to-indigo-700 transition-all"
        >
          ← Try Again
        </Link>
      </div>
    </div>
  );
}
