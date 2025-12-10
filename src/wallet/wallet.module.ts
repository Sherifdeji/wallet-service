import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletService } from './wallet.service';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { WalletController } from './wallet.controller';
import { PaystackService } from './paystack.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Transaction]),
    UsersModule, // Import UsersModule to access UsersService
    forwardRef(() => AuthModule),
    // AuthModule,
  ],
  controllers: [WalletController],
  providers: [WalletService, PaystackService],
  exports: [WalletService], // Export for use in other modules
})
export class WalletModule {}
