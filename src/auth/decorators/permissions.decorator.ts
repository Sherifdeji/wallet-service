import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for API key authentication
 * JWT authentication bypasses permission checks (full access)
 *
 * @example
 * @RequirePermissions('deposit', 'transfer')
 * async transferFunds() { ... }
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
