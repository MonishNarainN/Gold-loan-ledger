const express = require('express');
const {
  getAllUsers,
  getUser,
  updateProfile,
  deleteUser,
  getUserStats
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Admin routes
router.get('/', authorize('ADMIN'), getAllUsers);
router.get('/:id', getUser);
router.put('/:id', updateProfile);
router.delete('/:id', authorize('ADMIN'), deleteUser);
router.get('/:id/stats', getUserStats);

module.exports = router;
