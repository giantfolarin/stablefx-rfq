'use client'

import { useState } from 'react'
import QuoteCreator from '@/components/maker/QuoteCreator'
import QuoteBoard from '@/components/taker/QuoteBoard'
import SettlementHistory from '@/components/rfq/SettlementHistory'

type ViewMode = 'taker' | 'maker'

export default function RFQPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('taker')

  return (
    <div className="min-h-screen bg-[#0B0F14] py-6 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="font-display text-2xl sm:text-3xl md:text-[40px] font-bold text-[#E5E7EB] mb-3 sm:mb-4 tracking-tight px-2">
            Institutional RFQ Trading
          </h1>
          <p className="text-sm sm:text-base text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed px-4">
            Request for Quote (RFQ) system with EIP-712 signatures and atomic PVP settlement
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-center mb-6 sm:mb-8 px-2">
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl shadow-lg p-1.5 sm:p-2 inline-flex w-full sm:w-auto max-w-md">
            <button
              onClick={() => setViewMode('taker')}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-[13px] uppercase tracking-wide transition-all duration-150 ${
                viewMode === 'taker'
                  ? 'bg-[#3B82F6] text-white shadow-md'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#161E2E]'
              }`}
            >
              <span className="hidden sm:inline">🎯 Taker View</span>
              <span className="sm:hidden">🎯 Taker</span>
            </button>
            <button
              onClick={() => setViewMode('maker')}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-[13px] uppercase tracking-wide transition-all duration-150 ${
                viewMode === 'maker'
                  ? 'bg-[#3B82F6] text-white shadow-md'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#161E2E]'
              }`}
            >
              <span className="hidden sm:inline">🏦 Maker View</span>
              <span className="sm:hidden">🏦 Maker</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 items-start">
          {/* Left Sidebar - Info */}
          <div className="space-y-3 sm:space-y-4 order-2 lg:order-1">
            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6">
              <h3 className="font-display font-bold text-[16px] text-[#E5E7EB] mb-4 tracking-tight">
                What is RFQ Trading?
              </h3>
              <div className="space-y-3 text-[13px] text-[#9CA3AF] leading-relaxed">
                <p>
                  <strong className="text-[#E5E7EB]">Request for Quote (RFQ)</strong> is an institutional trading model where:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong className="text-[#E5E7EB]">Makers</strong> create and sign quotes offchain using EIP-712
                  </li>
                  <li>
                    <strong className="text-[#E5E7EB]">Takers</strong> request quotes and select the best price
                  </li>
                  <li>
                    <strong className="text-[#E5E7EB]">Settlement</strong> happens onchain with signature verification
                  </li>
                  <li>
                    <strong className="text-[#E5E7EB]">Zero slippage</strong> - price is guaranteed in the quote
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-[#3B82F6]/[0.08] border border-[#3B82F6]/30 rounded-xl p-6">
              <h4 className="font-display font-bold text-[14px] text-[#E5E7EB] mb-3 tracking-tight">🔒 Security Features</h4>
              <ul className="text-[13px] space-y-2 text-[#93C5FD]">
                <li>✓ EIP-712 typed signatures</li>
                <li>✓ Nonce-based replay protection</li>
                <li>✓ Time-bound quote expiry</li>
                <li>✓ Atomic PVP settlement</li>
                <li>✓ Onchain signature verification</li>
              </ul>
            </div>
          </div>

          {/* Center - Main Interface */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            {viewMode === 'taker' ? (
              <QuoteBoard />
            ) : (
              <QuoteCreator />
            )}
          </div>
        </div>

        {/* Features Banner */}
        <div className="mt-8 sm:mt-12 md:mt-16 bg-[#111827] border border-[#1F2937] rounded-2xl p-6 sm:p-8">
          <h3 className="font-display text-xl sm:text-2xl font-bold text-[#E5E7EB] mb-6 text-center tracking-tight">
            RFQ vs AMM Trading
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#3B82F6] rounded-xl flex items-center justify-center text-3xl mx-auto mb-4">
                💰
              </div>
              <h4 className="font-bold text-[16px] text-[#E5E7EB] mb-2 tracking-tight">Zero Slippage</h4>
              <p className="text-[#9CA3AF] text-[13px] leading-relaxed">
                Price is guaranteed in the quote - no algorithmic slippage like AMMs
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#34D399] rounded-xl flex items-center justify-center text-3xl mx-auto mb-4">
                🏦
              </div>
              <h4 className="font-bold text-[16px] text-[#E5E7EB] mb-2 tracking-tight">Institutional Grade</h4>
              <p className="text-[#9CA3AF] text-[13px] leading-relaxed">
                Competitive pricing from professional market makers, not pools
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#FBBF24] rounded-xl flex items-center justify-center text-3xl mx-auto mb-4">
                ⚡
              </div>
              <h4 className="font-bold text-[16px] text-[#E5E7EB] mb-2 tracking-tight">Atomic Settlement</h4>
              <p className="text-[#9CA3AF] text-[13px] leading-relaxed">
                Payment vs Payment (PVP) settlement with signature verification
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-8 sm:mt-12 md:mt-16 bg-[#161E2E] border border-[#374151] rounded-2xl p-6 sm:p-8">
          <h3 className="font-display text-xl sm:text-2xl font-bold text-[#E5E7EB] mb-6 sm:mb-8 text-center tracking-tight">
            How RFQ Settlement Works
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#3B82F6] rounded-full flex items-center justify-center text-base sm:text-lg font-bold mx-auto mb-2 sm:mb-3 text-white">
                1
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-[#E5E7EB] mb-1 sm:mb-2 tracking-tight">Maker Signs Quote</h4>
              <p className="text-xs sm:text-[13px] text-[#9CA3AF] leading-relaxed px-1">
                Market maker creates and signs quote using EIP-712
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#34D399] rounded-full flex items-center justify-center text-base sm:text-lg font-bold mx-auto mb-2 sm:mb-3 text-white">
                2
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-[#E5E7EB] mb-1 sm:mb-2 tracking-tight">Taker Selects Quote</h4>
              <p className="text-xs sm:text-[13px] text-[#9CA3AF] leading-relaxed px-1">
                Taker compares quotes and selects best price
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#93C5FD] rounded-full flex items-center justify-center text-base sm:text-lg font-bold mx-auto mb-2 sm:mb-3 text-white">
                3
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-[#E5E7EB] mb-1 sm:mb-2 tracking-tight">Onchain Verification</h4>
              <p className="text-xs sm:text-[13px] text-[#9CA3AF] leading-relaxed px-1">
                Contract verifies signature, nonce, and expiry
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FBBF24] rounded-full flex items-center justify-center text-base sm:text-lg font-bold mx-auto mb-2 sm:mb-3 text-white">
                4
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-[#E5E7EB] mb-1 sm:mb-2 tracking-tight">Atomic Settlement</h4>
              <p className="text-xs sm:text-[13px] text-[#9CA3AF] leading-relaxed px-1">
                PVP settlement completes in single transaction
              </p>
            </div>
          </div>
        </div>

        {/* Settlement History */}
        <div className="mt-8">
          <SettlementHistory />
        </div>
      </div>
    </div>
  )
}
