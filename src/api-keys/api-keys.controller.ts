import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';

@ApiTags('API Keys')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new API key',
    description:
      'Creates a new API key with specified permissions. Maximum 5 active keys allowed per user. Expiry format (1H, 1D, 1M, 1Y) is converted to actual datetime.',
  })
  @ApiResponse({
    status: 201,
    description:
      'API key created successfully. This is the ONLY time the plain key is returned.',
    schema: {
      type: 'object',
      properties: {
        api_key: {
          type: 'string',
          example: 'sk_live_[new_64_random_characters_generated]',
          description: 'Plain API key (NEVER shown again)',
        },
        expires_at: {
          type: 'string',
          format: 'date-time',
          example: '2025-12-11T10:30:00.000Z',
          description: 'Datetime when key expires',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input, invalid permissions, or maximum 5 keys limit reached',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT required',
  })
  async createApiKey(@Req() req, @Body() createApiKeyDto: CreateApiKeyDto) {
    const userId = req.user.userId;
    return this.apiKeysService.createApiKey(
      userId,
      createApiKeyDto.name,
      createApiKeyDto.permissions,
      createApiKeyDto.expiry,
    );
  }

  @Post('rollover')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Rollover expired API key',
    description:
      'Creates a new API key with the same permissions as an expired key. The old key must be truly expired (not just revoked).',
  })
  @ApiResponse({
    status: 201,
    description: 'API key rolled over successfully',
    schema: {
      type: 'object',
      properties: {
        api_key: {
          type: 'string',
          example: 'sk_live_[new_64_random_characters_generated]',
          description: 'Plain API key (NEVER shown again)',
        },
        expires_at: {
          type: 'string',
          format: 'date-time',
          example: '2026-01-10T10:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Key is not expired, or maximum 5 keys limit reached',
  })
  @ApiResponse({
    status: 404,
    description: 'API key not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You do not own this API key',
  })
  async rolloverApiKey(
    @Req() req,
    @Body() rolloverApiKeyDto: RolloverApiKeyDto,
  ) {
    const userId = req.user.userId;
    return this.apiKeysService.rolloverApiKey(
      userId,
      rolloverApiKeyDto.expired_key_id,
      rolloverApiKeyDto.expiry,
    );
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all API keys',
    description:
      'Get all API keys for the authenticated user (plain keys are NEVER returned)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of API keys',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          permissions: { type: 'array', items: { type: 'string' } },
          expiresAt: { type: 'string', format: 'date-time' },
          revoked: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT required',
  })
  async listApiKeys(@Req() req) {
    const userId = req.user.userId;
    return this.apiKeysService.listApiKeys(userId);
  }

  @Delete(':keyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke API key',
    description: 'Revoke an API key, making it unusable immediately',
  })
  @ApiResponse({
    status: 200,
    description: 'API key revoked successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'API key revoked successfully' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'API key not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You do not own this API key',
  })
  async revokeApiKey(@Req() req, @Param('keyId') keyId: string) {
    const userId = req.user.userId;
    await this.apiKeysService.revokeApiKey(userId, keyId);
    return { message: 'API key revoked successfully' };
  }
}
