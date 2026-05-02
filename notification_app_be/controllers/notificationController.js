const notificationService = require('../services/notificationService');
const Log = require('../../logging_middleware/log');

const notificationController = {

  async getNotifications(req, res) {
    const studentId = req.query.studentId;
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'studentId query parameter is required' });
    }

    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const { type, isRead } = req.query;

    const parsedIsRead = isRead === 'true' ? true : isRead === 'false' ? false : undefined;

    await Log('backend', 'info', 'controller',
      `getNotifications called — student: ${studentId}, page: ${page}, type: ${type || 'all'}`);

    try {
      const data = await notificationService.getNotifications(studentId, {
        page, limit, type, isRead: parsedIsRead,
      });
      await Log('backend', 'info', 'controller',
        `Returning ${data.notifications.length} notifications for student ${studentId}`);
      return res.json({ success: true, data });
    } catch (err) {
      await Log('backend', 'error', 'controller',
        `getNotifications failed for student ${studentId}: ${err.message}`);
      return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
  },

  async getUnreadCount(req, res) {
    const studentId = req.query.studentId;
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'studentId query parameter is required' });
    }

    await Log('backend', 'info', 'controller',
      `getUnreadCount called — student: ${studentId}`);

    try {
      const unreadCount = await notificationService.getUnreadCount(studentId);
      await Log('backend', 'info', 'controller',
        `Student ${studentId} has ${unreadCount} unread notifications`);
      return res.json({ success: true, data: { unreadCount } });
    } catch (err) {
      await Log('backend', 'error', 'controller',
        `getUnreadCount failed for student ${studentId}: ${err.message}`);
      return res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
    }
  },

  async markAsRead(req, res) {
    const studentId = req.query.studentId;
    const { id }    = req.params;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'studentId query parameter is required' });
    }

    await Log('backend', 'info', 'controller',
      `markAsRead called — notification: ${id}, student: ${studentId}`);

    try {
      const found = await notificationService.markAsRead(id, studentId);
      if (!found) {
        await Log('backend', 'warn', 'controller',
          `Notification ${id} not found for student ${studentId}`);
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }
      await Log('backend', 'info', 'controller', `Notification ${id} marked as read`);
      return res.json({ success: true, message: 'Notification marked as read' });
    } catch (err) {
      await Log('backend', 'error', 'controller',
        `markAsRead failed for notification ${id}: ${err.message}`);
      return res.status(500).json({ success: false, message: 'Failed to update notification' });
    }
  },

  async markAllRead(req, res) {
    const studentId = req.query.studentId;
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'studentId query parameter is required' });
    }

    await Log('backend', 'info', 'controller',
      `markAllRead called — student: ${studentId}`);

    try {
      const updatedCount = await notificationService.markAllRead(studentId);
      await Log('backend', 'info', 'controller',
        `Marked ${updatedCount} notifications as read for student ${studentId}`);
      return res.json({ success: true, message: 'All notifications marked as read', data: { updatedCount } });
    } catch (err) {
      await Log('backend', 'error', 'controller',
        `markAllRead failed for student ${studentId}: ${err.message}`);
      return res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
    }
  },

  async deleteNotification(req, res) {
    const studentId = req.query.studentId;
    const { id }    = req.params;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'studentId query parameter is required' });
    }

    await Log('backend', 'info', 'controller',
      `deleteNotification called — notification: ${id}, student: ${studentId}`);

    try {
      const found = await notificationService.deleteNotification(id, studentId);
      if (!found) {
        await Log('backend', 'warn', 'controller',
          `Notification ${id} not found for student ${studentId} — cannot delete`);
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }
      await Log('backend', 'info', 'controller', `Notification ${id} deleted successfully`);
      return res.json({ success: true, message: 'Notification deleted' });
    } catch (err) {
      await Log('backend', 'error', 'controller',
        `deleteNotification failed for notification ${id}: ${err.message}`);
      return res.status(500).json({ success: false, message: 'Failed to delete notification' });
    }
  },

  async createNotifications(req, res) {
    const { studentIds, type, message } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'studentIds must be a non-empty array' });
    }

    const validTypes = ['Placement', 'Result', 'Event'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `type must be one of: ${validTypes.join(', ')}` });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'message is required' });
    }

    await Log('backend', 'info', 'controller',
      `createNotifications called — type: ${type}, recipients: ${studentIds.length}`);

    try {
      const count = await notificationService.createNotifications(studentIds, type, message.trim());
      await Log('backend', 'info', 'controller',
        `Created ${count} notifications — type: ${type}, message: "${message.trim().slice(0, 60)}"`);
      return res.status(201).json({ success: true, message: 'Notifications created successfully', data: { count } });
    } catch (err) {
      await Log('backend', 'error', 'controller',
        `createNotifications failed: ${err.message}`);
      return res.status(500).json({ success: false, message: 'Failed to create notifications' });
    }
  },
};

module.exports = notificationController;
