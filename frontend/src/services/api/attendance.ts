import { apiGet, apiPost } from '@/lib/api';

export interface Attendance {
  _id: string;
  userId: string;
  projectId: string;
  type: 'checkin' | 'checkout';
  location: string;
  timestamp: string;
  synced: boolean;
  createdAt: string;
}

export const attendanceApi = {
  getByProject: async (projectId: string, page = 1, limit = 10) => {
    const response = await apiGet<{ attendance: Attendance[]; pagination: any }>(`/attendance/project/${projectId}`, { page, limit });
    return response.data;
  },

  checkIn: async (projectId: string, location: string) => {
    const response = await apiPost<Attendance>('/attendance/checkin', { projectId, location });
    return response.data;
  },

  checkOut: async (projectId: string) => {
    const response = await apiPost<Attendance>('/attendance/checkout', { projectId });
    return response.data;
  },
};

