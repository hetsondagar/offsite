import { apiGet, apiPost } from '@/lib/api';

export type WorkStoppageReason = 
  | 'MATERIAL_DELAY'
  | 'LABOUR_SHORTAGE'
  | 'WEATHER'
  | 'MACHINE_BREAKDOWN'
  | 'APPROVAL_PENDING'
  | 'SAFETY_ISSUE';

export interface WorkStoppage {
  occurred: boolean;
  reason?: WorkStoppageReason;
  durationHours?: number;
  remarks?: string;
  evidencePhotos?: string[];
}

export interface DPR {
  _id: string;
  projectId: string;
  taskId: string;
  createdBy: string;
  photos: string[];
  notes?: string;
  aiSummary?: string;
  workStoppage?: WorkStoppage;
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
    workStoppage?: WorkStoppage;
  }, photos?: File[], stoppageEvidencePhotos?: File[]) => {
    const formData = new FormData();
    formData.append('projectId', data.projectId);
    formData.append('taskId', data.taskId);
    if (data.notes) formData.append('notes', data.notes);
    if (data.generateAISummary) formData.append('generateAISummary', 'true');
    
    // Add work stoppage data
    if (data.workStoppage) {
      formData.append('workStoppage[occurred]', data.workStoppage.occurred.toString());
      if (data.workStoppage.occurred) {
        if (data.workStoppage.reason) formData.append('workStoppage[reason]', data.workStoppage.reason);
        if (data.workStoppage.durationHours !== undefined) {
          formData.append('workStoppage[durationHours]', data.workStoppage.durationHours.toString());
        }
        if (data.workStoppage.remarks) formData.append('workStoppage[remarks]', data.workStoppage.remarks);
      }
    }
    
    // Regular DPR photos
    if (photos) {
      photos.forEach((photo) => {
        formData.append('photos', photo);
      });
    }
    
    // Work stoppage evidence photos (upload separately, then send URLs)
    // Note: For now, we'll upload evidence photos with regular photos
    // and mark them separately in the backend
    if (stoppageEvidencePhotos) {
      stoppageEvidencePhotos.forEach((photo) => {
        formData.append('photos', photo); // Upload with regular photos for now
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

