'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useWallet } from '@/contexts/WalletContext'
import WalletModal from './WalletModal'

export default function Navbar() {
  const pathname = usePathname()
  const { account, isCorrectNetwork, chainId, switchToArcTestnet, disconnectWallet } = useWallet()
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)

  const navItems = [
    { name: 'Home', href: '/', icon: '🏠' },
    { name: 'RFQ', href: '/rfq', icon: '' },
  ]

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <nav className="sticky top-0 z-50 bg-[#0B0F14]/95 backdrop-blur-md border-b border-[#1F2937] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <Image
              src="/stablefx-horizontal-logo.png"
              alt="StableFX"
              width={200}
              height={50}
              className="h-10 w-auto transition-all duration-300 group-hover:opacity-90"
              priority
              unoptimized
            />
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    px-4 py-2 rounded-xl font-bold transition-all duration-200
                    ${item.name === 'RFQ' ? 'text-base' : 'text-base'}
                    ${
                      isActive
                        ? 'bg-[#3B82F6] text-white shadow-md'
                        : 'text-[#9CA3AF] hover:bg-[#161E2E] hover:text-[#E5E7EB]'
                    }
                  `}
                >
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* Wallet Connection */}
          <div className="hidden md:flex items-center space-x-3">
            {account ? (
              <div className="flex items-center space-x-2">
                <div className="px-4 py-2 bg-[#3B82F6] text-white rounded-xl font-medium text-sm shadow-md">
                  {formatAddress(account)}
                </div>

                {/* Wrong Network Button */}
                {!isCorrectNetwork && (
                  <button
                    onClick={async () => {
                      try {
                        await switchToArcTestnet()
                      } catch (err: any) {
                        console.error('Manual network switch failed:', err)
                        alert(`Failed to switch network: ${err.message}`)
                      }
                    }}
                    className="px-4 py-2 bg-[#EF4444] text-white rounded-xl font-medium text-sm hover:bg-[#DC2626] transition-all duration-200 animate-pulse"
                    title={`Switch from Chain ID ${chainId} to Arc Testnet (5042002)`}
                  >
                    ⚠️ Switch to Arc Testnet
                  </button>
                )}

                <button
                  onClick={disconnectWallet}
                  className="px-4 py-2 bg-[#1F2937] text-[#E5E7EB] rounded-xl font-medium text-sm hover:bg-[#374151] transition-all duration-200"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="px-5 py-2.5 bg-[#3B82F6] text-white font-semibold rounded-xl shadow-md hover:bg-[#2563EB] transition-all duration-300 hover:scale-105"
              >
                Connect Wallet
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 rounded-xl hover:bg-[#161E2E]">
            <svg className="w-6 h-6 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Network Banner */}
      <div className="bg-gradient-to-r from-neon-purple to-neon-aqua py-1.5">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-white text-xs font-medium">
            Live RFQ Environment • Onchain Settlement via Arc L1 • USDC-Native Gas • Sub-Second Finality
          </p>
        </div>
      </div>

      {/* Wallet Connection Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </nav>
  )
}
