# StableFX Demo - Complete Setup Guide

## Quick Start (5 minutes)

```bash
# 1. Navigate to project
cd stablefx-demo

# 2. Run the automated setup script
npm run setup:all

# 3. Start everything with Docker
docker-compose up

# 4. Open browser
http://localhost:3000
```

## Manual Setup (if you prefer step-by-step)

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker & Docker Compose (optional, but recommended)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Initialize database
npx prisma migrate dev --name init

# Seed demo data
npm run seed

# Start backend
npm run dev
```

Backend will run on **http://localhost:3001**

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start frontend
npm run dev
```

Frontend will run on **http://localhost:3000**

## Docker Setup (Recommended)

```bash
# From project root
docker-compose up --build
```

This starts:
- Backend API on port 3001
- Frontend on port 3000
- Database (SQLite, mounted as volume)

## Project Structure

```
stablefx-demo/
├── backend/                 # NestJS API
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── dev.db          # SQLite database
│   ├── src/
│   │   ├── swap/           # Swap APIs
│   │   ├── perp/           # Perpetuals
│   │   ├── treasury/       # Treasury tools
│   │   ├── oracle/         # Price oracle
│   │   ├── account/        # Account management
│   │   └── prisma/         # Database service
│   └── package.json
├── frontend/                # Next.js app
│   ├── app/                # App router pages
│   │   ├── swap/          # Swap UI
│   │   ├── perp/          # Perpetuals UI
│   │   ├── treasury/      # Treasury dashboard
│   │   └── payouts/       # Cross-border payouts
│   ├── components/         # Reusable components
│   └── lib/               # API client
├── docker-compose.yml
└── SETUP.md               # This file
```

## API Endpoints

### Swap APIs
- `POST /api/swap/quote` - Get RFQ quote
- `POST /api/swap/execute` - Execute swap
- `GET /api/swap/history` - Swap history

### Perpetuals
- `POST /api/perp/open` - Open position
- `POST /api/perp/close` - Close position
- `GET /api/perp/positions` - List positions

### Treasury
- `GET /api/treasury/balances` - Get balances
- `POST /api/treasury/rebalance` - Rebalance
- `POST /api/treasury/payout` - Cross-border payout

### Oracle
- `GET /api/oracle/prices` - Current prices

## Demo Account

**Email:** demo@stablefx.local
**Initial balances:** 100,000 in each currency
- USDC_arc
- EURC_arc
- USDC_base
- USDC_polygon
- USDC_ethereum

## Features Implemented

✅ **Swap Engine**
  - RFQ-style quotes with live pricing
  - Multi-currency swaps
  - Spread calculation
  - Transaction history

✅ **Perpetuals**
  - Open/close positions on USDC/EURC
  - Leverage support (1x-5x)
  - Real-time PnL calculation
  - Long/short positions

✅ **Treasury Tools**
  - Multi-currency balance tracking
  - Automated rebalancing
  - Cross-border payouts
  - Transaction logs

✅ **Price Oracle**
  - Live price feeds
  - Historical data
  - Simulated fluctuations

## Localhost vs Production

This demo runs entirely on localhost with:
- **Mocked liquidity** - Simulated order books
- **Mocked RFQ** - Instant quotes without real LPs
- **Simulated settlement** - Database updates instead of blockchain
- **Placeholder configs** - For Arc RPC, StableFX API keys

### To adapt for production:
1. Replace mock Oracle with real Pyth/Chainlink feeds
2. Integrate actual Circle StableFX API
3. Connect to Arc blockchain via Web3 provider
4. Implement real CCTP flows (burn/mint)
5. Add authentication & KYC
6. Use PostgreSQL instead of SQLite

## Troubleshooting

**Backend won't start:**
```bash
# Delete and recreate database
rm prisma/dev.db
npx prisma migrate dev --name init
```

**Ports already in use:**
```bash
# Change ports in .env files
# Backend: PORT=3002
# Frontend: Change next.config.js
```

**Docker issues:**
```bash
# Clean rebuild
docker-compose down -v
docker-compose up --build
```

## Next Steps

1. Explore the swap UI at `/swap`
2. Try opening a perpetual position at `/perp`
3. View treasury dashboard at `/treasury`
4. Execute a cross-border payout at `/payouts`

## Support

This is a localhost demo inspired by Arc + StableFX docs.
Not for production use.

For Arc documentation: https://docs.arc.network
For Circle StableFX: https://developers.circle.com
