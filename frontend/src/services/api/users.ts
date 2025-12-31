import { apiGet } from '@/lib/api';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'engineer' | 'manager' | 'owner';
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
};

