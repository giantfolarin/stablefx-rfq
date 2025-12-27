@echo off
REM System Maker Setup Script
REM This script helps configure the automated RFQ generator

echo ============================================================
echo SYSTEM MAKER SETUP
echo ============================================================
echo.
echo This script will help you set up the automated RFQ generator
echo that ensures Taker View is never empty.
echo.

REM Step 1: Generate Wallet
echo Step 1: Generate System Maker Wallet
echo ----------------------------------------
echo.
echo Generating new wallet...
node -e "const {Wallet} = require('ethers'); const w = Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey);" > system-maker-wallet.txt
type system-maker-wallet.txt
echo.
echo Wallet saved to: system-maker-wallet.txt
echo.
echo ⚠️  SECURITY WARNING:
echo - Keep this private key secure
echo - Never commit to git
echo - Use separate wallet (not personal funds)
echo.
pause

REM Step 2: Update Environment Variables
echo.
echo Step 2: Update Environment Variables
echo ----------------------------------------
echo.
echo Please manually add these to your .env files:
echo.
echo Backend (backend/.env):
echo   SYSTEM_MAKER_PRIVATE_KEY=^(copy from system-maker-wallet.txt^)
echo   API_BASE_URL=http://localhost:3001/api
echo.
for /f "tokens=2" %%a in ('findstr "Address:" system-maker-wallet.txt') do (
    echo Frontend (frontend/.env.local):
    echo   NEXT_PUBLIC_SYSTEM_MAKER_ADDRESS=%%a
)
echo.
pause

REM Step 3: Install Dependencies
echo.
echo Step 3: Install Dependencies
echo ----------------------------------------
echo.
cd backend
echo Installing backend dependencies (ethers, concurrently)...
call npm install ethers@^6.13.0 concurrently@^8.2.2
echo.
echo ✅ Dependencies installed
echo.
cd ..

REM Step 4: Instructions
echo.
echo ============================================================
echo SETUP COMPLETE
echo ============================================================
echo.
echo Next Steps:
echo.
echo 1. Add environment variables to .env files (see above)
echo.
echo 2. Fund system maker wallet:
echo    - Get testnet USDC and EURC from Arc faucet
echo    - Approve tokens for RFQ contract
echo.
echo 3. Start system maker:
echo    cd backend
echo    npm run start:all
echo.
echo 4. Verify in frontend:
echo    - Open http://localhost:3000/rfq
echo    - Switch to Taker View
echo    - Should see quote with "PLATFORM" maker
echo.
echo 📖 Full guide: SYSTEM_MAKER_DEPLOYMENT.md
echo.
pause
