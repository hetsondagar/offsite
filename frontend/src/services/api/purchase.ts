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
  status: 'SENT' | 'RECEIVED';
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
