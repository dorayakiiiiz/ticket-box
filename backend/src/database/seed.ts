/**
 * Database Seed Script
 * Run: npm run seed
 *
 * - Idempotent: skips if concerts already exist
 * - Runs synchronize so tables are created without starting the server first
 * - 8 concerts, each with ticket types sized to their venue capacity
 * - soldQuantity is derived proportionally from the mock sold percentage
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

dotenv.config();

import { User, UserRole } from '../entities/user.entity';
import { Concert, ConcertStatus } from '../entities/concert.entity';
import { TicketType } from '../entities/ticket-type.entity';
import { Order } from '../entities/order.entity';
import { Ticket } from '../entities/ticket.entity';
import { Otp } from '../entities/otp.entity';
import { Guest } from '../entities/guest.entity';

// Helpers

/** Parse "14 THG 6, 2026" → Date */
function parseMockDate(dateStr: string): Date {
  const match = dateStr.match(/(\d+)\s+THG\s+(\d+),\s+(\d+)/);
  if (!match) throw new Error(`Cannot parse date string: "${dateStr}"`);
  const [, day, month, year] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), 18, 0, 0);
}

type TicketConfig = {
  name: string;
  price: number;
  total: number;
  color: string;
  maxPerUser?: number;
};

// Seed data: each concert has its own ticket types scaled to venue capacity.
// soldPercent -> soldQuantity = round(total * soldPercent / 100)

const CONCERT_SEED_DATA = [
  // 1. ANH TRAI SAY HI — large stadium, 5 tiers
  {
    name: 'ANH TRAI SAY HI',
    subtitle: 'ATSH Concert 2026',
    description:
      'Đêm diễn cuối năm của chương trình Anh Trai Say Hi với sự tham gia của toàn bộ dàn nghệ sĩ. Khán giả sẽ được thưởng thức những màn trình diễn đỉnh cao, kết hợp âm nhạc sôi động và hình ảnh sân khấu hoành tráng.',
    venue: 'Sân Vận Động Mỹ Đình',
    city: 'Hà Nội',
    date: '14 THG 6, 2026',
    coverImageUrl:
      'https://images.unsplash.com/photo-1566477712363-3c75dd39b416?w=800&h=600&fit=crop&auto=format',
    status: ConcertStatus.UPCOMING,
    soldPercent: 93,
    ticketTypes: [
      { name: 'SKY LOUNGE', price: 8_000_000, total: 50,   color: '#CCFF00', maxPerUser: 2 },
      { name: 'SVIP',       price: 5_000_000, total: 100,  color: '#FF2D20', maxPerUser: 2 },
      { name: 'VIP',        price: 4_000_000, total: 200,  color: '#C084FC', maxPerUser: 4 },
      { name: 'CAT 1',      price: 1_500_000, total: 500,  color: '#F97316', maxPerUser: 4 },
      { name: 'FANZONE',    price: 800_000,   total: 2000, color: '#38BDF8', maxPerUser: 6 },
    ] as TicketConfig[],
  },

  // 2. RAP VIET ALL-STARS — mid-size arena, 3 tiers
  {
    name: 'RAP VIỆT ALL-STARS',
    subtitle: 'Concert Rap Lớn Nhất Năm',
    description:
      'Tập hợp những cái tên đình đám nhất của làng rap Việt Nam trong một đêm nhạc không thể bỏ qua. Đây là lần đầu tiên các nghệ sĩ cùng đứng chung sân khấu.',
    venue: 'Nhà Thi Đấu Quân Khu 7',
    city: 'TP. Hồ Chí Minh',
    date: '22 THG 6, 2026',
    coverImageUrl:
      'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=700&h=500&fit=crop&auto=format',
    status: ConcertStatus.UPCOMING,
    soldPercent: 62,
    ticketTypes: [
      { name: 'VIP',     price: 2_000_000, total: 200,  color: '#C084FC', maxPerUser: 4 },
      { name: 'CAT 1',   price: 1_000_000, total: 500,  color: '#F97316', maxPerUser: 4 },
      { name: 'FANZONE', price: 500_000,   total: 1500, color: '#38BDF8', maxPerUser: 6 },
    ] as TicketConfig[],
  },

  // 3. BINZ x TOULIVER LIVE — small venue, 3 tiers
  {
    name: 'BINZ × TOULIVER LIVE',
    subtitle: 'Live In Concert',
    description:
      'Một đêm nhạc kết hợp rap và electronic độc đáo từ hai nghệ sĩ tài năng nhất Việt Nam. Âm nhạc live sẽ tạo ra một không gian trải nghiệm hoàn toàn khác biệt.',
    venue: 'GEM Center',
    city: 'TP. Hồ Chí Minh',
    date: '05 THG 7, 2026',
    coverImageUrl:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=700&h=500&fit=crop&auto=format',
    status: ConcertStatus.UPCOMING,
    soldPercent: 94,
    ticketTypes: [
      { name: 'SVIP',    price: 2_500_000, total: 100, color: '#FF2D20', maxPerUser: 2 },
      { name: 'VIP',     price: 1_500_000, total: 300, color: '#C084FC', maxPerUser: 4 },
      { name: 'FANZONE', price: 650_000,   total: 800, color: '#38BDF8', maxPerUser: 4 },
    ] as TicketConfig[],
  },

  // 4. DEN VAU — TROI OI! — mid-size hall, 3 tiers
  {
    name: 'ĐEN VÂU — TRỜI ƠI!',
    subtitle: 'Đêm Nhạc Trực Tiếp',
    description:
      'Đen Vâu trở lại với đêm nhạc solo đầy cảm xúc tại Hà Nội, mang đến những ca khúc đã đồng hành cùng hàng triệu người nghe.',
    venue: 'Cung Thể Thao Quần Ngựa',
    city: 'Hà Nội',
    date: '12 THG 7, 2026',
    coverImageUrl:
      'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=700&h=500&fit=crop&auto=format',
    status: ConcertStatus.UPCOMING,
    soldPercent: 45,
    ticketTypes: [
      { name: 'VIP',     price: 1_200_000, total: 150,  color: '#C084FC', maxPerUser: 4 },
      { name: 'CAT 1',   price: 800_000,   total: 400,  color: '#F97316', maxPerUser: 4 },
      { name: 'FANZONE', price: 400_000,   total: 1000, color: '#38BDF8', maxPerUser: 6 },
    ] as TicketConfig[],
  },

  // 5. MY TAM TOUR 2026 — theater, 4 premium tiers
  {
    name: 'MỸ TÂM TOUR 2026',
    subtitle: 'Hoa Hồng Có Gai',
    description:
      'Mỹ Tâm trở lại với world tour đầy hoành tráng sau nhiều năm chờ đợi. Đêm diễn sẽ kể lại hành trình âm nhạc hơn 20 năm của người phụ nữ mạnh mẽ nhất Vpop.',
    venue: 'Nhà Hát Hòa Bình',
    city: 'TP. Hồ Chí Minh',
    date: '19 THG 7, 2026',
    coverImageUrl:
      'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=700&h=500&fit=crop&auto=format',
    status: ConcertStatus.UPCOMING,
    soldPercent: 71,
    ticketTypes: [
      { name: 'SVIP',    price: 4_000_000, total: 80,  color: '#FF2D20', maxPerUser: 2 },
      { name: 'VIP',     price: 2_500_000, total: 200, color: '#C084FC', maxPerUser: 4 },
      { name: 'CAT 1',   price: 1_200_000, total: 400, color: '#F97316', maxPerUser: 4 },
      { name: 'FANZONE', price: 850_000,   total: 800, color: '#38BDF8', maxPerUser: 6 },
    ] as TicketConfig[],
  },

  // 6. AFTERPARTY FESTIVAL — large EDM festival, 4 tiers
  {
    name: 'AFTERPARTY FESTIVAL',
    subtitle: 'EDM & Electronic Night',
    description:
      'Festival EDM quốc tế lớn nhất từ trước đến nay tại Việt Nam. Bốn DJ hàng đầu thế giới sẽ cùng khuấy động Sài Gòn trong một đêm không ngủ.',
    venue: 'SECC',
    city: 'TP. Hồ Chí Minh',
    date: '02 THG 8, 2026',
    coverImageUrl:
      'https://images.unsplash.com/photo-1565035010268-a3816f98589a?w=700&h=500&fit=crop&auto=format',
    status: ConcertStatus.UPCOMING,
    soldPercent: 58,
    ticketTypes: [
      { name: 'SKY LOUNGE', price: 8_000_000, total: 30,   color: '#CCFF00', maxPerUser: 2 },
      { name: 'VIP TABLE',  price: 4_000_000, total: 150,  color: '#C084FC', maxPerUser: 4 },
      { name: 'CAT 1',      price: 2_000_000, total: 500,  color: '#F97316', maxPerUser: 4 },
      { name: 'STANDING',   price: 1_200_000, total: 3000, color: '#38BDF8', maxPerUser: 8 },
    ] as TicketConfig[],
  },

  // 7. MCK & OBITO — small venue, 2 tiers
  {
    name: 'MCK & OBITO',
    subtitle: 'Anh Đã Ổn Hơn Concert',
    description:
      'MCK và Obito hội ngộ trong đêm concert đặc biệt tại Đà Nẵng, mang lại những khoảnh khắc âm nhạc chữa lành và đầy năng lượng.',
    venue: 'TT Hội Nghị 8 Hoàng Diệu',
    city: 'Đà Nẵng',
    date: '26 THG 7, 2026',
    coverImageUrl:
      'https://images.unsplash.com/photo-1563841930606-67e2bce48b78?w=700&h=500&fit=crop&auto=format',
    status: ConcertStatus.UPCOMING,
    soldPercent: 33,
    ticketTypes: [
      { name: 'VIP',     price: 1_000_000, total: 100, color: '#C084FC', maxPerUser: 4 },
      { name: 'FANZONE', price: 450_000,   total: 500, color: '#38BDF8', maxPerUser: 4 },
    ] as TicketConfig[],
  },

  // 8. MONO — WAITING FOR WINTER — intimate theater, 3 tiers
  {
    name: 'MONO — WAITING FOR WINTER',
    subtitle: 'First Solo Concert',
    description:
      'MONO ra mắt concert solo đầu tiên trong sự nghiệp tại một trong những sân khấu danh giá nhất Hà Nội. Một đêm nhạc R&B đầy cảm xúc.',
    venue: 'Nhà Hát Lớn Hà Nội',
    city: 'Hà Nội',
    date: '09 THG 8, 2026',
    coverImageUrl:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=700&h=500&fit=crop&auto=format',
    status: ConcertStatus.UPCOMING,
    soldPercent: 21,
    ticketTypes: [
      { name: 'SVIP',  price: 2_000_000, total: 50,  color: '#FF2D20', maxPerUser: 2 },
      { name: 'VIP',   price: 1_200_000, total: 150, color: '#C084FC', maxPerUser: 4 },
      { name: 'CAT 1', price: 600_000,   total: 300, color: '#F97316', maxPerUser: 4 },
    ] as TicketConfig[],
  },
] as const;

// Main

async function seed() {
  console.log('TicketBox — Database Seed');

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [User, Otp, Concert, TicketType, Order, Ticket, Guest],
    synchronize: true, // Creates tables if they do not exist yet
    logging: false,
  });

  await dataSource.initialize();
  console.log('Connected to database');

  const userRepo       = dataSource.getRepository(User);
  const concertRepo    = dataSource.getRepository(Concert);
  const ticketTypeRepo = dataSource.getRepository(TicketType);

  // Idempotency check
  const existingCount = await concertRepo.count();
  if (existingCount > 0) {
    console.log(`Skipped: ${existingCount} concerts already exist. Run "npm run seed:fresh" to reset.`);
    await dataSource.destroy();
    return;
  }

  // Seed users
  console.log('Seeding users...');

  const [organizerHash, audienceHash] = await Promise.all([
    bcrypt.hash('Password@123', 10),
    bcrypt.hash('Password@123', 10),
  ]);

  await userRepo.save([
    userRepo.create({
      email: 'organizer@ticketbox.vn',
      password: organizerHash,
      fullName: 'TicketBox Organizer',
      role: UserRole.ORGANIZER,
      isVerified: true,
    }),
    userRepo.create({
      email: 'user@ticketbox.vn',
      password: audienceHash,
      fullName: 'Nguyễn Văn A',
      role: UserRole.AUDIENCE,
      isVerified: true,
    }),
  ]);

  console.log('  organizer@ticketbox.vn  -> ORGANIZER');
  console.log('  user@ticketbox.vn       -> AUDIENCE');

  // Seed concerts and ticket types
  console.log('Seeding concerts...');

  for (const data of CONCERT_SEED_DATA) {
    const { ticketTypes, soldPercent, date: dateStr, ...concertFields } = data;

    // Save concert
    const concert = await concertRepo.save(
      concertRepo.create({
        ...concertFields,
        date: parseMockDate(dateStr),
        aiBioStatus: 'IDLE',
      }),
    );

    // soldQuantity is proportional to the sold percentage from mock data
    const ticketTypeEntities = ticketTypes.map(tt =>
      ticketTypeRepo.create({
        name: tt.name,
        price: tt.price,
        totalQuantity: tt.total,
        soldQuantity: Math.round(tt.total * soldPercent / 100),
        maxPerUser: tt.maxPerUser ?? 4,
        colorCode: tt.color,
        concert,
      }),
    );
    await ticketTypeRepo.save(ticketTypeEntities);

    const totalSeats = ticketTypes.reduce((sum, tt) => sum + tt.total, 0);
    console.log(
      `  ${data.name.padEnd(30)} ${ticketTypes.length} ticket types  |  ${totalSeats.toLocaleString()} seats  |  ${soldPercent}% sold`,
    );
  }

  // Summary
  const [concertCount, ticketTypeCount, userCount] = await Promise.all([
    concertRepo.count(),
    ticketTypeRepo.count(),
    userRepo.count(),
  ]);

  console.log('Seed complete.');
  console.log(`  Concerts:     ${concertCount}`);
  console.log(`  Ticket types: ${ticketTypeCount}`);
  console.log(`  Users:        ${userCount}`);
  console.log('Test accounts:');
  console.log('  organizer@ticketbox.vn  /  Password@123  (ORGANIZER)');
  console.log('  user@ticketbox.vn       /  Password@123  (AUDIENCE)');

  await dataSource.destroy();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
