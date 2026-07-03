import apiClient from './apiClient';
import type { BookingResponse, BookingStatusResponse } from '../types';

export const bookingService = {
  createBooking: async (
    ticketTypeId: string,
    quantity: number,
    idempotencyKey: string,
    captchaToken: string,
  ): Promise<BookingResponse> => {
    const res = await apiClient.post(
      '/booking',
      { ticketTypeId, quantity },
      {
        headers: {
          // Header chống double-click — Redis SET NX ở backend
          'Idempotency-Key': idempotencyKey,
          'x-turnstile-token': captchaToken,
        },
      },
    );
    return res.data;
  },

  // Poll mỗi 2s check order đã được create xong chưa
  checkStatus: async (idempotencyKey: string): Promise<BookingStatusResponse> => {
    const res = await apiClient.get('/booking/status', {
      params: { key: idempotencyKey },
    });
    return res.data;
  },
};
