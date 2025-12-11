import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { Transaction } from '../wallet/entities/transaction.entity';
import { ApiKey } from '../api-keys/entities/api-key.entity';

config();

const configService = new ConfigService();

// Determine if running compiled code
const isProduction = process.env.NODE_ENV === 'production';
const entityPath = isProduction ? 'dist/**/*.entity.js' : 'src/**/*.entity.ts';
const migrationPath = isProduction
  ? 'dist/migrations/*.js'
  : 'src/migrations/*.ts';

export default new DataSource({
  type: 'postgres',
  url: configService.get('DATABASE_URL'),
  host: configService.get('DATABASE_HOST') || 'localhost',
  port: parseInt(configService.get('DATABASE_PORT') || '5432', 10),
  username: configService.get('DATABASE_USER') || 'postgres',
  password: configService.get('DATABASE_PASSWORD'),
  database: configService.get('DATABASE_NAME') || 'wallet_db',
  entities: isProduction ? [User, Wallet, Transaction, ApiKey] : [entityPath],
  migrations: [migrationPath], // ✅ Dynamic path
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: configService.get('NODE_ENV') === 'development',
  ssl:
    configService.get('NODE_ENV') === 'production'
      ? {
          rejectUnauthorized: false,
        }
      : false,
});
