# 🚀 Deploy StableFX Demo to Localhost - Complete Guide

## One-Command Deployment (Easiest)

```bash
# Step 1: Generate all project files
node generate-project.js

# Step 2: Run setup (Windows)
setup.bat

# Step 2: Run setup (Mac/Linux)
chmod +x setup.sh
./setup.sh

# Step 3: Start with Docker
docker-compose up --build
```

**That's it!** Open http://localhost:3000

---

## Manual Deployment (Step-by-Step)

### Step 1: Generate Project Files

```bash
node generate-project.js
```

This creates:
- All backend files (controllers, services, modules)
- All frontend files (pages, components, API client)
- Docker configuration
- Setup scripts

### Step 2: Backend Setup

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

# This creates the SQLite database with tables and demo data

# Start backend
npm run dev
```

Backend runs on http://localhost:3001

**Test it:**
```bash
curl http://localhost:3001/api/treasury/balances
```

### Step 3: Frontend Setup

Open a **new terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start frontend
npm run dev
```

Frontend runs on http://localhost:3000

---

## What You Get

### Backend APIs (http://localhost:3001/api)

**Swap:**
- `POST /swap/quote` - Get RFQ quote
- `POST /swap/execute` - Execute swap
- `GET /swap/history` - Swap history

**Perpetuals:**
- `POST /perp/open` - Open position
- `POST /perp/close` - Close position
- `GET /perp/positions` - List positions

**Treasury:**
- `GET /treasury/balances` - Get balances
- `POST /treasury/rebalance` - Rebalance
- `POST /treasury/payout` - Execute payout
- `GET /treasury/payouts` - Payout history

**Oracle:**
- `GET /oracle/prices` - Current prices

### Frontend Pages (http://localhost:3000)

- **/** - Home page with overview
- **/swap** - Swap interface
- **/perp** - Perpetuals trading
- **/treasury** - Treasury dashboard
- **/payouts** - Cross-border payouts

---

## Testing the Demo

### 1. Test Swap

```bash
# Get quote
curl -X POST http://localhost:3001/api/swap/quote \
  -H "Content-Type: application/json" \
  -d '{
    "fromCurrency": "USDC_arc",
    "toCurrency": "EURC_arc",
    "amount": 1000
  }'

# Execute swap
curl -X POST http://localhost:3001/api/swap/execute \
  -H "Content-Type: application/json" \
  -d '{
    "fromCurrency": "USDC_arc",
    "toCurrency": "EURC_arc",
    "amount": 1000
  }'
```

### 2. Test Perpetual

```bash
# Open long position
curl -X POST http://localhost:3001/api/perp/open \
  -H "Content-Type: application/json" \
  -d '{
    "pair": "USDC/EURC",
    "size": 10000,
    "leverage": 2,
    "side": "long"
  }'

# Get positions
curl http://localhost:3001/api/perp/positions
```

### 3. Test Treasury

```bash
# Get balances
curl http://localhost:3001/api/treasury/balances

# Rebalance (40% USDC_arc, 30% EURC_arc, 30% USDC_base)
curl -X POST http://localhost:3001/api/treasury/rebalance \
  -H "Content-Type: application/json" \
  -d '{
    "targetAllocations": {
      "USDC_arc": 40,
      "EURC_arc": 30,
      "USDC_base": 30
    }
  }'
```

### 4. Test Payout

```bash
# Execute cross-border payout
curl -X POST http://localhost:3001/api/treasury/payout \
  -H "Content-Type: application/json" \
  -d '{
    "fromRegion": "US",
    "toRegion": "EU",
    "currency": "USDC_arc",
    "amount": 5000
  }'
```

---

## Troubleshooting

### Backend won't start

```bash
# Delete database and recreate
cd backend
rm prisma/dev.db
npx prisma migrate dev --name init
npm run dev
```

### Frontend can't connect to API

Check `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Make sure backend is running on port 3001.

### Port already in use

**Backend (change port 3001):**
Edit `backend/.env`:
```
PORT=3002
```

**Frontend (change port 3000):**
```bash
cd frontend
PORT=3001 npm run dev
```

### Docker issues

```bash
# Clean restart
docker-compose down -v
docker-compose up --build
```

---

## Understanding the Demo

### What's Mocked

✅ **Price Oracle** - Simulated with small fluctuations
✅ **Liquidity** - Unlimited, instant execution
✅ **RFQ** - Instant quotes, no real LPs
✅ **Settlement** - Database updates, not blockchain
✅ **CCTP** - Simulated burn/mint flows

### What's Real

✅ **Database** - SQLite with Prisma ORM
✅ **REST APIs** - Full NestJS backend
✅ **Price calculations** - Based on Arc/StableFX concepts
✅ **PnL calculations** - Real math for perpetuals
✅ **Balance management** - Proper transaction handling

### Arc/StableFX Concepts Implemented

✅ **RFQ Model** - Quote → Execute flow
✅ **Sub-second Settlement** - Simulated Arc finality
✅ **Multi-currency** - USDC/EURC pairs
✅ **Cross-chain** - Multiple chain support
✅ **Treasury Tools** - Balance tracking & rebalancing
✅ **Perpetuals** - Synthetic exposure to stablecoin pairs

---

## Next Steps

### Explore the UI

1. **Swap Page** - Execute USDC → EURC swap
2. **Perp Page** - Open a 2x leveraged position
3. **Treasury Page** - View multi-currency balances
4. **Payouts Page** - Simulate cross-border transfer

### Modify the Code

All source code is in:
- `backend/src/` - NestJS modules
- `frontend/app/` - Next.js pages
- `frontend/components/` - React components

### Adapt for Production

To connect to real Arc + StableFX:

1. Replace mock Oracle with Pyth/Chainlink
2. Integrate Circle StableFX API
3. Add Web3 provider for Arc blockchain
4. Implement real CCTP burn/mint
5. Add authentication (JWT, OAuth)
6. Use PostgreSQL instead of SQLite
7. Add KYC/compliance checks

---

## Architecture

```
Frontend (Next.js on :3000)
         ↓
     HTTP/REST
         ↓
Backend (NestJS on :3001)
         ↓
   ┌─────┴─────┐
   ↓           ↓
Database    Oracle
(SQLite)   (Mocked)
```

## Tech Stack

**Backend:**
- NestJS (Node.js framework)
- Prisma (ORM)
- SQLite (Database)
- TypeScript

**Frontend:**
- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- Axios (API client)

---

## Support

This is a localhost demo for learning purposes.

**Arc Docs:** https://docs.arc.network
**Circle StableFX:** https://developers.circle.com

---

**Enjoy exploring StableFX on Arc! 🚀**
