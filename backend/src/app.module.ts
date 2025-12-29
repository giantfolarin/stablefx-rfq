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
    // PrismaModule, // Disabled for Railway - RFQ uses in-memory storage
    // SwapModule, // Requires database
    // PerpModule, // Requires database
    // TreasuryModule, // Requires database
    // OracleModule, // Requires database
    // AccountModule, // Requires database
    RfqModule, // Works without database (in-memory storage)
  ],
})
export class AppModule {}
