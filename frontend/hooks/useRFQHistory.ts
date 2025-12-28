/**
 * RFQ Settlement History Hook - Production Grade
 *
 * CRITICAL FIXES:
 * 1. Uses dedicated read-only provider (not wallet provider)
 * 2. Never shows raw RPC errors to users
 * 3. Implements retry logic with exponential backoff
 * 4. Works even when wallet is disconnected
 * 5. Sanitizes all errors into institutional-grade messages
 */

'use client'

import { useState, useEffect } from 'react'
import { Contract } from 'ethers'
import { SWAP_CONTRACT_ADDRESS } from '@/lib/contracts'
import { TOKENS } from '@/lib/tokens'
import { getReadOnlyProvider, withRetry, sanitizeRPCError } from '@/lib/provider'

const RFQ_CONTRACT_ABI = [
  'event RFQSettled(address indexed maker, address indexed taker, address indexed tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bytes32 indexed rfqId)'
]

export interface SettlementEvent {
  maker: string
  taker: string
  tokenIn: string
  tokenOut: string
  amountIn: bigint
  amountOut: bigint
  blockNumber: number
  transactionHash: string
  timestamp: number
}

export function useRFQHistory() {
  const [events, setEvents] = useState<SettlementEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // PRODUCTION FIX: Use dedicated read-only provider, not wallet provider
    // This allows settlement history to work even without wallet connection
    const provider = getReadOnlyProvider()

    const fetchEvents = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const contract = new Contract(
          SWAP_CONTRACT_ADDRESS,
          RFQ_CONTRACT_ABI,
          provider
        )

        // PRODUCTION FIX: Wrap RPC calls with retry logic
        const currentBlock = await withRetry(
          () => provider.getBlockNumber(),
          3, // 3 retries
          5000 // 5 second timeout
        )

        const fromBlock = Math.max(0, currentBlock - 10000)

        // Query RFQSettled events with retry
        const filter = contract.filters.RFQSettled()
        const eventLogs = await withRetry(
          () => contract.queryFilter(filter, fromBlock, currentBlock),
          3,
          10000 // 10 second timeout for event queries
        )

        // Parse events and get timestamps
        const parsedEvents = await Promise.all(
          eventLogs.map(async (log) => {
            try {
              // Type guard: only process EventLog (has args), skip plain Log
              if (!('args' in log)) {
                return null
              }

              const block = await provider.getBlock(log.blockNumber)
              return {
                maker: log.args?.maker || '',
                taker: log.args?.taker || '',
                tokenIn: log.args?.tokenIn || '',
                tokenOut: log.args?.tokenOut || '',
                amountIn: log.args?.amountIn || BigInt(0),
                amountOut: log.args?.amountOut || BigInt(0),
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                timestamp: block?.timestamp || 0
              }
            } catch (error) {
              // Silently skip events that fail to parse
              console.warn('Failed to parse event at block', log.blockNumber, error)
              return null
            }
          })
        )

        // Filter out null events
        const validEvents = parsedEvents.filter((e): e is SettlementEvent => e !== null)

        // Sort by block number descending (newest first)
        validEvents.sort((a, b) => b.blockNumber - a.blockNumber)

        setEvents(validEvents)
        setIsLoading(false)
      } catch (err: any) {
        // PRODUCTION FIX: Sanitize error before showing to user
        const sanitizedError = sanitizeRPCError(err)
        setError(sanitizedError)
        setIsLoading(false)

        // Keep existing events even if refresh fails
        // This provides better UX than clearing the entire list
      }
    }

    // Initial fetch
    fetchEvents()

    // Refresh events every 15 seconds
    const interval = setInterval(fetchEvents, 15000)
    return () => clearInterval(interval)
  }, []) // No dependencies - this runs independently of wallet state

  const getTokenSymbol = (address: string): string => {
    const token = Object.values(TOKENS).find(
      t => t.address.toLowerCase() === address.toLowerCase()
    )
    return token?.symbol || 'UNKNOWN'
  }

  return {
    events,
    isLoading,
    error,
    getTokenSymbol
  }
}
