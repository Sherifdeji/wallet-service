import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly paystackSecretKey: string;
  private readonly paystackBaseUrl = 'https://api.paystack.co';
  private readonly axiosInstance: AxiosInstance;

  constructor(private configService: ConfigService) {
    // Fix: Add non-null assertion or provide default with validation
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');

    if (!secretKey) {
      throw new Error(
        'PAYSTACK_SECRET_KEY is not configured in environment variables',
      );
    }

    this.paystackSecretKey = secretKey;

    // Create axios instance with Paystack config
    this.axiosInstance = axios.create({
      baseURL: this.paystackBaseUrl,
      headers: {
        Authorization: `Bearer ${this.paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    this.logger.log('PaystackService initialized');
  }

  /**
   * Initialize Paystack transaction
   * @param email User email (from Google OAuth)
   * @param amount Amount in KOBO (already in KOBO from frontend)
   * @param reference Unique transaction reference
   * @returns Paystack response with authorization_url
   */
  async initializeTransaction(
    email: string,
    amount: number,
    reference: string,
  ): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> {
    try {
      this.logger.log(
        `Initializing Paystack transaction: ${reference} for ${email} with amount ${amount} KOBO`,
      );

      const response = await this.axiosInstance.post(
        '/transaction/initialize',
        {
          email,
          amount, // Amount in KOBO (Paystack expects KOBO)
          reference,
          currency: 'NGN',
          channels: [
            'card',
            'bank',
            'ussd',
            'qr',
            'mobile_money',
            'bank_transfer',
          ],
        },
      );

      if (!response.data.status) {
        throw new InternalServerErrorException(
          response.data.message || 'Paystack initialization failed',
        );
      }

      this.logger.log(`Paystack transaction initialized: ${reference}`);

      return {
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        reference: response.data.data.reference,
      };
    } catch (error) {
      this.logger.error(
        `Paystack initialization error: ${error.message}`,
        error.stack,
      );

      if (error.response) {
        throw new InternalServerErrorException(
          error.response.data?.message || 'Paystack API error',
        );
      }

      throw new InternalServerErrorException(
        'Failed to initialize Paystack transaction',
      );
    }
  }

  /**
   * Verify Paystack webhook signature (CRITICAL SECURITY)
   * Uses HMAC SHA512 to verify webhook authenticity
   * @param signature x-paystack-signature header value
   * @param payload Raw request body as string
   * @returns true if signature is valid, false otherwise
   */
  verifyWebhookSignature(signature: string, payload: string): boolean {
    try {
      if (!signature) {
        this.logger.warn('No signature provided for webhook verification');
        return false;
      }

      // Compute HMAC SHA512 hash
      const hash = crypto
        .createHmac('sha512', this.paystackSecretKey)
        .update(payload)
        .digest('hex');

      const isValid = hash === signature;

      if (!isValid) {
        this.logger.warn('Invalid Paystack webhook signature');
      } else {
        this.logger.log('Paystack webhook signature verified successfully');
      }

      return isValid;
    } catch (error) {
      this.logger.error(
        `Webhook signature verification error: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Verify transaction with Paystack API (optional, for additional verification)
   * @param reference Transaction reference
   * @returns Transaction data from Paystack
   */
  async verifyTransaction(reference: string): Promise<any> {
    try {
      this.logger.log(`Verifying transaction with Paystack: ${reference}`);

      const response = await this.axiosInstance.get(
        `/transaction/verify/${reference}`,
      );

      if (!response.data.status) {
        throw new InternalServerErrorException(
          response.data.message || 'Transaction verification failed',
        );
      }

      this.logger.log(`Transaction verified: ${reference}`);

      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Transaction verification error: ${error.message}`,
        error.stack,
      );

      if (error.response) {
        throw new InternalServerErrorException(
          error.response.data?.message || 'Paystack API error',
        );
      }

      throw new InternalServerErrorException('Failed to verify transaction');
    }
  }
}
