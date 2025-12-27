import { IsString, IsNotEmpty } from 'class-validator';

export class CreateQuoteDto {
  @IsNotEmpty()
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

  @IsString()
  @IsNotEmpty()
  signature: string;
}
