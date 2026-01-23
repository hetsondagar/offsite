import { openDB, DBSchema, IDBPDatabase } from 'idb';

/** Generate client-side UUID for offline records. */
export function generateOfflineId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/** Standard offline record metadata. All offline records MUST include these. */
export interface OfflineRecordMeta {
  id: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  synced: boolean;
  retryCount: number;
  lastError?: string;
}

interface OffSiteDB extends DBSchema {
  dprs: {
    key: string;
    value: {
      id: string;
      projectId: string;
      taskId: string;
      photos: string[];
      notes: string;
      aiSummary: string;
      workStoppage?: {
        occurred: boolean;
        reason?: string;
        durationHours?: number;
        remarks?: string;
        evidencePhotos?: string[];
      };
      timestamp: number;
      createdBy?: string;
      createdAt: string;
      updatedAt: string;
      synced: boolean;
      retryCount: number;
      lastError?: string;
    };
  };
  attendance: {
    key: string;
    value: {
      id: string;
      projectId: string;
      userId?: string;
      type: 'checkin' | 'checkout';
      location: string;
      latitude?: number;
      longitude?: number;
      timestamp: number;
      markedAt?: string;
      createdAt: string;
      updatedAt: string;
      synced: boolean;
      retryCount: number;
      lastError?: string;
    };
  };
  materials: {
    key: string;
    value: {
      id: string;
      projectId: string;
      materialId: string;
      materialName?: string;
      quantity: number;
      unit?: string;
      reason: string;
      timestamp: number;
      requestedBy?: string;
      requestedAt?: string;
      createdAt: string;
      updatedAt: string;
      synced: boolean;
      retryCount: number;
      lastError?: string;
    };
  };
  aiCache: {
    key: string;
    value: {
      id: string;
      type: 'risk' | 'anomalies';
      siteId: string;
      data: any;
      timestamp: number;
    };
    indexes: { siteId: string; type: string };
  };
  apiCache: {
    key: string;
    value: {
      key: string;
      response: any;
      timestamp: number;
    };
  };
}

let dbInstance: IDBPDatabase<OffSiteDB> | null = null;

const DB_VERSION = 4;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100; // Initial delay, doubles on each retry

/**
 * Retry wrapper for IndexedDB operations with exponential backoff
 * Android-specific: Handles storage reliability issues on low-end devices
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY_MS
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) {
      console.error('IndexedDB operation failed after retries:', error);
      throw error;
    }

    // Check if error is retryable (QuotaExceededError, TransactionInactiveError, etc.)
    const isRetryable = error instanceof Error && (
      error.name === 'QuotaExceededError' ||
      error.name === 'TransactionInactiveError' ||
      error.name === 'InvalidStateError' ||
      error.message?.includes('transaction') ||
      error.message?.includes('database')
    );

    if (!isRetryable) {
      throw error; // Don't retry non-retryable errors
    }

    // Wait before retrying (exponential backoff)
    await new Promise(resolve => setTimeout(resolve, delay));

    // Retry with doubled delay
    return withRetry(operation, retries - 1, delay * 2);
  }
}

/**
 * Get database instance with retry and connection health check
 * Android-specific: Ensures database is ready before operations
 */
export async function getDB(): Promise<IDBPDatabase<OffSiteDB>> {
  if (dbInstance) {
    // Health check: verify database is still open
    try {
      if (dbInstance.objectStoreNames.length === 0) {
        // Database was closed, reset instance
        dbInstance = null;
      }
    } catch {
      // Database connection lost, reset instance
      dbInstance = null;
    }
  }

  if (dbInstance) {
    return dbInstance;
  }

  return withRetry(async () => {
    dbInstance = await openDB<OffSiteDB>('offsite-db', DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('dprs')) {
          db.createObjectStore('dprs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('attendance')) {
          db.createObjectStore('attendance', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('materials')) {
          db.createObjectStore('materials', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('aiCache')) {
          const aiStore = db.createObjectStore('aiCache', { keyPath: 'id' });
          aiStore.createIndex('siteId', 'siteId');
          aiStore.createIndex('type', 'type');
        }
        if (!db.objectStoreNames.contains('apiCache')) {
          db.createObjectStore('apiCache', { keyPath: 'key' });
        }
      },
      blocked() {
        // Another tab/page is using the database
        console.warn('IndexedDB upgrade blocked - another tab may be open');
      },
      blocking() {
        // This tab is blocking another tab's upgrade
        console.warn('IndexedDB upgrade blocking - close other tabs');
        // Close database to allow upgrade
        if (dbInstance) {
          dbInstance.close();
          dbInstance = null;
        }
      },
    });

    return dbInstance;
  });
}

function nowISO(): string {
  return new Date().toISOString();
}

// ----- DPR -----

export type DPRRecord = OffSiteDB['dprs']['value'];

export async function saveDPR(
  data: Omit<DPRRecord, 'id' | 'synced' | 'retryCount' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateOfflineId();
  const createdAt = nowISO();
  const updatedAt = createdAt;
  
  return withRetry(async () => {
    const db = await getDB();
    await db.put('dprs', {
      ...data,
      id,
      createdAt,
      updatedAt,
      synced: false,
      retryCount: 0,
    });
    return id;
  });
}

export async function getDPRs(): Promise<DPRRecord[]> {
  return withRetry(async () => {
    const db = await getDB();
    return db.getAll('dprs');
  });
}

export async function getUnsyncedDPRs(): Promise<DPRRecord[]> {
  return withRetry(async () => {
    const db = await getDB();
    const all = await db.getAll('dprs');
    return all.filter((d) => !d.synced);
  });
}

export async function markDPRSynced(id: string): Promise<void> {
  return withRetry(async () => {
    const db = await getDB();
    const dpr = await db.get('dprs', id);
    if (dpr) {
      dpr.synced = true;
      dpr.updatedAt = nowISO();
      if (dpr.lastError !== undefined) delete dpr.lastError;
      await db.put('dprs', dpr);
    }
  });
}

export async function markDPRFailed(id: string, errorMessage: string): Promise<void> {
  return withRetry(async () => {
    const db = await getDB();
    const dpr = await db.get('dprs', id);
    if (dpr) {
      dpr.retryCount = (dpr.retryCount ?? 0) + 1;
      dpr.lastError = errorMessage;
      dpr.updatedAt = nowISO();
      await db.put('dprs', dpr);
    }
  });
}

// ----- Attendance -----

export type AttendanceRecord = OffSiteDB['attendance']['value'];

export async function saveAttendance(
  data: Omit<AttendanceRecord, 'id' | 'synced' | 'retryCount' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateOfflineId();
  const createdAt = nowISO();
  const updatedAt = createdAt;
  
  return withRetry(async () => {
    const db = await getDB();
    await db.put('attendance', {
      ...data,
      id,
      createdAt,
      updatedAt,
      synced: false,
      retryCount: 0,
    });
    return id;
  });
}

export async function getAttendance(): Promise<AttendanceRecord[]> {
  return withRetry(async () => {
    const db = await getDB();
    return db.getAll('attendance');
  });
}

export interface CheckInState {
  isCheckedIn: boolean;
  projectId?: string;
  checkInTime?: string;
  checkInId?: string;
  location?: { latitude: number; longitude: number; address: string };
}

/** Derive check-in state from unsynced attendance. Latest record wins; check-in without later checkout = checked in. */
export async function getCheckInStateFromIndexedDB(): Promise<CheckInState> {
  const all = await getUnsyncedAttendance();
  if (all.length === 0) return { isCheckedIn: false };
  const sorted = [...all].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  const latest = sorted[0];
  if (latest.type === 'checkout') return { isCheckedIn: false };
  const time = latest.markedAt
    ? new Date(latest.markedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : new Date(latest.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const loc =
    latest.latitude != null && latest.longitude != null
      ? {
          latitude: latest.latitude,
          longitude: latest.longitude,
          address: latest.location || `Coordinates: ${latest.latitude.toFixed(6)}, ${latest.longitude.toFixed(6)}`,
        }
      : undefined;
  return {
    isCheckedIn: true,
    projectId: latest.projectId,
    checkInTime: time,
    checkInId: latest.id,
    location: loc,
  };
}

export async function getUnsyncedAttendance(): Promise<AttendanceRecord[]> {
  return withRetry(async () => {
    const db = await getDB();
    const all = await db.getAll('attendance');
    return all.filter((a) => !a.synced);
  });
}

export async function markAttendanceSynced(id: string): Promise<void> {
  return withRetry(async () => {
    const db = await getDB();
    const att = await db.get('attendance', id);
    if (att) {
      att.synced = true;
      att.updatedAt = nowISO();
      if (att.lastError !== undefined) delete att.lastError;
      await db.put('attendance', att);
    }
  });
}

export async function markAttendanceFailed(id: string, errorMessage: string): Promise<void> {
  return withRetry(async () => {
    const db = await getDB();
    const att = await db.get('attendance', id);
    if (att) {
      att.retryCount = (att.retryCount ?? 0) + 1;
      att.lastError = errorMessage;
      att.updatedAt = nowISO();
      await db.put('attendance', att);
    }
  });
}

// ----- Materials -----

export type MaterialRecord = OffSiteDB['materials']['value'];

export async function saveMaterialRequest(
  data: Omit<MaterialRecord, 'id' | 'synced' | 'retryCount' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateOfflineId();
  const createdAt = nowISO();
  const updatedAt = createdAt;
  
  return withRetry(async () => {
    const db = await getDB();
    await db.put('materials', {
      ...data,
      id,
      createdAt,
      updatedAt,
      synced: false,
      retryCount: 0,
    });
    return id;
  });
}

export async function getMaterials(): Promise<MaterialRecord[]> {
  return withRetry(async () => {
    const db = await getDB();
    return db.getAll('materials');
  });
}

export async function getUnsyncedMaterials(): Promise<MaterialRecord[]> {
  return withRetry(async () => {
    const db = await getDB();
    const all = await db.getAll('materials');
    return all.filter((m) => !m.synced);
  });
}

export async function markMaterialSynced(id: string): Promise<void> {
  return withRetry(async () => {
    const db = await getDB();
    const mat = await db.get('materials', id);
    if (mat) {
      mat.synced = true;
      mat.updatedAt = nowISO();
      if (mat.lastError !== undefined) delete mat.lastError;
      await db.put('materials', mat);
    }
  });
}

export async function markMaterialFailed(id: string, errorMessage: string): Promise<void> {
  return withRetry(async () => {
    const db = await getDB();
    const mat = await db.get('materials', id);
    if (mat) {
      mat.retryCount = (mat.retryCount ?? 0) + 1;
      mat.lastError = errorMessage;
      mat.updatedAt = nowISO();
      await db.put('materials', mat);
    }
  });
}

// ----- AI Cache (TTL 1 hour) -----

export async function saveAICache(
  type: 'risk' | 'anomalies',
  siteId: string,
  data: any
): Promise<void> {
  return withRetry(async () => {
    const db = await getDB();
    const id = `${type}_${siteId}`;
    await db.put('aiCache', { id, type, siteId, data, timestamp: Date.now() });
  });
}

export async function getAICache(
  type: 'risk' | 'anomalies',
  siteId: string
): Promise<any | null> {
  return withRetry(async () => {
    const db = await getDB();
    const id = `${type}_${siteId}`;
    const cached = await db.get('aiCache', id);
    const TTL_MS = 60 * 60 * 1000;
    if (cached && Date.now() - cached.timestamp < TTL_MS) {
      return cached.data;
    }
    return null;
  });
}

// ----- API cache -----

export async function setApiCache(key: string, response: any): Promise<void> {
  return withRetry(async () => {
    const db = await getDB();
    if (!db.objectStoreNames.contains('apiCache')) return;
    await db.put('apiCache', { key, response, timestamp: Date.now() });
  }).catch((e) => {
    // Cache failures are non-critical, log but don't throw
    console.warn('Failed to set API cache:', e);
  });
}

export async function getApiCache<T = any>(
  key: string
): Promise<{ response: T; timestamp: number } | null> {
  return withRetry(async () => {
    const db = await getDB();
    if (!db.objectStoreNames.contains('apiCache')) return null;
    const entry = await db.get('apiCache', key);
    if (!entry) return null;
    return { response: entry.response as T, timestamp: entry.timestamp };
  }).catch((e) => {
    // Cache failures are non-critical, log but don't throw
    console.warn('Failed to get API cache:', e);
    return null;
  });
}
