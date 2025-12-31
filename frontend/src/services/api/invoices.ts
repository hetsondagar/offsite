import { apiGet, apiPost } from '@/lib/api';

export interface InvoiceItem {
  name: string;
  qty: number;
  rate: number;
  amount: number;
  gst: number;
}

export interface Invoice {
  _id: string;
  invoiceId: string;
  projectId: string;
  items: InvoiceItem[];
  subtotal: number;
  gst: number;
  total: number;
  status: 'pending' | 'paid' | 'overdue';
  createdAt: string;
  updatedAt: string;
}

export const invoicesApi = {
  getAll: async (page = 1, limit = 10) => {
    const response = await apiGet<{ invoices: Invoice[]; pagination: any }>('/invoices', { page, limit });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiGet<Invoice>(`/invoices/${id}`);
    return response.data;
  },

  create: async (data: {
    projectId: string;
    items: Array<{
      name: string;
      qty: number;
      rate: number;
      gst?: number;
    }>;
  }) => {
    const response = await apiPost<Invoice>('/invoices', data);
    return response.data;
  },
};

