'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { Contract, formatUnits, parseUnits, MaxUint256 } from 'ethers'
import { ERC20_ABI, SWAP_CONTRACT_ADDRESS } from '@/lib/contracts'

export function useTokens() {
  const { provider, account } = useWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get token balance
  async function getBalance(tokenAddress: string): Promise<string> {
    if (!provider || !account) {
      console.log('Wallet not connected - returning 0 balance')
      return '0'
    }

    try {
      console.log('Fetching balance for token:', tokenAddress, 'account:', account)
      const contract = new Contract(tokenAddress, ERC20_ABI, provider)
      const balance = await contract.balanceOf(account)
      const decimals = await contract.decimals()
      const formattedBalance = formatUnits(balance, decimals)
      console.log('Balance fetched:', formattedBalance, 'for token:', tokenAddress)
      return formattedBalance
    } catch (err: any) {
      console.error('Error getting balance for', tokenAddress, ':', err)
      return '0'
    }
  }

  // Get token allowance for a spender
  async function getAllowance(tokenAddress: string, spenderAddress: string): Promise<string> {
    if (!provider || !account) {
      throw new Error('Wallet not connected')
    }

    try {
      const contract = new Contract(tokenAddress, ERC20_ABI, provider)
      const allowance = await contract.allowance(account, spenderAddress)
      const decimals = await contract.decimals()
      return formatUnits(allowance, decimals)
    } catch (err: any) {
      console.error('Error getting allowance:', err)
      throw new Error(err.message || 'Failed to get allowance')
    }
  }

  // Approve token spending
  async function approve(
    tokenAddress: string,
    spenderAddress: string,
    amount?: string | bigint
  ): Promise<boolean> {
    if (!provider || !account) {
      setError('Wallet not connected')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const signer = await provider.getSigner()
      const contract = new Contract(tokenAddress, ERC20_ABI, signer)

      // Handle different amount types
      let approvalAmount: bigint
      if (!amount) {
        // No amount specified, approve max uint256 (infinite approval)
        approvalAmount = MaxUint256
      } else if (typeof amount === 'bigint') {
        // BigInt provided directly (exact wei amount)
        approvalAmount = amount
      } else {
        // String provided (human-readable decimal)
        approvalAmount = parseUnits(amount, await contract.decimals())
      }

      // Check current allowance first (skip approval if already sufficient)
      const currentAllowance = await contract.allowance(account, spenderAddress)
      console.log('Current allowance:', currentAllowance.toString())
      console.log('Required amount:', approvalAmount.toString())

      if (currentAllowance >= approvalAmount) {
        console.log('✅ Sufficient allowance already exists - skipping approval')
        setIsLoading(false)
        return true
      }

      console.log('🔵 Approving token:', {
        token: tokenAddress,
        spender: spenderAddress,
        amount: approvalAmount.toString(),
        account
      })

      const tx = await contract.approve(spenderAddress, approvalAmount)
      console.log('📤 Approval transaction sent:', tx.hash)

      const receipt = await tx.wait()
      console.log('✅ Approval confirmed in block:', receipt.blockNumber)

      // Verify the approval actually worked
      const newAllowance = await contract.allowance(account, spenderAddress)
      console.log('✅ New allowance:', newAllowance.toString())

      if (newAllowance < approvalAmount) {
        throw new Error(`Approval failed: allowance ${newAllowance.toString()} < requested ${approvalAmount.toString()}`)
      }

      return true
    } catch (err: any) {
      console.error('❌ Error approving token:', err)
      setError(err.message || 'Failed to approve token')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Check if swap contract is approved for a token
  async function isApprovedForSwap(tokenAddress: string, requiredAmount: string): Promise<boolean> {
    try {
      const allowance = await getAllowance(tokenAddress, SWAP_CONTRACT_ADDRESS)
      return parseFloat(allowance) >= parseFloat(requiredAmount)
    } catch (err) {
      console.error('Error checking approval:', err)
      return false
    }
  }

  // Approve swap contract to spend tokens
  async function approveForSwap(tokenAddress: string, amount?: string | bigint): Promise<boolean> {
    return approve(tokenAddress, SWAP_CONTRACT_ADDRESS, amount)
  }

  // Get token info (symbol and decimals)
  async function getTokenInfo(tokenAddress: string): Promise<{ symbol: string; decimals: number }> {
    if (!provider) {
      console.log('Provider not available - using defaults')
      return { symbol: 'UNKNOWN', decimals: 6 }
    }

    try {
      console.log('Fetching token info for:', tokenAddress)
      const contract = new Contract(tokenAddress, ERC20_ABI, provider)
      const [symbol, decimals] = await Promise.all([
        contract.symbol(),
        contract.decimals()
      ])

      console.log('Token info fetched:', { symbol, decimals })
      return { symbol, decimals }
    } catch (err: any) {
      console.error('Error getting token info for', tokenAddress, ':', err)
      return { symbol: 'UNKNOWN', decimals: 6 }
    }
  }

  return {
    getBalance,
    getAllowance,
    approve,
    isApprovedForSwap,
    approveForSwap,
    getTokenInfo,
    isLoading,
    error,
  }
}
