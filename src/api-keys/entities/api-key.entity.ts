import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column()
  name: string;

  @Column({ name: 'key_hash' })
  keyHash: string;

  @Column({ type: 'simple-array' })
  permissions: string[];

  @Column({ name: 'expires_at' })
  @Index()
  expiresAt: Date;

  @Column({ default: false })
  @Index()
  revoked: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.apiKeys)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
