import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Concert } from './concert.entity';
import { Ticket } from './ticket.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderCode: string;

  @Column('decimal')
  totalAmount: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ nullable: true })
  paymentId: string; // VNPAY/MoMo transaction id

  // Idempotency Key — UUID từ FE, dùng để liên kết booking request với order
  // FE polling GET /booking/status?key=xxx sẽ tìm order theo key này
  @Column({ nullable: true, unique: true })
  idempotencyKey: string;

  // Số lượng vé trong đơn hàng — ghi lại để truy vết
  @Column({ default: 1 })
  quantity: number;

  @ManyToOne(() => User, user => user.orders)
  user: User;

  @ManyToOne(() => Concert)
  concert: Concert;

  @OneToMany(() => Ticket, ticket => ticket.order)
  tickets: Ticket[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
