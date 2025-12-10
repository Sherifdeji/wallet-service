import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsPositive,
  Min,
  Length,
  Matches,
} from 'class-validator';

export class TransferDto {
  @ApiProperty({
    description: '10-digit wallet number of recipient (starts with 45)',
    example: '4512345678',
    minLength: 10,
    maxLength: 10,
    pattern: '^45[0-9]{8}$',
  })
  @IsString()
  @Length(10, 10, { message: 'Wallet number must be exactly 10 digits' })
  @Matches(/^45[0-9]{8}$/, {
    message: 'Invalid wallet number format (must start with 45)',
  })
  wallet_number: string;

  @ApiProperty({
    description: 'Amount to transfer in KOBO (1 Naira = 100 Kobo)',
    example: 3000,
    minimum: 100,
    type: Number,
  })
  @IsNumber()
  @IsPositive({ message: 'Amount must be a positive number' })
  @Min(100, { message: 'Minimum transfer is 100 KOBO (1 Naira)' })
  amount: number;
}
