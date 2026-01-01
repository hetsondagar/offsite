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
    const response = await apiGet<{
      project: Project;
      statistics: {
        tasks: {
          total: number;
          byStatus: {
            pending: number;
            'in-progress': number;
            completed: number;
          };
          recent: any[];
        };
        dprs: {
          total: number;
          recent: any[];
        };
        materials: {
          total: number;
          byStatus: {
            pending: number;
            approved: number;
            rejected: number;
          };
          recent: any[];
        };
        attendance: {
          total: number;
          todayCheckIns: number;
          recent: any[];
        };
        events: {
          total: number;
        };
      };
    }>(`/projects/${id}`);
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

  addMembers: async (id: string, data: {
    engineerOffsiteIds?: string[];
    managerOffsiteIds?: string[];
  }) => {
    const response = await apiPost<{ invitations: number }>(`/projects/${id}/members`, data);
    return response.data;
  },
};

