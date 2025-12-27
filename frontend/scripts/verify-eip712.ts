// Verify EIP-712 domain configuration from deployed V2 contract
// Run: npx tsx scripts/verify-eip712.ts

import { JsonRpcProvider, Contract, keccak256, toUtf8Bytes } from 'ethers';

const RPC_URL = 'https://rpc.arc.dev'; // Arc Testnet
const CONTRACT_ADDRESS = '0x732CDC0e4Ddae3176631c4511D8efbdCfaDF0981';

const ABI = [
  {
    "inputs": [],
    "name": "eip712Domain",
    "outputs": [
      {"internalType": "bytes1", "name": "fields", "type": "bytes1"},
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "string", "name": "version", "type": "string"},
      {"internalType": "uint256", "name": "chainId", "type": "uint256"},
      {"internalType": "address", "name": "verifyingContract", "type": "address"},
      {"internalType": "bytes32", "name": "salt", "type": "bytes32"},
      {"internalType": "uint256[]", "name": "extensions", "type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "RFQ_TYPEHASH",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function verify() {
  const provider = new JsonRpcProvider(RPC_URL);
  const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);

  console.log('🔍 Querying ArcStableFXRFQ_V2 at', CONTRACT_ADDRESS);
  console.log('');

  try {
    // Get EIP-712 domain from contract
    const domain = await contract.eip712Domain();

    console.log('📋 CONTRACT EIP-712 DOMAIN (Source of Truth):');
    console.log('  name:             ', domain.name);
    console.log('  version:          ', domain.version);
    console.log('  chainId:          ', domain.chainId.toString());
    console.log('  verifyingContract:', domain.verifyingContract);
    console.log('');

    // Get RFQ_TYPEHASH from contract
    const contractTypehash = await contract.RFQ_TYPEHASH();
    console.log('📋 CONTRACT RFQ_TYPEHASH:');
    console.log('  ', contractTypehash);
    console.log('');

    // Compute expected typehash (must match contract)
    const typestring = 'RFQ(address maker,address taker,address tokenIn,address tokenOut,uint256 amountIn,uint256 amountOut,uint256 nonce,uint256 expiry)';
    const expectedTypehash = keccak256(toUtf8Bytes(typestring));

    console.log('🔍 FRONTEND COMPUTED TYPEHASH:');
    console.log('  ', expectedTypehash);
    console.log('');

    const typehashMatches = contractTypehash === expectedTypehash;
    console.log(typehashMatches ? '✅ Typehash MATCHES' : '❌ CRITICAL: Typehash MISMATCH');
    console.log('');

    // Print required frontend config
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 REQUIRED FRONTEND CONFIGURATION (lib/rfq.ts):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('export const RFQ_EIP712_DOMAIN = {');
    console.log(`  name: '${domain.name}',`);
    console.log(`  version: '${domain.version}',`);
    console.log(`  chainId: ${domain.chainId.toString()},`);
    console.log(`  verifyingContract: '${domain.verifyingContract.toLowerCase()}'`);
    console.log('};');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (err: any) {
    console.error('❌ Error querying contract:', err.message);
    console.error('');
    console.error('Possible issues:');
    console.error('  - RPC endpoint down');
    console.error('  - Contract not deployed at this address');
    console.error('  - Contract does not implement eip712Domain()');
  }
}

verify();
