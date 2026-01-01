export type UserRole = 'engineer' | 'manager' | 'owner';
export type TaskStatus = 'pending' | 'in-progress' | 'completed';
export type AttendanceType = 'checkin' | 'checkout';
export type MaterialRequestStatus = 'pending' | 'approved' | 'rejected';
export type InvoiceStatus = 'DRAFT' | 'FINALIZED';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
export type GstType = 'CGST_SGST' | 'IGST';
export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed' | 'archived';

export interface JWTPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

