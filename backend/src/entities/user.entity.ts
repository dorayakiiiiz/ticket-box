import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Order } from './order.entity';
import { Ticket } from './ticket.entity';

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
  password?: string; // Null if using OAuth

  @Column({ nullable: true })
  fullName?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.AUDIENCE })
  role: UserRole;

  @Column({ default: false })
  isVerified: boolean;

  @OneToMany(() => Order, order => order.user)
  orders: Order[];

  @OneToMany(() => Ticket, ticket => ticket.user)
  tickets: Ticket[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
