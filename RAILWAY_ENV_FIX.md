# Railway Backend Fix - Environment Variables

Your backend is deployed but returning 502 errors because it's missing environment variables.

## Fix: Add Environment Variables to Railway

1. Go to: https://railway.app/
2. Open your `stablefx-rfq` project
3. Click on the **backend service**
4. Go to the **Variables** tab
5. Add these environment variables one by one:

```bash
NODE_ENV=production
PORT=3001
DEMO_MODE=true
MOCK_LIQUIDITY=true
INITIAL_BALANCE=100000
DATABASE_URL=file:./prisma/dev.db
ARC_RPC_URL=https://testnet-rpc.arc.network
ARC_CHAIN_ID=10007
```

6. Click **Deploy** to restart with new variables

## Verify It's Working

After deployment completes:

1. Check Railway logs (should show the StableFX banner)
2. System maker should successfully post quotes (no more 502 errors)
3. Quotes should appear on your Vercel app

## Alternative: Quick Check Railway Logs

1. Go to your Railway backend service
2. Click on **Deployments** tab
3. Click on the latest deployment
4. Check the **Logs** - look for errors or the startup banner
