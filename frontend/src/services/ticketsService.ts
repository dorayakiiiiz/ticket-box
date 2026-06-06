import apiClient from './apiClient';

export interface Ticket {
  id: string;
  qrCode: string;
  status: string;
}

export interface MyOrder {
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
  tickets: Ticket[];
}

export const ticketsService = {
  getMyTickets: async (): Promise<MyOrder[]> => {
    const res = await apiClient.get('/tickets/my-tickets');
    return res.data;
  },
};
