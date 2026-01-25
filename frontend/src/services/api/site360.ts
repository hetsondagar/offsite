import { apiGet, apiPost } from '@/lib/api';

export interface Site360Connection {
  label: string;
  targetNodeId: string | {
    _id: string;
    zoneName: string;
    imageUrl: string;
  };
}

export interface Site360Node {
  _id: string;
  projectId: string | {
    _id: string;
    name: string;
    location: string;
  };
  zoneName: string;
  imageUrl: string;
  uploadedBy: string | {
    _id: string;
    name: string;
    email: string;
    offsiteId: string;
  };
  connections: Site360Connection[];
  createdAt: string;
  updatedAt: string;
}

export const site360Api = {
  // Create a new node (Engineer only)
  createNode: async (data: {
    projectId: string;
    zoneName: string;
    connectToNodeId?: string;
    forwardLabel?: string;
    backLabel?: string;
    panorama: File;
  }) => {
    const formData = new FormData();
    formData.append('projectId', data.projectId);
    formData.append('zoneName', data.zoneName);
    formData.append('panorama', data.panorama);
    if (data.connectToNodeId) {
      formData.append('connectToNodeId', data.connectToNodeId);
    }
    if (data.forwardLabel) {
      formData.append('forwardLabel', data.forwardLabel);
    }
    if (data.backLabel) {
      formData.append('backLabel', data.backLabel);
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${apiUrl}/site360/nodes`, {
      method: 'POST',
      headers: {
        ...(token && token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create node' }));
      throw new Error(error.message || 'Failed to create node');
    }

    return response.json();
  },

  // Get all nodes for a project
  getProjectNodes: async (projectId: string) => {
    const response = await apiGet<Site360Node[]>(`/site360/project/${projectId}`);
    return response.data;
  },

  // Get node by ID
  getNode: async (nodeId: string) => {
    const response = await apiGet<Site360Node>(`/site360/node/${nodeId}`);
    return response.data;
  },
};
