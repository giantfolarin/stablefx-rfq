import { Module } from '@nestjs/common';
import { SwapController } from './swap.controller';
import { SwapService } from './swap.service';
import { OracleModule } from '../oracle/oracle.module';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [OracleModule, AccountModule],
  controllers: [SwapController],
  providers: [SwapService],
  exports: [SwapService],
})
export class SwapModule {}
