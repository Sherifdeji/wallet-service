import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');

    if (!secretKey) {
      this.logger.error('❌ PAYSTACK_SECRET_KEY not found in environment');
      throw new Error('PAYSTACK_SECRET_KEY is required');
    }

    this.secretKey = secretKey;

    // Verify key format
    if (
      !this.secretKey.startsWith('sk_test_') &&
      !this.secretKey.startsWith('sk_live_')
    ) {
      this.logger.error(
        `❌ Invalid PAYSTACK_SECRET_KEY format. Key starts with: ${this.secretKey.substring(0, 4)}`,
      );
      throw new Error('Invalid Paystack secret key format');
    }

    this.logger.log(
      `✅ Paystack initialized with key: ${this.secretKey.substring(0, 10)}...${this.secretKey.slice(-4)}`,
    );

    // Create axios instance for Paystack API calls
    this.axiosInstance = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * CRITICAL: Verify Paystack webhook signature
   * Per copilot instructions: Use HMAC SHA512
   *
   * @param signature - Signature from x-paystack-signature header
   * @param rawBody - RAW request body (NOT JSON-parsed)
   * @returns true if signature is valid, false otherwise
   */
  verifyWebhookSignature(signature: string, rawBody: string): boolean {
    if (!signature) {
      this.logger.error('❌ Missing signature for verification');
      return false;
    }

    if (!rawBody) {
      this.logger.error('❌ Missing raw body for signature computation');
      return false;
    }

    try {
      // Compute HMAC SHA512 hash using raw body
      const hash = crypto
        .createHmac('sha512', this.secretKey)
        .update(rawBody) // CRITICAL: Use raw body, NOT JSON.stringify(parsed)
        .digest('hex');

      // Compare signatures (constant-time comparison to prevent timing attacks)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(hash, 'hex'),
        Buffer.from(signature, 'hex'),
      );

      if (!isValid) {
        this.logger.error('❌ Signature verification failed');
        this.logger.debug(`Expected hash: ${hash.substring(0, 20)}...`);
        this.logger.debug(
          `Received signature: ${signature.substring(0, 20)}...`,
        );
      } else {
        this.logger.log('✅ Signature verification successful');
      }

      return isValid;
    } catch (error) {
      this.logger.error(
        `❌ Error during signature verification: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Initialize Paystack transaction
   * Per copilot instructions: Send amounts in KOBO
   *
   * @param amount - Amount in KOBO (1 Naira = 100 Kobo)
   * @param email - User's email
   * @param reference - Unique transaction reference
   * @returns Paystack response with authorization_url
   */
  async initializeTransaction(
    amount: number,
    email: string,
    reference: string,
  ): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> {
    // Validate inputs per copilot instructions
    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (amount < 100) {
      throw new BadRequestException(
        'Minimum deposit amount is 100 KOBO (₦1.00)',
      );
    }

    if (!email || !email.includes('@')) {
      throw new BadRequestException('Valid email is required');
    }

    if (!reference) {
      throw new BadRequestException('Transaction reference is required');
    }

    this.logger.log(
      `Initializing Paystack transaction: ${reference} for ${email} with amount ${amount} KOBO (₦${amount / 100})`,
    );

    try {
      const response = await this.axiosInstance.post(
        '/transaction/initialize',
        {
          email,
          amount, // CRITICAL: Already in KOBO per copilot instructions
          reference,
          currency: 'NGN',
          // IMPORTANT: Don't send callback_url here
          // Paystack will use the webhook URL configured in dashboard
          // callback_url is for redirect after payment (optional)
          callback_url:
            this.configService.get<string>('FRONTEND_URL') ||
            'http://localhost:3001/payment/success',
          metadata: {
            custom_fields: [
              {
                display_name: 'Reference',
                variable_name: 'reference',
                value: reference,
              },
            ],
          },
        },
      );

      if (!response.data.status) {
        this.logger.error(
          `❌ Paystack initialization failed: ${response.data.message}`,
        );
        throw new BadRequestException(
          response.data.message || 'Failed to initialize transaction',
        );
      }

      this.logger.log(`✅ Paystack transaction initialized: ${reference}`);
      this.logger.debug(
        `Authorization URL: ${response.data.data.authorization_url}`,
      );

      // Return the required fields per copilot instructions
      return {
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        reference: response.data.data.reference,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          this.logger.error(
            `❌ Paystack API error (${error.response.status}): ${JSON.stringify(error.response.data)}`,
          );

          if (error.response.status === 401) {
            this.logger.error(
              '❌ Authentication failed! Check PAYSTACK_SECRET_KEY',
            );
            this.logger.error(
              `Current key format: ${this.secretKey.substring(0, 10)}...`,
            );
          }

          const message =
            error.response.data.message ||
            error.response.data.error ||
            'Paystack API error';
          throw new BadRequestException(message);
        } else if (error.request) {
          this.logger.error(
            '❌ No response from Paystack. Check internet connection.',
          );
          throw new BadRequestException(
            'Unable to connect to Paystack. Please try again.',
          );
        }
      }

      this.logger.error(`❌ Paystack initialization error: ${error.message}`);
      throw new BadRequestException(
        error.message || 'Failed to initialize transaction',
      );
    }
  }

  /**
   * Verify transaction (optional - for manual verification)
   * NOTE: Per copilot instructions, only webhooks should credit wallets
   * This is for read-only verification
   */
  async verifyTransaction(reference: string): Promise<any> {
    this.logger.log(`Verifying transaction: ${reference}`);

    try {
      const response = await this.axiosInstance.get(
        `/transaction/verify/${reference}`,
      );

      if (!response.data.status) {
        throw new BadRequestException(
          response.data.message || 'Verification failed',
        );
      }

      this.logger.log(`✅ Transaction verified: ${reference}`);
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `❌ Transaction verification error: ${JSON.stringify(error.response.data)}`,
        );
        throw new BadRequestException(
          error.response.data.message || 'Verification failed',
        );
      }

      this.logger.error(`❌ Verification error: ${error.message}`);
      throw new BadRequestException(error.message || 'Verification failed');
    }
  }
}
