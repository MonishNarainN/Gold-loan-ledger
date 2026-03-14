const express = require('express');
const {
  register,
  login,
  getMe,
  logout,
  getPendingUsers,
  approveUser
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/register', validateUserRegistration, register);
router.post('/login', validateUserLogin, login);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Admin routes
router.get('/pending-users', protect, authorize('ADMIN'), getPendingUsers);
router.put('/approve-user/:id', protect, authorize('ADMIN'), approveUser);

module.exports = router;
