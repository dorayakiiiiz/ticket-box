import apiClient from './apiClient';
import type { BookingResponse, BookingStatusResponse } from '../types';

/**
 * bookingService — Service gọi API đặt vé Phase 3
 *
 * Sử dụng apiClient (tự gắn JWT token vào header Authorization)
 */
export const bookingService = {
  /**
   * Gửi request đặt vé — POST /booking
   *
   * @param ticketTypeId - UUID loại vé muốn mua (từ concert.ticketTypes)
   * @param quantity - Số lượng vé (1-10)
   * @param idempotencyKey - UUID sinh bởi FE, gắn vào header chống double-click
   * @returns BookingResponse (status, jobId, idempotencyKey)
   *
   * HTTP 202: Giữ vé thành công, đang tạo đơn
   * HTTP 400: Hết vé / Vượt limit
   * HTTP 409: Request trùng lặp (double-click)
   * HTTP 429: Rate limit (thao tác quá nhanh)
   */
  createBooking: async (
    ticketTypeId: string,
    quantity: number,
    idempotencyKey: string,
  ): Promise<BookingResponse> => {
    const res = await apiClient.post(
      '/booking',
      { ticketTypeId, quantity },
      {
        headers: {
          // Header chống double-click — Redis SET NX ở backend
          'Idempotency-Key': idempotencyKey,
        },
      },
    );
    return res.data;
  },

  /**
   * Polling kiểm tra Worker đã tạo order xong chưa — GET /booking/status
   *
   * FE gọi mỗi 2 giây sau khi POST /booking trả 202
   * Khi status === 'completed' → có orderId → chuyển trang
   *
   * @param idempotencyKey - UUID đã gửi lúc booking
   * @returns BookingStatusResponse (status, orderId)
   */
  checkStatus: async (idempotencyKey: string): Promise<BookingStatusResponse> => {
    const res = await apiClient.get('/booking/status', {
      params: { key: idempotencyKey },
    });
    return res.data;
  },
};
