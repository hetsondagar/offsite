import { apiGet, apiPost } from '@/lib/api';

export interface DPR {
  _id: string;
  projectId: string;
  taskId: string;
  createdBy: string;
  photos: string[];
  notes?: string;
  aiSummary?: string;
  synced: boolean;
  createdAt: string;
  updatedAt: string;
}

export const dprApi = {
  getByProject: async (projectId: string, page = 1, limit = 10) => {
    const response = await apiGet<{ dprs: DPR[]; pagination: any }>(`/dpr/project/${projectId}`, { page, limit });
    return response.data;
  },

  create: async (data: {
    projectId: string;
    taskId: string;
    notes?: string;
    generateAISummary?: boolean;
  }, photos?: File[]) => {
    const formData = new FormData();
    formData.append('projectId', data.projectId);
    formData.append('taskId', data.taskId);
    if (data.notes) formData.append('notes', data.notes);
    if (data.generateAISummary) formData.append('generateAISummary', 'true');
    
    if (photos) {
      photos.forEach((photo) => {
        formData.append('photos', photo);
      });
    }

    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/dpr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to create DPR');
    }
    return result.data;
  },
};

