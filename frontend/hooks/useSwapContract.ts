'use client'

import { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { parseUnits, formatUnits } from 'ethers'

export interface SwapQuote {
  amountOut: string
  fee: string
  rate: number
}

export function useSwapContract() {
  const { swapContract, account } = useWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get quote for swapping token A to B
  async function getQuoteAForB(amountIn: string, decimals: number = 6): Promise<SwapQuote | null> {
    if (!swapContract) {
      setError('Wallet not connected')
      return null
    }

    try {
      setIsLoading(true)
      setError(null)

      const amountInWei = parseUnits(amountIn, decimals)
      const [amountOut, fee] = await swapContract.quoteAForB(amountInWei)

      const amountOutFormatted = formatUnits(amountOut, decimals)
      const feeFormatted = formatUnits(fee, decimals)
      const rate = parseFloat(amountOutFormatted) / parseFloat(amountIn)

      return {
        amountOut: amountOutFormatted,
        fee: feeFormatted,
        rate,
      }
    } catch (err: any) {
      console.error('Error getting quote A for B:', err)
      setError(err.message || 'Failed to get quote')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Get quote for swapping token B to A
  async function getQuoteBForA(amountIn: string, decimals: number = 6): Promise<SwapQuote | null> {
    if (!swapContract) {
      setError('Wallet not connected')
      return null
    }

    try {
      setIsLoading(true)
      setError(null)

      const amountInWei = parseUnits(amountIn, decimals)
      const [amountOut, fee] = await swapContract.quoteBForA(amountInWei)

      const amountOutFormatted = formatUnits(amountOut, decimals)
      const feeFormatted = formatUnits(fee, decimals)
      const rate = parseFloat(amountOutFormatted) / parseFloat(amountIn)

      return {
        amountOut: amountOutFormatted,
        fee: feeFormatted,
        rate,
      }
    } catch (err: any) {
      console.error('Error getting quote B for A:', err)
      setError(err.message || 'Failed to get quote')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Execute swap A for B
  async function swapAForB(
    amountIn: string,
    minAmountOut: string,
    decimals: number = 6
  ): Promise<boolean> {
    if (!swapContract || !account) {
      setError('Wallet not connected')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      const amountInWei = parseUnits(amountIn, decimals)
      const minAmountOutWei = parseUnits(minAmountOut, decimals)

      const tx = await swapContract.swapAForB(amountInWei, minAmountOutWei)
      console.log('Swap transaction sent:', tx.hash)

      await tx.wait()
      console.log('Swap transaction confirmed')

      return true
    } catch (err: any) {
      console.error('Error executing swap A for B:', err)
      setError(err.message || 'Failed to execute swap')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Execute swap B for A
  async function swapBForA(
    amountIn: string,
    minAmountOut: string,
    decimals: number = 6
  ): Promise<boolean> {
    if (!swapContract || !account) {
      setError('Wallet not connected')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      const amountInWei = parseUnits(amountIn, decimals)
      const minAmountOutWei = parseUnits(minAmountOut, decimals)

      const tx = await swapContract.swapBForA(amountInWei, minAmountOutWei)
      console.log('Swap transaction sent:', tx.hash)

      await tx.wait()
      console.log('Swap transaction confirmed')

      return true
    } catch (err: any) {
      console.error('Error executing swap B for A:', err)
      setError(err.message || 'Failed to execute swap')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Get liquidity pool balances
  async function getLiquidityBalances() {
    if (!swapContract) {
      setError('Wallet not connected')
      return null
    }

    try {
      setIsLoading(true)
      setError(null)

      const [balanceA, balanceB] = await swapContract.liquidityBalances()

      return {
        balanceA: formatUnits(balanceA, 6),
        balanceB: formatUnits(balanceB, 6),
      }
    } catch (err: any) {
      console.error('Error getting liquidity balances:', err)
      setError(err.message || 'Failed to get liquidity balances')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Get token addresses
  async function getTokenAddresses() {
    if (!swapContract) {
      setError('Wallet not connected')
      return null
    }

    try {
      const tokenA = await swapContract.tokenA()
      const tokenB = await swapContract.tokenB()

      return { tokenA, tokenB }
    } catch (err: any) {
      console.error('Error getting token addresses:', err)
      setError(err.message || 'Failed to get token addresses')
      return null
    }
  }

  return {
    getQuoteAForB,
    getQuoteBForA,
    swapAForB,
    swapBForA,
    getLiquidityBalances,
    getTokenAddresses,
    isLoading,
    error,
  }
}
