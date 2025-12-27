import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { SwapModule } from './swap/swap.module';
import { PerpModule } from './perp/perp.module';
import { TreasuryModule } from './treasury/treasury.module';
import { OracleModule } from './oracle/oracle.module';
import { AccountModule } from './account/account.module';
import { RfqModule } from './rfq/rfq.module';

@Module({
  imports: [
    PrismaModule,
    SwapModule,
    PerpModule,
    TreasuryModule,
    OracleModule,
    AccountModule,
    RfqModule,
  ],
})
export class AppModule {}
