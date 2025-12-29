# System Maker Railway Deployment Guide

This guide shows you how to deploy the System Maker as a separate Railway service so it runs 24/7 in the cloud.

## What is the System Maker?

The System Maker is an automated bot that:
- Generates RFQ quotes every 10 minutes
- Posts them to your backend API
- Ensures your platform ALWAYS has quotes available
- Currently running on your local machine (we'll move it to Railway)

---

## Step 1: Get Your System Maker Private Key

The system maker needs a wallet private key to sign RFQ quotes.

**Option A: Use your existing key** (if you have one in `.env`)
- Check `backend/.env` for `SYSTEM_MAKER_PRIVATE_KEY`
- If it's a placeholder like `0xabc...`, you need a real one

**Option B: Generate a new wallet**
1. Visit https://vanity-eth.tk/ or use MetaMask
2. Create a new wallet
3. Copy the private key (starts with `0x`)
4. **IMPORTANT**: Fund this wallet with Arc testnet tokens:
   - You need EURC tokens (the system maker sells EURC for USDC)
   - Get testnet tokens from Arc faucet

---

## Step 2: Create New Railway Service

1. Go to https://railway.app/
2. Open your existing `stablefx-rfq` project
3. Click **"+ New"** in the top right
4. Select **"GitHub Repo"**
5. Choose your `stablefx-rfq` repository
6. Railway will create a new service

---

## Step 3: Configure the System Maker Service

### 3.1 Set Custom Dockerfile

1. In the new service, click **Settings** tab
2. Scroll to **"Deploy"** section
3. Under **"Dockerfile Path"**, enter:
   ```
   backend/Dockerfile.systemmaker
   ```
4. Under **"Root Directory"**, enter:
   ```
   backend
   ```

### 3.2 Set Service Name (Optional but Recommended)

1. Still in Settings
2. Under **"Service Name"**, change to:
   ```
   system-maker
   ```

---

## Step 4: Add Environment Variables

1. Click **"Variables"** tab
2. Add these variables one by one:

```bash
SYSTEM_MAKER_PRIVATE_KEY=0xYOUR_ACTUAL_PRIVATE_KEY_HERE
API_BASE_URL=https://stablefx-rfq-production.up.railway.app/api
NODE_ENV=production
```

**CRITICAL**: Replace `0xYOUR_ACTUAL_PRIVATE_KEY_HERE` with your real private key from Step 1!

---

## Step 5: Deploy

1. Railway will automatically deploy after you add variables
2. OR click **"Deploy"** button manually

---

## Step 6: Verify It's Working

### Check Railway Logs

1. Go to your system-maker service in Railway
2. Click **"Deployments"** tab
3. Click on the latest deployment
4. Check **"Logs"** - you should see:

```
🤖 SYSTEM MAKER - AUTO RFQ GENERATOR
Maker Address: 0x...
RFQ Pair:      USDC → EURC
Amount:        0.2 USDC → 0.2 EURC
Expiry:        10 minutes
Auto-renew:    ✅ Enabled
API Endpoint: https://stablefx-rfq-production.up.railway.app/api

🔑 Checking token approvals...
✅ Sufficient allowance already exists
🔏 Generated System RFQ:
✅ Quote posted to API successfully
⏰ Next regeneration in 10 minutes
✅ System Maker is running
```

### Check Your Frontend

1. Go to https://rfqarc.vercel.app
2. You should see platform quotes appearing automatically
3. Quotes should refresh every 10 minutes

---

## Troubleshooting

### Issue: "SYSTEM_MAKER_PRIVATE_KEY not set"
**Solution**: Add the environment variable in Railway Variables tab

### Issue: "Failed to post quote to API: 502"
**Solution**: Make sure your backend service is running and API_BASE_URL is correct

### Issue: "Insufficient funds" or "transfer amount exceeds allowance"
**Solution**:
1. Your system maker wallet needs EURC tokens
2. Get testnet EURC from Arc faucet
3. The system maker will automatically approve tokens on first run

### Issue: Quotes not appearing on frontend
**Solution**:
1. Check system maker logs - is it posting successfully?
2. Check backend logs - is it receiving the quotes?
3. Verify API_BASE_URL points to your Railway backend

---

## Stop Local System Maker

Once Railway deployment is working:

1. On your local machine, press `Ctrl+C` to stop the system maker
2. You can now close your terminal
3. Everything is running in the cloud!

---

## Cost Estimate

- Railway Free Tier: $5/month of free usage
- System maker uses minimal resources (runs 24/7)
- Should stay within free tier limits

---

## Next Steps

Your entire StableFX platform is now fully cloud-hosted:
- ✅ Backend on Railway
- ✅ Frontend on Vercel
- ✅ System Maker on Railway

No more localhost dependencies!
