import { Injectable } from '@nestjs/common';
import { CreateQuoteDto } from './dto/create-quote.dto';

export interface RFQQuote {
  rfq: {
    maker: string;
    taker: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOut: string;
    nonce: string;
    expiry: string;
  };
  signature: string;
}

@Injectable()
export class RfqService {
  private quotes: RFQQuote[] = [];

  getAllQuotes(): RFQQuote[] {
    // Filter out expired quotes
    const now = Math.floor(Date.now() / 1000);
    this.quotes = this.quotes.filter(
      (quote) => BigInt(quote.rfq.expiry) > BigInt(now),
    );
    return this.quotes;
  }

  createQuote(createQuoteDto: CreateQuoteDto): RFQQuote {
    // Check if quote already exists (by maker + nonce)
    const exists = this.quotes.some(
      (q) =>
        q.rfq.maker === createQuoteDto.rfq.maker &&
        q.rfq.nonce === createQuoteDto.rfq.nonce,
    );

    if (exists) {
      throw new Error('Quote with this maker and nonce already exists');
    }

    const quote: RFQQuote = {
      rfq: createQuoteDto.rfq,
      signature: createQuoteDto.signature,
    };

    this.quotes.push(quote);
    return quote;
  }

  deleteQuote(maker: string, nonce: string): boolean {
    const initialLength = this.quotes.length;
    this.quotes = this.quotes.filter(
      (q) => !(q.rfq.maker === maker && q.rfq.nonce === nonce),
    );
    return this.quotes.length < initialLength;
  }

  clearExpiredQuotes(): number {
    const now = Math.floor(Date.now() / 1000);
    const initialLength = this.quotes.length;
    this.quotes = this.quotes.filter(
      (quote) => BigInt(quote.rfq.expiry) > BigInt(now),
    );
    return initialLength - this.quotes.length;
  }
}
