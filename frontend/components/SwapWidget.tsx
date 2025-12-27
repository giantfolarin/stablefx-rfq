'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useSwapContract } from '@/hooks/useSwapContract'
import { useTokens } from '@/hooks/useTokens'
import { Token, TOKENS, getTokenByAddress } from '@/lib/tokens'
import TokenSelector from './TokenSelector'

interface SwapWidgetProps {
  onSwap?: (from: string, to: string, amount: number) => void
}

export default function SwapWidget({ onSwap }: SwapWidgetProps) {
  const { account, swapContract, isCorrectNetwork, chainId, switchToArcTestnet } = useWallet()
  const { getQuoteAForB, getQuoteBForA, swapAForB, swapBForA, isLoading: swapLoading, error: swapError } = useSwapContract()
  const { getBalance, isApprovedForSwap, approveForSwap, isLoading: tokenLoading, error: tokenError } = useTokens()

  // Selected tokens
  const [fromToken, setFromToken] = useState<Token>(TOKENS.USDC)
  const [toToken, setToToken] = useState<Token>(TOKENS.EURC)

  // Swap state
  const [amount, setAmount] = useState('')
  const [amountOut, setAmountOut] = useState('')
  const [fee, setFee] = useState('')
  const [rate, setRate] = useState(0)
  const [success, setSuccess] = useState(false)

  // Token balances
  const [fromBalance, setFromBalance] = useState('0')
  const [toBalance, setToBalance] = useState('0')

  // Contract token addresses
  const [contractTokenA, setContractTokenA] = useState<string>('')
  const [contractTokenB, setContractTokenB] = useState<string>('')
  const [pairSupported, setPairSupported] = useState(true)

  // Approval state
  const [needsApproval, setNeedsApproval] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  const error = swapError || tokenError
  const isLoading = swapLoading || tokenLoading

  // Fetch contract token addresses on mount
  useEffect(() => {
    const fetchContractTokens = async () => {
      if (!swapContract) {
        console.log('No swap contract available')
        return
      }

      try {
        console.log('Fetching contract token addresses...')
        const [tokenA, tokenB] = await Promise.all([
          swapContract.tokenA(),
          swapContract.tokenB()
        ])

        console.log('Contract tokenA:', tokenA)
        console.log('Contract tokenB:', tokenB)

        setContractTokenA(tokenA.toLowerCase())
        setContractTokenB(tokenB.toLowerCase())
      } catch (err) {
        console.error('Error fetching contract tokens:', err)
      }
    }

    fetchContractTokens()
  }, [swapContract])

  // Check if selected pair is supported by the contract
  useEffect(() => {
    if (!contractTokenA || !contractTokenB) {
      console.log('Contract tokens not loaded yet, marking pair as not supported')
      setPairSupported(false)
      return
    }

    const fromAddr = fromToken.address.toLowerCase()
    const toAddr = toToken.address.toLowerCase()

    console.log('Pair validation:')
    console.log('  From token:', fromToken.symbol, '-', fromAddr)
    console.log('  To token:', toToken.symbol, '-', toAddr)
    console.log('  Contract tokenA:', contractTokenA)
    console.log('  Contract tokenB:', contractTokenB)

    const isSupported =
      (fromAddr === contractTokenA && toAddr === contractTokenB) ||
      (fromAddr === contractTokenB && toAddr === contractTokenA)

    console.log('  Pair supported:', isSupported)
    setPairSupported(isSupported)
  }, [fromToken, toToken, contractTokenA, contractTokenB])

  // Update balances when tokens or account change
  useEffect(() => {
    const updateBalances = async () => {
      console.log('updateBalances triggered - account:', account, 'fromToken:', fromToken.symbol, 'toToken:', toToken.symbol)

      if (!account) {
        console.log('No account connected - setting balances to 0')
        setFromBalance('0')
        setToBalance('0')
        return
      }

      try {
        console.log('Fetching balances for:', fromToken.symbol, '&', toToken.symbol)
        const [balFrom, balTo] = await Promise.all([
          getBalance(fromToken.address),
          getBalance(toToken.address)
        ])

        console.log('Balances received:', { from: balFrom, to: balTo })
        setFromBalance(balFrom)
        setToBalance(balTo)
      } catch (err) {
        console.error('Error updating balances:', err)
        setFromBalance('0')
        setToBalance('0')
      }
    }

    updateBalances()
    const interval = setInterval(updateBalances, 10000)
    return () => clearInterval(interval)
  }, [account, fromToken, toToken, getBalance])

  // Get quote when amount changes
  useEffect(() => {
    const getQuote = async () => {
      if (!amount || parseFloat(amount) <= 0 || !pairSupported) {
        setAmountOut('')
        setFee('')
        setRate(0)
        setNeedsApproval(false)
        return
      }

      // Determine swap direction based on contract tokens
      const fromAddr = fromToken.address.toLowerCase()
      const isAtoB = fromAddr === contractTokenA

      const quote = isAtoB
        ? await getQuoteAForB(amount)
        : await getQuoteBForA(amount)

      if (quote) {
        setAmountOut(quote.amountOut)
        setFee(quote.fee)
        setRate(quote.rate)

        // Check if approval is needed
        const approved = await isApprovedForSwap(fromToken.address, amount)
        setNeedsApproval(!approved)
      }
    }

    const debounce = setTimeout(getQuote, 500)
    return () => clearTimeout(debounce)
  }, [amount, fromToken, toToken, pairSupported, contractTokenA])

  const handleApprove = async () => {
    setIsApproving(true)
    const success = await approveForSwap(fromToken.address)
    setIsApproving(false)

    if (success) {
      setNeedsApproval(false)
    }
  }

  const handleSwap = async () => {
    if (!amount || parseFloat(amount) <= 0 || !account || !pairSupported) return

    setSuccess(false)

    const slippageTolerance = 0.005
    const minAmountOutRaw = parseFloat(amountOut) * (1 - slippageTolerance)
    // Round to token decimals to avoid "too many decimals" error
    const minAmountOut = minAmountOutRaw.toFixed(toToken.decimals)

    const fromAddr = fromToken.address.toLowerCase()
    const isAtoB = fromAddr === contractTokenA

    const result = isAtoB
      ? await swapAForB(amount, minAmountOut)
      : await swapBForA(amount, minAmountOut)

    if (result) {
      setSuccess(true)
      setAmount('')
      setAmountOut('')

      // Refresh balances
      const [balFrom, balTo] = await Promise.all([
        getBalance(fromToken.address),
        getBalance(toToken.address)
      ])
      setFromBalance(balFrom)
      setToBalance(balTo)

      setTimeout(() => setSuccess(false), 5000)
    }
  }

  const handleTokenSwap = () => {
    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp)
    setAmount('')
    setAmountOut('')
    setFee('')
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-display font-bold text-slate-950">Swap</h3>
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span>⚡</span>
          <span>On-Chain</span>
        </div>
      </div>

      {!account && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-800">
            Please connect your wallet to start swapping
          </p>
        </div>
      )}

      {account && !isCorrectNetwork && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-red-900">Wrong Network Detected</p>
            <p className="text-xs text-red-700 mt-1">
              You're connected to Chain ID: {chainId}. Please switch to Arc Testnet (Chain ID: 5042002)
            </p>
          </div>
          <button
            onClick={switchToArcTestnet}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Switch to Arc Testnet
          </button>
        </div>
      )}

      {!pairSupported && account && isCorrectNetwork && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm text-orange-800">
            This token pair is not supported by the contract. Supported pairs: {getTokenByAddress(contractTokenA)?.symbol} ↔ {getTokenByAddress(contractTokenB)?.symbol}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-800">Swap executed successfully!</p>
        </div>
      )}

      {/* From Token */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-600">From</label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={!account}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 pr-32 text-2xl font-semibold text-slate-950 focus:outline-none focus:ring-2 focus:ring-arc-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <TokenSelector
              selectedToken={fromToken}
              onSelectToken={setFromToken}
              excludeToken={toToken}
              disabled={!account}
            />
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Balance: {parseFloat(fromBalance).toFixed(4)} {fromToken.symbol}
        </div>
      </div>

      {/* Swap Direction Button */}
      <div className="flex justify-center -my-2">
        <button
          onClick={handleTokenSwap}
          disabled={!account}
          className="p-3 bg-arc-50 hover:bg-arc-100 rounded-xl border-4 border-white shadow-md hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5 text-arc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* To Token */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-600">To (estimated)</label>
        <div className="relative">
          <input
            type="text"
            value={amountOut || '0.00'}
            readOnly
            placeholder="0.00"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 pr-32 text-2xl font-semibold text-slate-950 focus:outline-none"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <TokenSelector
              selectedToken={toToken}
              onSelectToken={setToToken}
              excludeToken={fromToken}
              disabled={!account}
            />
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Balance: {parseFloat(toBalance).toFixed(4)} {toToken.symbol}
        </div>
      </div>

      {/* Rate Info */}
      {rate > 0 && pairSupported && (
        <div className="bg-arc-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Exchange Rate</span>
            <span className="font-semibold text-slate-950">
              1 {fromToken.symbol} = {rate.toFixed(6)} {toToken.symbol}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Fee</span>
            <span className="font-semibold text-fx-600">{parseFloat(fee).toFixed(4)} {toToken.symbol}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Slippage Tolerance</span>
            <span className="font-semibold text-neon-aqua">0.5%</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {needsApproval && account && pairSupported ? (
        <button
          onClick={handleApprove}
          disabled={isApproving}
          className="w-full bg-gradient-fx text-white font-semibold py-4 rounded-xl shadow-md hover:shadow-glow-green disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02]"
        >
          {isApproving ? 'Approving...' : `Approve ${fromToken.symbol}`}
        </button>
      ) : (
        <button
          onClick={handleSwap}
          disabled={!account || !amount || parseFloat(amount) <= 0 || isLoading || needsApproval || !pairSupported}
          className="w-full bg-gradient-arc text-white font-semibold py-4 rounded-xl shadow-md hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02]"
        >
          {!account ? 'Connect Wallet' : !pairSupported ? 'Pair Not Supported' : isLoading ? 'Processing...' : 'Execute Swap'}
        </button>
      )}
    </div>
  )
}
