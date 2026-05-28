import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Concert } from './concert.entity';

@Entity('ticket_types')
export class TicketType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // SVIP, VIP, CAT1

  @Column('decimal')
  price: number;

  @Column()
  totalQuantity: number;

  @Column({ default: 0 })
  soldQuantity: number;

  @Column({ default: 2 })
  maxPerUser: number; // Max tickets per user

  @Column()
  colorCode: string;

  @ManyToOne(() => Concert, concert => concert.ticketTypes, { onDelete: 'CASCADE' })
  concert: Concert;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
