import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  Headers,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
  ApiQuery,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { PaystackService } from './paystack.service';
import { DualAuthGuard } from '../auth/guards/dual-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { InitializeDepositDto } from './dto/initialize-deposit.dto';
import { TransferDto } from './dto/transfer.dto';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly paystackService: PaystackService,
  ) {}

  /**
   * Initialize deposit via Paystack
   */
  @Post('deposit')
  @UseGuards(DualAuthGuard, PermissionsGuard)
  @RequirePermissions('deposit')
  @ApiBearerAuth('JWT')
  @ApiSecurity('API-Key')
  @ApiOperation({
    summary: 'Initialize deposit via Paystack',
    description:
      'Creates a pending transaction and returns Paystack payment URL. Amount must be in KOBO.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment URL returned successfully',
    schema: {
      example: {
        reference: 'TXN_1702201234567_abc123',
        authorization_url:
          'https://checkout.paystack.com/abc123def456ghi789jkl012',
        access_code: 'abc123def456ghi789jkl012',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid amount (minimum 100 KOBO)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Missing deposit permission' })
  async initializeDeposit(@Req() req: any, @Body() dto: InitializeDepositDto) {
    const userId = req.user.userId || req.user.id;
    return await this.walletService.initializeDeposit(userId, dto.amount);
  }

  /**
   * Paystack webhook endpoint (CRITICAL - ONLY ENDPOINT THAT CREDITS WALLETS)
   * This endpoint receives payment confirmations from Paystack
   * MUST verify signature, MUST be idempotent
   */
  @Post('paystack/webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Paystack webhook (internal)',
    description:
      'Receives payment confirmations from Paystack. Verifies signature and credits wallet. This is the ONLY endpoint that credits wallets.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: { example: { status: true } },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid Paystack signature',
  })
  async handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() payload: any,
  ) {
    this.logger.log('Received Paystack webhook');

    // CRITICAL: Verify Paystack signature
    const rawBody = JSON.stringify(payload);
    const isValid = this.paystackService.verifyWebhookSignature(
      signature,
      rawBody,
    );

    if (!isValid) {
      this.logger.error('Invalid Paystack webhook signature');
      throw new UnauthorizedException('Invalid signature');
    }

    this.logger.log('Paystack webhook signature verified');

    // Extract event data
    const { event, data } = payload;

    // Handle charge.success event
    if (event === 'charge.success') {
      const { reference, amount, status } = data;

      this.logger.log(
        `Processing charge.success: ${reference}, amount: ${amount}, status: ${status}`,
      );

      // Only process if payment was successful
      if (status === 'success') {
        try {
          // Credit wallet (idempotent & atomic)
          await this.walletService.creditWalletFromWebhook(
            reference,
            amount, // Amount from Paystack is in KOBO
            data,
          );

          this.logger.log(`Wallet credited successfully: ${reference}`);
        } catch (error) {
          this.logger.error(
            `Error crediting wallet: ${error.message}`,
            error.stack,
          );
          // Return 200 to Paystack even if processing fails
          // (Paystack will retry webhook if we return error)
        }
      } else {
        this.logger.warn(
          `Payment status is not success: ${status} for ${reference}`,
        );
      }
    } else {
      this.logger.log(`Ignoring webhook event: ${event}`);
    }

    // Always return success to Paystack
    return { status: true };
  }

  /**
   * Check deposit status (read-only, does NOT credit wallet)
   */
  @Get('deposit/:reference/status')
  @UseGuards(DualAuthGuard, PermissionsGuard)
  @RequirePermissions('read')
  @ApiBearerAuth('JWT')
  @ApiSecurity('API-Key')
  @ApiOperation({
    summary: 'Check deposit transaction status',
    description:
      'Returns the status of a deposit transaction. This is read-only and does NOT credit the wallet.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction status returned',
    schema: {
      example: {
        reference: 'TXN_1702201234567_abc123',
        status: 'success',
        amount: 5000,
        created_at: '2025-12-10T10:00:00.000Z',
        updated_at: '2025-12-10T10:01:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getDepositStatus(@Param('reference') reference: string) {
    return await this.walletService.getDepositStatus(reference);
  }

  /**
   * Get wallet balance
   */
  @Get('balance')
  @UseGuards(DualAuthGuard, PermissionsGuard)
  @RequirePermissions('read')
  @ApiBearerAuth('JWT')
  @ApiSecurity('API-Key')
  @ApiOperation({
    summary: 'Get wallet balance',
    description: 'Returns current wallet balance in KOBO',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance returned successfully',
    schema: {
      example: {
        balance: 15000,
        wallet_number: '4512345678',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getBalance(@Req() req: any) {
    const userId = req.user.userId || req.user.id;
    return await this.walletService.getBalance(userId);
  }

  /**
   * Get wallet info
   */
  @Get('info')
  @UseGuards(DualAuthGuard, PermissionsGuard)
  @RequirePermissions('read')
  @ApiBearerAuth('JWT')
  @ApiSecurity('API-Key')
  @ApiOperation({
    summary: 'Get complete wallet information',
    description: 'Returns wallet ID, number, balance, and timestamps',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet info returned successfully',
    schema: {
      example: {
        id: 'uuid',
        wallet_number: '4512345678',
        balance: 15000,
        created_at: '2025-12-10T10:00:00.000Z',
        updated_at: '2025-12-10T10:01:00.000Z',
      },
    },
  })
  async getWalletInfo(@Req() req: any) {
    const userId = req.user.userId || req.user.id;
    return await this.walletService.getWalletInfo(userId);
  }

  /**
   * Transfer funds to another wallet
   */
  @Post('transfer')
  @UseGuards(DualAuthGuard, PermissionsGuard)
  @RequirePermissions('transfer')
  @ApiBearerAuth('JWT')
  @ApiSecurity('API-Key')
  @ApiOperation({
    summary: 'Transfer funds to another wallet',
    description:
      'Transfers funds from your wallet to another wallet. Operation is atomic.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transfer completed successfully',
    schema: {
      example: {
        status: 'success',
        message: 'Transfer completed successfully',
        transaction_id: 'uuid',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid amount or insufficient balance',
  })
  @ApiResponse({ status: 404, description: 'Recipient wallet not found' })
  async transfer(@Req() req: any, @Body() dto: TransferDto) {
    const userId = req.user.userId || req.user.id;
    return await this.walletService.transfer(
      userId,
      dto.wallet_number,
      dto.amount,
    );
  }

  /**
   * Get transaction history
   */
  @Get('transactions')
  @UseGuards(DualAuthGuard, PermissionsGuard)
  @RequirePermissions('read')
  @ApiBearerAuth('JWT')
  @ApiSecurity('API-Key')
  @ApiOperation({
    summary: 'Get transaction history',
    description: 'Returns paginated transaction history',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction history returned',
    schema: {
      example: [
        {
          id: 'uuid',
          type: 'deposit',
          amount: 5000,
          status: 'success',
          reference: 'TXN_123',
          metadata: {},
          created_at: '2025-12-10T10:00:00.000Z',
        },
      ],
    },
  })
  async getTransactions(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user.userId || req.user.id;
    return await this.walletService.getTransactions(
      userId,
      page || 1,
      limit || 20,
    );
  }
}
