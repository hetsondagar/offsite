import { apiGet, apiPost, apiDelete } from '@/lib/api';

export interface ToolHistory {
  action: 'ISSUED' | 'RETURNED';
  workerId?: string;
  workerName: string;
  projectId: string;
  timestamp: string;
  notes?: string;
}

export interface Tool {
  _id: string;
  toolId: string;
  name: string;
  description?: string;
  category?: string;
  status: 'AVAILABLE' | 'ISSUED';
  currentHolderWorkerId?: any;
  currentHolderName?: string;
  currentLabourName?: string;
  currentProjectId?: any;
  issuedAt?: string;
  history: ToolHistory[];
  createdBy: any;
  createdAt: string;
}

export const toolsApi = {
  // Create tool
  createTool: async (data: {
    name: string;
    description?: string;
    category?: string;
  }) => {
    const response = await apiPost<Tool>('/tools', data);
    return response.data;
  },

  // Get all tools
  getAllTools: async (page = 1, limit = 50, status?: string, category?: string) => {
    const params: any = { page, limit };
    if (status) params.status = status;
    if (category) params.category = category;
    const response = await apiGet<{ tools: Tool[]; pagination: any }>('/tools', params);
    return response.data;
  },

  // Issue tool
  issueTool: async (toolId: string, data: {
    labourName?: string;
    workerId?: string;
    projectId: string;
    notes?: string;
  }) => {
    const response = await apiPost<Tool>(`/tools/${toolId}/issue`, data);
    return response.data;
  },

  // Return tool
  returnTool: async (toolId: string, notes?: string) => {
    const response = await apiPost<Tool>(`/tools/${toolId}/return`, { notes });
    return response.data;
  },

  // Get tool history
  getToolHistory: async (toolId: string) => {
    const response = await apiGet<{ tool: any; history: ToolHistory[] }>(`/tools/${toolId}/history`);
    return response.data;
  },

  // Delete tool
  deleteTool: async (toolId: string) => {
    const response = await apiDelete(`/tools/${toolId}`);
    return response.data;
  },
};
