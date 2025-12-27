# StableFX

Institutional-grade Request-for-Quote (RFQ) trading system for stablecoin FX, featuring EIP-712 signed quotes and atomic PVP settlement on Arc L1.

## Features

- **Institutional RFQ Trading** - Professional quote creation and execution
- **EIP-712 Offchain Quotes** - Gas-efficient quote generation with cryptographic signatures
- **Atomic Onchain Settlement** - Trustless PVP (Payment vs Payment) execution
- **Zero Slippage** - Price guaranteed in the quote, locked at signature time
- **Reference Liquidity Support** - System maker provides continuous market liquidity

## Stack

- **Frontend**: Next.js + Ethers.js
- **Backend**: Node.js + NestJS
- **Chain**: Circle Arc L1 (Testnet)
- **Gas**: USDC-native (sub-cent transaction costs)

## Status

⚠️ **Testnet** - Currently deployed on Arc Testnet for development and testing

## Architecture

### Two-Step Settlement Process

1. **Approve** - Taker authorizes token transfer
2. **Execute** - Atomic swap via `settleRFQ()` with signature verification

### Components

- **Taker View** - Browse and fill available quotes
- **Maker View** - Create and manage custom quotes
- **System Maker** - Automated quote generation for continuous liquidity
- **Quote Store** - Off-chain quote registry with API access

## Quick Start

### Prerequisites

- Node.js 18+
- MetaMask or compatible Web3 wallet
- Arc Testnet USDC/EURC (from faucet)

### Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/stablefx.git
cd stablefx

# Setup backend
cd backend
cp .env.example .env
# Edit .env and add SYSTEM_MAKER_PRIVATE_KEY
npm install
npx prisma generate
npm run start:dev

# Setup frontend (in new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### Environment Setup

**Backend** (`backend/.env`):
```env
SYSTEM_MAKER_PRIVATE_KEY=0x...  # Generate new wallet
ARC_RPC_URL=https://rpc.testnet.arc.network
API_BASE_URL=http://localhost:3001/api
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SYSTEM_MAKER_ADDRESS=0xf42138298fa1Fc8514BC17D59eBB451AceF3cDBa
```

### Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

## Smart Contracts

**Arc Testnet**:
- Swap Contract: `0x732CDC0e4Ddae3176631c4511D8efbdCfaDF0981`
- USDC: `0x3600000000000000000000000000000000000000`
- EURC: `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a`

## How It Works

### For Takers (Quote Consumers)

1. Connect wallet to Arc Testnet
2. Browse available quotes in Taker View
3. Click "Fill" on desired quote
4. Approve USDC spend (one-time per quote)
5. Execute settlement - receive EURC atomically

### For Makers (Quote Providers)

1. Switch to Maker View
2. Create quote with custom parameters:
   - Token pair (USDC/EURC)
   - Amount and price
   - Expiry time
3. Sign quote with EIP-712 (offchain)
4. Quote published to store, visible to takers

### System Maker (Automated)

- Runs continuously via PM2
- Maintains minimum 1 active quote
- Auto-regenerates every 10 minutes
- Ensures liquidity always available

## Security

### EIP-712 Typed Data

Quotes use structured data signing per EIP-712:
```solidity
struct RFQ {
    address maker;
    address taker;      // 0x0 for public quotes
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 amountOut;
    uint256 nonce;      // Replay protection
    uint256 expiry;     // Time-bound validity
}
```

### Contract Verification

Settlement contract enforces:
- ✅ Valid EIP-712 signature from maker
- ✅ Nonce matches maker's current counter
- ✅ Quote not expired
- ✅ Atomic token transfers (PVP)

## API Reference

### Quote Store API

**Get All Quotes**
```http
GET /api/rfq/quotes
```

**Create Quote**
```http
POST /api/rfq/quotes
Content-Type: application/json

{
  "rfq": {
    "maker": "0x...",
    "taker": "0x0000000000000000000000000000000000000000",
    "tokenIn": "0x...",
    "tokenOut": "0x...",
    "amountIn": "200000",
    "amountOut": "200000",
    "nonce": "0",
    "expiry": "1735340000"
  },
  "signature": "0x..."
}
```

**Delete Quote**
```http
DELETE /api/rfq/quotes/:maker/:nonce
```

## Development

### Project Structure

```
stablefx/
├── backend/              # NestJS API server
│   ├── src/
│   │   ├── rfq/         # Quote store module
│   │   └── main.ts
│   ├── services/
│   │   └── systemMaker.ts   # Automated liquidity
│   └── prisma/          # Database schema
│
├── frontend/            # Next.js application
│   ├── app/            # Pages
│   ├── components/     # React components
│   ├── contexts/       # Wallet & quote contexts
│   └── hooks/          # RFQ settlement logic
│
└── docs/               # Documentation
```

### Running System Maker

```bash
cd backend
npm run system-maker

# Or with PM2
pm2 start ecosystem.config.js
pm2 logs system-maker
```

## Network Details

**Arc Testnet**:
- Chain ID: `5042002` (0x4CEF52)
- RPC: `https://rpc.testnet.arc.network`
- Native Gas: USDC (18 decimals)
- Finality: Sub-second
- Block Explorer: Coming soon

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License

## Support

- Issues: https://github.com/giantfolarin/stablefx-rfq/issues
- Documentation: See `/docs` folder
- Arc Network: https://www.arc.network/

## Acknowledgments

- Built on Circle's Arc L1 blockchain
- EIP-712 standard for typed data signing
- Inspired by institutional FX trading workflows

---

⚠️ **Testnet Only**
