const { JsonRpcProvider, Contract } = require('ethers');

const SWAP_CONTRACT_ADDRESS = '0x732CDC0e4Ddae3176631c4511D8efbdCfaDF0981';
const SYSTEM_MAKER_ADDRESS = '0xf42138298fa1Fc8514BC17D59eBB451AceF3cDBa';
const RPC_URL = 'https://rpc.testnet.arc.network';

const ABI = [
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "nonces",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function checkNonce() {
  const provider = new JsonRpcProvider(RPC_URL);
  const contract = new Contract(SWAP_CONTRACT_ADDRESS, ABI, provider);

  const onChainNonce = await contract.nonces(SYSTEM_MAKER_ADDRESS);
  const now = Math.floor(Date.now() / 1000);

  console.log('==========================================');
  console.log('NONCE COMPARISON');
  console.log('==========================================');
  console.log('System Maker:', SYSTEM_MAKER_ADDRESS);
  console.log('On-chain nonce:', onChainNonce.toString());
  console.log('Current timestamp:', now.toString());
  console.log('Difference:', (BigInt(now) - onChainNonce).toString(), 'seconds');
  console.log('==========================================');

  if (onChainNonce > BigInt(now)) {
    console.log('❌ CRITICAL BUG: On-chain nonce is GREATER than timestamp!');
    console.log('   This means timestamp-based nonces are ALWAYS stale!');
  } else {
    console.log('⚠️  Timestamp-based nonces are ahead of contract nonce');
    console.log('   But this can change after ANY settlement!');
  }
}

checkNonce().catch(console.error);
