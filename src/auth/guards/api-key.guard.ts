import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeysService } from '../../api-keys/api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Validate API key (returns userId and permissions, or null if invalid)
    const result = await this.apiKeysService.validateApiKey(apiKey);

    if (!result) {
      throw new UnauthorizedException('Invalid, expired, or revoked API key');
    }

    // Attach user and permissions to request
    request.user = {
      userId: result.userId,
      permissions: result.permissions,
      authType: 'api_key', // Mark as API key authentication
    };

    return true;
  }
}
