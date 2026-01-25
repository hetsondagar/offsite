import { apiGet, apiPost } from '@/lib/api';

export interface PurchaseHistory {
  _id: string;
  projectId: any;
  materialRequestId: string;
  materialId: string;
  materialName: string;
  qty: number;
  unit: string;
  gstRate: number;
  gstAmount: number;
  basePrice: number;
  totalCost: number;
  sentAt: string;
  sentBy: any;
  receivedAt?: string;
  receivedBy?: any;
  proofPhotoUrl?: string;
  geoLocation?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  status: 'PENDING_GRN' | 'SENT' | 'RECEIVED';
  grnGenerated?: boolean;
  grnGeneratedAt?: string;
}

export interface ApprovedRequest {
  _id: string;
  projectId: any;
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  reason: string;
  requestedBy: any;
  approvedBy: any;
  approvedAt: string;
  gstRate: number;
  approxPriceINR: number;
}

export const purchaseApi = {
  // Get approved requests ready to send (Purchase Manager)
  getApprovedRequests: async (page = 1, limit = 20) => {
    const response = await apiGet<{ requests: ApprovedRequest[]; pagination: any }>(
      '/purchase/approved-requests',
      { page, limit }
    );
    return response.data;
  },

  // Send material (Purchase Manager)
  sendMaterial: async (requestId: string, gstRate = 18) => {
    const response = await apiPost<PurchaseHistory>(`/purchase/send/${requestId}`, { gstRate });
    return response.data;
  },

  // Receive material (Engineer)
  receiveMaterial: async (historyId: string, data: {
    proofPhotoUrl?: string;
    geoLocation?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const response = await apiPost<PurchaseHistory>(`/purchase/receive/${historyId}`, data);
    return response.data;
  },

  // Get sent materials for engineer
  getSentForEngineer: async (page = 1, limit = 20) => {
    const response = await apiGet<{ history: PurchaseHistory[]; pagination: any }>(
      '/purchase/sent-for-engineer',
      { page, limit }
    );
    return response.data;
  },

  // Get history by project
  getHistoryByProject: async (projectId: string, page = 1, limit = 20, status?: string) => {
    const params: any = { page, limit };
    if (status) params.status = status;
    const response = await apiGet<{ history: PurchaseHistory[]; pagination: any }>(
      `/purchase/history/project/${projectId}`,
      params
    );
    return response.data;
  },

  // Get all history (Purchase Manager)
  getAllHistory: async (page = 1, limit = 20, status?: string) => {
    const params: any = { page, limit };
    if (status) params.status = status;
    const response = await apiGet<{ history: PurchaseHistory[]; pagination: any }>(
      '/purchase/history',
      params
    );
    return response.data;
  },
};

export interface PurchaseInvoice {
  _id: string;
  purchaseHistoryId: any;
  projectId: any;
  invoiceNumber: string;
  materialName: string;
  qty: number;
  unit: string;
  basePrice: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  generatedAt: string;
  generatedBy: any;
  receiptPhotoUrl?: string;
  receiptUploadedAt?: string;
  receiptUploadedBy?: any;
  pdfSentToOwner?: boolean;
  pdfSentToManager?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const purchaseInvoiceApi = {
  // Get purchase invoices (Manager/Owner)
  getInvoices: async (page = 1, limit = 20) => {
    const response = await apiGet<{ invoices: PurchaseInvoice[]; pagination: any }>(
      '/purchase/invoices',
      { page, limit }
    );
    return response.data;
  },

  // Get purchase invoice by ID
  getInvoiceById: async (id: string) => {
    const response = await apiGet<PurchaseInvoice>(`/purchase/invoices/${id}`);
    return response.data;
  },

  // Download PDF
  downloadPDF: async (id: string): Promise<Blob> => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${apiUrl}/purchase/invoices/${id}/pdf`, {
      method: 'GET',
      headers: {
        ...(token && token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {}),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
      throw new Error('Failed to download invoice PDF');
    }

    return response.blob();
  },

  // Upload receipt photo and send PDF (Purchase Manager)
  uploadReceiptAndSend: async (id: string, receiptFile: File): Promise<PurchaseInvoice> => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('accessToken');
    
    const formData = new FormData();
    formData.append('receipt', receiptFile);

    const response = await fetch(`${apiUrl}/purchase/invoices/${id}/upload-receipt`, {
      method: 'POST',
      headers: {
        ...(token && token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
      const error = await response.json().catch(() => ({ message: 'Failed to upload receipt' }));
      throw new Error(error.message || 'Failed to upload receipt');
    }

    return response.json();
  },
};
