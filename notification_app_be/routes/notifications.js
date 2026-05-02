const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/notificationController');

router.get('/notifications/unread-count', controller.getUnreadCount);
router.get('/notifications',              controller.getNotifications);
router.put('/notifications/read-all',     controller.markAllRead);
router.put('/notifications/:id/read',     controller.markAsRead);
router.delete('/notifications/:id',       controller.deleteNotification);
router.post('/notifications',             controller.createNotifications);

module.exports = router;
