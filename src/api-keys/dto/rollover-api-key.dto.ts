import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsUUID } from 'class-validator';

export class RolloverApiKeyDto {
  @ApiProperty({
    description: 'ID of the expired API key to rollover',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID('4', { message: 'expired_key_id must be a valid UUID' })
  @IsString()
  expired_key_id: string;

  @ApiProperty({
    description: 'New expiry duration (will be converted to datetime)',
    example: '1M',
    enum: ['1H', '1D', '1M', '1Y'],
  })
  @IsString()
  @IsEnum(['1H', '1D', '1M', '1Y'], {
    message:
      'Expiry must be one of: 1H (Hour), 1D (Day), 1M (Month), 1Y (Year)',
  })
  expiry: string;
}
