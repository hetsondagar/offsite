import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DPR } from '../dpr/dpr.model';
import { Attendance } from '../attendance/attendance.model';
import { MaterialRequest } from '../materials/material.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../utils/logger';

const syncBatchSchema = z.object({
  dprs: z.array(z.any()).optional().default([]),
  attendance: z.array(z.any()).optional().default([]),
  materials: z.array(z.any()).optional().default([]),
});

export const syncBatch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { dprs, attendance, materials } = syncBatchSchema.parse(req.body);

    const syncedIds: {
      dprs: string[];
      attendance: string[];
      materials: string[];
    } = {
      dprs: [],
      attendance: [],
      materials: [],
    };

    // Sync DPRs
    for (const dprData of dprs) {
      try {
        // Conflict resolution: latest timestamp wins
        const existing = await DPR.findById(dprData.id);
        const incomingTimestamp = dprData.timestamp || dprData.createdAt;

        if (existing) {
          const existingTimestamp = existing.createdAt.getTime();
          if (incomingTimestamp > existingTimestamp) {
            // Update with newer data
            Object.assign(existing, {
              ...dprData,
              synced: true,
            });
            await existing.save();
            syncedIds.dprs.push(dprData.id);
          } else {
            // Keep existing, just mark as synced
            existing.synced = true;
            await existing.save();
            syncedIds.dprs.push(dprData.id);
          }
        } else {
          // Create new
          const dpr = new DPR({
            ...dprData,
            createdBy: req.user.userId,
            synced: true,
          });
          await dpr.save();
          syncedIds.dprs.push(dprData.id);
        }
      } catch (error) {
        logger.error(`Error syncing DPR ${dprData.id}:`, error);
      }
    }

    // Sync Attendance
    for (const attData of attendance) {
      try {
        const existing = await Attendance.findById(attData.id);
        const incomingTimestamp = attData.timestamp || attData.createdAt;

        if (existing) {
          const existingTimestamp = existing.timestamp.getTime();
          if (incomingTimestamp > existingTimestamp) {
            Object.assign(existing, {
              ...attData,
              userId: req.user.userId,
              synced: true,
            });
            await existing.save();
            syncedIds.attendance.push(attData.id);
          } else {
            existing.synced = true;
            await existing.save();
            syncedIds.attendance.push(attData.id);
          }
        } else {
          const att = new Attendance({
            ...attData,
            userId: req.user.userId,
            synced: true,
          });
          await att.save();
          syncedIds.attendance.push(attData.id);
        }
      } catch (error) {
        logger.error(`Error syncing attendance ${attData.id}:`, error);
      }
    }

    // Sync Materials
    for (const matData of materials) {
      try {
        const existing = await MaterialRequest.findById(matData.id);
        const incomingTimestamp = matData.timestamp || matData.createdAt;

        if (existing) {
          const existingTimestamp = existing.createdAt.getTime();
          if (incomingTimestamp > existingTimestamp) {
            Object.assign(existing, {
              ...matData,
              requestedBy: req.user.userId,
            });
            await existing.save();
            syncedIds.materials.push(matData.id);
          } else {
            syncedIds.materials.push(matData.id);
          }
        } else {
          const mat = new MaterialRequest({
            ...matData,
            requestedBy: req.user.userId,
          });
          await mat.save();
          syncedIds.materials.push(matData.id);
        }
      } catch (error) {
        logger.error(`Error syncing material ${matData.id}:`, error);
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

