import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RfqService } from './rfq.service';
import { CreateQuoteDto } from './dto/create-quote.dto';

@Controller('rfq')
export class RfqController {
  constructor(private readonly rfqService: RfqService) {}

  @Get('quotes')
  getAllQuotes() {
    return this.rfqService.getAllQuotes();
  }

  @Post('quotes')
  @HttpCode(HttpStatus.CREATED)
  createQuote(@Body() createQuoteDto: CreateQuoteDto) {
    return this.rfqService.createQuote(createQuoteDto);
  }

  @Delete('quotes/:maker/:nonce')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteQuote(@Param('maker') maker: string, @Param('nonce') nonce: string) {
    const deleted = this.rfqService.deleteQuote(maker, nonce);
    if (!deleted) {
      throw new Error('Quote not found');
    }
  }

  @Post('quotes/cleanup')
  @HttpCode(HttpStatus.OK)
  clearExpiredQuotes() {
    const count = this.rfqService.clearExpiredQuotes();
    return { cleared: count };
  }
}
