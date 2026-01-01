import { apiGet, apiPost, apiPatch } from '@/lib/api';

export interface BillingPeriod {
  from: string;
  to: string;
}

export interface Supplier {
  companyName: string;
  address: string;
  gstin: string;
  state: string;
}

export interface Client {
  name: string;
  address: string;
  gstin?: string;
  state: string;
}

export interface Invoice {
  _id: string;
  projectId: string | { _id: string; name: string; location: string };
  ownerId: string | { _id: string; name: string; email: string };
  billingPeriod: BillingPeriod;
  taxableAmount: number;
  gstRate: number;
  gstType: 'CGST_SGST' | 'IGST';
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  invoiceNumber?: string;
  status: 'DRAFT' | 'FINALIZED';
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  supplier: Supplier;
  client: Client;
  notes?: string;
  finalizedBy?: string | { _id: string; name: string; email: string };
  finalizedAt?: string;
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const invoicesApi = {
  getAll: async (page = 1, limit = 10, filters?: {
    projectId?: string;
    status?: 'DRAFT' | 'FINALIZED';
    paymentStatus?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  }) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.paymentStatus) params.append('paymentStatus', filters.paymentStatus);

    const response = await apiGet<{ invoices: Invoice[]; pagination: any }>(
      `/invoices?${params.toString()}`
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiGet<Invoice>(`/invoices/${id}`);
    return response.data;
  },

  create: async (data: {
    projectId: string;
    billingPeriod: BillingPeriod;
    gstRate?: number;
    supplier: Supplier;
    client: Client;
    notes?: string;
    taxableAmount?: number; // For offline drafts only
  }) => {
    const response = await apiPost<Invoice>('/invoices', data);
    return response.data;
  },

  finalize: async (id: string) => {
    const response = await apiPost<Invoice>(`/invoices/${id}/finalize`, {});
    return response.data;
  },

  downloadPDF: async (id: string): Promise<Blob> => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/invoices/${id}/pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download invoice PDF');
    }

    return response.blob();
  },

  updatePaymentStatus: async (id: string, paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID') => {
    const response = await apiPatch<Invoice>(`/invoices/${id}/payment-status`, { paymentStatus });
    return response.data;
  },
};
