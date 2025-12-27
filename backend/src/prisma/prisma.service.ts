import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    console.log('✓ Database connected');

    // Initialize demo account if in demo mode
    if (process.env.DEMO_MODE === 'true') {
      await this.initializeDemoData();
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async initializeDemoData() {
    const demoAccount = await this.account.findUnique({
      where: { email: 'demo@stablefx.local' },
    });

    if (!demoAccount) {
      const account = await this.account.create({
        data: {
          name: 'Demo Account',
          email: 'demo@stablefx.local',
        },
      });

      const initialBalance = parseFloat(process.env.INITIAL_BALANCE || '100000');

      // Create initial balances for different currencies
      const currencies = [
        'USDC_arc',
        'EURC_arc',
        'USDC_base',
        'USDC_polygon',
        'USDC_ethereum',
      ];

      for (const currency of currencies) {
        await this.balance.create({
          data: {
            accountId: account.id,
            currency,
            amount: initialBalance,
          },
        });
      }

      console.log('✓ Demo account initialized with balances');
    }
  }
}
