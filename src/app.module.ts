import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { ApiKeysModule } from './api-keys/api-keys.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? undefined : '.env',
    }),

    // Database configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        host: configService.get('DATABASE_HOST') || 'localhost',
        port: configService.get('DATABASE_PORT') || 5432,
        username: configService.get('DATABASE_USER') || 'postgres',
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME') || 'wallet_db',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        ssl:
          configService.get('NODE_ENV') === 'production'
            ? {
                rejectUnauthorized: false,
              }
            : false,
      }),
    }),
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 10, // 10 requests per minute
      },
    ]),

    // Feature modules
    AuthModule,
    UsersModule,
    WalletModule,
    ApiKeysModule,
  ],
})
export class AppModule {}
