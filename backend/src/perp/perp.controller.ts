import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { PerpService } from './perp.service';

class OpenPositionDto {
  pair: string;
  size: number;
  leverage: number;
  side: 'long' | 'short';
  accountId?: string;
}

class ClosePositionDto {
  positionId: string;
}

@Controller('perp')
export class PerpController {
  constructor(private perpService: PerpService) {}

  @Post('open')
  async openPosition(@Body() dto: OpenPositionDto) {
    return this.perpService.openPosition(
      dto.pair,
      dto.size,
      dto.leverage,
      dto.side,
      dto.accountId
    );
  }

  @Post('close')
  async closePosition(@Body() dto: ClosePositionDto) {
    return this.perpService.closePosition(dto.positionId);
  }

  @Get('positions')
  async getPositions(@Query('accountId') accountId?: string) {
    return this.perpService.getPositions(accountId);
  }

  @Get('positions/:id')
  async getPosition(@Param('id') id: string) {
    return this.perpService.getPosition(id);
  }
}
