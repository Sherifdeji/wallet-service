import { Controller, Get, Req, UseGuards, HttpCode } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Initiate Google OAuth login',
    description: 'Redirects user to Google consent page for authentication',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth consent page',
  })
  async googleAuth() {
    // Guard handles the redirect to Google
    // This method exists only to trigger the guard
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Google OAuth callback',
    description:
      'Handles Google OAuth callback, creates user if not exists, auto-creates wallet, returns JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated, returns JWT token',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          example:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Google authentication failed',
  })
  async googleAuthRedirect(@Req() req) {
    return this.authService.googleLogin(req.user);
  }
}
