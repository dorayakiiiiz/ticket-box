import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Concert } from './concert.entity';
import { Ticket } from './ticket.entity';
import { TicketType } from './ticket-type.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  VNPAY = 'VNPAY',
  MOMO = 'MOMO',
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

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  paymentId: string; // VNPAY/MoMo transaction id

  // Idempotency Key — UUID từ FE, dùng để liên kết booking request với order
  // FE polling GET /booking/status?key=xxx sẽ tìm order theo key này
  @Column({ nullable: true, unique: true })
  idempotencyKey: string;

  // Số lượng vé trong đơn hàng — ghi lại để truy vết
  @Column({ default: 1 })
  quantity: number;

  // Cờ đánh dấu đã hoàn vé về Redis chưa — dùng bởi CronService self-healing
  // Khi order bị CANCELLED/FAILED, cần rollback Redis availability
  // Nếu Redis rollback lỗi → false → cronjob sẽ thử lại lần sau
  @Column({ default: false })
  isRefundedToRedis: boolean;

  @ManyToOne(() => User, user => user.orders)
  user: User;

  @ManyToOne(() => Concert)
  concert: Concert;

  @ManyToOne(() => TicketType)
  ticketType: TicketType;

  // Khách hàng vãng lai (hoặc thông tin người nhận vé)
  @Column({ nullable: true })
  guestName: string;

  @Column({ nullable: true })
  guestEmail: string;

  @Column({ nullable: true })
  guestPhone: string;

  @OneToMany(() => Ticket, ticket => ticket.order)
  tickets: Ticket[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
