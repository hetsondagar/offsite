import { apiGet, apiPost } from '@/lib/api';

export interface PettyCash {
  _id: string;
  projectId: any;
  submittedBy: any;
  amount: number;
  description: string;
  category: string;
  receiptPhotoUrl?: string;
  geoLocation?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  distanceFromSite?: number;
  geoFenceValid: boolean;
  status: 'PENDING_PM_APPROVAL' | 'PENDING_OWNER_APPROVAL' | 'APPROVED' | 'REJECTED';
  pmApprovedBy?: any;
  pmApprovedAt?: string;
  ownerApprovedBy?: any;
  ownerApprovedAt?: string;
  rejectedBy?: any;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export const pettyCashApi = {
  // Submit expense (Manager)
  submitExpense: async (data: {
    projectId: string;
    amount: number;
    description: string;
    category: string;
    receiptPhotoUrl?: string;
    geoLocation?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const response = await apiPost<PettyCash>('/petty-cash', data);
    return response.data;
  },

  // Get pending expenses
  getPendingExpenses: async () => {
    const response = await apiGet<PettyCash[]>('/petty-cash/pending');
    return response.data;
  },

  // Get all expenses (Owner)
  getAllExpenses: async (page = 1, limit = 50, status?: string, projectId?: string) => {
    const params: any = { page, limit };
    if (status) params.status = status;
    if (projectId) params.projectId = projectId;
    const response = await apiGet<{ expenses: PettyCash[]; pagination: any; summary: any }>(
      '/petty-cash/all',
      params
    );
    return response.data;
  },

  // Get my expenses
  getMyExpenses: async () => {
    const response = await apiGet<PettyCash[]>('/petty-cash/my');
    return response.data;
  },

  // Approve expense
  approveExpense: async (id: string) => {
    const response = await apiPost<PettyCash>(`/petty-cash/${id}/approve`, {});
    return response.data;
  },

  // Reject expense
  rejectExpense: async (id: string, rejectionReason: string) => {
    const response = await apiPost<PettyCash>(`/petty-cash/${id}/reject`, { rejectionReason });
    return response.data;
  },
};
