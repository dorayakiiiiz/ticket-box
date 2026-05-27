import apiClient from './apiClient';
import { EVENTS, HERO_SLIDES, CATEGORIES, UPCOMING, ZONES } from './mockData';
import { EventInfo, ZoneInfo } from '../types';

// Hàm delay để giả lập mạng
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const concertService = {
  getHeroSlides: async () => {
    try {
      const response = await apiClient.get('/concerts/hero');
      return response.data;
    } catch (error) {
      // Mock fallback
      await delay(500);
      return HERO_SLIDES;
    }
  },

  getAllEvents: async (): Promise<EventInfo[]> => {
    try {
      const response = await apiClient.get('/concerts');
      return response.data;
    } catch (error) {
      await delay(500);
      return EVENTS;
    }
  },

  getEventById: async (id: number): Promise<EventInfo | undefined> => {
    try {
      const response = await apiClient.get(`/concerts/${id}`);
      return response.data;
    } catch (error) {
      await delay(500);
      return EVENTS.find(e => e.id === id);
    }
  },

  getCategories: async () => {
    try {
      const response = await apiClient.get('/concerts/categories');
      return response.data;
    } catch (error) {
      await delay(300);
      return CATEGORIES;
    }
  },

  getUpcomingEvents: async () => {
    try {
      const response = await apiClient.get('/concerts/upcoming');
      return response.data;
    } catch (error) {
      await delay(400);
      return UPCOMING;
    }
  },

  getZones: async (): Promise<ZoneInfo[]> => {
    try {
      const response = await apiClient.get('/tickets/zones');
      return response.data;
    } catch (error) {
      await delay(300);
      return ZONES;
    }
  }
};
