import { apiPost } from '@/lib/api';

export interface SyncBatch {
  dprs?: any[];
  attendance?: any[];
  materials?: any[];
}

export interface SyncResponse {
  dprs: string[];
  attendance: string[];
  materials: string[];
}

export const syncApi = {
  batchSync: async (data: SyncBatch) => {
    const response = await apiPost<SyncResponse>('/sync/batch', data);
    return response.data;
  },
};

