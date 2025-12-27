import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { SwapService } from './swap.service';

class SwapQuoteDto {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
}

class SwapExecuteDto {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  accountId?: string;
}

@Controller('swap')
export class SwapController {
  constructor(private swapService: SwapService) {}

  @Post('quote')
  async getQuote(@Body() dto: SwapQuoteDto) {
    return this.swapService.getQuote(
      dto.fromCurrency,
      dto.toCurrency,
      dto.amount
    );
  }

  @Post('execute')
  async executeSwap(@Body() dto: SwapExecuteDto) {
    return this.swapService.executeSwap(
      dto.fromCurrency,
      dto.toCurrency,
      dto.amount,
      dto.accountId
    );
  }

  @Get('history')
  async getHistory(@Query('accountId') accountId?: string) {
    return this.swapService.getHistory(accountId);
  }
}
