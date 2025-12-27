/**
 * Verify Platform Quote is Settleable
 *
 * This script verifies that the platform quote can be settled by:
 * 1. Fetching the platform quote from API
 * 2. Checking maker's token approval
 * 3. Simulating settlement via gas estimation (without actually settling)
 *
 * This proves the quote is valid and settleable without consuming it.
 */

const { JsonRpcProvider, Contract } = require('ethers');
require('dotenv').config();

const RPC_URL = 'https://rpc.testnet.arc.network';
const API_URL = 'http://localhost:3001/api';
const SWAP_CONTRACT_ADDRESS = '0x732CDC0e4Ddae3176631c4511D8efbdCfaDF0981';
const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';

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
        "internalType": "struct ArcStableFXRFQ.RFQ",
        "name": "rfq",
        "type": "tuple"
      },
      {"internalType": "bytes", "name": "signature", "type": "bytes"}
    ],
    "name": "settleRFQ",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const ERC20_ABI = [
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
];

async function verifyPlatformQuoteSettleable() {
  console.log('\n' + '='.repeat(60));
  console.log('VERIFYING PLATFORM QUOTE IS SETTLEABLE');
  console.log('='.repeat(60) + '\n');

  const provider = new JsonRpcProvider(RPC_URL);

  // Step 1: Fetch platform quote
  console.log('Step 1: Fetching platform quote from API...');
  const response = await fetch(`${API_URL}/rfq/quotes`);
  if (!response.ok) {
    throw new Error(`Failed to fetch quotes: ${response.status}`);
  }

  const quotes = await response.json();
  if (quotes.length === 0) {
    throw new Error('No quotes available');
  }

  const platformQuote = quotes[0];
  console.log('  Maker:', platformQuote.rfq.maker);
  console.log('  Nonce:', platformQuote.rfq.nonce);
  console.log('  Pair: USDC -> EURC');
  console.log('  Amount:', platformQuote.rfq.amountIn, '->', platformQuote.rfq.amountOut);
  const expiryDate = new Date(Number(platformQuote.rfq.expiry) * 1000);
  const now = new Date();
  const timeLeft = Math.floor((expiryDate - now) / 1000 / 60);
  console.log('  Expiry:', expiryDate.toISOString(), `(${timeLeft} min left)`);
  console.log('');

  // Step 2: Verify maker's EURC approval to swap contract
  console.log('Step 2: Checking maker EURC approval...');
  const eurcContract = new Contract(EURC_ADDRESS, ERC20_ABI, provider);
  const makerAllowance = await eurcContract.allowance(
    platformQuote.rfq.maker,
    SWAP_CONTRACT_ADDRESS
  );
  console.log('  Maker EURC allowance:', makerAllowance.toString());

  const amountOut = BigInt(platformQuote.rfq.amountOut);
  if (makerAllowance < amountOut) {
    console.error('  INSUFFICIENT ALLOWANCE!');
    throw new Error(`Maker has insufficient EURC approval. Need: ${amountOut}, Have: ${makerAllowance}`);
  }
  console.log('  Sufficient allowance for settlement');
  console.log('');

  // Step 3: Check maker's EURC balance
  console.log('Step 3: Checking maker EURC balance...');
  const makerBalance = await eurcContract.balanceOf(platformQuote.rfq.maker);
  console.log('  Maker EURC balance:', makerBalance.toString());

  if (makerBalance < amountOut) {
    console.error('  INSUFFICIENT BALANCE!');
    throw new Error(`Maker has insufficient EURC balance. Need: ${amountOut}, Have: ${makerBalance}`);
  }
  console.log('  Sufficient balance for settlement');
  console.log('');

  // Step 4: Prepare RFQ for verification
  console.log('Step 4: Preparing RFQ structure...');
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
  console.log('  RFQ structure prepared');
  console.log('');

  // Step 5: Verify quote signature and settlability
  console.log('Step 5: Verifying quote is settleable via gas estimation...');
  console.log('  (This simulates settlement without actually executing it)');

  const swapContract = new Contract(SWAP_CONTRACT_ADDRESS, SWAP_CONTRACT_ABI, provider);

  try {
    // Gas estimation will fail if:
    // - Signature is invalid
    // - Nonce mismatch
    // - Quote expired
    // - Insufficient maker approval
    // - Insufficient maker balance
    const gasEstimate = await swapContract.settleRFQ.estimateGas(
      rfqForContract,
      platformQuote.signature
    );
    console.log('  Gas estimate:', gasEstimate.toString());
    console.log('  QUOTE IS VALID AND SETTLEABLE');
    console.log('');
  } catch (error) {
    console.error('  GAS ESTIMATION FAILED - Quote cannot be settled:');
    console.error('  ', error.message);
    console.log('');
    throw error;
  }

  console.log('='.repeat(60));
  console.log('VERIFICATION PASSED');
  console.log('Platform quote is valid and can be settled by any taker');
  console.log('='.repeat(60));
  console.log('');
}

verifyPlatformQuoteSettleable()
  .then(() => {
    console.log('Verification completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nVerification failed:', error.message);
    process.exit(1);
  });
