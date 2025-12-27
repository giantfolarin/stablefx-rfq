import { Module } from '@nestjs/common';
import { TreasuryController } from './treasury.controller';
import { TreasuryService } from './treasury.service';
import { AccountModule } from '../account/account.module';
import { SwapModule } from '../swap/swap.module';

@Module({
  imports: [AccountModule, SwapModule],
  controllers: [TreasuryController],
  providers: [TreasuryService],
  exports: [TreasuryService],
})
export class TreasuryModule {}
