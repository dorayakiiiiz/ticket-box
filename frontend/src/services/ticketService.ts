import apiClient from './apiClient';

export interface MyTicketOrder {
  orderId: string;
  orderCode: string;
  createdAt: string;
  totalAmount: number;
  quantity: number;
  concert: {
    id: string;
    name: string;
    date: string;
  };
  ticketType: {
    name: string;
    price: number;
  };
  tickets: Array<{
    id: string;
    qrCode: string; // Thực chất là UUID được backend sinh ra
    status: string; // VALID, USED...
  }>;
}

export const ticketService = {
  /**
   * Lấy danh sách vé (gom theo Order) của user hiện hành
   */
  getMyTickets: async (): Promise<MyTicketOrder[]> => {
    const res = await apiClient.get('/tickets/my-tickets');
    return res.data;
  },
};
