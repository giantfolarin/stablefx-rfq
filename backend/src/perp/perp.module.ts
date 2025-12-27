import { Module } from '@nestjs/common';
import { PerpController } from './perp.controller';
import { PerpService } from './perp.service';
import { OracleModule } from '../oracle/oracle.module';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [OracleModule, AccountModule],
  controllers: [PerpController],
  providers: [PerpService],
})
export class PerpModule {}
