/**
 * Test Platform Quote Settlement End-to-End
 *
 * This script tests that a platform (system maker) quote can be settled successfully:
 * 1. Fetch platform quote from API
 * 2. Approve tokenIn (USDC) to swap contract
 * 3. Call settleRFQ()
 * 4. Verify settlement succeeded
 */

const { JsonRpcProvider, Contract, Wallet, parseUnits } = require('ethers');
require('dotenv').config();

const RPC_URL = 'https://rpc.testnet.arc.network';
const API_URL = 'http://localhost:3001/api';
const SWAP_CONTRACT_ADDRESS = '0x732CDC0e4Ddae3176631c4511D8efbdCfaDF0981';
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

const TAKER_PRIVATE_KEY = process.env.TAKER_PRIVATE_KEY || process.env.PRIVATE_KEY;

if (!TAKER_PRIVATE_KEY) {
  console.error('❌ TAKER_PRIVATE_KEY not set in .env');
  process.exit(1);
}

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
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "maker", "type": "address"},
      {"indexed": true, "name": "taker", "type": "address"},
      {"indexed": false, "name": "nonce", "type": "uint256"}
    ],
    "name": "RFQSettled",
    "type": "event"
  }
];

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
];

async function testPlatformSettlement() {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING PLATFORM QUOTE SETTLEMENT');
  console.log('='.repeat(60) + '\n');

  // Setup
  const provider = new JsonRpcProvider(RPC_URL);
  const takerWallet = new Wallet(TAKER_PRIVATE_KEY, provider);

  console.log('Taker wallet:', takerWallet.address);
  console.log('');

  // Step 1: Fetch platform quote
  console.log('STEP 1: Fetching platform quote from API...');
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
  console.log('  Pair: USDC -> EURC');
  console.log('  Amount:', platformQuote.rfq.amountIn, '->', platformQuote.rfq.amountOut);
  console.log('  Nonce:', platformQuote.rfq.nonce);
  console.log('  Expiry:', new Date(Number(platformQuote.rfq.expiry) * 1000).toISOString());
  console.log('');

  // Step 2: Check taker's USDC balance
  console.log('STEP 2: Checking taker USDC balance...');
  const usdcContract = new Contract(USDC_ADDRESS, ERC20_ABI, provider);
  const takerBalance = await usdcContract.balanceOf(takerWallet.address);
  console.log('  Taker USDC balance:', takerBalance.toString());

  const amountIn = BigInt(platformQuote.rfq.amountIn);
  if (takerBalance < amountIn) {
    throw new Error(`Insufficient USDC balance. Need: ${amountIn}, Have: ${takerBalance}`);
  }
  console.log('  Sufficient balance');
  console.log('');

  // Step 3: Approve USDC to swap contract
  console.log('STEP 3: Approving USDC to swap contract...');
  const usdcWithSigner = new Contract(USDC_ADDRESS, ERC20_ABI, takerWallet);

  const currentAllowance = await usdcContract.allowance(takerWallet.address, SWAP_CONTRACT_ADDRESS);
  console.log('  Current allowance:', currentAllowance.toString());

  if (currentAllowance < amountIn) {
    console.log('  Sending approval transaction...');
    const approveTx = await usdcWithSigner.approve(SWAP_CONTRACT_ADDRESS, amountIn);
    console.log('  Approval tx:', approveTx.hash);

    console.log('  Waiting for confirmation...');
    const approveReceipt = await approveTx.wait();
    console.log('  Approved in block:', approveReceipt.blockNumber);
  } else {
    console.log('  Sufficient allowance already exists');
  }
  console.log('');

  // Step 4: Prepare RFQ for settlement
  console.log('STEP 4: Preparing RFQ for settlement...');
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
  console.log('  RFQ prepared');
  console.log('');

  // Step 5: Estimate gas (this will reveal any revert errors)
  console.log('STEP 5: Estimating gas for settleRFQ...');
  const swapContract = new Contract(SWAP_CONTRACT_ADDRESS, SWAP_CONTRACT_ABI, takerWallet);

  try {
    const gasEstimate = await swapContract.settleRFQ.estimateGas(
      rfqForContract,
      platformQuote.signature
    );
    console.log('  Gas estimate:', gasEstimate.toString());
    console.log('');
  } catch (error) {
    console.error('  GAS ESTIMATION FAILED:');
    console.error('  ', error.message);
    console.log('');
    throw error;
  }

  // Step 6: Call settleRFQ
  console.log('STEP 6: Calling settleRFQ...');
  const settleTx = await swapContract.settleRFQ(
    rfqForContract,
    platformQuote.signature
  );
  console.log('  Settlement tx sent:', settleTx.hash);

  console.log('  Waiting for confirmation...');
  const settleReceipt = await settleTx.wait();
  console.log('  Confirmed in block:', settleReceipt.blockNumber);

  if (settleReceipt.status !== 1) {
    throw new Error('Settlement transaction reverted');
  }
  console.log('');

  // Step 7: Verify RFQSettled event
  console.log('STEP 7: Verifying RFQSettled event...');
  const settledEvents = settleReceipt.logs
    .filter(log => log.address.toLowerCase() === SWAP_CONTRACT_ADDRESS.toLowerCase())
    .map(log => {
      try {
        return swapContract.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .filter(event => event && event.name === 'RFQSettled');

  if (settledEvents.length === 0) {
    throw new Error('RFQSettled event not found in receipt');
  }

  const settledEvent = settledEvents[0];
  console.log('  Event found:');
  console.log('    Maker:', settledEvent.args.maker);
  console.log('    Taker:', settledEvent.args.taker);
  console.log('    Nonce:', settledEvent.args.nonce.toString());
  console.log('');

  console.log('='.repeat(60));
  console.log('PLATFORM QUOTE SETTLEMENT TEST PASSED');
  console.log('='.repeat(60));
  console.log('');
}

testPlatformSettlement()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nTest failed:', error.message);
    process.exit(1);
  });
