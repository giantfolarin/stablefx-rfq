# Next Steps - Get Quotes Displaying on Live App

Your backend is now successfully deployed to Railway! 🎉

Follow these 3 steps to complete the deployment:

---

## Step 1: Update Vercel Environment Variable

1. Go to: https://vercel.com/
2. Open your `stablefx-demo` project
3. Go to **Settings** → **Environment Variables**
4. Find `NEXT_PUBLIC_API_URL`
5. Change its value from:
   ```
   http://localhost:3001/api
   ```
   to:
   ```
   https://stablefx-rfq-production.up.railway.app/api
   ```
6. Click **Save**

---

## Step 2: Redeploy Vercel Frontend

1. Go to **Deployments** tab in Vercel
2. Click the **"..."** menu on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (usually 1-2 minutes)

---

## Step 3: Start System Maker to Generate Quotes

Open a terminal in your project and run:

```bash
cd "c:\Users\simpl\Desktop\Stablecoin FX Micro-Exchange\stablefx-demo\backend"
npm run system-maker
```

This will:
- Connect to your Railway backend
- Automatically generate RFQ quotes every few seconds
- Push quotes to the backend API

**Keep this terminal running** while you want quotes to appear on the live site.

---

## Verify Everything Works

1. Open your Vercel app: https://rfqarc.vercel.app
2. You should now see quotes appearing in the "Available Quotes" section
3. The quotes are coming from the system maker through your Railway backend

---

## Troubleshooting

If quotes still don't appear:
1. Check browser console for errors (F12 → Console)
2. Verify the environment variable was saved correctly in Vercel
3. Make sure you redeployed after changing the environment variable
4. Ensure the system maker is running without errors
