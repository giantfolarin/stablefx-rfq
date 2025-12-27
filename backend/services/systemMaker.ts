/**
 * System Maker - Automated RFQ Generator
 *
 * Ensures Taker View is NEVER empty by maintaining at least one active platform RFQ.
 *
 * Flow:
 * 1. Generate EIP-712 signed RFQ (0.2 USDC → 0.2 EURC, 10min expiry)
 * 2. POST to quote store API
 * 3. Monitor for expiry or fills
 * 4. Auto-regenerate when needed
 */

import 'dotenv/config'
import { Wallet, parseUnits, TypedDataDomain, JsonRpcProvider, Contract } from 'ethers'

// ============================================================================
// CONFIGURATION
// ============================================================================

const SYSTEM_MAKER_PRIVATE_KEY = process.env.SYSTEM_MAKER_PRIVATE_KEY!
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api'
const ARC_CHAIN_ID = 5042002 // Arc Testnet
const SWAP_CONTRACT_ADDRESS = '0x732CDC0e4Ddae3176631c4511D8efbdCfaDF0981'
const ARC_RPC_URL = 'https://rpc.testnet.arc.network'

// Token addresses (Arc Testnet)
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'
const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a'

// RFQ Parameters (Fixed)
const AMOUNT_IN = parseUnits('0.2', 6)   // 0.2 USDC
const AMOUNT_OUT = parseUnits('0.2', 6)  // 0.2 EURC
const EXPIRY_SECONDS = 600 // 10 minutes
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

// ============================================================================
// EIP-712 SETUP
// ============================================================================

const domain: TypedDataDomain = {
  name: 'ArcStableFX',  // ✅ Must match contract's eip712Domain()
  version: '2',
  chainId: ARC_CHAIN_ID,
  verifyingContract: SWAP_CONTRACT_ADDRESS
}

const types = {
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

// Contract ABIs
const SWAP_CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "nonces",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
]

const ERC20_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
]

// ============================================================================
// SYSTEM MAKER INSTANCE
// ============================================================================

let systemWallet: Wallet
let provider: JsonRpcProvider
let swapContract: Contract
let currentQuoteNonce: bigint | null = null
let regenerationTimer: NodeJS.Timeout | null = null
let isRegenerating = false  // Prevent concurrent regenerations

try {
  if (!SYSTEM_MAKER_PRIVATE_KEY) {
    throw new Error('SYSTEM_MAKER_PRIVATE_KEY not set in environment variables')
  }
  provider = new JsonRpcProvider(ARC_RPC_URL)
  systemWallet = new Wallet(SYSTEM_MAKER_PRIVATE_KEY, provider)  // Connect wallet to provider
  swapContract = new Contract(SWAP_CONTRACT_ADDRESS, SWAP_CONTRACT_ABI, provider)
  console.log('✅ System Maker initialized:', systemWallet.address)
  console.log('✅ Connected to Arc Testnet RPC:', ARC_RPC_URL)
} catch (error) {
  console.error('❌ Failed to initialize System Maker:', error)
  process.exit(1)
}

// ============================================================================
// QUOTE GENERATION
// ============================================================================

async function generateSystemRFQ(): Promise<{ rfq: any; signature: string }> {
  // ============================================================================
  // 🔑 CRITICAL FIX: Read nonce from contract, NOT from timestamp
  // ============================================================================
  // The contract enforces: require(nonces[maker] == rfq.nonce)
  // We MUST read the current on-chain nonce to ensure it matches
  // ============================================================================

  let nonce: bigint
  try {
    nonce = await swapContract.nonces(systemWallet.address)
    console.log('✅ Read on-chain nonce for system maker:', nonce.toString())
  } catch (error) {
    console.error('❌ Failed to read on-chain nonce:', error)
    throw new Error('Cannot generate RFQ without valid nonce from contract')
  }

  const now = Math.floor(Date.now() / 1000)
  const expiry = BigInt(now + EXPIRY_SECONDS)

  const rfq = {
    maker: systemWallet.address,
    taker: ZERO_ADDRESS, // Public RFQ
    tokenIn: USDC_ADDRESS,
    tokenOut: EURC_ADDRESS,
    amountIn: AMOUNT_IN,
    amountOut: AMOUNT_OUT,
    nonce,  // ✅ Using contract nonce, not timestamp
    expiry
  }

  // Sign with EIP-712
  const signature = await systemWallet.signTypedData(domain, types, rfq)

  console.log('🔏 Generated System RFQ:', {
    maker: rfq.maker,
    pair: 'USDC → EURC',
    amountIn: '0.2 USDC',
    amountOut: '0.2 EURC',
    nonce: nonce.toString(),
    expiry: new Date(Number(expiry) * 1000).toISOString(),
    signature: signature.slice(0, 20) + '...'
  })

  return { rfq, signature }
}

// ============================================================================
// API INTERACTION
// ============================================================================

async function postQuoteToAPI(rfq: any, signature: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/rfq/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rfq: {
          maker: rfq.maker,
          taker: rfq.taker,
          tokenIn: rfq.tokenIn,
          tokenOut: rfq.tokenOut,
          amountIn: rfq.amountIn.toString(),
          amountOut: rfq.amountOut.toString(),
          nonce: rfq.nonce.toString(),
          expiry: rfq.expiry.toString()
        },
        signature
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Failed to post quote to API:', response.status, errorText)
      return false
    }

    console.log('✅ Quote posted to API successfully')
    return true
  } catch (error) {
    console.error('❌ Error posting quote to API:', error)
    return false
  }
}

async function removeSystemQuoteFromAPI(nonce: bigint): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/rfq/quotes/${systemWallet.address}/${nonce.toString()}`,
      { method: 'DELETE' }
    )

    if (!response.ok && response.status !== 204 && response.status !== 404) {
      console.error('❌ Failed to remove quote from API:', response.status)
      return false
    }

    console.log('🗑️  Removed old quote (nonce:', nonce.toString(), ')')
    return true
  } catch (error) {
    console.error('❌ Error removing quote from API:', error)
    return false
  }
}

async function checkSystemQuoteExists(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/rfq/quotes`)
    if (!response.ok) {
      console.log('⚠️  API returned error, assuming quote exists to avoid spurious regeneration')
      return true  // Assume quote exists on error to prevent unnecessary regenerations
    }

    const quotes = await response.json()
    const systemQuote = quotes.find((q: any) =>
      q.rfq.maker.toLowerCase() === systemWallet.address.toLowerCase()
    )

    return !!systemQuote
  } catch (error) {
    console.log('⚠️  Error checking quote existence, assuming quote exists:', error.message)
    return true  // Assume quote exists on error to prevent spurious regenerations
  }
}

// ============================================================================
// AUTO-REGENERATION LOGIC
// ============================================================================

async function regenerateSystemQuote() {
  // Prevent concurrent regenerations (race condition protection)
  if (isRegenerating) {
    console.log('⏭️  Skipping regeneration - already in progress')
    return
  }

  isRegenerating = true
  console.log('🔄 Regenerating system RFQ...')

  try {
    // Remove old quote if exists
    if (currentQuoteNonce !== null) {
      await removeSystemQuoteFromAPI(currentQuoteNonce)
    }

    // Generate new quote
    const { rfq, signature } = await generateSystemRFQ()

    // Post to API
    const success = await postQuoteToAPI(rfq, signature)

    if (success) {
      currentQuoteNonce = rfq.nonce

      // Schedule next regeneration (10 minutes from now)
      if (regenerationTimer) {
        clearTimeout(regenerationTimer)
      }

      regenerationTimer = setTimeout(() => {
        regenerateSystemQuote()
      }, EXPIRY_SECONDS * 1000)

      console.log(`⏰ Next regeneration in ${EXPIRY_SECONDS / 60} minutes`)
    } else {
      // Retry after 10 seconds if failed
      console.log('⚠️  Failed to post quote, retrying in 10 seconds...')
      setTimeout(regenerateSystemQuote, 10000)
    }
  } finally {
    isRegenerating = false
  }
}

// ============================================================================
// TOKEN APPROVAL (CRITICAL FOR SETTLEMENT)
// ============================================================================

/**
 * Approve tokenOut (EURC) to swap contract so quotes can be settled
 * This MUST be done before creating quotes, otherwise settlement will fail
 */
async function ensureTokenApproval(): Promise<void> {
  console.log('\n🔑 Checking token approvals...')

  const eurcContract = new Contract(EURC_ADDRESS, ERC20_ABI, systemWallet)

  try {
    // Check current allowance
    const currentAllowance = await eurcContract.allowance(systemWallet.address, SWAP_CONTRACT_ADDRESS)
    console.log('Current EURC allowance:', currentAllowance.toString())

    // Approve 1,000,000 EURC (more than enough for many quotes)
    const APPROVAL_AMOUNT = parseUnits('1000000', 6)  // 1M EURC

    if (currentAllowance < APPROVAL_AMOUNT) {
      console.log('⏳ Approving EURC to swap contract...')
      console.log('Amount:', APPROVAL_AMOUNT.toString(), '(1,000,000 EURC)')

      const approveTx = await eurcContract.approve(SWAP_CONTRACT_ADDRESS, APPROVAL_AMOUNT)
      console.log('Approval tx sent:', approveTx.hash)

      const receipt = await approveTx.wait()
      console.log('✅ Approval confirmed in block:', receipt.blockNumber)
      console.log('✅ System maker can now create quotes that can be settled!')
    } else {
      console.log('✅ Sufficient allowance already exists')
    }
  } catch (error) {
    console.error('❌ Failed to approve tokens:', error)
    throw new Error('Cannot create quotes without token approval')
  }
}

// ============================================================================
// MONITORING & RECOVERY
// ============================================================================

/**
 * Monitor quote store and regenerate if system quote is missing
 * (handles cases where quote was filled or manually removed)
 */
async function monitorAndRecover() {
  // Skip if already regenerating
  if (isRegenerating) {
    return
  }

  const exists = await checkSystemQuoteExists()

  if (!exists) {
    console.log('⚠️  System quote missing - regenerating immediately...')
    await regenerateSystemQuote()
  }
}

// ============================================================================
// STARTUP
// ============================================================================

export async function startSystemMaker() {
  console.log('\n' + '='.repeat(60))
  console.log('🤖 SYSTEM MAKER - AUTO RFQ GENERATOR')
  console.log('='.repeat(60))
  console.log('Maker Address:', systemWallet.address)
  console.log('RFQ Pair:      USDC → EURC')
  console.log('Amount:        0.2 USDC → 0.2 EURC')
  console.log('Expiry:        10 minutes')
  console.log('Auto-renew:    ✅ Enabled')
  console.log('API Endpoint:', API_BASE_URL)
  console.log('='.repeat(60) + '\n')

  // ============================================================================
  // 🔑 CRITICAL: Approve tokens BEFORE creating quotes
  // ============================================================================
  // Without this, settlement will fail with "transfer amount exceeds allowance"
  // ============================================================================
  try {
    await ensureTokenApproval()
  } catch (error) {
    console.error('❌ FATAL: Cannot start without token approval')
    process.exit(1)
  }

  // Wait 5 seconds after approval to let blockchain sync
  console.log('\n⏳ Waiting 5 seconds for blockchain sync...\n')
  await new Promise(resolve => setTimeout(resolve, 5000))

  // Generate initial quote
  await regenerateSystemQuote()

  // Start monitoring (check every 30 seconds if system quote exists)
  setInterval(monitorAndRecover, 30000)

  console.log('✅ System Maker is running')
  console.log('   - Taker View will NEVER be empty')
  console.log('   - Quote auto-regenerates every 10 minutes')
  console.log('   - Monitors for fills and recovers automatically\n')
}

// Start if running directly
if (require.main === module) {
  startSystemMaker().catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down System Maker...')
  if (regenerationTimer) {
    clearTimeout(regenerationTimer)
  }
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down System Maker...')
  if (regenerationTimer) {
    clearTimeout(regenerationTimer)
  }
  process.exit(0)
})
