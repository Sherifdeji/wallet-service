import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsEnum, ArrayNotEmpty } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Name/label for the API key',
    example: 'wallet-service',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description:
      'Permissions for the API key (subset of: deposit, transfer, read)',
    example: ['deposit', 'transfer', 'read'],
    type: [String],
    enum: ['deposit', 'transfer', 'read'],
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'At least one permission must be specified' })
  @IsEnum(['deposit', 'transfer', 'read'], {
    each: true,
    message: 'Each permission must be one of: deposit, transfer, read',
  })
  permissions: string[];

  @ApiProperty({
    description: 'Expiry duration (will be converted to datetime)',
    example: '1D',
    enum: ['1H', '1D', '1M', '1Y'],
  })
  @IsString()
  @IsEnum(['1H', '1D', '1M', '1Y'], {
    message:
      'Expiry must be one of: 1H (Hour), 1D (Day), 1M (Month), 1Y (Year)',
  })
  expiry: string;
}
