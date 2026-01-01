import { Router } from 'express';
import {
  getMyNotifications,
  createNotificationController,
  createBulkNotificationController,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  searchUserByOffsiteId,
} from './notification.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';
import { authorizePermission } from '../../middlewares/role.middleware';

const router = Router();

// Get own notifications
router.get('/me', authenticateUser, getMyNotifications);

// Mark notification as read
router.patch('/:id/read', authenticateUser, markNotificationAsRead);

// Mark all as read
router.patch('/me/read-all', authenticateUser, markAllNotificationsAsRead);

// Create notification (managers and owners can send notifications)
router.post(
  '/',
  authenticateUser,
  authorizePermission('canSendNotifications'),
  createNotificationController
);

// Create bulk notifications
router.post(
  '/bulk',
  authenticateUser,
  authorizePermission('canSendNotifications'),
  createBulkNotificationController
);

// Search user by OffSite ID
router.get('/search/user', authenticateUser, searchUserByOffsiteId);

export default router;

