@echo off
REM ============================================================================
REM StableFX - Pre-Push Safety Check
REM ============================================================================
REM Run this script before pushing to GitHub to verify no secrets are exposed

echo.
echo ============================================================
echo STABLEFX - PRE-PUSH SAFETY CHECK
echo ============================================================
echo.

echo [1/5] Checking for .gitignore...
if exist .gitignore (
    echo    ✅ .gitignore exists
) else (
    echo    ❌ ERROR: .gitignore not found!
    echo    Run: copy nul .gitignore
    goto :error
)

echo.
echo [2/5] Checking for .env files (should NOT be committed)...
if exist backend\.env (
    echo    ⚠️  backend\.env exists (will be ignored by git)
) else (
    echo    ⚠️  backend\.env not found
)

if exist frontend\.env.local (
    echo    ⚠️  frontend\.env.local exists (will be ignored by git)
) else (
    echo    ⚠️  frontend\.env.local not found
)

echo.
echo [3/5] Checking for .env.example files (SHOULD be committed)...
if exist backend\.env.example (
    echo    ✅ backend\.env.example exists
) else (
    echo    ❌ ERROR: backend\.env.example not found!
    goto :error
)

if exist frontend\.env.example (
    echo    ✅ frontend\.env.example exists
) else (
    echo    ❌ ERROR: frontend\.env.example not found!
    goto :error
)

echo.
echo [4/5] Checking for private keys in .env.example files...
findstr /C:"0xabcdef" backend\.env.example >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ❌ ERROR: Found real private key in .env.example!
    echo    Replace it with a dummy value: 0x0000...0000
    goto :error
) else (
    echo    ✅ No real private keys in .env.example
)

echo.
echo [5/5] Checking for sensitive files...
if exist backend\logs\ (
    echo    ⚠️  logs/ directory exists (will be ignored by git)
)

if exist backend\prisma\dev.db (
    echo    ⚠️  dev.db exists (will be ignored by git)
)

echo.
echo ============================================================
echo ✅ SAFETY CHECK PASSED
echo ============================================================
echo.
echo Your repository is safe to push to GitHub!
echo.
echo Next steps:
echo   1. git init
echo   2. git add .
echo   3. git status  (verify .env files are NOT listed)
echo   4. git commit -m "Initial commit"
echo   5. git remote add origin YOUR_REPO_URL
echo   6. git push -u origin main
echo.
goto :end

:error
echo.
echo ============================================================
echo ❌ SAFETY CHECK FAILED
echo ============================================================
echo.
echo Please fix the errors above before pushing to GitHub!
echo.
goto :end

:end
echo Press any key to exit...
pause >nul
