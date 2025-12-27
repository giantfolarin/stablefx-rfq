// Arc Testnet Token Addresses (contract allowlist)
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'
export const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a'

// Deployed RFQ Contract on Arc L1 (V2 - Production)
export const SWAP_CONTRACT_ADDRESS = '0x732CDC0e4Ddae3176631c4511D8efbdCfaDF0981'

// StableFX & Utility Contracts
export const FX_ESCROW_ADDRESS = '0x1f91886C7028986aD885ffCee0e40b75C9cd5aC1'
export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3'

// Standard ERC-20 ABI (minimal interface)
export const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {"name": "_spender", "type": "address"},
      {"name": "_value", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {"name": "_owner", "type": "address"},
      {"name": "_spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"name": "", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  }
] as const

// ArcStableFXRFQ_V2 Contract ABI (Production)
export const SWAP_CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "address[]", "name": "tokens", "type": "address[]"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "ECDSAInvalidSignature",
    "type": "error"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "length", "type": "uint256"}],
    "name": "ECDSAInvalidSignatureLength",
    "type": "error"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "s", "type": "bytes32"}],
    "name": "ECDSAInvalidSignatureS",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidShortString",
    "type": "error"
  },
  {
    "inputs": [{"internalType": "string", "name": "str", "type": "string"}],
    "name": "StringTooLong",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "EIP712DomainChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "maker", "type": "address"},
      {"indexed": true, "internalType": "bytes32", "name": "rfqId", "type": "bytes32"}
    ],
    "name": "RFQCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "maker", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "taker", "type": "address"},
      {"indexed": false, "internalType": "address", "name": "tokenIn", "type": "address"},
      {"indexed": false, "internalType": "address", "name": "tokenOut", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amountIn", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "amountOut", "type": "uint256"},
      {"indexed": true, "internalType": "bytes32", "name": "rfqId", "type": "bytes32"}
    ],
    "name": "RFQSettled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "bytes32", "name": "rfqId", "type": "bytes32"},
      {"indexed": true, "internalType": "address", "name": "maker", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "taker", "type": "address"},
      {"indexed": false, "internalType": "address", "name": "tokenIn", "type": "address"},
      {"indexed": false, "internalType": "address", "name": "tokenOut", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amountIn", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "amountOut", "type": "uint256"}
    ],
    "name": "RFQSettlementIntent",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "RFQ_TYPEHASH",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "rfqId", "type": "bytes32"}],
    "name": "cancelRFQ",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "name": "cancelledRFQs",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
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
      }
    ],
    "name": "computeRFQId",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "pure",
    "type": "function"
  },
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
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "nonces",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
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
    "name": "supportedToken",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const
