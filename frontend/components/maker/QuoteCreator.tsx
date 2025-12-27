'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useQuoteStore } from '@/contexts/QuoteStoreContext'
import { useRFQ } from '@/hooks/useRFQ'
import { useTokens } from '@/hooks/useTokens'
import { TOKENS, Token } from '@/lib/tokens'
import { getTimeUntilExpiry, computeRFQId, ANY_TAKER } from '@/lib/rfq'
import { formatUnits } from 'ethers'

export default function QuoteCreator() {
  const { account, isCorrectNetwork } = useWallet()
  const { addQuote, quotes, removeQuote } = useQuoteStore()
  const { createAndSignRFQ, cancelRFQ, isLoading, error } = useRFQ()
  const { getBalance, approveForSwap, isLoading: isApprovingToken } = useTokens()

  const [tokenInSymbol, setTokenInSymbol] = useState<'USDC' | 'EURC'>('USDC')
  const [tokenOutSymbol, setTokenOutSymbol] = useState<'USDC' | 'EURC'>('EURC')
  const [amountIn, setAmountIn] = useState('')
  const [rate, setRate] = useState('')
  const [ttl, setTTL] = useState(300) // 5 minutes default
  const [specificTaker, setSpecificTaker] = useState('')
  const [useSpecificTaker, setUseSpecificTaker] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<Record<number, number>>({})
  const [isApproving, setIsApproving] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [cancellingRfqId, setCancellingRfqId] = useState<string | null>(null)

  const tokenIn = TOKENS[tokenInSymbol]
  const tokenOut = TOKENS[tokenOutSymbol]

  // Calculate amount out based on rate
  const amountOut = amountIn && rate
    ? (parseFloat(amountIn) * parseFloat(rate)).toFixed(6)
    : '0.00'

  // Filter quotes created by current account
  const myQuotes = quotes.filter(q => q.rfq.maker.toLowerCase() === account?.toLowerCase())

  // Update time remaining for each quote
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeRemaining: Record<number, number> = {}
      myQuotes.forEach((quote, idx) => {
        newTimeRemaining[idx] = getTimeUntilExpiry(quote.rfq)
      })
      setTimeRemaining(newTimeRemaining)
    }, 1000)

    return () => clearInterval(interval)
  }, [myQuotes])

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const getTokenSymbol = (address: string): string => {
    const token = Object.values(TOKENS).find(
      t => t.address.toLowerCase() === address.toLowerCase()
    )
    return token?.symbol || 'UNKNOWN'
  }

  const handleCancelQuote = async (quote: typeof myQuotes[0]) => {
    // V2: Compute rfqId for onchain cancellation
    const rfqId = computeRFQId(quote.rfq)

    if (!confirm(
      'Cancel this RFQ onchain?\n\n' +
      `This will emit RFQCancelled event and prevent settlement.\n` +
      `rfqId: ${rfqId.slice(0, 10)}...`
    )) {
      return
    }

    try {
      setCancellingRfqId(rfqId)

      // V2: Call contract.cancelRFQ(rfqId)
      const success = await cancelRFQ(rfqId)

      if (success) {
        // Remove from frontend store after onchain cancellation
        removeQuote(quote)
        alert('✅ RFQ cancelled onchain - RFQCancelled event emitted')
      } else {
        alert('❌ Failed to cancel RFQ onchain')
      }
    } catch (err: any) {
      console.error('Error cancelling quote:', err)
      alert(`❌ Error: ${err.message || 'Failed to cancel'}`)
    } finally {
      setCancellingRfqId(null)
    }
  }

  const handleCreateQuote = async () => {
    if (!amountIn || !rate || parseFloat(amountIn) <= 0 || parseFloat(rate) <= 0) {
      alert('Please enter valid amount and rate')
      return
    }

    try {
      // Calculate amountOut in wei
      const amountOutDecimal = parseFloat(amountIn) * parseFloat(rate)
      const amountOutWei = BigInt(Math.floor(amountOutDecimal * 1_000_000)) // 6 decimals

      // STEP 1: Maker approves tokenOut (tokens maker will send to taker)
      setIsApproving(true)
      console.log('🔵 STEP 1: Maker approving tokenOut:', {
        token: tokenOut.address,
        amount: amountOutWei.toString()
      })

      const approved = await approveForSwap(tokenOut.address, amountOutWei)

      if (!approved) {
        alert('❌ Token approval failed - you must approve tokenOut before creating RFQ')
        setIsApproving(false)
        return
      }

      console.log('✅ STEP 1 Complete: TokenOut approved')
      setIsApproving(false)

      // STEP 2: Sign RFQ with EIP-712
      setIsSigning(true)
      console.log('🔵 STEP 2: Signing RFQ...')

      const quote = await createAndSignRFQ({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn,
        rate,
        taker: useSpecificTaker ? specificTaker : ANY_TAKER, // Zero address = public RFQ
        ttlSeconds: ttl,
        decimalsIn: tokenIn.decimals,
        decimalsOut: tokenOut.decimals
      })

      setIsSigning(false)

      if (quote) {
        console.log('✅ STEP 2 Complete: RFQ signed and ready')
        // Add quote to global store (broadcasts to takers)
        addQuote(quote)
        alert('✅ RFQ created successfully! Takers can now fill this quote.')
        // Reset form
        setAmountIn('')
        setRate('')
      }
    } catch (err: any) {
      console.error('❌ Error creating quote:', err)
      alert(err.message || 'Failed to create quote')
      setIsApproving(false)
      setIsSigning(false)
    }
  }

  if (!account) {
    return (
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6">
        <p className="text-[#9CA3AF] text-[13px]">Connect your wallet to create quotes</p>
      </div>
    )
  }

  if (!isCorrectNetwork) {
    return (
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6">
        <p className="text-[#F87171] text-[13px] font-semibold">Please switch to Arc Testnet</p>
      </div>
    )
  }

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 space-y-6">
      {/* Header - Dark Theme */}
      <div>
        <h2 className="text-[20px] font-bold text-[#E5E7EB]">Create RFQ Quote</h2>
        <p className="text-[13px] text-[#9CA3AF] mt-1">
          Set your price, sign offchain, and broadcast to takers
        </p>
      </div>

      {/* Token Pair Selection - Dark Theme */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">
            Taker Pays
          </label>
          <select
            value={tokenInSymbol}
            onChange={(e) => setTokenInSymbol(e.target.value as any)}
            className="w-full px-4 py-3 border border-[#374151] bg-[#161E2E] text-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 focus:border-[#3B82F6]"
          >
            <option value="USDC">🔵 USDC</option>
            <option value="EURC">🟢 EURC</option>
          </select>
          <p className="text-[11px] text-[#6B7280] mt-1">What the taker sends to you</p>
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">
            You Send
          </label>
          <select
            value={tokenOutSymbol}
            onChange={(e) => setTokenOutSymbol(e.target.value as any)}
            className="w-full px-4 py-3 border border-[#374151] bg-[#161E2E] text-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 focus:border-[#3B82F6]"
          >
            <option value="USDC">🔵 USDC</option>
            <option value="EURC">🟢 EURC</option>
          </select>
          <p className="text-[11px] text-[#6B7280] mt-1">You send this to the taker on settlement.</p>
        </div>
      </div>

      {/* Amount Taker Pays - Dark Theme */}
      <div>
        <label className="block text-[12px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">
          Amount Taker Pays ({tokenInSymbol})
        </label>
        <input
          type="number"
          value={amountIn}
          onChange={(e) => setAmountIn(e.target.value)}
          placeholder="0.00"
          step="0.000001"
          className="w-full px-4 py-3 text-[16px] font-semibold border border-[#374151] bg-[#161E2E] text-[#E5E7EB] placeholder-[#6B7280] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 focus:border-[#3B82F6] font-mono"
        />
        <p className="text-[11px] text-[#6B7280] mt-2">
          You receive this exact amount when filled. Atomic settlement, guaranteed.
        </p>
      </div>

      {/* FX Rate - Dark Theme */}
      <div>
        <label className="block text-[12px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">
          Exchange Rate (1 {tokenInSymbol} = ? {tokenOutSymbol})
        </label>
        <input
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="0.999000"
          step="0.000001"
          className="w-full px-4 py-3 text-[16px] font-semibold border border-[#374151] bg-[#161E2E] text-[#E5E7EB] placeholder-[#6B7280] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 focus:border-[#3B82F6] font-mono"
        />
        <p className="text-[13px] text-[#93C5FD] font-semibold mt-2 font-mono">
          You send: {amountOut} {tokenOutSymbol}
        </p>
        <p className="text-[11px] text-[#6B7280] mt-1">
          Fixed price. No slippage, no repricing once signed.
        </p>
      </div>

      {/* TTL - Dark Theme */}
      <div>
        <label className="block text-[12px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">
          Quote Validity (seconds)
        </label>
        <select
          value={ttl}
          onChange={(e) => setTTL(Number(e.target.value))}
          className="w-full px-4 py-3 border border-[#374151] bg-[#161E2E] text-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 focus:border-[#3B82F6]"
        >
          <option value={30}>30 seconds</option>
          <option value={60}>1 minute</option>
          <option value={120}>2 minutes</option>
          <option value={300}>5 minutes</option>
          <option value={600}>10 minutes</option>
        </select>
      </div>

      {/* RFQ Type Selection - Dark Theme */}
      <div>
        <label className="block text-[12px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">
          RFQ Type
        </label>
        <div className="space-y-3">
          {/* Public RFQ Option */}
          <label className="flex items-center p-3 border border-[#374151] bg-[#161E2E] rounded-lg cursor-pointer hover:border-[#4B5563] transition-colors">
            <input
              type="radio"
              name="rfqType"
              checked={!useSpecificTaker}
              onChange={() => {
                setUseSpecificTaker(false)
                setSpecificTaker('')
              }}
              className="w-4 h-4 text-[#3B82F6]"
            />
            <div className="ml-3 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[#E5E7EB]">Public RFQ</span>
                <span className="px-2 py-0.5 bg-[#22C55E]/[0.12] border border-[#22C55E]/30 text-[#34D399] text-[10px] font-semibold rounded">
                  🌐 OPEN
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280] mt-0.5">Anyone can fill this quote</p>
            </div>
          </label>

          {/* Private RFQ Option */}
          <label className="flex items-center p-3 border border-[#374151] bg-[#161E2E] rounded-lg cursor-pointer hover:border-[#4B5563] transition-colors">
            <input
              type="radio"
              name="rfqType"
              checked={useSpecificTaker}
              onChange={() => setUseSpecificTaker(true)}
              className="w-4 h-4 text-[#3B82F6]"
            />
            <div className="ml-3 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[#E5E7EB]">Private RFQ</span>
                <span className="px-2 py-0.5 bg-[#F59E0B]/[0.12] border border-[#F59E0B]/30 text-[#FBBF24] text-[10px] font-semibold rounded">
                  🔒 RESTRICTED
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280] mt-0.5">Only specific taker can fill</p>
            </div>
          </label>
        </div>

        {/* Taker Address Input (shows when Private is selected) */}
        {useSpecificTaker && (
          <div className="mt-3">
            <label className="block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1">
              Taker Address
            </label>
            <input
              type="text"
              value={specificTaker}
              onChange={(e) => setSpecificTaker(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2 border border-[#374151] bg-[#161E2E] text-[#E5E7EB] placeholder-[#6B7280] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 focus:border-[#3B82F6] font-mono text-[13px]"
            />
          </div>
        )}
      </div>

      {/* Create Button with Two-Step Progress - Dark Theme */}
      <div className="space-y-2">
        <button
          onClick={handleCreateQuote}
          disabled={isApproving || isSigning || isLoading || !amountIn || !rate}
          className={`w-full py-4 rounded-lg font-semibold uppercase tracking-wide text-[13px] transition-all duration-150 ${
            isApproving || isSigning || isLoading || !amountIn || !rate
              ? 'bg-[#1F2937] text-[#6B7280] cursor-not-allowed'
              : 'bg-[#3B82F6] text-white hover:bg-[#2563EB] active:bg-[#1D4ED8]'
          }`}
        >
          {isApproving
            ? '⏳ Step 1/2: Approving TokenOut...'
            : isSigning
            ? '⏳ Step 2/2: Signing RFQ...'
            : 'Create RFQ Quote (2 Steps)'}
        </button>
        <p className="text-[11px] text-[#6B7280] text-center font-mono">
          Step 1: Approve tokenOut • Step 2: Sign RFQ with EIP-712
        </p>
      </div>

      {/* Error Display - Dark Theme */}
      {error && (
        <div className="bg-[#F87171]/[0.08] border border-[#F87171]/20 rounded-lg p-4">
          <p className="text-[13px] text-[#F87171]">{error}</p>
        </div>
      )}

      {/* Active Quotes - Dark Theme */}
      {myQuotes.length > 0 && (
        <div className="mt-6 pt-6 border-t border-[#374151]">
          <h3 className="text-[16px] font-bold text-[#E5E7EB] mb-3 uppercase tracking-wide">Your Active Quotes</h3>
          <div className="space-y-3">
            {myQuotes.map((quote, idx) => {
              const tokenInSymbol = getTokenSymbol(quote.rfq.tokenIn)
              const tokenOutSymbol = getTokenSymbol(quote.rfq.tokenOut)
              const timeLeft = timeRemaining[idx] || 0
              const isExpiring = timeLeft < 30
              const rfqId = computeRFQId(quote.rfq)
              const isCancelling = cancellingRfqId === rfqId

              return (
                <div
                  key={`${quote.rfq.maker}-${quote.rfq.nonce}`}
                  className={`border-2 rounded-lg p-4 transition-all ${
                    isExpiring
                      ? 'bg-[#FBBF24]/[0.08] border-[#FBBF24]/30'
                      : 'bg-[#3B82F6]/[0.08] border-[#3B82F6]/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-[16px] text-[#E5E7EB]">
                        {tokenInSymbol} → {tokenOutSymbol}
                      </p>
                      <p className="text-[11px] text-[#6B7280] font-mono mt-1">
                        Maker: {formatAddress(quote.rfq.maker)}
                      </p>
                      <p className="text-[11px] text-[#6B7280] font-mono mt-0.5">
                        rfqId: {rfqId.slice(0, 10)}...
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded text-[13px] font-semibold ${
                      isExpiring
                        ? 'bg-[#FBBF24]/20 text-[#FBBF24]'
                        : 'bg-[#93C5FD]/20 text-[#93C5FD]'
                    }`}>
                      {timeLeft > 0 ? formatTime(timeLeft) : 'Expired'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wide">Rate</p>
                      <p className="font-semibold text-[#93C5FD] font-mono text-[13px]">
                        1 {tokenInSymbol} = {(Number(formatUnits(quote.rfq.amountOut, 6)) / Number(formatUnits(quote.rfq.amountIn, 6))).toFixed(6)} {tokenOutSymbol}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wide">Amount</p>
                      <p className="font-semibold text-[#E5E7EB] font-mono text-[13px]">
                        {formatUnits(quote.rfq.amountIn, 6)} {tokenInSymbol}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCancelQuote(quote)}
                    disabled={isCancelling}
                    className={`w-full py-2 px-4 rounded-lg font-medium text-[13px] uppercase tracking-wide transition-colors ${
                      isCancelling
                        ? 'bg-[#1F2937] text-[#6B7280] cursor-not-allowed'
                        : 'bg-[#F87171]/[0.12] border border-[#F87171]/30 hover:bg-[#F87171]/20 text-[#F87171]'
                    }`}
                  >
                    {isCancelling ? '⏳ Cancelling Onchain...' : '❌ Cancel RFQ (Onchain)'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
