import { Module } from '@nestjs/common';
import { OracleService } from './oracle.service';

@Module({
  providers: [OracleService],
  exports: [OracleService],
})
export class OracleModule {}
