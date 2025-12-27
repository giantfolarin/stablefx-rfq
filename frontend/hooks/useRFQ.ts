'use client'

import { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { Contract, parseUnits } from 'ethers'
import {
  RFQ,
  RFQQuote,
  signRFQ,
  calculateAmountOut,
  isRFQExpired,
  ANY_TAKER,
  computeRFQId
} from '@/lib/rfq'
import { SWAP_CONTRACT_ADDRESS, SWAP_CONTRACT_ABI } from '@/lib/contracts'

// ============================================================================
// SETTLED RFQ TRACKING (Prevent Replay Attacks)
// ============================================================================

const SETTLED_RFQS_KEY = 'settled_rfqs_v1'

function getSettledRFQs(): Set<string> {
  if (typeof window === 'undefined') return new Set()

  try {
    const stored = sessionStorage.getItem(SETTLED_RFQS_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function markRFQAsSettled(rfqId: string): void {
  if (typeof window === 'undefined') return

  try {
    const settled = getSettledRFQs()
    settled.add(rfqId)
    sessionStorage.setItem(SETTLED_RFQS_KEY, JSON.stringify([...settled]))
    console.log('✅ Marked RFQ as SETTLED:', rfqId)
  } catch (err) {
    console.error('Failed to mark RFQ as settled:', err)
  }
}

function isRFQSettled(rfqId: string): boolean {
  return getSettledRFQs().has(rfqId)
}

function clearSettledRFQs(): void {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.removeItem(SETTLED_RFQS_KEY)
    console.log('🗑️  Cleared settled RFQs cache')
  } catch (err) {
    console.error('Failed to clear settled RFQs:', err)
  }
}

interface CreateRFQParams {
  tokenIn: string
  tokenOut: string
  amountIn: string
  rate: string
  taker?: string
  ttlSeconds?: number
  decimalsIn?: number
  decimalsOut?: number
}

// Export helpers for RFQ settlement tracking (replay protection)
export { isRFQSettled, clearSettledRFQs }

export function useRFQ() {
  const { provider, account, swapContract } = useWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create and sign an RFQ as a maker
  const createAndSignRFQ = async (params: CreateRFQParams): Promise<RFQQuote | null> => {
    if (!provider || !account) {
      setError('Wallet not connected')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use swap contract as RFQ contract for now
      const contract = swapContract || new Contract(
        SWAP_CONTRACT_ADDRESS,
        SWAP_CONTRACT_ABI,
        provider
      )

      // Get current nonce for maker
      const nonce = await contract.nonces(account)
      console.log('Current nonce for maker:', nonce.toString())

      // Calculate expiry
      const ttl = params.ttlSeconds || 300 // Default 5 minutes
      const expiry = BigInt(Math.floor(Date.now() / 1000) + ttl)

      // Parse amounts
      const amountInWei = parseUnits(params.amountIn, params.decimalsIn || 6)
      const amountOutWei = calculateAmountOut(
        amountInWei,
        params.rate,
        params.decimalsIn || 6,
        params.decimalsOut || 6
      )

      // Build RFQ - CRITICAL: taker must be address(0) for public RFQs
      const taker = (params.taker && params.taker !== '') ? params.taker : ANY_TAKER

      const rfq: RFQ = {
        maker: account,
        taker,
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: amountInWei,
        amountOut: amountOutWei,
        nonce: BigInt(nonce),
        expiry
      }

      console.log('🔵 RFQ to sign:', {
        maker: rfq.maker,
        taker: rfq.taker,
        isPublic: rfq.taker === ANY_TAKER,
        tokenIn: rfq.tokenIn,
        tokenOut: rfq.tokenOut,
        amountIn: rfq.amountIn.toString(),
        amountOut: rfq.amountOut.toString()
      })

      // Sign RFQ using EIP-712
      const signature = await signRFQ(rfq, provider, SWAP_CONTRACT_ADDRESS)
      console.log('RFQ signed:', signature)

      // Create quote object (caller will add to global store)
      const quote: RFQQuote = {
        rfq,
        signature,
        metadata: {
          createdAt: Date.now(),
          pair: `${params.tokenIn}/${params.tokenOut}`,
          rate: params.rate,
          expiresIn: ttl
        }
      }

      setIsLoading(false)
      return quote
    } catch (err: any) {
      console.error('Error creating RFQ:', err)
      setError(err.message || 'Failed to create RFQ')
      setIsLoading(false)
      return null
    }
  }

  //============================================================================
  // Settle an RFQ as a taker (institutional-grade with replay protection)
  // ============================================================================
  // Returns: { success: boolean, txHash?: string }
  // - success: true ONLY if settlement tx was mined successfully
  // - txHash: transaction hash of settlement (undefined if failed)
  // ============================================================================
  const settleRFQ = async (quote: RFQQuote): Promise<{success: boolean, txHash?: string}> => {
    console.log('========================================')
    console.log('🔵 settleRFQ FUNCTION CALLED')
    console.log('========================================')

    if (!provider || !account) {
      console.error('❌ Wallet not connected')
      setError('Wallet not connected')
      return { success: false }
    }

    console.log('✅ Provider and account available')
    console.log('Account:', account)

    const rfqId = computeRFQId(quote.rfq)
    console.log('RFQ ID computed:', rfqId)

    // Case-insensitive address comparison
    const accountLower = account.toLowerCase()
    const takerLower = quote.rfq.taker.toLowerCase()
    const anyTakerLower = ANY_TAKER.toLowerCase()

    if (accountLower !== takerLower && takerLower !== anyTakerLower) {
      console.error('❌ Not authorized:', { account: accountLower, taker: takerLower })
      setError('You are not the designated taker for this quote')
      return { success: false }
    }

    if (isRFQExpired(quote.rfq)) {
      console.error('❌ Quote expired')
      setError('Quote has expired')
      return { success: false }
    }

    console.log('✅ All validations passed, proceeding with settlement')
    setIsLoading(true)
    setError(null)

    try {
      const signer = await provider.getSigner()
      const contract = new Contract(
        SWAP_CONTRACT_ADDRESS,
        SWAP_CONTRACT_ABI,
        signer
      )

      console.log('📝 Calling settleRFQ on contract...')
      console.log('RFQ struct (must be byte-for-byte identical to signed data):', {
        maker: quote.rfq.maker,
        taker: quote.rfq.taker,
        tokenIn: quote.rfq.tokenIn,
        tokenOut: quote.rfq.tokenOut,
        amountIn: quote.rfq.amountIn.toString(),
        amountOut: quote.rfq.amountOut.toString(),
        nonce: quote.rfq.nonce.toString(),
        expiry: quote.rfq.expiry.toString()
      })
      console.log('Signature:', quote.signature)

      // 🔑 CRITICAL: Pass exact RFQ struct to contract (must match signed data)
      const rfqForContract = {
        maker: quote.rfq.maker,
        taker: quote.rfq.taker,
        tokenIn: quote.rfq.tokenIn,
        tokenOut: quote.rfq.tokenOut,
        amountIn: quote.rfq.amountIn,
        amountOut: quote.rfq.amountOut,
        nonce: quote.rfq.nonce,
        expiry: quote.rfq.expiry
      }

      console.log('🔥 STEP 2: Calling contract.settleRFQ()...')
      console.log('Contract address:', SWAP_CONTRACT_ADDRESS)
      console.log('RFQ struct:', rfqForContract)
      console.log('Signature:', quote.signature)

      console.log('⏳ Sending settlement transaction to blockchain...')
      const tx = await contract.settleRFQ(rfqForContract, quote.signature)
      console.log('✅ ✅ ✅ SETTLEMENT TRANSACTION SENT TO BLOCKCHAIN ✅ ✅ ✅')
      console.log('Transaction hash:', tx.hash)
      console.log('Waiting for transaction confirmation...')

      const receipt = await tx.wait()
      console.log('✅ Settlement receipt:', receipt)

      // ============================================================================
      // 🔑 SOURCE OF TRUTH: receipt.status === 1
      // ============================================================================
      // If the transaction was mined successfully, the settlement succeeded.
      // Event parsing is for logging/debugging only - never fail on missing events.
      // ============================================================================

      if (receipt.status !== 1) {
        throw new Error('Transaction reverted onchain')
      }

      // ✅ Transaction mined successfully - RFQ is now SETTLED
      console.log('✅ ✅ ✅ SETTLEMENT CONFIRMED ON-CHAIN (receipt.status === 1) ✅ ✅ ✅')
      console.log('Transaction hash:', tx.hash)

      // Mark RFQ as settled to prevent replay attempts
      markRFQAsSettled(rfqId)

      // ============================================================================
      // 📊 EVENT PARSING (Informational Only - Not Required for Success)
      // ============================================================================

      try {
        const parsedEvents = receipt.logs
          .map((log: any, index: number) => {
            try {
              const parsed = contract.interface.parseLog({
                topics: [...log.topics],
                data: log.data
              })
              console.log(`📋 Parsed log ${index}:`, parsed?.name)
              return parsed
            } catch (err) {
              return null
            }
          })
          .filter((e: any) => e !== null)

        console.log('📊 All parsed events:', parsedEvents.map((e: any) => e?.name))

        // Log settlement events for debugging (not required for success)
        const settlementIntentEvent = parsedEvents.find((e: any) => e?.name === 'RFQSettlementIntent')
        const rfqSettledEvent = parsedEvents.find((e: any) => e?.name === 'RFQSettled')

        if (settlementIntentEvent) {
          console.log('📋 RFQSettlementIntent:', {
            rfqId: settlementIntentEvent.args.rfqId,
            maker: settlementIntentEvent.args.maker,
            taker: settlementIntentEvent.args.taker,
            amountIn: settlementIntentEvent.args.amountIn.toString(),
            amountOut: settlementIntentEvent.args.amountOut.toString()
          })
        }

        if (rfqSettledEvent) {
          console.log('📋 RFQSettled:', {
            rfqId: rfqSettledEvent.args.rfqId,
            maker: rfqSettledEvent.args.maker,
            taker: rfqSettledEvent.args.taker,
            amountIn: rfqSettledEvent.args.amountIn.toString(),
            amountOut: rfqSettledEvent.args.amountOut.toString()
          })
        }

        if (!settlementIntentEvent && !rfqSettledEvent) {
          console.warn('⚠️  No settlement events found in logs (event parsing may have failed)')
          console.warn('This is OK - transaction still succeeded (receipt.status === 1)')
        }
      } catch (eventParseError) {
        console.warn('⚠️  Event parsing failed:', eventParseError)
        console.warn('This is OK - transaction still succeeded (receipt.status === 1)')
      }

      // ============================================================================
      // ✅ SETTLEMENT SUCCESSFUL
      // ============================================================================

      setIsLoading(false)
      return { success: true, txHash: tx.hash }
    } catch (err: any) {
      console.error('❌ Settlement error:', err)

      // ============================================================================
      // 🔑 ERROR CLASSIFICATION
      // ============================================================================
      // Two types of errors:
      // 1. Pre-flight simulation failure (tx never sent) - ethers.js catches this
      // 2. Transaction reverted on-chain (tx was sent but failed)
      //
      // We can distinguish by checking if err.transaction exists
      // ============================================================================

      const errorMsg = err.message?.toLowerCase() || ''
      const wasTxSent = err.transaction !== undefined

      if (!wasTxSent) {
        console.log('⚠️  Transaction was NOT sent (simulation/pre-flight failure)')
        console.log('Contract would have reverted, so ethers.js prevented sending tx')
      } else {
        console.log('📤 Transaction WAS sent but reverted on-chain')
        console.log('Transaction hash:', err.transactionHash)
      }

      // Check for nonce errors (quote already filled)
      if (errorMsg.includes('bad nonce') || errorMsg.includes('invalid nonce') || errorMsg.includes('nonce')) {
        console.log('❌ Nonce error: Quote has already been filled')
        setError('Quote already filled - nonce has been consumed on-chain')
        setIsLoading(false)

        // DO NOT mark as settled in sessionStorage - this creates false positives
        // The quote was filled by someone else, but we don't have the txHash

        alert('❌ Quote Already Filled\n\nThis quote has been filled by another user.\n\nThe maker\'s nonce has been consumed. Try filling a different quote.')
        return { success: false, errorType: 'NONCE_CONSUMED' as const }
      }

      // Parse other contract revert messages
      if (errorMsg.includes('expired')) {
        setError('Quote expired - settlement deadline passed')
      } else if (errorMsg.includes('invalid signature')) {
        setError('Invalid maker signature - quote may be malformed')
      } else if (errorMsg.includes('not taker') || errorMsg.includes('unauthorized')) {
        setError('You are not authorized to fill this quote')
      } else if (errorMsg.includes('insufficient')) {
        setError('Insufficient token balance or allowance')
      } else if (errorMsg.includes('user rejected') || errorMsg.includes('user denied')) {
        setError('Transaction rejected by user')
      } else {
        // Generic error - log full details but show friendly message
        console.error('Full error details:', err)
        setError('Settlement failed - check console for details')
      }

      setIsLoading(false)
      return { success: false }
    }
  }

  // Get current nonce for an address
  const getNonce = async (address: string): Promise<bigint> => {
    if (!provider) {
      return BigInt(0)
    }

    try {
      const contract = swapContract || new Contract(
        SWAP_CONTRACT_ADDRESS,
        SWAP_CONTRACT_ABI,
        provider
      )

      const nonce = await contract.nonces(address)
      return BigInt(nonce)
    } catch (err) {
      console.error('Error fetching nonce:', err)
      return BigInt(0)
    }
  }

  // V2: Cancel an RFQ by rfqId (only maker can cancel)
  const cancelRFQ = async (rfqId: string): Promise<boolean> => {
    if (!provider || !account) {
      console.error('❌ Wallet not connected')
      setError('Wallet not connected')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const signer = await provider.getSigner()
      const contract = new Contract(
        SWAP_CONTRACT_ADDRESS,
        SWAP_CONTRACT_ABI,
        signer
      )

      console.log('🔵 Cancelling RFQ:', { rfqId, maker: account })

      // Call cancelRFQ on contract
      const tx = await contract.cancelRFQ(rfqId)
      console.log('📤 Cancellation tx sent:', tx.hash)

      const receipt = await tx.wait()
      console.log('✅ Cancellation receipt:', receipt)

      // Check for RFQCancelled event
      const parsedEvents = receipt.logs
        .map((log: any) => {
          try {
            return contract.interface.parseLog(log)
          } catch {
            return null
          }
        })
        .filter((e: any) => e !== null)

      const cancelledEvent = parsedEvents.find((e: any) => e?.name === 'RFQCancelled')

      if (!cancelledEvent) {
        console.error('❌ Transaction succeeded but no RFQCancelled event found')
        setError('Cancellation failed - no RFQCancelled event')
        setIsLoading(false)
        return false
      }

      console.log('✅ RFQCancelled event confirmed:', {
        maker: cancelledEvent.args.maker,
        rfqId: cancelledEvent.args.rfqId
      })

      setIsLoading(false)
      return true
    } catch (err: any) {
      console.error('❌ Error cancelling RFQ:', err)

      if (err.message.includes('not maker')) {
        setError('Only the maker can cancel this RFQ')
      } else if (err.message.includes('already cancelled')) {
        setError('RFQ already cancelled')
      } else if (err.message.includes('already settled')) {
        setError('Cannot cancel - RFQ already settled')
      } else {
        setError(err.message || 'Failed to cancel RFQ')
      }

      setIsLoading(false)
      return false
    }
  }

  return {
    isLoading,
    error,
    createAndSignRFQ,
    settleRFQ,
    cancelRFQ,
    getNonce
  }
}
