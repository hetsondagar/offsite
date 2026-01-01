import { apiGet, apiPost, apiPatch } from '@/lib/api';

export interface Notification {
  _id: string;
  userId: string;
  offsiteId?: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectInvitation {
  _id: string;
  projectId: {
    _id: string;
    name: string;
    location: string;
    startDate: string;
    endDate?: string;
  };
  userId: string;
  offsiteId: string;
  invitedBy: {
    _id: string;
    name: string;
    offsiteId: string;
  };
  role: 'engineer' | 'manager';
  status: 'pending' | 'accepted' | 'rejected';
  respondedAt?: string;
  createdAt: string;
}

export const notificationsApi = {
  getMyNotifications: async (page = 1, limit = 20, unreadOnly = false) => {
    const response = await apiGet<{
      notifications: Notification[];
      pagination: any;
      unreadCount: number;
    }>('/notifications/me', { page, limit, unreadOnly: unreadOnly.toString() });
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await apiPatch(`/notifications/${id}/read`, {});
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await apiPatch('/notifications/me/read-all', {});
    return response.data;
  },

  getMyInvitations: async () => {
    const response = await apiGet<ProjectInvitation[]>('/projects/invitations/me');
    // The API returns { success: true, data: invitations[] }
    // So response.data is already the array
    const data = response.data;
    return Array.isArray(data) ? data : [];
  },

  acceptInvitation: async (id: string) => {
    const response = await apiPost(`/projects/invitations/${id}/accept`, {});
    return response.data;
  },

  rejectInvitation: async (id: string) => {
    const response = await apiPost(`/projects/invitations/${id}/reject`, {});
    return response.data;
  },
};

