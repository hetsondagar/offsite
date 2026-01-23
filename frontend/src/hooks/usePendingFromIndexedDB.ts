/**
 * Load pending (unsynced) count from IndexedDB. Single source of truth for offline queue.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getUnsyncedDPRs,
  getUnsyncedAttendance,
  getUnsyncedMaterials,
} from '@/lib/indexeddb';

export interface PendingItem {
  id: string;
  type: 'dpr' | 'attendance' | 'material';
  synced: boolean;
  retryCount?: number;
  lastError?: string;
  timestamp: number;
  [k: string]: unknown;
}

export function usePendingFromIndexedDB() {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(async () => {
    const [dprs, attendance, materials] = await Promise.all([
      getUnsyncedDPRs(),
      getUnsyncedAttendance(),
      getUnsyncedMaterials(),
    ]);
    const items: PendingItem[] = [
      ...dprs.map((d) => ({ ...d, type: 'dpr' as const })),
      ...attendance.map((a) => ({ ...a, type: 'attendance' as const })),
      ...materials.map((m) => ({ ...m, type: 'material' as const })),
    ].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    setPendingItems(items);
    setPendingCount(items.length);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { pendingItems, pendingCount, refresh };
}
