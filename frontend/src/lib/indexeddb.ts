import { openDB, DBSchema, IDBPDatabase } from 'idb';

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
      createdAt?: string;
      synced: boolean;
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
      synced: boolean;
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
      synced: boolean;
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

export async function getDB(): Promise<IDBPDatabase<OffSiteDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  // Increment to version 3 to ensure apiCache store is created for existing databases
  dbInstance = await openDB<OffSiteDB>('offsite-db', 3, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Create dprs store if it doesn't exist
      if (!db.objectStoreNames.contains('dprs')) {
        db.createObjectStore('dprs', { keyPath: 'id' });
      }
      
      // Create attendance store if it doesn't exist
      if (!db.objectStoreNames.contains('attendance')) {
        db.createObjectStore('attendance', { keyPath: 'id' });
      }
      
      // Create materials store if it doesn't exist
      if (!db.objectStoreNames.contains('materials')) {
        db.createObjectStore('materials', { keyPath: 'id' });
      }
      
      // Ensure aiCache store exists (added in version 2)
      if (!db.objectStoreNames.contains('aiCache')) {
        const aiStore = db.createObjectStore('aiCache', { keyPath: 'id' });
        aiStore.createIndex('siteId', 'siteId');
        aiStore.createIndex('type', 'type');
      }

      // Ensure apiCache store exists (added in version 3)
      if (!db.objectStoreNames.contains('apiCache')) {
        db.createObjectStore('apiCache', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// DPR operations
export async function saveDPR(data: Omit<OffSiteDB['dprs']['value'], 'id' | 'synced'>) {
  const db = await getDB();
  const id = `dpr_${Date.now()}_${Math.random()}`;
  await db.put('dprs', {
    ...data,
    id,
    synced: false,
  });
  return id;
}

export async function getDPRs() {
  const db = await getDB();
  return db.getAll('dprs');
}

export async function getUnsyncedDPRs() {
  const db = await getDB();
  const all = await db.getAll('dprs');
  return all.filter(dpr => !dpr.synced);
}

export async function markDPRSynced(id: string) {
  const db = await getDB();
  const dpr = await db.get('dprs', id);
  if (dpr) {
    dpr.synced = true;
    await db.put('dprs', dpr);
  }
}

// Attendance operations
export async function saveAttendance(data: Omit<OffSiteDB['attendance']['value'], 'id' | 'synced'>) {
  const db = await getDB();
  const id = `att_${Date.now()}_${Math.random()}`;
  await db.put('attendance', {
    ...data,
    id,
    synced: false,
  });
  return id;
}

export async function getUnsyncedAttendance() {
  const db = await getDB();
  const all = await db.getAll('attendance');
  return all.filter(att => !att.synced);
}

export async function markAttendanceSynced(id: string) {
  const db = await getDB();
  const att = await db.get('attendance', id);
  if (att) {
    att.synced = true;
    await db.put('attendance', att);
  }
}

// Material operations
export async function saveMaterialRequest(data: Omit<OffSiteDB['materials']['value'], 'id' | 'synced'>) {
  const db = await getDB();
  const id = `mat_${Date.now()}_${Math.random()}`;
  await db.put('materials', {
    ...data,
    id,
    synced: false,
  });
  return id;
}

export async function getUnsyncedMaterials() {
  const db = await getDB();
  const all = await db.getAll('materials');
  return all.filter(mat => !mat.synced);
}

export async function markMaterialSynced(id: string) {
  const db = await getDB();
  const mat = await db.get('materials', id);
  if (mat) {
    mat.synced = true;
    await db.put('materials', mat);
  }
}

// AI Cache operations
export async function saveAICache(
  type: 'risk' | 'anomalies',
  siteId: string,
  data: any
) {
  const db = await getDB();
  const id = `${type}_${siteId}`;
  await db.put('aiCache', {
    id,
    type,
    siteId,
    data,
    timestamp: Date.now(),
  });
}

export async function getAICache(
  type: 'risk' | 'anomalies',
  siteId: string
): Promise<any | null> {
  const db = await getDB();
  const id = `${type}_${siteId}`;
  const cached = await db.get('aiCache', id);
  
  // Cache valid for 1 hour
  if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) {
    return cached.data;
  }
  
  return null;
}

// Generic API cache operations
export async function setApiCache(key: string, response: any) {
  try {
    const db = await getDB();
    // Verify the store exists before using it
    if (!db.objectStoreNames.contains('apiCache')) {
      console.warn('apiCache store does not exist, skipping cache write');
      return;
    }
    await db.put('apiCache', {
      key,
      response,
      timestamp: Date.now(),
    });
  } catch (error) {
    // Silently fail cache operations - they're not critical
    console.warn('Failed to set API cache:', error);
  }
}

export async function getApiCache<T = any>(
  key: string
): Promise<{ response: T; timestamp: number } | null> {
  try {
    const db = await getDB();
    // Verify the store exists before using it
    if (!db.objectStoreNames.contains('apiCache')) {
      return null;
    }
    const entry = await db.get('apiCache', key);
    if (!entry) return null;
    return { response: entry.response as T, timestamp: entry.timestamp };
  } catch (error) {
    // Silently fail cache operations - they're not critical
    console.warn('Failed to get API cache:', error);
    return null;
  }
}

