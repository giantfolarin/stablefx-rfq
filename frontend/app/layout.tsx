import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { WalletProvider } from '@/contexts/WalletContext'
import { QuoteStoreProvider } from '@/contexts/QuoteStoreContext'
import Navbar from '@/components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'StableFX • Arc L1 • Institutional Stablecoin FX',
  description: 'Enterprise-grade stablecoin FX engine with perpetuals, treasury tools, and CCTP-native cross-chain swaps on Circle Arc L1',
  icons: {
    icon: '/sfx-logo.png',
    apple: '/sfx-logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          <QuoteStoreProvider>
            <Navbar />

            {/* Main Content */}
            <main className="min-h-screen bg-gray-50">
              {children}
            </main>

          {/* Footer */}
          <footer className="bg-slate-950 text-gray-300">
            <div className="max-w-7xl mx-auto px-4 py-12">
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                <div>
                  <h4 className="font-display font-bold text-white mb-4">StableFX</h4>
                  <p className="text-sm text-gray-400">
                    Institutional RFQ settlement on Arc L1
                  </p>
                </div>
                <div>
                  <h5 className="font-semibold text-white mb-4">RFQ Model</h5>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li>• EIP-712 Signed Quotes</li>
                    <li>• Offchain Quote Creation</li>
                    <li>• Onchain Settlement</li>
                    <li>• Atomic PVP Execution</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-white mb-4">Technology</h5>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li>• Circle Arc L1 Blockchain</li>
                    <li>• USDC-Native Gas Fees</li>
                    <li>• Sub-Second Finality</li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-gray-800 pt-8 text-center">
                <a
                  href="https://github.com/giantfolarin/stablefx-rfq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors inline-flex items-center gap-2"
                >
                  <span>Open Source</span>
                  <span>•</span>
                  <span className="underline decoration-dotted underline-offset-4">GitHub ↗</span>
                </a>
              </div>
            </div>
          </footer>
          </QuoteStoreProvider>
        </WalletProvider>
      </body>
    </html>
  )
}
