import { apiGet } from '@/lib/api';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'engineer' | 'manager' | 'owner';
  offsiteId: string; // Unique OffSite ID (e.g., OSSE0023, OSPM0042, OSOW0001)
  assignedProjects: any[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const usersApi = {
  getMe: async () => {
    const response = await apiGet<User>('/users/me');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiGet<User>(`/users/${id}`);
    return response.data;
  },

  getByOffsiteId: async (offsiteId: string) => {
    const response = await apiGet<User>(`/users/offsite/${offsiteId}`);
    return response.data;
  },

  searchByOffsiteId: async (offsiteId: string) => {
    const response = await apiGet<User>('/notifications/search/user', { offsiteId });
    return response.data;
  },
};

