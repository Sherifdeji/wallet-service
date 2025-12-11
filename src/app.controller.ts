import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Returns service status and available endpoints',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is running',
    schema: {
      example: {
        status: 'ok',
        service: 'HNG Stage 8 - Wallet Service',
        version: '1.0.0',
        endpoints: {
          swagger: '/api/docs',
          googleLogin: '/auth/google',
          paystackWebhook: '/wallet/paystack/webhook',
        },
        timestamp: '2025-12-11T06:30:00.000Z',
      },
    },
  })
  getHealth() {
    return {
      status: 'ok',
      service: 'HNG Stage 8 - Wallet Service',
      version: '1.0.0',
      endpoints: {
        swagger: '/api/docs',
        googleLogin: '/auth/google',
        paystackWebhook: '/wallet/paystack/webhook',
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Alternative health check',
    description: 'Returns simple OK status',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      example: { status: 'ok' },
    },
  })
  checkHealth() {
    return { status: 'ok' };
  }
}
