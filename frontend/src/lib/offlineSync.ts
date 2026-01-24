/**
 * Offline sync facade. Delegates to centralized Sync Engine.
 */

import { runSync, type SyncResult } from './syncEngine';

export type { SyncResult as OfflineSyncResult };

export async function syncOfflineStores(): Promise<{
  syncedDprs: number;
  syncedAttendance: number;
  syncedMaterials: number;
}> {
  const r = await runSync();
  return {
    syncedDprs: r.syncedDPRs,
    syncedAttendance: r.syncedAttendance,
    syncedMaterials: r.syncedMaterials,
  };
}
