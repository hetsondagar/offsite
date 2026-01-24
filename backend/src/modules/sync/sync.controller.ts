import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DPR } from '../dpr/dpr.model';
import { Attendance } from '../attendance/attendance.model';
import { MaterialRequest } from '../materials/material.model';
import { Invoice } from '../invoices/invoice.model';
import { Project } from '../projects/project.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../utils/logger';
import { validateGeoFence, getProjectGeoFence } from '../../utils/geoFence';

const syncBatchSchema = z.object({
  dprs: z.array(z.any()).optional().default([]),
  attendance: z.array(z.any()).optional().default([]),
  materials: z.array(z.any()).optional().default([]),
  invoices: z.array(z.any()).optional().default([]),
});

const toMillis = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (value instanceof Date) {
    const time = value.getTime();
    if (Number.isFinite(time)) return time;
  }
  return Date.now();
};

export const syncBatch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { dprs, attendance, materials, invoices } = syncBatchSchema.parse(req.body);

    const syncedIds: {
      dprs: string[];
      attendance: string[];
      materials: string[];
      invoices: string[];
    } = {
      dprs: [],
      attendance: [],
      materials: [],
      invoices: [],
    };

    // Sync DPRs
    for (const dprData of dprs) {
      try {
        const clientId = dprData.clientId || dprData.id;
        if (!clientId) continue;

        // Conflict resolution: latest timestamp wins
        const existing = await DPR.findOne({
          clientId,
          createdBy: req.user.userId,
        });
        const incomingTimestamp = toMillis(dprData.timestamp ?? dprData.createdAt);

        if (existing) {
          const existingTimestamp = existing.createdAt.getTime();
          if (incomingTimestamp > existingTimestamp) {
            // Update with newer data
            Object.assign(existing, {
              ...dprData,
              clientId,
              synced: true,
            });
            await existing.save();
            syncedIds.dprs.push(clientId);
          } else {
            // Keep existing, just mark as synced
            existing.synced = true;
            await existing.save();
            syncedIds.dprs.push(clientId);
          }
        } else {
          // Create new
          const dpr = new DPR({
            ...dprData,
            clientId,
            createdBy: req.user.userId,
            synced: true,
          });
          await dpr.save();
          syncedIds.dprs.push(clientId);
        }
      } catch (error) {
        logger.error(`Error syncing DPR ${dprData?.id || dprData?.clientId}:`, error);
      }
    }

    // Sync Attendance with server-side geo-fence re-validation
    for (const attData of attendance) {
      try {
        const clientId = attData.clientId || attData.id;
        if (!clientId) continue;

        // Server is authoritative: re-validate geo-fence for all attendance records
        let geoFenceStatus: 'INSIDE' | 'OUTSIDE' | undefined;
        let distanceFromCenter: number | undefined;
        let geoFenceViolation = false;

        if (attData.latitude && attData.longitude && attData.projectId) {
          const project = await Project.findById(attData.projectId);
          if (project) {
            const geoFence = getProjectGeoFence(project);
            if (geoFence) {
              const validation = validateGeoFence(
                attData.latitude,
                attData.longitude,
                geoFence
              );
              distanceFromCenter = validation.distanceFromCenter;
              geoFenceStatus = validation.status;
              geoFenceViolation = validation.violation;

              // Log violations for audit
              if (validation.violation) {
                logger.warn(`Geo-fence violation detected for attendance ${clientId}: ${validation.distanceFromCenter}m from center (radius: ${geoFence.radiusMeters}m)`, {
                  userId: req.user.userId,
                  projectId: attData.projectId,
                  distance: validation.distanceFromCenter,
                  radius: geoFence.radiusMeters,
                });
              }
            }
          }
        }

        const existing = await Attendance.findOne({
          clientId,
          userId: req.user.userId,
        });
        const incomingTimestamp = toMillis(attData.timestamp ?? attData.createdAt);

        if (existing) {
          const existingTimestamp = existing.timestamp.getTime();
          if (incomingTimestamp > existingTimestamp) {
            Object.assign(existing, {
              ...attData,
              userId: req.user.userId,
              clientId,
              distanceFromCenter,
              geoFenceStatus,
              geoFenceViolation,
              synced: true,
            });
            if (attData.timestamp) {
              existing.timestamp = new Date(incomingTimestamp);
            }
            await existing.save();
            syncedIds.attendance.push(clientId);
          } else {
            // Update geo-fence status even if keeping existing record (server re-validation)
            existing.distanceFromCenter = distanceFromCenter ?? existing.distanceFromCenter;
            existing.geoFenceStatus = geoFenceStatus ?? existing.geoFenceStatus;
            existing.geoFenceViolation = geoFenceViolation || existing.geoFenceViolation || false;
            existing.synced = true;
            await existing.save();
            syncedIds.attendance.push(clientId);
          }
        } else {
          const att = new Attendance({
            ...attData,
            userId: req.user.userId,
            clientId,
            distanceFromCenter,
            geoFenceStatus,
            geoFenceViolation,
            timestamp: new Date(incomingTimestamp),
            synced: true,
          });
          await att.save();
          syncedIds.attendance.push(clientId);
        }
      } catch (error) {
        logger.error(`Error syncing attendance ${attData?.id || attData?.clientId}:`, error);
      }
    }

    // Sync Materials
    for (const matData of materials) {
      try {
        const clientId = matData.clientId || matData.id;
        if (!clientId) continue;

        const existing = await MaterialRequest.findOne({
          clientId,
          requestedBy: req.user.userId,
        });
        const incomingTimestamp = toMillis(matData.timestamp ?? matData.requestedAt ?? matData.createdAt);

        if (existing) {
          const existingTimestamp = existing.createdAt.getTime();
          if (incomingTimestamp > existingTimestamp) {
            Object.assign(existing, {
              ...matData,
              requestedBy: req.user.userId,
              clientId,
            });
            await existing.save();
            syncedIds.materials.push(clientId);
          } else {
            syncedIds.materials.push(clientId);
          }
        } else {
          const mat = new MaterialRequest({
            ...matData,
            requestedBy: req.user.userId,
            clientId,
          });
          await mat.save();
          syncedIds.materials.push(clientId);
        }
      } catch (error) {
        logger.error(`Error syncing material ${matData?.id || matData?.clientId}:`, error);
      }
    }

    // Sync Invoices (owner only, drafts only)
    if (req.user.role === 'owner') {
      for (const invoiceData of invoices) {
        try {
          // Only sync DRAFT invoices (offline drafts)
          if (invoiceData.status !== 'DRAFT') {
            logger.warn(`Skipping non-draft invoice ${invoiceData.id}`);
            continue;
          }

          const existing = await Invoice.findById(invoiceData.id);
          const incomingTimestamp = invoiceData.timestamp || invoiceData.createdAt;

          if (existing) {
            // If invoice is already finalized, skip
            if (existing.status === 'FINALIZED') {
              logger.warn(`Skipping finalized invoice ${invoiceData.id}`);
              syncedIds.invoices.push(invoiceData.id);
              continue;
            }

            const existingTimestamp = existing.createdAt.getTime();
            if (incomingTimestamp > existingTimestamp) {
              // Update with newer data (but don't allow status changes to FINALIZED)
              Object.assign(existing, {
                ...invoiceData,
                status: 'DRAFT', // Ensure it remains a draft
                ownerId: req.user.userId,
              });
              await existing.save();
              syncedIds.invoices.push(invoiceData.id);
            } else {
              syncedIds.invoices.push(invoiceData.id);
            }
          } else {
            // Create new draft invoice
            const invoice = new Invoice({
              ...invoiceData,
              ownerId: req.user.userId,
              status: 'DRAFT', // Ensure it's a draft
            });
            await invoice.save();
            syncedIds.invoices.push(invoiceData.id);
          }
        } catch (error) {
          logger.error(`Error syncing invoice ${invoiceData.id}:`, error);
        }
      }
    }

    logger.info(`Batch sync completed for user ${req.user.userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Sync completed successfully',
      data: syncedIds,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

