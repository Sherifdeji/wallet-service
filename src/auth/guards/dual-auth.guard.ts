import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiKeyGuard } from './api-key.guard';

@Injectable()
export class DualAuthGuard implements CanActivate {
  constructor(
    private readonly jwtAuthGuard: JwtAuthGuard,
    private readonly apiKeyGuard: ApiKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check if Authorization header exists (JWT)
    const hasJwt = request.headers.authorization?.startsWith('Bearer ');

    // Check if x-api-key header exists (API Key)
    const hasApiKey = !!request.headers['x-api-key'];

    // Try JWT first
    if (hasJwt) {
      try {
        const canActivate = await this.jwtAuthGuard.canActivate(context);
        if (canActivate) {
          // Mark as JWT authentication
          request.user.authType = 'jwt';
          return true;
        }
      } catch (error) {
        // JWT validation failed, try API key if available
        if (!hasApiKey) {
          throw error; // No API key to fall back to
        }
      }
    }

    // Try API key
    if (hasApiKey) {
      try {
        return await this.apiKeyGuard.canActivate(context);
      } catch (error) {
        // API key validation failed
        throw error;
      }
    }

    // Neither JWT nor API key provided
    throw new UnauthorizedException(
      'Authentication required. Provide either JWT token (Authorization: Bearer) or API key (x-api-key header)',
    );
  }
}
