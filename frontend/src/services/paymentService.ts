import apiClient from './apiClient';

export const paymentService = {
  /**
   * Tạo URL thanh toán
   * FE gọi endpoint này đẩy orderId và cổng thanh toán để lấy URL
   */
  createPaymentUrl: async (orderId: string, paymentMethod: 'VNPAY' | 'MOMO'): Promise<{ paymentUrl: string }> => {
    const res = await apiClient.post('/payment/create-url', {
      orderId,
      paymentMethod,
    });
    return res.data;
  },
};
