import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany } from 'typeorm';
import { Order } from './order.entity';

export enum UserRole {
  AUDIENCE = 'AUDIENCE',
  ORGANIZER = 'ORGANIZER',
  STAFF = 'STAFF',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  fullName?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.AUDIENCE })
  role: UserRole;

  @Column({ default: false })
  isVerified: boolean;

  // Soft delete — tài khoản bị vô hiệu hoá nhưng giữ lại lịch sử
  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(() => Order, order => order.user)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
