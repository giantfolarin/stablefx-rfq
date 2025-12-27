/**
 * Verify Platform Quote Signature
 *
 * This script verifies that the platform quote has a valid EIP-712 signature
 * by recovering the signer address and comparing it to the maker address.
 */

const { verifyTypedData } = require('ethers');

const API_URL = 'http://localhost:3001/api';
const ARC_CHAIN_ID = 5042002;
const SWAP_CONTRACT_ADDRESS = '0x732CDC0e4Ddae3176631c4511D8efbdCfaDF0981';

const domain = {
  name: 'ArcStableFX',
  version: '2',
  chainId: ARC_CHAIN_ID,
  verifyingContract: SWAP_CONTRACT_ADDRESS
};

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
};

async function verifyQuoteSignature() {
  console.log('\n' + '='.repeat(60));
  console.log('VERIFYING PLATFORM QUOTE SIGNATURE');
  console.log('='.repeat(60) + '\n');

  // Fetch platform quote
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
  console.log('  Signature:', platformQuote.signature.slice(0, 20) + '...');
  console.log('');

  // Prepare RFQ for signature verification
  console.log('Step 2: Preparing RFQ value for signature verification...');
  const rfqValue = {
    maker: platformQuote.rfq.maker,
    taker: platformQuote.rfq.taker,
    tokenIn: platformQuote.rfq.tokenIn,
    tokenOut: platformQuote.rfq.tokenOut,
    amountIn: BigInt(platformQuote.rfq.amountIn),
    amountOut: BigInt(platformQuote.rfq.amountOut),
    nonce: BigInt(platformQuote.rfq.nonce),
    expiry: BigInt(platformQuote.rfq.expiry)
  };
  console.log('  RFQ value prepared');
  console.log('');

  // Recover signer address from signature
  console.log('Step 3: Recovering signer address from EIP-712 signature...');
  console.log('  Domain:');
  console.log('    name:', domain.name);
  console.log('    version:', domain.version);
  console.log('    chainId:', domain.chainId);
  console.log('    verifyingContract:', domain.verifyingContract);
  console.log('');

  try {
    const recoveredAddress = verifyTypedData(
      domain,
      types,
      rfqValue,
      platformQuote.signature
    );
    console.log('  Recovered signer:', recoveredAddress);
    console.log('  Expected maker:', platformQuote.rfq.maker);
    console.log('');

    if (recoveredAddress.toLowerCase() === platformQuote.rfq.maker.toLowerCase()) {
      console.log('='.repeat(60));
      console.log('SIGNATURE VERIFICATION PASSED');
      console.log('Quote has a valid EIP-712 signature from the maker');
      console.log('='.repeat(60));
      console.log('');
      return true;
    } else {
      console.error('='.repeat(60));
      console.error('SIGNATURE VERIFICATION FAILED');
      console.error('Recovered address does not match maker address');
      console.error('='.repeat(60));
      console.error('');
      throw new Error('Signature mismatch');
    }
  } catch (error) {
    console.error('  Failed to recover signer:', error.message);
    console.log('');
    throw error;
  }
}

verifyQuoteSignature()
  .then(() => {
    console.log('Verification completed successfully');
    console.log('The quote is properly signed and will be accepted by the contract');
    console.log('');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nVerification failed:', error.message);
    process.exit(1);
  });
