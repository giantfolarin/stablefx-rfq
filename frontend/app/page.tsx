import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen">
      <section className="relative bg-gradient-to-br from-arc-500 via-arc-600 to-neon-purple overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:30px_30px]"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-24 md:py-32">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-white text-xs sm:text-sm font-medium mb-6 sm:mb-8 border border-white/20">
              <span className="w-2 h-2 bg-fx-400 rounded-full animate-pulse"></span>
              <span className="hidden sm:inline">Powered by Circle Arc L1 • CCTP Native Settlement</span>
              <span className="sm:hidden">Circle Arc L1 • CCTP</span>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl md:text-7xl font-bold text-white mb-4 sm:mb-6 tracking-tight px-2">
              Institutional Stablecoin FX
            </h1>
            <p className="text-base sm:text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto mb-8 sm:mb-12 px-4">
              EIP-712 signed quotes with atomic PVP settlement and sub-second finality
            </p>
            <div className="flex justify-center">
              <Link
                href="/rfq"
                className="px-8 py-4 bg-white text-arc-600 font-semibold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                Start RFQ Trading →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12 sm:py-16 md:py-24">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-slate-950 mb-3 sm:mb-4 px-2">
            Institutional RFQ settlement infrastructure built on Arc
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            EIP-712 signed quotes with atomic PVP settlement
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-10 sm:mb-16">
          <Link href="/rfq" className="group block">
            <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-8 border-2 border-transparent hover:border-arc-500 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className="text-5xl">🎯</div>
                <div className="px-3 py-1 bg-fx-100 text-fx-700 rounded-full text-xs font-semibold">
                  EIP-712
                </div>
              </div>
              <h2 className="font-display text-3xl font-bold mb-3 text-slate-950">RFQ Settlement</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Settle pre-signed quotes with EIP-712 signatures. Makers create quotes offchain, takers execute onchain with atomic PVP settlement.
              </p>
              <div className="flex items-center text-arc-600 font-semibold group-hover:translate-x-2 transition-transform">
                Create or Settle Quote →
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-gradient-to-r from-arc-600 via-neon-purple to-neon-aqua rounded-2xl p-6 sm:p-8 text-white text-center shadow-glow">
          <h3 className="font-display text-xl sm:text-2xl font-bold mb-2">Arc L1 Production Network</h3>
          <p className="text-sm sm:text-base text-blue-100 mb-4 sm:mb-6 px-2">
            Onchain settlement via Arc L1 • CCTP-native stablecoin infrastructure
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <span className="bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-medium border border-white/30">USDC Gas</span>
            <span className="bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-medium border border-white/30">CCTP Native</span>
            <span className="bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-medium border border-white/30">Sub-second Finality</span>
            <span className="hidden sm:inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full font-medium border border-white/30">EVM Compatible</span>
          </div>
        </div>
      </section>
    </div>
  )
}
