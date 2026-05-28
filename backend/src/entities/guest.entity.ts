import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Concert } from './concert.entity';

@Entity('guests')
export class Guest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ unique: true })
  guestCode: string; // Generated or from CSV

  @Column({ default: false })
  isCheckedIn: boolean;

  @ManyToOne(() => Concert, { onDelete: 'CASCADE' })
  concert: Concert;

  @CreateDateColumn()
  createdAt: Date;
}
