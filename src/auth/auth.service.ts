import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private walletService: WalletService,
    private jwtService: JwtService,
  ) {}

  /**
   * Handle Google OAuth login
   * Creates user and wallet if not exists
   * Returns JWT token
   */
  async googleLogin(googleUser: { googleId: string; email: string }): Promise<{
    status: string;
    data: {
      access_token: string;
      user: {
        id: string;
        email: string;
        createdAt: Date;
      };
    };
  }> {
    // Check if user exists by Google ID
    let user = await this.usersService.findByGoogleId(googleUser.googleId);

    // If user doesn't exist, create new user
    if (!user) {
      user = await this.usersService.create({
        email: googleUser.email,
        googleId: googleUser.googleId,
      });

      // Auto-create wallet for new user
      await this.walletService.createWallet(user.id);
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    return {
      status: 'success',
      data: {
        access_token,
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
        },
      },
    };
  }

  /**
   * Validate and return user from JWT payload
   */
  async validateUser(userId: string): Promise<User | null> {
    return this.usersService.findById(userId);
  }
}
