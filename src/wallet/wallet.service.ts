import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { UsersService } from '../users/users.service';
import { PaystackService } from './paystack.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly paystackService: PaystackService,
  ) {}

  /**
   * Create wallet for new user
   * Auto-called when user signs up via Google OAuth
   */
  async createWallet(userId: string): Promise<Wallet> {
    this.logger.log(`Creating wallet for user: ${userId}`);

    // Generate unique 10-digit wallet number starting with "45"
    const walletNumber = await this.generateUniqueWalletNumber();

    // Create wallet with zero balance
    const wallet = this.walletRepository.create({
      userId,
      walletNumber,
      balance: 0, // Initialize with 0 KOBO
    });

    const savedWallet = await this.walletRepository.save(wallet);

    this.logger.log(
      `Wallet created: ${savedWallet.walletNumber} for user ${userId}`,
    );

    return savedWallet;
  }

  /**
   * Generate unique 10-digit wallet number
   * Format: 45XXXXXXXX (starts with 45, followed by 8 random digits)
   * Must be unique and indexed in database
   */
  private async generateUniqueWalletNumber(): Promise<string> {
    const MAX_ATTEMPTS = 10; // Prevent infinite loop
    let attempts = 0;

    while (attempts < MAX_ATTEMPTS) {
      // Generate 8 random digits
      const randomDigits = Math.floor(10000000 + Math.random() * 90000000);

      // Prepend "45" to make it 10 digits
      const walletNumber = `45${randomDigits}`;

      // Check if wallet number already exists
      const existing = await this.walletRepository.findOne({
        where: { walletNumber },
      });

      if (!existing) {
        return walletNumber; // Found unique number
      }

      attempts++;
      this.logger.warn(
        `Wallet number collision detected (attempt ${attempts}/${MAX_ATTEMPTS})`,
      );
    }

    // This should never happen with 100 million possible combinations
    throw new InternalServerErrorException(
      'Failed to generate unique wallet number after maximum attempts',
    );
  }

  /**
   * Initialize deposit via Paystack
   *
   * @param userId - User ID
   * @param amount - Amount in KOBO (1 Naira = 100 Kobo)
   * @returns Payment URL and reference
   */
  async initializeDeposit(
    userId: string,
    amount: number,
  ): Promise<{
    status: string;
    data: {
      reference: string;
      authorization_url: string;
    };
    message: string;
  }> {
    // Validate amount per copilot instructions
    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (amount < 100) {
      throw new BadRequestException(
        'Minimum deposit amount is 100 KOBO (₦1.00)',
      );
    }

    // Get user details
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user's wallet
    const wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Generate unique reference per copilot instructions
    const reference = `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `Initializing deposit - User: ${userId}, Amount: ${amount} KOBO (₦${amount / 100}), Reference: ${reference}`,
    );

    // Create pending transaction per copilot instructions
    const transaction = this.transactionRepository.create({
      walletId: wallet.id,
      type: 'deposit',
      amount,
      status: 'pending',
      reference,
      metadata: {
        email: user.email,
        userId,
        wallet_number: wallet.walletNumber,
      },
    });

    await this.transactionRepository.save(transaction);

    try {
      // Initialize Paystack transaction
      const paystackResponse = await this.paystackService.initializeTransaction(
        amount,
        user.email,
        reference,
      );

      this.logger.log(
        `✅ Deposit initialized - Reference: ${reference}, URL: ${paystackResponse.authorization_url}`,
      );

      // Return in standard API format per copilot instructions
      return {
        status: 'success',
        data: {
          reference: paystackResponse.reference,
          authorization_url: paystackResponse.authorization_url,
        },
        message: 'Deposit initialized successfully',
      };
    } catch (error) {
      // If Paystack initialization fails, mark transaction as failed
      transaction.status = 'failed';
      transaction.metadata = {
        ...transaction.metadata,
        error: error.message,
      };
      await this.transactionRepository.save(transaction);

      this.logger.error(
        `❌ Deposit initialization failed - Reference: ${reference}, Error: ${error.message}`,
      );

      throw error;
    }
  }

  /**
   * Credit wallet from Paystack webhook (IDEMPOTENT & ATOMIC)
   * CRITICAL: This is the ONLY method that credits wallets
   * CRITICAL: Must be idempotent (no double-crediting)
   * CRITICAL: Must be atomic (use database transaction)
   */
  async creditWalletFromWebhook(
    reference: string,
    amount: number,
    paystackData: any,
  ): Promise<void> {
    this.logger.log(`Processing webhook for reference: ${reference}`);

    // Use database transaction for atomicity
    await this.dataSource.transaction(async (manager) => {
      // Find transaction with pessimistic write lock (prevents race conditions)
      const transaction = await manager.findOne(Transaction, {
        where: { reference },
        lock: { mode: 'pessimistic_write' }, // Lock row for update
      });

      if (!transaction) {
        this.logger.error(`Transaction not found: ${reference}`);
        throw new NotFoundException('Transaction not found');
      }

      // IDEMPOTENCY CHECK: If already processed, do nothing
      if (transaction.status === 'success') {
        this.logger.warn(
          `Transaction already processed (idempotency): ${reference}`,
        );
        return; // Exit early, wallet already credited
      }

      // Verify transaction type is deposit
      if (transaction.type !== 'deposit') {
        this.logger.error(
          `Invalid transaction type for webhook: ${transaction.type}`,
        );
        throw new BadRequestException('Invalid transaction type');
      }

      // Verify amount matches
      if (Number(transaction.amount) !== amount) {
        this.logger.error(
          `Amount mismatch: Expected ${transaction.amount}, Got ${amount}`,
        );
        throw new BadRequestException('Amount mismatch');
      }

      // Update transaction status to success
      transaction.status = 'success';
      transaction.metadata = {
        ...transaction.metadata,
        paystack_webhook: paystackData,
        processed_at: new Date().toISOString(),
      };
      await manager.save(Transaction, transaction);

      this.logger.log(`Transaction marked as success: ${reference}`);

      // Find and lock wallet for update
      const wallet = await manager.findOne(Wallet, {
        where: { id: transaction.walletId },
        lock: { mode: 'pessimistic_write' }, // Lock row for update
      });

      if (!wallet) {
        this.logger.error(`Wallet not found: ${transaction.walletId}`);
        throw new NotFoundException('Wallet not found');
      }

      // Credit wallet (atomic operation within transaction)
      const previousBalance = wallet.balance;
      wallet.balance = Number(wallet.balance) + amount; // Ensure number type
      await manager.save(Wallet, wallet);

      this.logger.log(
        `Wallet ${wallet.walletNumber} credited: ${previousBalance} → ${wallet.balance} KOBO`,
      );
    });

    this.logger.log(`Webhook processing completed successfully: ${reference}`);
  }

  /**
   * Get wallet balance
   */
  async getBalance(userId: string): Promise<{
    balance: number;
    wallet_number: string;
  }> {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      balance: Number(wallet.balance), // Convert bigint to number
      wallet_number: wallet.walletNumber,
    };
  }

  /**
   * Get complete wallet information
   */
  async getWalletInfo(userId: string) {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      id: wallet.id,
      wallet_number: wallet.walletNumber,
      balance: Number(wallet.balance),
      created_at: wallet.createdAt,
      updated_at: wallet.updatedAt,
    };
  }

  /**
   * Transfer funds between wallets (atomic operation)
   */
  /**
   * Transfer funds between wallets (atomic operation)
   * Must be atomic with pessimistic locking
   */
  async transfer(
    userId: string,
    recipientWalletNumber: string,
    amount: number,
  ): Promise<{
    status: string;
    message: string;
    transaction_id: string;
  }> {
    this.logger.log(
      `Transfer request: ${userId} → ${recipientWalletNumber}: ${amount} KOBO`,
    );

    // Validate amount (minimum 100 KOBO)
    if (amount < 100) {
      throw new BadRequestException('Minimum transfer is 100 KOBO (1 Naira)');
    }

    // Find sender's wallet
    const senderWallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!senderWallet) {
      throw new NotFoundException('Your wallet not found');
    }

    // Check if transferring to self
    if (senderWallet.walletNumber === recipientWalletNumber) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    // Find recipient's wallet
    const recipientWallet = await this.walletRepository.findOne({
      where: { walletNumber: recipientWalletNumber },
    });

    if (!recipientWallet) {
      throw new NotFoundException('Recipient wallet not found');
    }

    // Check sender balance before transaction
    if (Number(senderWallet.balance) < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Use atomic transaction for transfer operation
    const transactionId = await this.dataSource.transaction(async (manager) => {
      // Lock both wallets with pessimistic write lock (prevent race conditions)
      const lockedSender = await manager.findOne(Wallet, {
        where: { id: senderWallet.id },
        lock: { mode: 'pessimistic_write' },
      });

      const lockedRecipient = await manager.findOne(Wallet, {
        where: { id: recipientWallet.id },
        lock: { mode: 'pessimistic_write' },
      });

      // TypeScript null checks (production-grade error handling)
      if (!lockedSender) {
        throw new NotFoundException('Sender wallet not found during lock');
      }

      if (!lockedRecipient) {
        throw new NotFoundException('Recipient wallet not found during lock');
      }

      // Double-check balance after lock (critical for race conditions)
      if (Number(lockedSender.balance) < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      // Update balances (atomic operation)
      lockedSender.balance = Number(lockedSender.balance) - amount;
      lockedRecipient.balance = Number(lockedRecipient.balance) + amount;

      await manager.save(Wallet, [lockedSender, lockedRecipient]);

      // Generate unique reference (use UUID or timestamp)
      const reference = `TRF_${Date.now()}_${uuidv4().split('-')[0]}`;

      // Create transfer_out transaction
      const transferOutTxn = manager.create(Transaction, {
        walletId: lockedSender.id,
        type: 'transfer_out',
        amount,
        status: 'success',
        reference: `${reference}_OUT`,
        metadata: {
          recipient_wallet_number: recipientWalletNumber,
          recipient_wallet_id: lockedRecipient.id,
        },
      });

      // Create transfer_in transaction
      const transferInTxn = manager.create(Transaction, {
        walletId: lockedRecipient.id,
        type: 'transfer_in',
        amount,
        status: 'success',
        reference: `${reference}_IN`,
        metadata: {
          sender_wallet_number: lockedSender.walletNumber,
          sender_wallet_id: lockedSender.id,
        },
      });

      // Save both transactions atomically
      const savedTransactions = await manager.save(Transaction, [
        transferOutTxn,
        transferInTxn,
      ]);

      this.logger.log(`Transfer completed: ${reference}`);

      return savedTransactions[0].id;
    });

    return {
      status: 'success',
      message: 'Transfer completed successfully',
      transaction_id: transactionId,
    };
  }
  /**
   * Get transaction history with pagination
   */
  async getTransactions(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<any[]> {
    // Validate and sanitize pagination params
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit)); // Max 100 per page

    // Find user's wallet
    const wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Calculate offset
    const skip = (validPage - 1) * validLimit;

    // Get transactions with pagination
    const transactions = await this.transactionRepository.find({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      skip,
      take: validLimit,
    });

    return transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      status: tx.status,
      reference: tx.reference,
      metadata: tx.metadata,
      created_at: tx.createdAt,
    }));
  }

  /**
   * Get deposit transaction status
   */
  async getDepositStatus(reference: string): Promise<{
    reference: string;
    status: string;
    amount: number;
    created_at: Date;
    updated_at: Date;
  }> {
    const transaction = await this.transactionRepository.findOne({
      where: { reference },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      reference: transaction.reference,
      status: transaction.status,
      amount: Number(transaction.amount),
      created_at: transaction.createdAt,
      updated_at: transaction.updatedAt,
    };
  }

  /**
   * Find wallet by wallet number (used for transfers)
   */
  async findByWalletNumber(walletNumber: string): Promise<Wallet | null> {
    return await this.walletRepository.findOne({
      where: { walletNumber },
    });
  }

  /**
   * Find wallet by user ID
   */
  async findByUserId(userId: string): Promise<Wallet | null> {
    return await this.walletRepository.findOne({
      where: { userId },
    });
  }
}
