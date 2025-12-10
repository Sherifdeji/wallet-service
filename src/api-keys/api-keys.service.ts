import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { ApiKey } from './entities/api-key.entity';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  /**
   * Generate API key in format: sk_live_<random_32_chars>
   */
  private generateApiKey(): string {
    const randomString = randomBytes(32).toString('hex');
    return `sk_live_${randomString}`;
  }

  /**
   * Hash API key using SHA-256 (crypto - no bcrypt needed)
   */
  private hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Convert expiry string (1H, 1D, 1M, 1Y) to actual Date
   */
  private convertExpiryToDate(expiry: string): Date {
    const now = Date.now();
    const expiryMap: Record<string, number> = {
      '1H': 60 * 60 * 1000, // 1 hour
      '1D': 24 * 60 * 60 * 1000, // 1 day
      '1M': 30 * 24 * 60 * 60 * 1000, // 1 month
      '1Y': 365 * 24 * 60 * 60 * 1000, // 1 year
    };

    const milliseconds = expiryMap[expiry.toUpperCase()];
    if (!milliseconds) {
      throw new BadRequestException(
        'Invalid expiry format. Must be one of: 1H, 1D, 1M, 1Y',
      );
    }

    return new Date(now + milliseconds);
  }

  /**
   * Count active (non-expired, non-revoked) API keys for a user
   */
  async countActiveKeys(userId: string): Promise<number> {
    return this.apiKeyRepository.count({
      where: {
        userId,
        revoked: false,
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  /**
   * Create new API key
   * Enforces 5 active keys limit
   */
  async createApiKey(
    userId: string,
    name: string,
    permissions: string[],
    expiry: string,
  ): Promise<{ api_key: string; expires_at: Date }> {
    // Validate permissions
    const validPermissions = ['deposit', 'transfer', 'read'];
    const invalidPermissions = permissions.filter(
      (p) => !validPermissions.includes(p),
    );
    if (invalidPermissions.length > 0) {
      throw new BadRequestException(
        `Invalid permissions: ${invalidPermissions.join(', ')}. Must be subset of: ${validPermissions.join(', ')}`,
      );
    }

    // Check active keys limit (maximum 5)
    const activeKeysCount = await this.countActiveKeys(userId);
    if (activeKeysCount >= 5) {
      throw new BadRequestException(
        'Maximum of 5 active API keys allowed per user. Please revoke or wait for existing keys to expire.',
      );
    }

    // Generate API key and hash it
    const apiKey = this.generateApiKey();
    const keyHash = this.hashApiKey(apiKey);

    // Convert expiry to datetime
    const expiresAt = this.convertExpiryToDate(expiry);

    // Create and save API key
    const newApiKey = this.apiKeyRepository.create({
      userId,
      name,
      keyHash,
      permissions,
      expiresAt,
      revoked: false,
    });

    await this.apiKeyRepository.save(newApiKey);

    // Return plain API key (ONLY TIME IT'S SHOWN)
    return {
      api_key: apiKey,
      expires_at: expiresAt,
    };
  }

  /**
   * Rollover expired API key
   * Creates new key with same permissions
   */
  async rolloverApiKey(
    userId: string,
    expiredKeyId: string,
    newExpiry: string,
  ): Promise<{ api_key: string; expires_at: Date }> {
    // Find the expired key
    const expiredKey = await this.apiKeyRepository.findOne({
      where: { id: expiredKeyId, userId },
    });

    if (!expiredKey) {
      throw new NotFoundException('API key not found');
    }

    // Verify key belongs to user
    if (expiredKey.userId !== userId) {
      throw new ForbiddenException('You do not own this API key');
    }

    // Verify key is actually expired
    if (expiredKey.expiresAt > new Date()) {
      throw new BadRequestException(
        'API key is not expired yet. Only expired keys can be rolled over.',
      );
    }

    // Check active keys limit before creating new one
    const activeKeysCount = await this.countActiveKeys(userId);
    if (activeKeysCount >= 5) {
      throw new BadRequestException(
        'Maximum of 5 active API keys allowed. Please revoke existing keys first.',
      );
    }

    // Create new key with same permissions
    return this.createApiKey(
      userId,
      expiredKey.name,
      expiredKey.permissions,
      newExpiry,
    );
  }

  /**
   * Validate API key and return user ID and permissions
   * Returns null if invalid, expired, or revoked
   */
  async validateApiKey(
    apiKey: string,
  ): Promise<{ userId: string; permissions: string[] } | null> {
    const keyHash = this.hashApiKey(apiKey);

    const apiKeyRecord = await this.apiKeyRepository.findOne({
      where: {
        keyHash,
        revoked: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!apiKeyRecord) {
      return null;
    }

    return {
      userId: apiKeyRecord.userId,
      permissions: apiKeyRecord.permissions,
    };
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (apiKey.userId !== userId) {
      throw new ForbiddenException('You do not own this API key');
    }

    apiKey.revoked = true;
    await this.apiKeyRepository.save(apiKey);
  }

  /**
   * List all API keys for a user (without showing actual keys)
   */
  async listApiKeys(userId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      select: [
        'id',
        'name',
        'permissions',
        'expiresAt',
        'revoked',
        'createdAt',
      ],
    });
  }
}
