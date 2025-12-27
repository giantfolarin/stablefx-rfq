@echo off

echo Setting up StableFX Demo...

echo.
echo Setting up backend...
cd backend
copy .env.example .env
call npm install
call npx prisma generate
call npx prisma migrate dev --name init
cd ..

echo.
echo Setting up frontend...
cd frontend
copy .env.example .env.local
call npm install
cd ..

echo.
echo Setup complete!
echo.
echo To start the application:
echo   Option 1 (Docker): docker-compose up
echo   Option 2 (Manual):
echo     Terminal 1: cd backend ^&^& npm run dev
echo     Terminal 2: cd frontend ^&^& npm run dev
echo.
echo Then open http://localhost:3000
pause
