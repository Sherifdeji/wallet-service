import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class InitialSchema1765449895852 implements MigrationInterface {
  name = 'InitialSchema1765449895852';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if tables already exist (for development databases)
    const usersTableExists = await queryRunner.hasTable('users');
    const walletsTableExists = await queryRunner.hasTable('wallets');
    const transactionsTableExists = await queryRunner.hasTable('transactions');
    const apiKeysTableExists = await queryRunner.hasTable('api_keys');

    // Create users table if not exists
    if (!usersTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'users',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'email',
              type: 'varchar',
              length: '255',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'google_id',
              type: 'varchar',
              length: '255',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
          ],
        }),
        true,
      );

      // Create indexes for users
      await queryRunner.createIndex(
        'users',
        new TableIndex({
          name: 'IDX_users_email',
          columnNames: ['email'],
        }),
      );

      await queryRunner.createIndex(
        'users',
        new TableIndex({
          name: 'IDX_users_google_id',
          columnNames: ['google_id'],
        }),
      );
    }

    // Create wallets table if not exists
    if (!walletsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'wallets',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'user_id',
              type: 'uuid',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'wallet_number',
              type: 'varchar',
              length: '10',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'balance',
              type: 'bigint',
              default: 0,
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
          ],
        }),
        true,
      );

      // Create foreign key for user_id
      await queryRunner.createForeignKey(
        'wallets',
        new TableForeignKey({
          name: 'FK_wallets_user_id',
          columnNames: ['user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      // Create indexes for wallets
      await queryRunner.createIndex(
        'wallets',
        new TableIndex({
          name: 'IDX_wallets_user_id',
          columnNames: ['user_id'],
        }),
      );

      await queryRunner.createIndex(
        'wallets',
        new TableIndex({
          name: 'IDX_wallets_wallet_number',
          columnNames: ['wallet_number'],
        }),
      );
    }

    // Create transactions table if not exists
    if (!transactionsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'transactions',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'wallet_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'type',
              type: 'varchar',
              length: '20',
              isNullable: false,
            },
            {
              name: 'amount',
              type: 'bigint',
              isNullable: false,
            },
            {
              name: 'status',
              type: 'varchar',
              length: '20',
              default: "'pending'",
              isNullable: false,
            },
            {
              name: 'reference',
              type: 'varchar',
              length: '255',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'metadata',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
          ],
        }),
        true,
      );

      // Add check constraints
      await queryRunner.query(`
        ALTER TABLE "transactions" 
        ADD CONSTRAINT "CHK_transactions_type" 
        CHECK (type IN ('deposit', 'transfer_in', 'transfer_out'))
      `);

      await queryRunner.query(`
        ALTER TABLE "transactions" 
        ADD CONSTRAINT "CHK_transactions_status" 
        CHECK (status IN ('pending', 'success', 'failed'))
      `);

      // Create foreign key for wallet_id
      await queryRunner.createForeignKey(
        'transactions',
        new TableForeignKey({
          name: 'FK_transactions_wallet_id',
          columnNames: ['wallet_id'],
          referencedTableName: 'wallets',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      // Create indexes for transactions
      await queryRunner.createIndex(
        'transactions',
        new TableIndex({
          name: 'IDX_transactions_wallet_id',
          columnNames: ['wallet_id'],
        }),
      );

      await queryRunner.createIndex(
        'transactions',
        new TableIndex({
          name: 'IDX_transactions_reference',
          columnNames: ['reference'],
        }),
      );

      await queryRunner.createIndex(
        'transactions',
        new TableIndex({
          name: 'IDX_transactions_status',
          columnNames: ['status'],
        }),
      );
    }

    // Create api_keys table if not exists
    if (!apiKeysTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'api_keys',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'user_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'name',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'key_hash',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'permissions',
              type: 'text',
              isNullable: false,
            },
            {
              name: 'expires_at',
              type: 'timestamp',
              isNullable: false,
            },
            {
              name: 'revoked',
              type: 'boolean',
              default: false,
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'now()',
              isNullable: false,
            },
          ],
        }),
        true,
      );

      // Create foreign key for user_id
      await queryRunner.createForeignKey(
        'api_keys',
        new TableForeignKey({
          name: 'FK_api_keys_user_id',
          columnNames: ['user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      // Create indexes for api_keys
      await queryRunner.createIndex(
        'api_keys',
        new TableIndex({
          name: 'IDX_api_keys_user_id',
          columnNames: ['user_id'],
        }),
      );

      await queryRunner.createIndex(
        'api_keys',
        new TableIndex({
          name: 'IDX_api_keys_expires_at',
          columnNames: ['expires_at'],
        }),
      );

      await queryRunner.createIndex(
        'api_keys',
        new TableIndex({
          name: 'IDX_api_keys_revoked',
          columnNames: ['revoked'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (due to foreign keys)
    const apiKeysTableExists = await queryRunner.hasTable('api_keys');
    const transactionsTableExists = await queryRunner.hasTable('transactions');
    const walletsTableExists = await queryRunner.hasTable('wallets');
    const usersTableExists = await queryRunner.hasTable('users');

    if (apiKeysTableExists) {
      await queryRunner.dropTable('api_keys', true);
    }

    if (transactionsTableExists) {
      await queryRunner.dropTable('transactions', true);
    }

    if (walletsTableExists) {
      await queryRunner.dropTable('wallets', true);
    }

    if (usersTableExists) {
      await queryRunner.dropTable('users', true);
    }
  }
}
