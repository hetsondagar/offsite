import { apiGet, apiPost } from '@/lib/api';

export interface Permit {
  _id: string;
  projectId: any;
  requestedBy: any;
  taskDescription: string;
  hazardType: string;
  safetyMeasures: string[];
  status: 'PENDING' | 'APPROVED' | 'OTP_GENERATED' | 'COMPLETED' | 'EXPIRED';
  approvedBy?: any;
  approvedAt?: string;
  otpGeneratedAt?: string;
  otpExpiresAt?: string;
  otpUsed: boolean;
  workStartedAt?: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
}

export const permitsApi = {
  // Create permit (Engineer)
  createPermit: async (data: {
    projectId: string;
    taskDescription: string;
    hazardType: string;
    safetyMeasures?: string[];
    notes?: string;
  }) => {
    const response = await apiPost<Permit>('/permits', data);
    return response.data;
  },

  // Get my permits (Engineer)
  getMyPermits: async () => {
    const response = await apiGet<Permit[]>('/permits/my');
    return response.data;
  },

  // Get pending permits (Manager)
  getPendingPermits: async () => {
    const response = await apiGet<Permit[]>('/permits/pending');
    return response.data;
  },

  // Approve permit (Manager)
  approvePermit: async (id: string) => {
    const response = await apiPost<Permit>(`/permits/${id}/approve`, {});
    return response.data;
  },

  // Verify OTP (Engineer)
  verifyOTP: async (id: string, otp: string) => {
    const response = await apiPost<Permit>(`/permits/${id}/verify-otp`, { otp });
    return response.data;
  },

  // Get permits by project
  getPermitsByProject: async (projectId: string) => {
    const response = await apiGet<Permit[]>(`/permits/project/${projectId}`);
    return response.data;
  },
};
