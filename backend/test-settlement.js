/**
 * Test Script: Simulate Platform Quote Settlement
 *
 * This script will:
 * 1. Fetch the current platform quote
 * 2. Attempt to settle it with estimateGas
 * 3. Show the EXACT error that's blocking settlement
 */

const { JsonRpcProvider, Contract, Wallet } = require('ethers');

// Configuration
const RPC_URL = 'https://rpc.testnet.arc.network';
const API_URL = 'http://localhost:3001/api';
const SWAP_CONTRACT_ADDRESS = '0x732CDC0e4Ddae3176631c4511D8efbdCfaDF0981';

// Test taker wallet (NOT the system maker!)
const TEST_TAKER_PRIVATE_KEY = process.env.TEST_TAKER_PRIVATE_KEY ||
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Default test key

const SWAP_CONTRACT_ABI = [
  {
    "inputs": [
      {
        "components": [
          {"internalType": "address", "name": "maker", "type": "address"},
          {"internalType": "address", "name": "taker", "type": "address"},
          {"internalType": "address", "name": "tokenIn", "type": "address"},
          {"internalType": "address", "name": "tokenOut", "type": "address"},
          {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
          {"internalType": "uint256", "name": "amountOut", "type": "uint256"},
          {"internalType": "uint256", "name": "nonce", "type": "uint256"},
          {"internalType": "uint256", "name": "expiry", "type": "uint256"}
        ],
        "internalType": "struct ArcStableFXRFQ_V2.RFQ",
        "name": "rfq",
        "type": "tuple"
      },
      {"internalType": "bytes", "name": "signature", "type": "bytes"}
    ],
    "name": "settleRFQ",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "nonces",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function testSettlement() {
  console.log('='.repeat(80));
  console.log('PLATFORM QUOTE SETTLEMENT TEST');
  console.log('='.repeat(80));

  // Setup provider and wallet
  const provider = new JsonRpcProvider(RPC_URL);
  const takerWallet = new Wallet(TEST_TAKER_PRIVATE_KEY, provider);

  console.log('\n📋 Test Configuration:');
  console.log('Taker wallet:', takerWallet.address);
  console.log('Contract:', SWAP_CONTRACT_ADDRESS);
  console.log('RPC:', RPC_URL);

  // Fetch platform quote from API
  console.log('\n🔍 Fetching platform quote from API...');
  const response = await fetch(`${API_URL}/rfq/quotes`);
  const quotes = await response.json();

  // Get the first available quote (user-created)
  const platformQuote = quotes[0];

  if (!platformQuote) {
    console.error('❌ No quotes found in API');
    return;
  }

  console.log('\n✅ Found platform quote:');
  console.log('Maker:', platformQuote.rfq.maker);
  console.log('Taker:', platformQuote.rfq.taker);
  console.log('Nonce:', platformQuote.rfq.nonce);
  console.log('TokenIn:', platformQuote.rfq.tokenIn);
  console.log('TokenOut:', platformQuote.rfq.tokenOut);
  console.log('AmountIn:', platformQuote.rfq.amountIn);
  console.log('AmountOut:', platformQuote.rfq.amountOut);
  console.log('Expiry:', platformQuote.rfq.expiry);
  console.log('Signature:', platformQuote.signature);

  // Check maker's current nonce
  console.log('\n🔍 Checking maker\'s on-chain nonce...');
  const contract = new Contract(SWAP_CONTRACT_ADDRESS, SWAP_CONTRACT_ABI, provider);
  const currentNonce = await contract.nonces(platformQuote.rfq.maker);
  console.log('Quote nonce:', platformQuote.rfq.nonce);
  console.log('On-chain nonce:', currentNonce.toString());

  if (platformQuote.rfq.nonce !== currentNonce.toString()) {
    console.error('❌ NONCE MISMATCH!');
    console.error(`Quote expects nonce ${platformQuote.rfq.nonce}, but contract expects ${currentNonce.toString()}`);
    return;
  }

  console.log('✅ Nonce matches!');

  // Prepare RFQ struct for contract
  const rfqForContract = {
    maker: platformQuote.rfq.maker,
    taker: platformQuote.rfq.taker,
    tokenIn: platformQuote.rfq.tokenIn,
    tokenOut: platformQuote.rfq.tokenOut,
    amountIn: BigInt(platformQuote.rfq.amountIn),
    amountOut: BigInt(platformQuote.rfq.amountOut),
    nonce: BigInt(platformQuote.rfq.nonce),
    expiry: BigInt(platformQuote.rfq.expiry)
  };

  // Test settlement with estimateGas
  console.log('\n🔥 Testing settlement with estimateGas...');
  console.log('Signer:', takerWallet.address);

  const contractWithSigner = new Contract(SWAP_CONTRACT_ADDRESS, SWAP_CONTRACT_ABI, takerWallet);

  try {
    const gasEstimate = await contractWithSigner.settleRFQ.estimateGas(
      rfqForContract,
      platformQuote.signature
    );
    console.log('✅ Gas estimate successful:', gasEstimate.toString());
    console.log('✅ Settlement SHOULD work!');
  } catch (error) {
    console.error('\n❌ ❌ ❌ GAS ESTIMATION FAILED ❌ ❌ ❌');
    console.error('This is why settlement never happens!');
    console.error('\nError message:', error.message);
    console.error('\nFull error:', error);

    // Try to decode the revert reason
    if (error.data) {
      console.error('\nRevert data:', error.data);
    }

    if (error.reason) {
      console.error('\nRevert reason:', error.reason);
    }
  }

  console.log('\n' + '='.repeat(80));
}

testSettlement().catch(console.error);
