import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RfqDto {
  @IsString()
  @IsNotEmpty()
  maker: string;

  @IsString()
  @IsNotEmpty()
  taker: string;

  @IsString()
  @IsNotEmpty()
  tokenIn: string;

  @IsString()
  @IsNotEmpty()
  tokenOut: string;

  @IsString()
  @IsNotEmpty()
  amountIn: string;

  @IsString()
  @IsNotEmpty()
  amountOut: string;

  @IsString()
  @IsNotEmpty()
  nonce: string;

  @IsString()
  @IsNotEmpty()
  expiry: string;
}

export class CreateQuoteDto {
  @ValidateNested()
  @Type(() => RfqDto)
  @IsNotEmpty()
  rfq: RfqDto;

  @IsString()
  @IsNotEmpty()
  signature: string;
}
