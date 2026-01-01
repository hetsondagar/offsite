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
      timestamp: number;
      synced: boolean;
    };
  };
  attendance: {
    key: string;
    value: {
      id: string;
      type: 'checkin' | 'checkout';
      location: string;
      timestamp: number;
      synced: boolean;
    };
  };
  materials: {
    key: string;
    value: {
      id: string;
      materialId: string;
      quantity: number;
      reason: string;
      timestamp: number;
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
  };
}

let dbInstance: IDBPDatabase<OffSiteDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<OffSiteDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<OffSiteDB>('offsite-db', 1, {
    upgrade(db) {
      // Create object stores
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

