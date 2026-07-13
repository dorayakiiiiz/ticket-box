'use client';
import apiClient from './apiClient';
import type { Concert, CreateTicketTypePayload, UpdateTicketTypePayload, TicketType } from '../types';

type CreateConcertPayload = {
  name: string;
  subtitle?: string;
  description: string;
  venue: string;
  city: string;
  date: string;
  coverImageUrl?: string;
};

type UpdateConcertPayload = Partial<CreateConcertPayload> & {
  status?: string;

};

// Fetcher dùng cho SWR — trả về data trực tiếp
export const fetcher = (url: string) =>
  apiClient.get(url).then((r) => r.data);

type PaginatedConcerts = {
  data: Concert[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type DashboardData = {
  stats: {
    totalRevenue: number;
    totalTicketsSold: number;
    activeEvents: number;
    checkedInToday: number;
    updatedAt: string;
  };
  revenueChart: { label: string; revenue: number; tickets: number }[];
  concertPerformance: {
    id: string;
    name: string;
    soldQuantity: number;
    totalQuantity: number;
    soldPercent: number;
    revenue: number;
  }[];
};

export const adminService = {
  getDashboard: async (range: '7d' | '30d' = '7d'): Promise<DashboardData> => {
    const res = await apiClient.get(`/admin/dashboard?range=${range}`);
    return res.data;
  },

  getConcerts: async (page = 1, limit = 12, search = '', status = '', city = ''): Promise<PaginatedConcerts> => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search ? { search } : {}),
      ...(status ? { status } : {}),
      ...(city ? { city } : {}),
    });
    const res = await apiClient.get(`/concerts?${params}`);
    return res.data;
  },

  getConcertById: async (id: string): Promise<Concert> => {
    const res = await apiClient.get(`/concerts/${id}`);
    return res.data;
  },

  createConcert: async (payload: CreateConcertPayload): Promise<Concert> => {
    const res = await apiClient.post('/concerts', payload);
    return res.data;
  },

  updateConcert: async (id: string, payload: UpdateConcertPayload): Promise<Concert> => {
    const res = await apiClient.put(`/concerts/${id}`, payload);
    return res.data;
  },

  deleteConcert: async (id: string): Promise<void> => {
    await apiClient.delete(`/concerts/${id}`);
  },

  uploadBio: async (concertId: string, file: File): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    // Override timeout: PDF upload can take 30-60s on slow networks (default 10s too short)
    const res = await apiClient.post(`/concerts/${concertId}/upload-bio`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60_000,
    });
    return res.data;
  },

  resetBio: async (concertId: string): Promise<{ message: string }> => {
    const res = await apiClient.post(`/concerts/${concertId}/reset-bio`);
    return res.data;
  },

  // Upload ảnh concert (cover) hoặc sơ đồ chỗ ngồi (seatMap) lên Supabase Storage
  // type: 'cover' | 'seatMap' — backend phân biệt qua query param
  uploadConcertImage: async (concertId: string, file: File, type: 'cover' | 'seatMap'): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post(`/concerts/${concertId}/upload-image?type=${type}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30_000,
    });
    return res.data;
  },

  // ─── Ticket Type CRUD ────────────────────────────────────────────────────────

  createTicketType: async (concertId: string, payload: CreateTicketTypePayload): Promise<TicketType> => {
    const res = await apiClient.post(`/concerts/${concertId}/ticket-types`, payload);
    return res.data;
  },

  updateTicketType: async (concertId: string, typeId: string, payload: UpdateTicketTypePayload): Promise<TicketType> => {
    const res = await apiClient.put(`/concerts/${concertId}/ticket-types/${typeId}`, payload);
    return res.data;
  },

  deleteTicketType: async (concertId: string, typeId: string): Promise<void> => {
    await apiClient.delete(`/concerts/${concertId}/ticket-types/${typeId}`);
  },

  getOrders: async (page = 1, limit = 10, status = 'ALL', search = '') => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(status !== 'ALL' ? { status } : {}),
      ...(search ? { search } : {}),
    });
    const res = await apiClient.get(`/admin/orders?${params}`);
    return res.data;
  },

  // ─── User Management ─────────────────────────────────────────────────────────

  getUserStats: async () => {
    const res = await apiClient.get('/admin/users/stats');
    return res.data;
  },

  getUsers: async (page = 1, limit = 10, role = 'ALL', search = '') => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(role !== 'ALL' ? { role } : {}),
      ...(search ? { search } : {}),
    });
    const res = await apiClient.get(`/admin/users?${params}`);
    return res.data;
  },

  createUser: async (payload: any) => {
    const res = await apiClient.post('/admin/users', payload);
    return res.data;
  },

  updateUser: async (id: string, payload: { fullName?: string; role?: string }) => {
    const res = await apiClient.patch(`/admin/users/${id}`, payload);
    return res.data;
  },

  changeUserPassword: async (id: string, newPassword: string) => {
    const res = await apiClient.patch(`/admin/users/${id}/password`, { newPassword });
    return res.data;
  },

  deleteUser: async (id: string) => {
    const res = await apiClient.delete(`/admin/users/${id}`);
    return res.data;
  },

  // ─── Guest Management ────────────────────────────────────────────────────────

  getGuests: async (page = 1, limit = 10, search = '') => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search ? { search } : {}),
    });
    const res = await apiClient.get(`/guests?${params}`);
    return res.data;
  },

  createGuest: async (payload: { fullName: string; email?: string; phone?: string; concertId: string }) => {
    const res = await apiClient.post('/guests', payload);
    return res.data;
  },

  updateGuest: async (id: string, payload: { fullName?: string; email?: string; phone?: string; isCheckedIn?: boolean }) => {
    const res = await apiClient.patch(`/guests/${id}`, payload);
    return res.data;
  },

  deleteGuest: async (id: string) => {
    const res = await apiClient.delete(`/guests/${id}`);
    return res.data;
  },

  importGuestsCSV: async (concertId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post(`/guests/import-csv/${concertId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60_000,
    });
    return res.data;
  },
};
