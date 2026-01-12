import { getUnsyncedAttendance, getUnsyncedDPRs, getUnsyncedMaterials, markAttendanceSynced, markDPRSynced, markMaterialSynced } from "@/lib/indexeddb";
import { syncApi } from "@/services/api/sync";

export interface OfflineSyncResult {
  syncedDprs: number;
  syncedAttendance: number;
  syncedMaterials: number;
}

export async function syncOfflineStores(): Promise<OfflineSyncResult> {
  if (!navigator.onLine) {
    return { syncedDprs: 0, syncedAttendance: 0, syncedMaterials: 0 };
  }

  const token = localStorage.getItem("accessToken");
  if (!token) {
    return { syncedDprs: 0, syncedAttendance: 0, syncedMaterials: 0 };
  }

  const dprs = await getUnsyncedDPRs();
  const attendance = await getUnsyncedAttendance();
  const materials = await getUnsyncedMaterials();

  if (dprs.length === 0 && attendance.length === 0 && materials.length === 0) {
    return { syncedDprs: 0, syncedAttendance: 0, syncedMaterials: 0 };
  }

  const batchData = {
    dprs: dprs.map((dpr) => ({
      id: dpr.id,
      clientId: dpr.id,
      projectId: dpr.projectId,
      taskId: dpr.taskId,
      notes: dpr.notes,
      aiSummary: dpr.aiSummary,
      photos: dpr.photos,
      timestamp: dpr.timestamp,
      createdAt: dpr.createdAt,
      createdBy: dpr.createdBy,
    })),
    attendance: attendance.map((att) => ({
      id: att.id,
      clientId: att.id,
      projectId: att.projectId,
      type: att.type,
      location: att.location,
      timestamp: att.timestamp,
      markedAt: att.markedAt,
      userId: att.userId,
    })),
    materials: materials.map((mat) => ({
      id: mat.id,
      clientId: mat.id,
      projectId: mat.projectId,
      materialId: mat.materialId,
      materialName: mat.materialName,
      quantity: mat.quantity,
      unit: mat.unit,
      reason: mat.reason,
      timestamp: mat.timestamp,
      requestedAt: mat.requestedAt,
      requestedBy: mat.requestedBy,
    })),
  };

  const result = await syncApi.batchSync(batchData);

  const syncedDprs = (result?.dprs || []).filter(Boolean) as string[];
  const syncedAttendance = (result?.attendance || []).filter(Boolean) as string[];
  const syncedMaterials = (result?.materials || []).filter(Boolean) as string[];

  await Promise.all([
    ...syncedDprs.map((id) => markDPRSynced(id)),
    ...syncedAttendance.map((id) => markAttendanceSynced(id)),
    ...syncedMaterials.map((id) => markMaterialSynced(id)),
  ]);

  return {
    syncedDprs: syncedDprs.length,
    syncedAttendance: syncedAttendance.length,
    syncedMaterials: syncedMaterials.length,
  };
}
