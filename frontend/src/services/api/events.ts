import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

export interface Event {
  _id: string;
  projectId: string;
  title: string;
  description?: string;
  type: 'meeting' | 'inspection' | 'delivery' | 'safety' | 'maintenance' | 'other';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  startDate: string;
  endDate?: string;
  location?: string;
  createdBy: string;
  attendees?: string[];
  reminders?: string[];
  createdAt: string;
  updatedAt: string;
}

export const eventsApi = {
  getAll: async (projectId?: string, page = 1, limit = 10) => {
    const params: any = { page, limit };
    if (projectId) params.projectId = projectId;
    const response = await apiGet<{ events: Event[]; pagination: any }>('/events', params);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiGet<Event>(`/events/${id}`);
    return response.data;
  },

  create: async (data: {
    projectId: string;
    title: string;
    description?: string;
    type: 'meeting' | 'inspection' | 'delivery' | 'safety' | 'maintenance' | 'other';
    startDate: string;
    endDate?: string;
    location?: string;
    attendees?: string[];
    reminders?: string[];
  }) => {
    const response = await apiPost<Event>('/events', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Event>) => {
    const response = await apiPatch<Event>(`/events/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiDelete(`/events/${id}`);
    return response;
  },
};

