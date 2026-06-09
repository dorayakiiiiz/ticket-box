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
  aiBio?: string;
};

// Fetcher dùng cho SWR — trả về data trực tiếp
export const fetcher = (url: string) =>
  apiClient.get(url).then((r) => r.data);

export const adminService = {
  getConcerts: async (): Promise<Concert[]> => {
    const res = await apiClient.get('/concerts');
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
};
