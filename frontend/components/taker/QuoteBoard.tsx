'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useQuoteStore } from '@/contexts/QuoteStoreContext'
import { useRFQ } from '@/hooks/useRFQ'
import { useTokens } from '@/hooks/useTokens'
import { RFQQuote, getTimeUntilExpiry, isSpecificTaker, computeRFQId } from '@/lib/rfq'
import { formatUnits } from 'ethers'
import { TOKENS } from '@/lib/tokens'
import WalletModal from '@/components/WalletModal'

// System Maker Address - Reference Liquidity Provider
// This address provides always-available reference quotes for onboarding
const SYSTEM_MAKER_ADDRESS = process.env.NEXT_PUBLIC_SYSTEM_MAKER_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'

interface QuoteBoardProps {
  pair?: string
}

export default function QuoteBoard({ pair }: QuoteBoardProps) {
  const { account, isCorrectNetwork, chainId, provider } = useWallet()
  const { quotes, removeQuote, clearExpiredQuotes } = useQuoteStore()
  const { settleRFQ, isLoading, error } = useRFQ()
  const { approveForSwap } = useTokens()

  const [selectedQuote, setSelectedQuote] = useState<RFQQuote | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [isSettling, setIsSettling] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<Record<number, number>>({})
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Separate user quotes from system reference quotes
  const userQuotes = quotes.filter(q =>
    q.rfq.maker.toLowerCase() !== SYSTEM_MAKER_ADDRESS.toLowerCase()
  )
  const systemQuotes = quotes.filter(q =>
    q.rfq.maker.toLowerCase() === SYSTEM_MAKER_ADDRESS.toLowerCase()
  )

  // Pagination applies to user quotes only
  const QUOTES_PER_PAGE = 5
  const totalPages = Math.ceil(userQuotes.length / QUOTES_PER_PAGE)
  const startIndex = (currentPage - 1) * QUOTES_PER_PAGE
  const endIndex = startIndex + QUOTES_PER_PAGE
  const currentUserQuotes = userQuotes.slice(startIndex, endIndex)

  // Combine for display: user quotes first, then system quotes
  const currentQuotes = [...currentUserQuotes, ...systemQuotes]

  // Update time remaining for each quote (every 1 second)
  useEffect(() => {
    // Initial update
    const newTimeRemaining: Record<number, number> = {}
    quotes.forEach((quote, idx) => {
      newTimeRemaining[idx] = getTimeUntilExpiry(quote.rfq)
    })
    setTimeRemaining(newTimeRemaining)

    // Update every second
    const interval = setInterval(() => {
      const updated: Record<number, number> = {}
      quotes.forEach((quote, idx) => {
        updated[idx] = getTimeUntilExpiry(quote.rfq)
      })
      setTimeRemaining(updated)
    }, 1000)

    return () => clearInterval(interval)
  }, [quotes])

  // Clear expired quotes separately (every 10 seconds to avoid API spam)
  useEffect(() => {
    const cleanup = setInterval(() => {
      clearExpiredQuotes()
    }, 10000) // 10 seconds

    return () => clearInterval(cleanup)
  }, [clearExpiredQuotes])

  // Reset to page 1 when quotes change
  useEffect(() => {
    setCurrentPage(1)
  }, [quotes.length])

  const handleAcceptQuote = async (quote: RFQQuote) => {
    // Wallet connection checks
    if (!account) {
      alert('Connect your wallet to settle RFQ')
      return
    }

    if (!isCorrectNetwork) {
      alert('Please switch to Arc Testnet to settle RFQ')
      return
    }

    // CRITICAL: Check if quote is still valid before proceeding
    if (!provider) {
      alert('Provider not available')
      return
    }

    try {
      const { Contract } = await import('ethers')
      const { SWAP_CONTRACT_ADDRESS, SWAP_CONTRACT_ABI } = await import('@/lib/contracts')
      const contract = new Contract(SWAP_CONTRACT_ADDRESS, SWAP_CONTRACT_ABI, provider)

      // Check maker's current nonce
      console.log('🔍 NONCE CHECK #1 (Pre-Approval)')
      console.log('Maker address:', quote.rfq.maker)
      console.log('Fetching current nonce from contract...')
      const currentNonce = await contract.nonces(quote.rfq.maker)
      console.log('Quote nonce:', quote.rfq.nonce.toString())
      console.log('Current on-chain nonce:', currentNonce.toString())
      console.log('Comparison: quote.nonce < currentNonce?', quote.rfq.nonce < currentNonce)

      if (quote.rfq.nonce < currentNonce) {
        console.log('❌ NONCE CHECK #1 FAILED: Quote nonce is less than current nonce')
        alert('❌ Quote Already Filled\n\nThis quote was filled while you were viewing it.\n\nPlease try a different quote.')
        removeQuote(quote)
        return
      }

      console.log('✅ NONCE CHECK #1 PASSED: Quote is still valid')
    } catch (err) {
      console.error('❌ Failed to check nonce:', err)
      console.error('Continuing anyway - contract will validate')
      // Continue anyway - let the contract validate
    }

    setSelectedQuote(quote)

    try {
      // ============================================================
      // STEP 1: APPROVE tokenIn (Taker approves tokens they will pay)
      // ============================================================
      setIsApproving(true)
      console.log('🔵 STEP 1/2: Taker approving tokenIn (tokens you will pay):', {
        token: quote.rfq.tokenIn,
        amount: quote.rfq.amountIn.toString()
      })

      const approved = await approveForSwap(quote.rfq.tokenIn, quote.rfq.amountIn)

      if (!approved) {
        alert('❌ STEP 1 FAILED: Token approval failed - check wallet and try again')
        setIsApproving(false)
        setSelectedQuote(null)
        return
      }

      console.log('✅ STEP 1 COMPLETE: TokenIn approved')
      console.log('📊 Approval tx confirmed, proceeding to settlement...')
      setIsApproving(false)

      // ============================================================
      // 🔍 CRITICAL: Re-check nonce after approval (prevent race condition)
      // ============================================================
      // Quote could have been filled by another user DURING approval process
      // Check again before sending settlement transaction
      try {
        const { Contract } = await import('ethers')
        const { SWAP_CONTRACT_ADDRESS, SWAP_CONTRACT_ABI } = await import('@/lib/contracts')
        const contract = new Contract(SWAP_CONTRACT_ADDRESS, SWAP_CONTRACT_ABI, provider)

        console.log('🔍 NONCE CHECK #2 (Post-Approval)')
        console.log('Maker address:', quote.rfq.maker)
        console.log('Fetching current nonce from contract...')
        const currentNonce = await contract.nonces(quote.rfq.maker)
        console.log('Quote nonce:', quote.rfq.nonce.toString())
        console.log('Current on-chain nonce:', currentNonce.toString())
        console.log('Comparison: quote.nonce < currentNonce?', quote.rfq.nonce < currentNonce)

        if (quote.rfq.nonce < currentNonce) {
          console.log('❌ NONCE CHECK #2 FAILED: Quote was filled during approval!')
          alert('❌ Quote Filled During Approval\n\nAnother user filled this quote while your approval was processing.\n\nYour tokens were approved but NOT swapped. Try a different quote.')

          // Clean up this quote and any other stale quotes from same maker
          const staleQuotes = quotes.filter(q =>
            q.rfq.maker.toLowerCase() === quote.rfq.maker.toLowerCase() &&
            q.rfq.nonce <= currentNonce
          )
          console.log(`🧹 Removing ${staleQuotes.length} stale quotes from this maker`)
          staleQuotes.forEach(q => removeQuote(q))

          setSelectedQuote(null)
          return
        }

        console.log('✅ NONCE CHECK #2 PASSED: Quote is still valid, proceeding to settlement')
      } catch (err) {
        console.error('Failed to re-check nonce:', err)
        // Continue anyway - let the contract validate
      }

      // ============================================================
      // STEP 2: CALL settleRFQ() - Atomic PVP settlement onchain
      // ============================================================
      setIsSettling(true)
      console.log('🔵 STEP 2/2: Starting settlement process...')
      console.log('Quote details:', {
        maker: quote.rfq.maker,
        taker: quote.rfq.taker,
        tokenIn: quote.rfq.tokenIn,
        tokenOut: quote.rfq.tokenOut,
        amountIn: quote.rfq.amountIn.toString(),
        amountOut: quote.rfq.amountOut.toString(),
        nonce: quote.rfq.nonce.toString(),
        expiry: quote.rfq.expiry.toString()
      })

      console.log('Calling settleRFQ()...')
      const result = await settleRFQ(quote)
      console.log('settleRFQ returned:', result)

      setIsSettling(false)

      // ============================================================================
      // 🔑 CRITICAL SUCCESS CONDITION
      // ============================================================================
      // SUCCESS = result.success === true AND result.txHash exists
      // This means:
      //   1. Settlement transaction was sent to blockchain
      //   2. Transaction was mined successfully
      //   3. receipt.status === 1 (transaction succeeded)
      //
      // APPROVAL ALONE IS NOT ENOUGH!
      // ============================================================================

      if (!result.success || !result.txHash) {
        console.error('❌ Settlement failed or no transaction was sent')
        console.error('Result:', result)

        // ============================================================
        // 🧹 CRITICAL: Clean up stale quotes on nonce errors
        // ============================================================
        // If settlement failed because the nonce was consumed,
        // remove ALL quotes from this maker with nonces <= failed nonce
        if ((result as any).errorType === 'NONCE_CONSUMED') {
          const failedMaker = quote.rfq.maker.toLowerCase()
          const failedNonce = quote.rfq.nonce

          console.log(`🧹 Nonce consumed! Cleaning up stale quotes from maker ${failedMaker}`)
          console.log(`Failed nonce: ${failedNonce.toString()}, removing all quotes with nonce <= ${failedNonce.toString()}`)

          // Remove ALL quotes from this maker with consumed nonces
          const staleQuotes = quotes.filter(q =>
            q.rfq.maker.toLowerCase() === failedMaker &&
            q.rfq.nonce <= failedNonce
          )

          console.log(`Found ${staleQuotes.length} stale quotes to remove`)
          staleQuotes.forEach(q => {
            console.log(`  - Removing stale quote with nonce ${q.rfq.nonce.toString()}`)
            removeQuote(q)
          })
        } else {
          alert('❌ STEP 2 FAILED: Settlement transaction failed or was not sent\n\nOnly token approval was completed. No settlement occurred.')
        }

        setSelectedQuote(null)
        return
      }

      // ============================================================
      // ✅ SETTLEMENT CONFIRMED: Transaction mined successfully
      // ============================================================
      console.log('✅ ✅ ✅ SETTLEMENT CONFIRMED ON-CHAIN ✅ ✅ ✅')
      console.log('Settlement transaction hash:', result.txHash)

      // ============================================================
      // 🧹 CRITICAL CLEANUP: Remove all invalidated quotes from this maker
      // ============================================================
      // When a quote is filled, the maker's nonce increments
      // ALL quotes from this maker with nonces <= filled nonce are now invalid
      const filledMaker = quote.rfq.maker.toLowerCase()
      const filledNonce = quote.rfq.nonce

      console.log(`🧹 Cleaning up invalidated quotes from maker ${filledMaker}`)
      console.log(`Filled nonce: ${filledNonce.toString()}, removing all quotes with nonce <= ${filledNonce.toString()}`)

      // Remove filled quote + any other quotes from same maker with consumed nonces
      const quotesToRemove = quotes.filter(q =>
        q.rfq.maker.toLowerCase() === filledMaker &&
        q.rfq.nonce <= filledNonce
      )

      console.log(`Found ${quotesToRemove.length} quotes to remove from maker ${filledMaker}`)
      quotesToRemove.forEach(q => {
        console.log(`  - Removing quote with nonce ${q.rfq.nonce.toString()}`)
        removeQuote(q)
      })

      setSelectedQuote(null)

      // Show detailed success message with transaction hash
      alert(
        `✅ RFQ FILLED SUCCESSFULLY!\n\n` +
        `You paid: ${formatUnits(quote.rfq.amountIn, 6)} ${getTokenSymbol(quote.rfq.tokenIn)}\n` +
        `You received: ${formatUnits(quote.rfq.amountOut, 6)} ${getTokenSymbol(quote.rfq.tokenOut)}\n\n` +
        `Settlement TX: ${result.txHash.slice(0, 10)}...${result.txHash.slice(-8)}\n` +
        `Status: Confirmed on Arc L1`
      )

    } catch (err: any) {
      // ❌ Only approval or unexpected errors reach here
      console.error('❌ Error during RFQ settlement:', err)
      alert(`❌ Settlement error: ${err.message || 'Unknown error'}`)
      setIsApproving(false)
      setIsSettling(false)
      setSelectedQuote(null)
      return
    }
  }

  const getTokenSymbol = (address: string): string => {
    const token = Object.values(TOKENS).find(t => t.address.toLowerCase() === address.toLowerCase())
    return token?.symbol || 'UNKNOWN'
  }

  return (
    <div className="bg-[#0B0F14] border border-[#1F2937]">
      {/* Institutional Header - Dark Theme */}
      <div className="border-b border-[#374151] px-5 py-3 bg-[#161E2E]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h2 className="text-[13px] font-semibold text-[#E5E7EB] uppercase tracking-wider">RFQ DESK</h2>
            <span className="text-[11px] text-[#9CA3AF] font-mono">
              {userQuotes.length} {userQuotes.length === 1 ? 'market quote' : 'market quotes'}
              {systemQuotes.length > 0 && ` + ${systemQuotes.length} reference`}
              {totalPages > 1 && ` • page ${currentPage}/${totalPages}`}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#9CA3AF] font-mono">
            <span>PVP</span>
            <span className="text-[#4B5563]">|</span>
            <span>&lt;2s FINALITY</span>
          </div>
        </div>
      </div>

      {/* Viewing Mode Banner - Dark Theme */}
      {!account && (
        <div className="px-5 py-2 bg-[#F59E0B]/[0.08] border-y border-[#F59E0B]/20">
          <span className="text-[11px] font-mono text-[#F59E0B] uppercase tracking-wide">
            VIEWING MODE — CONNECT WALLET TO EXECUTE RFQs
          </span>
        </div>
      )}

      {/* Wrong Network Banner - Dark Theme */}
      {!isCorrectNetwork && account && (
        <div className="px-5 py-2 bg-[#F87171]/[0.08] border-y border-[#F87171]/20">
          <span className="text-[11px] font-mono text-[#F87171] uppercase tracking-wide">
            WRONG NETWORK • DETECTED CHAIN ID: {chainId} • EXPECTED: 5042002
          </span>
        </div>
      )}

      {/* Settlement Info Banner - Dark Theme */}
      {account && isCorrectNetwork && quotes.length > 0 && (
        <div className="px-5 py-2.5 bg-[#3B82F6]/[0.08] border-y border-[#3B82F6]/20">
          <div className="flex items-start gap-3">
            <span className="text-[#93C5FD] text-sm">ℹ️</span>
            <div className="flex-1 space-y-1">
              <div className="text-[11px] font-mono font-semibold text-[#93C5FD] uppercase tracking-wide">
                Two-Step Settlement Process
              </div>
              <div className="text-[11px] font-mono text-[#9CA3AF]">
                1️⃣ Approve tokenIn (you authorize transfer) •
                2️⃣ Execute settleRFQ() (atomic PVP swap) •
                ✅ Confirmed by RFQSettled event
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reference Liquidity Info Banner - Dark Theme */}
      {systemQuotes.length > 0 && (
        <div className="px-5 py-2.5 bg-[#6B7280]/[0.08] border-y border-[#6B7280]/20">
          <div className="flex items-start gap-3">
            <span className="text-[#9CA3AF] text-sm">📊</span>
            <div className="flex-1 space-y-1">
              <div className="text-[11px] font-mono font-semibold text-[#9CA3AF] uppercase tracking-wide">
                Reference Liquidity Available
              </div>
              <div className="text-[11px] font-mono text-[#6B7280]">
                Platform-provided quotes (marked "REF") ensure continuous liquidity availability •
                Backed by real reserves • Settled via same atomic PVP flow as market maker quotes
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Institutional Data Table - Dark Theme */}
      {quotes.length === 0 ? (
        <div className="text-center py-16 bg-[#111827]">
          <p className="text-[#9CA3AF] text-[14px] font-mono uppercase tracking-wide">NO ACTIVE QUOTES AVAILABLE</p>
          <p className="text-[#6B7280] text-[12px] mt-1 font-mono">
            MARKET MAKER QUOTES WILL APPEAR HERE • REFERENCE LIQUIDITY AVAILABLE SOON
          </p>
        </div>
      ) : (
        <div>
          {/* Table Header - Dark Theme */}
          <div className="border-b border-[#374151] px-5 py-2 bg-[#111827]">
            <div className="flex items-center text-[11px] font-mono text-[#9CA3AF] uppercase tracking-wide">
              <span className="w-20">MAKER</span>
              <span className="w-12">T</span>
              <span className="w-28">PAIR</span>
              <span className="w-32 text-right">YOU PAY</span>
              <span className="w-32 text-right">YOU RECEIVE</span>
              <span className="w-20 text-right">RATE</span>
              <span className="w-16 text-right">TTL</span>
              <span className="w-24"></span>
            </div>
          </div>

          {/* Table Body - Dark Theme */}
          <div className="divide-y divide-[#1F2937]">
            {currentQuotes.map((quote, idx) => {
              const globalIdx = startIndex + idx  // Global index for timeRemaining
              const tokenInSymbol = getTokenSymbol(quote.rfq.tokenIn)
              const tokenOutSymbol = getTokenSymbol(quote.rfq.tokenOut)
              const timeLeft = timeRemaining[globalIdx] || 0
              const isExpiring = timeLeft < 30
              const isRestricted = isSpecificTaker(quote.rfq)
              const canAccept = !isRestricted || quote.rfq.taker.toLowerCase() === account?.toLowerCase()
              const isSelfQuote = account && quote.rfq.maker.toLowerCase() === account.toLowerCase()
              const isSystemQuote = quote.rfq.maker.toLowerCase() === SYSTEM_MAKER_ADDRESS.toLowerCase()
              // Removed isSettled check - on-chain nonce verification handles this automatically

              return (
                <div
                  key={idx}
                  className={`flex items-center px-5 py-2.5 transition-colors duration-150 ${
                    isSystemQuote
                      ? 'bg-[#1F2937]/30 border-l-2 border-l-[#6B7280]'
                      : isExpiring
                      ? 'bg-[#FBBF24]/[0.08] border-l-2 border-l-[#FBBF24]'
                      : isRestricted && !canAccept
                      ? 'bg-[#0B0F14] opacity-60'
                      : 'bg-[#0B0F14] hover:bg-[#161E2E]'
                  }`}
                >
                  {/* Maker Address - Dark Theme */}
                  <span className="w-20 text-[11px] font-mono text-[#9CA3AF]">
                    {isSystemQuote ? 'PLATFORM' : quote.rfq.maker.slice(0, 8)}
                  </span>

                  {/* Type Pills - Dark Theme */}
                  <div className="w-12">
                    {isSystemQuote ? (
                      <span className="inline-flex items-center px-2 py-0.5 bg-[#6B7280]/[0.12] border border-[#6B7280]/30 text-[#9CA3AF] text-[9px] font-bold rounded uppercase tracking-wide" title="Reference liquidity provided by the platform for immediate settlement">
                        REF
                      </span>
                    ) : isRestricted ? (
                      <span className="inline-flex items-center px-2 py-0.5 bg-[#F59E0B]/[0.12] border border-[#F59E0B]/30 text-[#FBBF24] text-[10px] font-semibold rounded" title="Private RFQ - Restricted Access">
                        🔒
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 bg-[#22C55E]/[0.12] border border-[#22C55E]/30 text-[#34D399] text-[10px] font-semibold rounded" title="Public RFQ - Anyone Can Fill">
                        🌐
                      </span>
                    )}
                  </div>

                  {/* Pair - Dark Theme */}
                  <span className="w-28 text-[12px] font-mono font-semibold text-[#E5E7EB]">
                    {tokenInSymbol}/{tokenOutSymbol}
                  </span>

                  {/* YOU PAY (Debit) - Dark Theme */}
                  <div className="w-32 text-right font-mono">
                    <div className="text-[14px] font-bold text-[#F87171]">
                      {formatUnits(quote.rfq.amountIn, 6)}
                    </div>
                    <div className="text-[11px] text-[#6B7280]">{tokenInSymbol}</div>
                  </div>

                  {/* YOU RECEIVE (Credit) - Dark Theme */}
                  <div className="w-32 text-right font-mono">
                    <div className="text-[14px] font-bold text-[#34D399]">
                      {formatUnits(quote.rfq.amountOut, 6)}
                    </div>
                    <div className="text-[11px] text-[#6B7280]">{tokenOutSymbol}</div>
                  </div>

                  {/* RATE (Neutral) - Dark Theme */}
                  <div className="w-20 text-right font-mono">
                    <div className="text-[12px] text-[#93C5FD]">
                      {(Number(formatUnits(quote.rfq.amountOut, 6)) / Number(formatUnits(quote.rfq.amountIn, 6))).toFixed(4)}
                    </div>
                  </div>

                  {/* TTL (Time to Live) - Dark Theme */}
                  <span className={`w-16 text-right text-[11px] font-mono ${
                    isExpiring ? 'text-[#FBBF24] font-bold' : 'text-[#9CA3AF]'
                  }`}>
                    {timeLeft}s
                  </span>

                  {/* Action Button - Dark Theme */}
                  <div className="w-24 flex justify-end">
                    <button
                      onClick={() => {
                        // If wallet not connected, show message and open wallet modal
                        if (!account) {
                          alert('Please connect your wallet to fill this quote')
                          setIsWalletModalOpen(true)
                          return
                        }
                        // Otherwise proceed with accepting quote
                        handleAcceptQuote(quote)
                      }}
                      disabled={
                        isLoading ||
                        timeLeft === 0 ||
                        (account && !isCorrectNetwork) ||
                        isSelfQuote ||
                        (isRestricted && !canAccept)
                      }
                      className={`px-3 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-[0.5px] rounded transition-all duration-150 ${
                        isSelfQuote
                          ? 'bg-[#374151] text-[#9CA3AF] cursor-not-allowed'
                          : isLoading || timeLeft === 0 || (account && !isCorrectNetwork) || (isRestricted && !canAccept)
                          ? 'bg-[#1F2937] text-[#6B7280] cursor-not-allowed'
                          : 'bg-[#3B82F6] text-white hover:bg-[#2563EB] active:bg-[#1D4ED8] active:scale-[0.98]'
                      }`}
                      title={
                        !account
                          ? 'Click to connect wallet'
                          : !isCorrectNetwork
                          ? 'Switch to Arc Testnet'
                          : isSelfQuote
                          ? 'You cannot fill your own RFQ'
                          : isRestricted && !canAccept
                          ? 'Private quote - unauthorized'
                          : ''
                      }
                    >
                      {selectedQuote === quote && isApproving
                        ? '1/2'
                        : selectedQuote === quote && isSettling
                        ? '2/2'
                        : timeLeft === 0
                        ? 'EXP'
                        : (account && !isCorrectNetwork)
                        ? 'NET'
                        : isSelfQuote
                        ? 'YOUR QUOTE'
                        : isRestricted && !canAccept
                        ? 'PRIV'
                        : 'FILL'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination Controls - Dark Theme */}
          {totalPages > 1 && (
            <div className="border-t border-[#374151] px-5 py-3 bg-[#111827]">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-mono text-[#9CA3AF]">
                  Page {currentPage} of {totalPages} • Showing {startIndex + 1}-{Math.min(endIndex, userQuotes.length)} of {userQuotes.length} market quotes
                  {systemQuotes.length > 0 && ` (+ ${systemQuotes.length} reference)`}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-wide rounded border transition-colors ${
                      currentPage === 1
                        ? 'bg-[#0B0F14] text-[#6B7280] border-[#1F2937] cursor-not-allowed'
                        : 'bg-[#161E2E] text-[#E5E7EB] border-[#374151] hover:border-[#4B5563]'
                    }`}
                  >
                    PREV
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-wide rounded border transition-colors ${
                      currentPage === totalPages
                        ? 'bg-[#0B0F14] text-[#6B7280] border-[#1F2937] cursor-not-allowed'
                        : 'bg-[#161E2E] text-[#E5E7EB] border-[#374151] hover:border-[#4B5563]'
                    }`}
                  >
                    NEXT
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="border-t border-red-400 bg-red-50 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-red-700 uppercase">ERROR:</span>
            <span className="text-xs font-mono text-red-900">{error}</span>
          </div>
        </div>
      )}

      {/* System Info */}
      <details className="border-t border-gray-300 group">
        <summary className="cursor-pointer bg-slate-50 hover:bg-slate-100 px-5 py-2.5 text-xs font-mono text-slate-600 uppercase flex items-center justify-between">
          <span>SYSTEM INFO</span>
          <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="px-5 py-3 bg-white border-t border-gray-200 space-y-2 text-xs font-mono text-slate-600">
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <div>QUOTE MODEL: EIP-712 OFFCHAIN</div>
            <div>SETTLEMENT: ATOMIC PVP</div>
            <div>SECURITY: SIGNATURE VERIFICATION</div>
            <div>SLIPPAGE: ZERO (GUARANTEED)</div>
          </div>
        </div>
      </details>

      {/* Wallet Connection Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </div>
  )
}
