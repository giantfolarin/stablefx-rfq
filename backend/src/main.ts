import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://rfqarc.vercel.app',
      /\.vercel\.app$/  // Allow all Vercel preview deployments
    ],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,  // Don't strip unknown properties
      transform: true,
      forbidNonWhitelisted: false,
      disableErrorMessages: false,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  // Listen on 0.0.0.0 to accept external connections (required for Railway)
  await app.listen(port, '0.0.0.0');

  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   🏦 StableFX Demo Backend                               ║
  ║   Stablecoin FX Engine on Arc (Localhost)                ║
  ║                                                           ║
  ║   Server running on: http://localhost:${port}            ║
  ║   API Base: http://localhost:${port}/api                 ║
  ║                                                           ║
  ║   Demo Mode: ${process.env.DEMO_MODE === 'true' ? '✓ Enabled' : '✗ Disabled'}                              ║
  ║   Mock Liquidity: ${process.env.MOCK_LIQUIDITY === 'true' ? '✓ Enabled' : '✗ Disabled'}                         ║
  ║                                                           ║
  ║   Endpoints:                                              ║
  ║   - POST /api/swap/quote                                  ║
  ║   - POST /api/swap/execute                                ║
  ║   - POST /api/perp/open                                   ║
  ║   - POST /api/perp/close                                  ║
  ║   - GET  /api/perp/positions                              ║
  ║   - GET  /api/treasury/balances                           ║
  ║   - POST /api/treasury/rebalance                          ║
  ║   - POST /api/treasury/payout                             ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
