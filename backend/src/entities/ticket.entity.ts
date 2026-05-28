import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Order } from './order.entity';
import { TicketType } from './ticket-type.entity';

export enum TicketStatus {
  VALID = 'VALID',
  USED = 'USED',
  REVOKED = 'REVOKED',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  qrCode: string;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.VALID })
  status: TicketStatus;

  @Column({ nullable: true })
  holderName: string; // From the checkout page

  @ManyToOne(() => User, user => user.tickets)
  user: User;

  @ManyToOne(() => Order, order => order.tickets, { onDelete: 'CASCADE' })
  order: Order;

  @ManyToOne(() => TicketType)
  ticketType: TicketType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
