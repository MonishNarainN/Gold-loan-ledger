const express = require('express');
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  createNotification
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Notification routes
router.get('/user/:userId', getUserNotifications);
router.get('/user/:userId/unread-count', getUnreadCount);
router.put('/:id/read', markAsRead);
router.put('/user/:userId/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);

// Admin routes
router.post('/', authorize('ADMIN'), createNotification);

module.exports = router;
