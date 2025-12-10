import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Min } from 'class-validator';

export class InitializeDepositDto {
  @ApiProperty({
    description: 'Amount to deposit in KOBO (1 Naira = 100 Kobo)',
    example: 5000,
    minimum: 100,
    type: Number,
  })
  @IsNumber()
  @IsPositive({ message: 'Amount must be a positive number' })
  @Min(100, { message: 'Minimum deposit is 100 KOBO (1 Naira)' })
  amount: number;
}
