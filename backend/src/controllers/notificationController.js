const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/response');

// @desc    Get user notifications
// @route   GET /api/notifications/user/:userId
// @access  Private
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Users can only see their own notifications unless they're admin
    if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
      return errorResponse(res, 403, 'Access denied');
    }

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to last 50 notifications

    successResponse(res, 200, 'User notifications retrieved successfully', notifications);
  } catch (error) {
    console.error('Get user notifications error:', error);
    errorResponse(res, 500, 'Failed to retrieve user notifications', error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return errorResponse(res, 404, 'Notification not found');
    }

    // Users can only mark their own notifications as read unless they're admin
    if (req.user.role !== 'ADMIN' && notification.userId.toString() !== req.user.id) {
      return errorResponse(res, 403, 'Access denied');
    }

    await notification.markAsRead();

    successResponse(res, 200, 'Notification marked as read', notification);
  } catch (error) {
    console.error('Mark notification as read error:', error);
    errorResponse(res, 500, 'Failed to mark notification as read', error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/user/:userId/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Users can only mark their own notifications as read unless they're admin
    if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
      return errorResponse(res, 403, 'Access denied');
    }

    const result = await Notification.updateMany(
      { userId, isRead: false },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );

    successResponse(res, 200, `${result.modifiedCount} notifications marked as read`);
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    errorResponse(res, 500, 'Failed to mark all notifications as read', error);
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/user/:userId/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Users can only see their own notification count unless they're admin
    if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
      return errorResponse(res, 403, 'Access denied');
    }

    const unreadCount = await Notification.countDocuments({ 
      userId, 
      isRead: false 
    });

    successResponse(res, 200, 'Unread count retrieved successfully', { unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    errorResponse(res, 500, 'Failed to retrieve unread count', error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notificationId = req.params.id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return errorResponse(res, 404, 'Notification not found');
    }

    // Users can only delete their own notifications unless they're admin
    if (req.user.role !== 'ADMIN' && notification.userId.toString() !== req.user.id) {
      return errorResponse(res, 403, 'Access denied');
    }

    await Notification.findByIdAndDelete(notificationId);

    successResponse(res, 200, 'Notification deleted successfully');
  } catch (error) {
    console.error('Delete notification error:', error);
    errorResponse(res, 500, 'Failed to delete notification', error);
  }
};

// @desc    Create notification (Admin only)
// @route   POST /api/notifications
// @access  Private/Admin
const createNotification = async (req, res) => {
  try {
    const { userId, title, message, type, data } = req.body;

    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      data: data || {}
    });

    successResponse(res, 201, 'Notification created successfully', notification);
  } catch (error) {
    console.error('Create notification error:', error);
    errorResponse(res, 500, 'Failed to create notification', error);
  }
};

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  createNotification
};
