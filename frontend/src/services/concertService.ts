import apiClient from './apiClient';
import { EVENTS, ZONES } from './mockData';
import type { Concert, EventInfo, ZoneInfo } from '../types';

// Base URL cho server-side ISR fetch — chỉ define 1 lần ở đây
// apiClient không support next: { revalidate } nên ISR phải dùng native fetch
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ISR fetch dùng trong Server Components (page.tsx, concert/[id]/page.tsx)
export async function getAllConcerts(): Promise<Concert[]> {
  try {
    const res = await fetch(`${API_URL}/concerts`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getConcertDetail(id: string): Promise<Concert | null> {
  try {
    const res = await fetch(`${API_URL}/concerts/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export const concertService = {
  // Real API — used by main pages
  getAll: async (): Promise<Concert[]> => {
    const res = await apiClient.get('/concerts');
    return res.data;
  },

  getById: async (id: string): Promise<Concert> => {
    const res = await apiClient.get(`/concerts/${id}`);
    return res.data;
  },

  // Legacy mock methods — used by booking flow (will be replaced in Phase 3)
  getEventById: async (id: number): Promise<EventInfo | undefined> => {
    return EVENTS.find(e => e.id === id);
  },

  getZones: async (): Promise<ZoneInfo[]> => {
    return ZONES;
  },
};

// SWR fetcher cho availability endpoint — dùng apiClient (tự attach auth header)
// Trả thẳng data để SWR cache theo URL key
export const availabilityFetcher = (url: string) =>
  apiClient.get(url).then((r) => r.data);


// Helper: get cheapest ticket price from a concert
export function getMinPrice(concert: Concert): number {
  if (!concert.ticketTypes?.length) return 0;
  return Math.min(...concert.ticketTypes.map(t => t.price));
}

// Helper: get overall sold percentage across all ticket types
export function getSoldPercent(concert: Concert): number {
  if (!concert.ticketTypes?.length) return 0;
  const totalQty = concert.ticketTypes.reduce((sum, t) => sum + t.totalQuantity, 0);
  const soldQty = concert.ticketTypes.reduce((sum, t) => sum + t.soldQuantity, 0);
  if (totalQty === 0) return 0;
  return Math.round((soldQty / totalQty) * 100);
}

// Helper: format date string for display
export function formatConcertDate(isoDate: string): string {
  const d = new Date(isoDate);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
}
