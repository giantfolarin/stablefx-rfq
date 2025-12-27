# ⚡ Quick Start - 60 Second Deploy

## Prerequisites Installed? ✅
- [x] Node.js 18+
- [x] npm
- [x] Files generated

---

## 🚀 Deploy in 3 Steps

### Step 1: Initialize Database (30 seconds)

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

You'll see:
```
✔ Generated Prisma Client
✔ Database created
✔ Demo account initialized
```

---

### Step 2: Start Backend (Terminal 1)

```bash
cd backend
npm run dev
```

Wait for:
```
╔═══════════════════════════════════════════════╗
║   🏦 StableFX Demo Backend                   ║
║   Server running on: http://localhost:3001   ║
╚═══════════════════════════════════════════════╝
```

---

### Step 3: Start Frontend (Terminal 2)

**Open NEW terminal**, then:

```bash
cd frontend
npm run dev
```

Wait for:
```
- ready started server on 0.0.0.0:3000
```

---

## 🎉 Done!

**Open browser:** http://localhost:3000

---

## 🎯 Try This First

### Test 1: Swap USDC → EURC

1. Go to http://localhost:3000/swap
2. From: **USDC_arc**
3. To: **EURC_arc**
4. Amount: **1000**
5. Click **"Get Quote"**
6. Click **"Execute Swap"**
7. See your balance update!

### Test 2: View Balance

1. Go to http://localhost:3000/treasury
2. See all your balances
3. Note the percentages

### Test 3: Open Perpetual

1. Go to http://localhost:3000/perp
2. Pair: **USDC/EURC**
3. Size: **10000**
4. Leverage: **2x**
5. Side: **Long**
6. Click **"Open Position"**
7. Watch PnL update in real-time!

---

## 📊 Demo Account

**Email:** demo@stablefx.local

**Balances:** $100K in each currency
- USDC_arc
- EURC_arc
- USDC_base
- USDC_polygon
- USDC_ethereum

**Total:** $500K equivalent

---

## 🔌 API Quick Test

```bash
# Get balances
curl http://localhost:3001/api/treasury/balances

# Get quote
curl -X POST http://localhost:3001/api/swap/quote \
  -H "Content-Type: application/json" \
  -d '{"fromCurrency":"USDC_arc","toCurrency":"EURC_arc","amount":1000}'

# Execute swap
curl -X POST http://localhost:3001/api/swap/execute \
  -H "Content-Type: application/json" \
  -d '{"fromCurrency":"USDC_arc","toCurrency":"EURC_arc","amount":1000}'
```

---

## 🐛 Issues?

### Backend won't start?
```bash
cd backend
rm prisma/dev.db
npx prisma migrate dev --name init
npm run dev
```

### Frontend can't connect?
Check `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Port 3001 taken?
Edit `backend/.env`:
```
PORT=3002
```

---

## 📚 Full Documentation

- **README.md** - Complete features & API docs
- **SETUP.md** - Detailed setup guide
- **DEPLOY_LOCALHOST.md** - Deployment walkthrough

---

## 🎓 What You Built

✅ **Full-stack app** (NestJS + Next.js)
✅ **Swap engine** (RFQ-style quotes)
✅ **Perpetuals** (leverage trading)
✅ **Treasury tools** (multi-currency)
✅ **Cross-border payouts** (sub-second)
✅ **Price oracle** (live feeds)
✅ **REST API** (8 endpoints)
✅ **Database** (SQLite with Prisma)

---

## ⚡ Tech Stack

**Backend:**
- NestJS (Node.js framework)
- Prisma (ORM)
- SQLite (Database)
- TypeScript

**Frontend:**
- Next.js 14 (React framework)
- Tailwind CSS
- Axios (API client)

**Inspired by:**
- Arc L1 (Circle's blockchain)
- StableFX (Institutional FX engine)
- CCTP (Cross-Chain Transfer Protocol)

---

**Now go explore! 🚀**

http://localhost:3000
