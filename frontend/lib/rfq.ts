'use client'

import { BrowserProvider, keccak256, AbiCoder } from 'ethers'

// RFQ Types matching the Solidity contract
export interface RFQ {
  maker: string
  taker: string
  tokenIn: string
  tokenOut: string
  amountIn: bigint
  amountOut: bigint
  nonce: bigint
  expiry: bigint
}

export interface RFQQuote {
  rfq: RFQ
  signature: string
  metadata: {
    createdAt: number
    pair: string
    rate: string
    expiresIn: number
  }
}

// EIP-712 Domain for Arc Testnet (V2)
// CRITICAL: Must match contract's eip712Domain() exactly
export const RFQ_EIP712_DOMAIN = {
  name: 'ArcStableFX',  // ⚠️ VERIFY: Call contract.eip712Domain() to confirm
  version: '2',          // ✅ UPDATED: V2 uses version "2"
  chainId: 5042002,      // ✅ Arc Testnet
  verifyingContract: '0x732CDC0e4Ddae3176631c4511D8efbdCfaDF0981' // ✅ V2 address (lowercase)
}

// EIP-712 Types for RFQ
export const RFQ_EIP712_TYPES = {
  RFQ: [
    { name: 'maker', type: 'address' },
    { name: 'taker', type: 'address' },
    { name: 'tokenIn', type: 'address' },
    { name: 'tokenOut', type: 'address' },
    { name: 'amountIn', type: 'uint256' },
    { name: 'amountOut', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' }
  ]
}

// Sign an RFQ using EIP-712
export async function signRFQ(
  rfq: RFQ,
  provider: BrowserProvider,
  contractAddress: string
): Promise<string> {
  const signer = await provider.getSigner()

  // CRITICAL: Domain must match contract's eip712Domain() EXACTLY
  // verifyingContract MUST be lowercase checksummed address
  const domain = {
    name: RFQ_EIP712_DOMAIN.name,
    version: RFQ_EIP712_DOMAIN.version,
    chainId: RFQ_EIP712_DOMAIN.chainId,
    verifyingContract: RFQ_EIP712_DOMAIN.verifyingContract.toLowerCase()
  }

  // Convert RFQ to plain object for signing
  const rfqValue = {
    maker: rfq.maker,
    taker: rfq.taker,
    tokenIn: rfq.tokenIn,
    tokenOut: rfq.tokenOut,
    amountIn: rfq.amountIn.toString(),
    amountOut: rfq.amountOut.toString(),
    nonce: rfq.nonce.toString(),
    expiry: rfq.expiry.toString()
  }

  const signature = await signer.signTypedData(
    domain,
    RFQ_EIP712_TYPES,
    rfqValue
  )

  return signature
}

// Helper to calculate rate from amounts
export function calculateRate(
  amountIn: bigint,
  amountOut: bigint,
  decimalsIn: number = 6,
  decimalsOut: number = 6
): string {
  // Rate = amountOut / amountIn
  const rate = Number(amountOut) / Number(amountIn)
  return rate.toFixed(6)
}

// Helper to calculate amountOut from rate
export function calculateAmountOut(
  amountIn: bigint,
  rate: string,
  decimalsIn: number = 6,
  decimalsOut: number = 6
): bigint {
  const rateNum = parseFloat(rate)
  const amountOut = Number(amountIn) * rateNum
  return BigInt(Math.floor(amountOut))
}

// Check if RFQ is expired
export function isRFQExpired(rfq: RFQ): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000))
  return now > rfq.expiry
}

// Get time until expiry in seconds
export function getTimeUntilExpiry(rfq: RFQ): number {
  const now = Math.floor(Date.now() / 1000)
  const expiry = Number(rfq.expiry)
  return Math.max(0, expiry - now)
}

// Format RFQ for display
export function formatRFQPair(tokenInSymbol: string, tokenOutSymbol: string): string {
  return `${tokenInSymbol}/${tokenOutSymbol}`
}

// ANY_TAKER address (0x0...0)
export const ANY_TAKER = '0x0000000000000000000000000000000000000000'

// Check if RFQ is for specific taker
// Returns false for public RFQs (taker = zero address or empty string)
// Returns true for private RFQs (taker = specific address)
export function isSpecificTaker(rfq: RFQ): boolean {
  // Public RFQ if taker is zero address OR empty string (defensive check)
  if (!rfq.taker || rfq.taker === '' || rfq.taker === ANY_TAKER) {
    return false
  }
  return true
}

/**
 * Compute RFQ ID exactly as the contract does
 * rfqId = keccak256(abi.encode(RFQ_TYPEHASH, maker, taker, tokenIn, tokenOut, amountIn, amountOut, nonce, expiry))
 */
export function computeRFQId(rfq: RFQ): string {
  // RFQ_TYPEHASH from contract
  const RFQ_TYPEHASH = keccak256(
    Buffer.from('RFQ(address maker,address taker,address tokenIn,address tokenOut,uint256 amountIn,uint256 amountOut,uint256 nonce,uint256 expiry)')
  )

  // Encode all parameters using AbiCoder
  const abiCoder = AbiCoder.defaultAbiCoder()
  const encoded = abiCoder.encode(
    ['bytes32', 'address', 'address', 'address', 'address', 'uint256', 'uint256', 'uint256', 'uint256'],
    [
      RFQ_TYPEHASH,
      rfq.maker,
      rfq.taker,
      rfq.tokenIn,
      rfq.tokenOut,
      rfq.amountIn,
      rfq.amountOut,
      rfq.nonce,
      rfq.expiry
    ]
  )

  // Hash the encoded data
  return keccak256(encoded)
}
