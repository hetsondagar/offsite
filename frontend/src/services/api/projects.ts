import { apiGet, apiPost, apiPatch } from '@/lib/api';

export interface Project {
  _id: string;
  name: string;
  location: string;
  startDate: string;
  endDate?: string;
  status: string;
  members: any[];
  progress: number;
  healthScore: number;
  createdAt: string;
  updatedAt: string;
}

export const projectsApi = {
  getAll: async (page = 1, limit = 10) => {
    const response = await apiGet<{ projects: Project[]; pagination: any }>('/projects', { page, limit });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiGet<Project>(`/projects/${id}`);
    return response.data;
  },

  create: async (data: {
    name: string;
    location: string;
    startDate: string;
    endDate?: string;
    engineerOffsiteIds?: string[];
    managerOffsiteIds?: string[];
  }) => {
    const response = await apiPost<Project>('/projects', data);
    return response.data;
  },
};

