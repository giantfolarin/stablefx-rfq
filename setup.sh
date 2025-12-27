#!/bin/bash

echo "🚀 Setting up StableFX Demo..."

# Backend setup
echo "
📦 Setting up backend..."
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
cd ..

# Frontend setup
echo "
📦 Setting up frontend..."
cd frontend
cp .env.example .env.local
npm install
cd ..

echo "
✅ Setup complete!"
echo "
To start the application:"
echo "  Option 1 (Docker): docker-compose up"
echo "  Option 2 (Manual):"
echo "    Terminal 1: cd backend && npm run dev"
echo "    Terminal 2: cd frontend && npm run dev"
echo "
Then open http://localhost:3000"
