export type ZoneInfo = {
  id: string;
  name: string;
  price: number;
  color: string;
  available: number;
  type: string;
};

export type ArtistInfo = {
  name: string;
  role: string;
};

export type EventInfo = {
  id: number;
  name: string;
  subtitle: string;
  artist: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  price: string;
  category: string;
  image: string;
  tag: string | null;
  tagStyle: string;
  sold: number;
  featured: boolean;
  description: string;
  artistList: ArtistInfo[];
};

// Types khớp với backend entity — dùng cho admin dashboard và API thật
export type TicketType = {
  id: string;
  name: string;
  price: number;
  totalQuantity: number;
  soldQuantity: number;
  maxPerUser: number;
  colorCode: string;
};

export type AiBioStatus = 'IDLE' | 'PROCESSING' | 'DONE' | 'FAILED';
export type ConcertStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export type Concert = {
  id: string;
  name: string;
  subtitle: string | null;
  description: string;
  venue: string;
  city: string;
  date: string;
  coverImageUrl: string | null;
  status: ConcertStatus;
  aiBio: string | null;
  aiBioStatus: AiBioStatus;
  ticketTypes: TicketType[];
  createdAt: string;
  updatedAt: string;
};
