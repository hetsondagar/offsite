import { apiGet, apiPost } from '@/lib/api';

export interface MaterialCatalog {
  _id: string;
  name: string;
  unit: string;
  defaultAnomalyThreshold: number;
  category?: string;
  isActive: boolean;
}

export interface MaterialRequest {
  _id: string;
  projectId: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  reason: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected';
  anomalyDetected: boolean;
  anomalyReason?: string;
  approvedBy?: string;
  rejectedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string;
}

export const materialsApi = {
  getCatalog: async () => {
    const response = await apiGet<{ materials: MaterialCatalog[]; grouped: Record<string, MaterialCatalog[]> }>('/materials/catalog');
    // Backend returns { materials: [...], grouped: {...} }, so we need to extract the materials array
    return response.data?.materials || [];
  },

  getPending: async (page = 1, limit = 10) => {
    const response = await apiGet<{ requests: MaterialRequest[]; pagination: any }>('/materials/pending', { page, limit });
    return response.data;
  },

  createRequest: async (data: {
    projectId: string;
    materialId: string;
    materialName: string;
    quantity: number;
    unit: string;
    reason: string;
  }) => {
    const response = await apiPost<MaterialRequest>('/materials/request', data);
    return response.data;
  },

  approve: async (id: string) => {
    const response = await apiPost<MaterialRequest>(`/materials/${id}/approve`, {});
    return response.data;
  },

  reject: async (id: string, rejectionReason: string) => {
    const response = await apiPost<MaterialRequest>(`/materials/${id}/reject`, { rejectionReason });
    return response.data;
  },
};

