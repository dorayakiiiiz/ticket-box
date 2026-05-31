/**
 * Clear Script — Truncates all tables to allow a fresh seed.
 * Run: npm run db:clear
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Otp } from '../entities/otp.entity';
import { Concert } from '../entities/concert.entity';
import { TicketType } from '../entities/ticket-type.entity';
import { Order } from '../entities/order.entity';
import { Ticket } from '../entities/ticket.entity';
import { Guest } from '../entities/guest.entity';

async function clear() {
  console.log('TicketBox — Clear Database');

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [User, Otp, Concert, TicketType, Order, Ticket, Guest],
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log('Connected to database');

  // Truncate in dependency order: children before parents
  await dataSource.query('TRUNCATE TABLE tickets CASCADE');
  await dataSource.query('TRUNCATE TABLE orders CASCADE');
  await dataSource.query('TRUNCATE TABLE ticket_types CASCADE');
  await dataSource.query('TRUNCATE TABLE guests CASCADE');
  await dataSource.query('TRUNCATE TABLE concerts CASCADE');
  await dataSource.query('TRUNCATE TABLE otps CASCADE');
  await dataSource.query('TRUNCATE TABLE users CASCADE');

  console.log('Cleared: tickets, orders, ticket_types, guests, concerts, otps, users');
  console.log('Run "npm run seed" to populate fresh data');

  await dataSource.destroy();
}

clear().catch(err => {
  console.error('Clear failed:', err);
  process.exit(1);
});
