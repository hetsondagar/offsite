import { apiGet, apiPost, apiPatch } from '@/lib/api';

export interface Task {
  _id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export const tasksApi = {
  getAll: async (projectId?: string) => {
    const params: any = {};
    if (projectId) params.projectId = projectId;
    const response = await apiGet<Task[]>('/tasks', params);
    return response.data;
  },

  create: async (data: {
    projectId: string;
    title: string;
    description?: string;
    assignedTo?: string;
    dueDate?: string;
  }) => {
    const response = await apiPost<Task>('/tasks', data);
    return response.data;
  },

  updateStatus: async (id: string, status: 'pending' | 'in-progress' | 'completed') => {
    const response = await apiPatch<Task>(`/tasks/${id}/status`, { status });
    return response.data;
  },
};

