/**
 * Centralized Sync Engine. Single source of sync logic.
 * Sync order: Attendance → DPRs → Materials. FIFO within each type.
 * Each item synced individually via batch API. On failure: increment retry, store error, continue.
 */

import {
  getUnsyncedAttendance,
  getUnsyncedDPRs,
  getUnsyncedMaterials,
  markAttendanceSynced,
  markDPRSynced,
  markMaterialSynced,
  markAttendanceFailed,
  markDPRFailed,
  markMaterialFailed,
} from './indexeddb';
import { isOnline } from './network';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

async function batchSyncRequest(body: {
  dprs?: any[];
  attendance?: any[];
  materials?: any[];
}): Promise<{ dprs: string[]; attendance: string[]; materials: string[] }> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/sync/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token.trim()}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Sync request failed');

  return {
    dprs: data?.data?.dprs ?? [],
    attendance: data?.data?.attendance ?? [],
    materials: data?.data?.materials ?? [],
  };
}

export interface SyncResult {
  syncedAttendance: number;
  syncedDPRs: number;
  syncedMaterials: number;
  failed: number;
  errors: string[];
}

let isSyncing = false;

export function getIsSyncing(): boolean {
  return isSyncing;
}

/**
 * Run full sync. Call only when online.
 * Order: Attendance (FIFO) → DPRs (FIFO) → Materials (FIFO).
 * Each item sent individually; on failure we continue and record error.
 */
export async function runSync(): Promise<SyncResult> {
  if (isSyncing) {
    return { syncedAttendance: 0, syncedDPRs: 0, syncedMaterials: 0, failed: 0, errors: [] };
  }

  const online = await isOnline();
  if (!online) {
    return { syncedAttendance: 0, syncedDPRs: 0, syncedMaterials: 0, failed: 0, errors: [] };
  }

  if (!getToken()) {
    return { syncedAttendance: 0, syncedDPRs: 0, syncedMaterials: 0, failed: 0, errors: [] };
  }

  isSyncing = true;
  const result: SyncResult = {
    syncedAttendance: 0,
    syncedDPRs: 0,
    syncedMaterials: 0,
    failed: 0,
    errors: [],
  };

  try {
    const att = await getUnsyncedAttendance();
    const dprs = await getUnsyncedDPRs();
    const mats = await getUnsyncedMaterials();

    const sortByCreated = <T extends { createdAt?: string; timestamp?: number }>(a: T, b: T) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : (a.timestamp ?? 0);
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : (b.timestamp ?? 0);
      return ta - tb;
    };

    const attendanceOrdered = [...att].sort(sortByCreated);
    const dprsOrdered = [...dprs].sort(sortByCreated);
    const matsOrdered = [...mats].sort(sortByCreated);

    for (const a of attendanceOrdered) {
      try {
        const payload = {
          id: a.id,
          clientId: a.id,
          projectId: a.projectId,
          type: a.type,
          location: a.location,
          timestamp: a.timestamp,
          markedAt: a.markedAt,
          userId: a.userId,
          latitude: a.latitude,
          longitude: a.longitude,
        };
        const res = await batchSyncRequest({ attendance: [payload], dprs: [], materials: [] });
        const ids = res.attendance || [];
        if (ids.includes(a.id)) {
          await markAttendanceSynced(a.id);
          result.syncedAttendance++;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        await markAttendanceFailed(a.id, msg);
        result.failed++;
        result.errors.push(`Attendance ${a.id}: ${msg}`);
      }
    }

    for (const d of dprsOrdered) {
      try {
        const payload = {
          id: d.id,
          clientId: d.id,
          projectId: d.projectId,
          taskId: d.taskId,
          notes: d.notes,
          aiSummary: d.aiSummary,
          photos: d.photos,
          timestamp: d.timestamp,
          createdAt: d.createdAt,
          createdBy: d.createdBy,
          workStoppage: d.workStoppage,
        };
        const res = await batchSyncRequest({ attendance: [], dprs: [payload], materials: [] });
        const ids = res.dprs || [];
        if (ids.includes(d.id)) {
          await markDPRSynced(d.id);
          result.syncedDPRs++;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        await markDPRFailed(d.id, msg);
        result.failed++;
        result.errors.push(`DPR ${d.id}: ${msg}`);
      }
    }

    for (const m of matsOrdered) {
      try {
        const payload = {
          id: m.id,
          clientId: m.id,
          projectId: m.projectId,
          materialId: m.materialId,
          materialName: m.materialName,
          quantity: m.quantity,
          unit: m.unit,
          reason: m.reason,
          timestamp: m.timestamp,
          requestedAt: m.requestedAt,
          requestedBy: m.requestedBy,
        };
        const res = await batchSyncRequest({ attendance: [], dprs: [], materials: [payload] });
        const ids = res.materials || [];
        if (ids.includes(m.id)) {
          await markMaterialSynced(m.id);
          result.syncedMaterials++;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        await markMaterialFailed(m.id, msg);
        result.failed++;
        result.errors.push(`Material ${m.id}: ${msg}`);
      }
    }
  } finally {
    isSyncing = false;
  }

  return result;
}

const debounceMs = 2000;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedule a debounced sync. Use for network-stability or foreground triggers.
 */
export function scheduleSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    runSync().catch((e) => console.error('Sync error:', e));
  }, debounceMs);
}

export function cancelScheduledSync(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}
