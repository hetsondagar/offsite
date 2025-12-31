import cron from 'node-cron';
import { Project } from '../modules/projects/project.model';
import { calculateProjectHealthScore } from './siteHealth';
import { predictDelayRisk } from './delayPredictor';
import { Attendance } from '../modules/attendance/attendance.model';
import { DPR } from '../modules/dpr/dpr.model';
import { logger } from './logger';

/**
 * Recalculate site health scores daily at 2 AM
 */
const recalculateHealthScores = async (): Promise<void> => {
  try {
    logger.info('Starting daily health score recalculation...');
    
    const projects = await Project.find({ status: 'active' });
    
    for (const project of projects) {
      const healthScore = await calculateProjectHealthScore(project._id.toString());
      project.healthScore = healthScore;
      await project.save();
    }
    
    logger.info(`Health scores recalculated for ${projects.length} projects`);
  } catch (error) {
    logger.error('Error recalculating health scores:', error);
  }
};

/**
 * Generate delay risk alerts daily at 8 AM
 */
const generateDelayRiskAlerts = async (): Promise<void> => {
  try {
    logger.info('Generating delay risk alerts...');
    
    const projects = await Project.find({ status: 'active' });
    
    for (const project of projects) {
      const risk = await predictDelayRisk(project._id.toString(), project.name);
      
      if (risk.risk === 'High') {
        logger.warn(`High delay risk detected for ${project.name}: ${risk.cause}`);
        // In production, send notifications to managers/owners
      }
    }
    
    logger.info('Delay risk alerts generated');
  } catch (error) {
    logger.error('Error generating delay risk alerts:', error);
  }
};

/**
 * Cleanup old unsynced data (older than 30 days)
 */
const cleanupOldUnsyncedData = async (): Promise<void> => {
  try {
    logger.info('Cleaning up old unsynced data...');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Cleanup old unsynced attendance
    const deletedAttendance = await Attendance.deleteMany({
      synced: false,
      createdAt: { $lt: thirtyDaysAgo },
    });
    
    // Cleanup old unsynced DPRs (keep synced ones)
    const deletedDPRs = await DPR.deleteMany({
      synced: false,
      createdAt: { $lt: thirtyDaysAgo },
    });
    
    logger.info(`Cleaned up ${deletedAttendance.deletedCount} attendance records and ${deletedDPRs.deletedCount} DPRs`);
  } catch (error) {
    logger.error('Error cleaning up old data:', error);
  }
};

export const startCronJobs = (): void => {
  // Recalculate health scores daily at 2 AM
  cron.schedule('0 2 * * *', recalculateHealthScores);
  
  // Generate delay risk alerts daily at 8 AM
  cron.schedule('0 8 * * *', generateDelayRiskAlerts);
  
  // Cleanup old data weekly on Sunday at 3 AM
  cron.schedule('0 3 * * 0', cleanupOldUnsyncedData);
  
  logger.info('Cron jobs started');
};

