/**
 * Verify EIP-712 Domain Configuration
 *
 * This script queries the contract's EIP-712 domain and compares it
 * to what systemMaker.ts is using for signing.
 */

const { JsonRpcProvider, Contract } = require('ethers');

const RPC_URL = 'https://rpc.testnet.arc.network';
const SWAP_CONTRACT_ADDRESS = '0x732CDC0e4Ddae3176631c4511D8efbdCfaDF0981';

const EIP712_DOMAIN_ABI = [
  {
    "inputs": [],
    "name": "eip712Domain",
    "outputs": [
      {"name": "fields", "type": "bytes1"},
      {"name": "name", "type": "string"},
      {"name": "version", "type": "string"},
      {"name": "chainId", "type": "uint256"},
      {"name": "verifyingContract", "type": "address"},
      {"name": "salt", "type": "bytes32"},
      {"name": "extensions", "type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DOMAIN_SEPARATOR",
    "outputs": [{"name": "", "type": "bytes32"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function verifyEIP712Domain() {
  console.log('\n' + '='.repeat(60));
  console.log('VERIFYING EIP-712 DOMAIN CONFIGURATION');
  console.log('='.repeat(60) + '\n');

  const provider = new JsonRpcProvider(RPC_URL);
  const contract = new Contract(SWAP_CONTRACT_ADDRESS, EIP712_DOMAIN_ABI, provider);

  console.log('Contract:', SWAP_CONTRACT_ADDRESS);
  console.log('');

  // Try to get DOMAIN_SEPARATOR
  try {
    console.log('Querying DOMAIN_SEPARATOR...');
    const domainSeparator = await contract.DOMAIN_SEPARATOR();
    console.log('  DOMAIN_SEPARATOR:', domainSeparator);
    console.log('');
  } catch (error) {
    console.log('  DOMAIN_SEPARATOR not available:', error.message);
    console.log('');
  }

  // Try to get eip712Domain
  try {
    console.log('Querying eip712Domain()...');
    const domain = await contract.eip712Domain();
    console.log('  Name:', domain.name);
    console.log('  Version:', domain.version);
    console.log('  ChainId:', domain.chainId.toString());
    console.log('  VerifyingContract:', domain.verifyingContract);
    console.log('');

    console.log('Expected configuration in systemMaker.ts:');
    console.log('  name: \'' + domain.name + '\'');
    console.log('  version: \'' + domain.version + '\'');
    console.log('  chainId: ' + domain.chainId.toString());
    console.log('  verifyingContract: \'' + domain.verifyingContract + '\'');
    console.log('');
  } catch (error) {
    console.log('  eip712Domain() not available:', error.message);
    console.log('');
    console.log('Contract may not implement EIP-5267 (eip712Domain)');
    console.log('You may need to check the contract source code for domain configuration');
  }
}

verifyEIP712Domain()
  .then(() => {
    console.log('Verification completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
