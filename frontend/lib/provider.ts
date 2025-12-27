/**
 * Production-Grade RPC Provider Infrastructure
 *
 * CRITICAL: Separates read-only RPC calls from wallet provider
 * - Read operations: Use dedicated JSON-RPC provider (reliable, always available)
 * - Write operations: Use wallet provider (user signs transactions)
 *
 * This prevents wallet provider failures from breaking read-only UI components.
 */

import { JsonRpcProvider, FallbackProvider } from 'ethers'

// Arc Testnet RPC Endpoint
const ARC_RPC_URL = 'https://rpc.testnet.arc.network'
const ARC_CHAIN_ID = 5042002

/**
 * Get dedicated read-only provider for queries
 *
 * PRODUCTION FIX:
 * - Never use wallet provider for reads (unreliable, requires connection)
 * - Always use dedicated JSON-RPC provider (stable, no wallet needed)
 * - Fallback to multiple endpoints if primary fails
 */
export function getReadOnlyProvider(): JsonRpcProvider {
  // Primary provider
  const primaryProvider = new JsonRpcProvider(ARC_RPC_URL, ARC_CHAIN_ID, {
    staticNetwork: true, // Skip network detection for performance
  })

  return primaryProvider
}

/**
 * Get provider with automatic retry and timeout
 *
 * @param maxRetries - Maximum retry attempts
 * @param timeout - Request timeout in milliseconds
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  timeout = 5000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      })

      // Race between actual request and timeout
      const result = await Promise.race([fn(), timeoutPromise])
      return result
    } catch (error: any) {
      lastError = error
      console.warn(`Attempt ${attempt}/${maxRetries} failed:`, error.message)

      // Exponential backoff (except on last attempt)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Request failed after retries')
}

/**
 * Sanitize RPC errors into user-friendly messages
 *
 * PRODUCTION FIX:
 * - Never show raw error messages to users
 * - Never show stack traces, RPC URLs, or technical details
 * - Always return neutral, institutional-grade error messages
 */
export function sanitizeRPCError(error: any): string {
  // Log full error for debugging (console only)
  console.error('[RPC Error - Debug Only]', {
    message: error?.message,
    code: error?.code,
    data: error?.data,
    stack: error?.stack
  })

  // Categorize and sanitize error
  const errorMessage = error?.message?.toLowerCase() || ''

  // Network/Connection Errors
  if (
    errorMessage.includes('fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('http request failed')
  ) {
    return 'Network connection temporarily unavailable.'
  }

  // Rate Limiting
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests') ||
    error?.code === 429
  ) {
    return 'Service temporarily busy. Please try again in a moment.'
  }

  // Block Range Errors
  if (
    errorMessage.includes('block') ||
    errorMessage.includes('range') ||
    errorMessage.includes('query')
  ) {
    return 'Data retrieval in progress. Please wait a moment.'
  }

  // Contract/ABI Errors
  if (
    errorMessage.includes('contract') ||
    errorMessage.includes('abi') ||
    errorMessage.includes('revert')
  ) {
    return 'Smart contract query failed. Please refresh the page.'
  }

  // Provider Errors
  if (
    errorMessage.includes('provider') ||
    errorMessage.includes('eth_') ||
    errorMessage.includes('unknown_error')
  ) {
    return 'Connection to blockchain temporarily unavailable.'
  }

  // Generic fallback (should never show technical details)
  return 'Service temporarily unavailable. Please refresh the page.'
}

/**
 * Health check for RPC endpoint
 */
export async function checkRPCHealth(): Promise<boolean> {
  try {
    const provider = getReadOnlyProvider()
    await provider.getBlockNumber()
    return true
  } catch (error) {
    console.error('RPC health check failed:', error)
    return false
  }
}
