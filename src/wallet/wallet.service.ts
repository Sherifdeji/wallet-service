import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {}

  /**
   * Generate unique 10-digit wallet number
   * Format: 45XXXXXXXX (starts with 45)
   */
  private async generateWalletNumber(): Promise<string> {
    let walletNumber: string = '';
    let exists = true;

    while (exists) {
      // Generate 8 random digits and prepend with '45'
      const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
      walletNumber = `45${randomDigits}`;

      // Check if wallet number already exists
      const existing = await this.walletRepository.findOne({
        where: { walletNumber },
      });
      exists = !!existing;
    }

    return walletNumber;
  }

  /**
   * Create wallet for a new user
   */
  async createWallet(userId: string): Promise<Wallet> {
    // Check if user already has a wallet
    const existingWallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (existingWallet) {
      throw new ConflictException('User already has a wallet');
    }

    const walletNumber = await this.generateWalletNumber();

    const wallet = this.walletRepository.create({
      userId,
      walletNumber,
      balance: 0, // Start with 0 balance in KOBO
    });

    return this.walletRepository.save(wallet);
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    return this.walletRepository.findOne({ where: { userId } });
  }

  async findByWalletNumber(walletNumber: string): Promise<Wallet | null> {
    return this.walletRepository.findOne({ where: { walletNumber } });
  }

  async getBalance(userId: string): Promise<number> {
    const wallet = await this.findByUserId(userId);
    return wallet ? wallet.balance : 0;
  }
}
