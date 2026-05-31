import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TicketType } from './ticket-type.entity';

export enum ConcertStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('concerts')
export class Concert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  subtitle: string;

  @Column('text')
  description: string;

  @Column()
  venue: string;

  @Column()
  city: string;

  @Column()
  date: Date;

  @Column({ nullable: true })
  coverImageUrl: string;

  @Column({ type: 'enum', enum: ConcertStatus, default: ConcertStatus.UPCOMING })
  status: ConcertStatus;

  @Column({ nullable: true, type: 'text' })
  aiBio: string;

  // IDLE | PROCESSING | DONE | FAILED — track trạng thái job AI
  @Column({ default: 'IDLE' })
  aiBioStatus: string;

  @OneToMany(() => TicketType, ticketType => ticketType.concert)
  ticketTypes: TicketType[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
