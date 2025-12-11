import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
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
   */
  async initializeTransaction(
    amount: number,
    email: string,
    reference: string,
  ): Promise<any> {
    this.logger.log(
      `Initializing Paystack transaction: ${reference} for ${email} with amount ${amount} KOBO`,
    );

    try {
      const response = await this.axiosInstance.post(
        '/transaction/initialize',
        {
          email,
          amount, // Already in KOBO
          reference,
          currency: 'NGN',
          callback_url:
            this.configService.get<string>('FRONTEND_URL') ||
            'http://localhost:3001',
        },
      );

      this.logger.log(`✅ Paystack transaction initialized: ${reference}`);
      this.logger.debug(
        `Authorization URL: ${response.data.data.authorization_url}`,
      );

      return response.data;
    } catch (error) {
      if (error.response) {
        this.logger.error(
          `❌ Paystack API error (${error.response.status}): ${JSON.stringify(error.response.data)}`,
        );

        if (error.response.status === 401) {
          this.logger.error(
            '❌ Authentication failed! Check PAYSTACK_SECRET_KEY',
          );
        }

        throw new Error(error.response.data.message || 'Paystack API error');
      } else if (error.request) {
        this.logger.error(
          '❌ No response from Paystack. Check internet connection.',
        );
        throw new Error('No response from Paystack');
      } else {
        this.logger.error(`❌ Paystack initialization error: ${error.message}`);
        throw new Error(error.message);
      }
    }
  }

  /**
   * Verify transaction (optional - for manual verification)
   * only webhooks should credit wallets
   */
  async verifyTransaction(reference: string): Promise<any> {
    this.logger.log(`Verifying transaction: ${reference}`);

    try {
      const response = await this.axiosInstance.get(
        `/transaction/verify/${reference}`,
      );

      this.logger.log(`✅ Transaction verified: ${reference}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        this.logger.error(
          `❌ Transaction verification error: ${JSON.stringify(error.response.data)}`,
        );
        throw new Error(error.response.data.message || 'Verification failed');
      }

      this.logger.error(`❌ Verification error: ${error.message}`);
      throw new Error(error.message);
    }
  }
}
