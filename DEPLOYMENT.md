# Deployment Guide

## Deploying to Vercel

The StableFX frontend is a Next.js application located in the `frontend` subdirectory. Follow these steps to deploy correctly:

### 1. Project Settings

In your Vercel project settings (https://vercel.com/[your-username]/[project-name]/settings):

**Build & Development Settings:**
- **Framework Preset:** Next.js
- **Root Directory:** `frontend` ← **IMPORTANT: Set this to `frontend`**
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install` (default)

### 2. Environment Variables

Add these environment variables in Vercel project settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-backend-url.com/api
NEXT_PUBLIC_SYSTEM_MAKER_ADDRESS=0xf42138298fa1Fc8514BC17D59eBB451AceF3cDBa
```

**Important Notes:**
- Replace `https://your-backend-url.com/api` with your actual backend API URL
- If you don't have a deployed backend yet, you can use `http://localhost:3001/api` for testing (but it won't work in production)
- The system maker address shown above is the current testnet address

### 3. Redeploy

After updating the settings:
1. Go to Deployments tab
2. Click the three dots (...) on the latest deployment
3. Select "Redeploy"
4. Or simply push a new commit to trigger a deployment

### 4. Verify Deployment

Once deployed, verify:
- Homepage loads correctly at your Vercel URL
- No 404 errors
- Wallet connection works
- Check browser console for any API connection errors

## Backend Deployment

The backend (`backend` directory) is a NestJS application that needs to be deployed separately. Consider:
- Railway.app
- Render.com
- Heroku
- DigitalOcean App Platform

Make sure to set the `SYSTEM_MAKER_PRIVATE_KEY` environment variable on your backend deployment.

## Troubleshooting

### 404 Error on Vercel

**Cause:** Root Directory not set to `frontend`

**Fix:**
1. Go to Project Settings → General → Build & Development Settings
2. Set Root Directory to `frontend`
3. Redeploy

### Environment Variables Not Working

**Cause:** Environment variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser

**Fix:** All client-side env vars in Next.js must start with `NEXT_PUBLIC_`

### API Connection Errors

**Cause:** Backend not deployed or NEXT_PUBLIC_API_URL not set correctly

**Fix:**
1. Deploy backend first
2. Update NEXT_PUBLIC_API_URL to point to deployed backend
3. Redeploy frontend
