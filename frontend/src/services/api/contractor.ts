import { apiGet, apiPost, apiPostFormData } from '@/lib/api';

export interface Contractor {
  _id: string;
  userId: any;
  rating?: number; // Rating out of 5
  assignedProjects: any[];
  contracts: {
    projectId: any;
    labourCountPerDay: number;
    ratePerLabourPerDay: number;
    gstRate: number;
    startDate: string;
    endDate?: string;
    isActive: boolean;
  }[];
}

export interface Labour {
  _id: string;
  contractorId: string;
  name: string;
  code: string;
  faceImageUrl?: string;
  faceEmbedding?: number[]; // Face embedding for recognition
  projectId: any;
  isActive: boolean;
}

export interface ContractorInvoice {
  _id: string;
  contractorId: any;
  projectId: any;
  weekStartDate: string;
  weekEndDate: string;
  labourCountTotal: number;
  ratePerLabour: number;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  status: 'PENDING_PM_APPROVAL' | 'APPROVED' | 'REJECTED';
  approvedBy?: any;
  approvedAt?: string;
  rejectedBy?: any;
  rejectedAt?: string;
  rejectionReason?: string;
  sentToOwner: boolean;
  invoiceNumber?: string;
  pdfUrl?: string;
  pdfSource?: 'GENERATED' | 'UPLOADED';
  pdfUploadedBy?: any;
  pdfUploadedAt?: string;
}

export const contractorApi = {
  // Get all contractors (Owner)
  getAllContractors: async () => {
    const response = await apiGet<Contractor[]>('/contractor');
    return response.data;
  },

  // Get all contractors (Owner) - alias
  getContractors: async () => {
    const response = await apiGet<Contractor[]>('/contractor');
    return response.data;
  },

  // Assign contractor to project (Owner)
  assignToProject: async (data: {
    contractorUserId: string;
    projectId: string;
    labourCountPerDay: number;
    ratePerLabourPerDay: number;
    gstRate?: number;
    startDate: string;
    endDate?: string;
  }) => {
    const response = await apiPost<Contractor>('/contractor/assign', data);
    return response.data;
  },

  // Register labour (Contractor)
  registerLabour: async (data: {
    name: string;
    faceImageUrl?: string;
    faceEmbedding?: number[]; // Face embedding for recognition
    projectId: string;
  }) => {
    const response = await apiPost<Labour>('/contractor/labour', data);
    return response.data;
  },

  // Get labours
  getLabours: async (projectId?: string) => {
    const params = projectId ? { projectId } : {};
    const response = await apiGet<Labour[]>('/contractor/labours', params);
    return response.data;
  },

  // Upload attendance (Contractor)
  uploadAttendance: async (data: {
    projectId: string;
    date: string;
    groupPhotoUrl: string;
    presentLabourIds: string[];
    detectedFaces?: string[]; // Labour IDs whose faces were detected
    latitude?: number; // GPS latitude
    longitude?: number; // GPS longitude
  }) => {
    const response = await apiPost<any>('/contractor/attendance', data);
    return response.data;
  },

  // Get attendance summary
  getAttendanceSummary: async (projectId: string, startDate?: string, endDate?: string) => {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await apiGet<any>(`/contractor/attendance/summary/${projectId}`, params);
    return response.data;
  },

  // Create weekly invoice (Contractor)
  createInvoice: async (data: {
    projectId: string;
    weekStartDate: string;
    weekEndDate: string;
  }) => {
    const response = await apiPost<ContractorInvoice>('/contractor/invoice', data);
    return response.data;
  },

  // Get pending invoices (Manager)
  getPendingInvoices: async () => {
    const response = await apiGet<ContractorInvoice[]>('/contractor/invoices/pending');
    return response.data;
  },

  // Get approved invoices (Owner)
  getApprovedInvoices: async () => {
    const response = await apiGet<ContractorInvoice[]>('/contractor/invoices/approved');
    return response.data;
  },

  // Get my invoices (Contractor)
  getMyInvoices: async () => {
    const response = await apiGet<ContractorInvoice[]>('/contractor/invoices/my');
    return response.data;
  },

  // Approve invoice (Manager)
  approveInvoice: async (id: string) => {
    const response = await apiPost<ContractorInvoice>(`/contractor/invoice/${id}/approve`, {});
    return response.data;
  },

  // Reject invoice (Manager)
  rejectInvoice: async (id: string, rejectionReason: string) => {
    const response = await apiPost<ContractorInvoice>(`/contractor/invoice/${id}/reject`, { rejectionReason });
    return response.data;
  },

  // Upload/import invoice PDF (Contractor)
  uploadInvoicePdf: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('pdf', file);
    const response = await apiPostFormData<ContractorInvoice>(`/contractor/invoice/${id}/upload-pdf`, formData);
    return response.data;
  },
};
