import { Notification, NotificationType } from './notification.model';
import { User } from '../users/user.model';
import { logger } from '../../utils/logger';

export interface CreateNotificationParams {
  userId?: string;
  offsiteId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

/**
 * Create a notification for a user
 * Can find user by userId or offsiteId
 */
export const createNotification = async (params: CreateNotificationParams): Promise<void> => {
  try {
    let userId = params.userId;

    // If offsiteId is provided, find the user by OffSite ID
    if (!userId && params.offsiteId) {
      const user = await User.findOne({ offsiteId: params.offsiteId }).select('_id');
      if (!user) {
        logger.warn(`User not found with OffSite ID: ${params.offsiteId}`);
        return; // Silently fail if user not found
      }
      userId = user._id.toString();
    }

    if (!userId) {
      throw new Error('Either userId or offsiteId must be provided');
    }

    // Get offsiteId if not provided
    let offsiteId = params.offsiteId;
    if (!offsiteId) {
      const user = await User.findById(userId).select('offsiteId');
      offsiteId = user?.offsiteId;
    }

    const notification = new Notification({
      userId,
      offsiteId,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data || {},
      read: false,
    });

    await notification.save();
    logger.info(`Notification created for user ${userId} (${offsiteId || 'N/A'})`);
  } catch (error: any) {
    logger.error('Failed to create notification:', error.message);
    throw error;
  }
};

/**
 * Create notifications for multiple users
 */
export const createBulkNotifications = async (
  params: Omit<CreateNotificationParams, 'userId' | 'offsiteId'> & {
    userIds?: string[];
    offsiteIds?: string[];
  }
): Promise<void> => {
  try {
    const { userIds, offsiteIds, ...notificationData } = params;

    if (userIds && userIds.length > 0) {
      // Get users to include offsiteId in notifications
      const users = await User.find({ _id: { $in: userIds } }).select('_id offsiteId');
      const userMap = new Map(users.map((user) => [user._id.toString(), user.offsiteId]));

      // Create notifications for multiple user IDs
      const notifications = userIds.map((userId) => ({
        userId,
        offsiteId: userMap.get(userId) || undefined,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data || {},
        read: false,
      }));

      await Notification.insertMany(notifications);
      logger.info(`Bulk notifications created for ${userIds.length} users`);
    } else if (offsiteIds && offsiteIds.length > 0) {
      // Find users by OffSite IDs and create notifications
      const users = await User.find({ offsiteId: { $in: offsiteIds } }).select('_id offsiteId');
      
      const notifications = users.map((user) => ({
        userId: user._id,
        offsiteId: user.offsiteId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data || {},
        read: false,
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        logger.info(`Bulk notifications created for ${notifications.length} users by OffSite ID`);
      }
    } else {
      throw new Error('Either userIds or offsiteIds must be provided');
    }
  } catch (error: any) {
    logger.error('Failed to create bulk notifications:', error.message);
    throw error;
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId: string, userId: string): Promise<void> => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    throw new Error('Notification not found or unauthorized');
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (userId: string): Promise<void> => {
  await Notification.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() }
  );
};

